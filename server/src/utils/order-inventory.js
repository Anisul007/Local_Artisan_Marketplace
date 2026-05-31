import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import { supportsMongoTransactions, withOptionalTransaction } from "./mongo-transaction.js";

const SELLABLE_STATUSES = ["active", "out_of_stock"];

function itemQty(item) {
  return Math.max(1, Math.floor(Number(item?.quantity)) || 1);
}

function listingIdFromItem(item) {
  const raw = item?.listing?._id || item?.listing || item?.listingId;
  if (!raw) return null;
  const id = String(raw);
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
}

function listingObjectId(item) {
  const id = listingIdFromItem(item);
  return id ? new mongoose.Types.ObjectId(id) : null;
}

/** Keep availability in sync when stock is tracked as active / out_of_stock */
export async function syncListingStatusFromStock(listingDoc, session = null) {
  if (!listingDoc?.inventory) return listingDoc;
  const status = listingDoc.inventory.status;
  if (!["active", "out_of_stock"].includes(status)) return listingDoc;

  const qty = Math.max(0, Number(listingDoc.inventory.stockQty) || 0);
  const nextStatus = qty > 0 ? "active" : "out_of_stock";
  if (status !== nextStatus) {
    listingDoc.inventory.status = nextStatus;
    await listingDoc.save(session ? { session } : undefined);
  }
  return listingDoc;
}

/**
 * Decrement listing stock for each order line. Throws if any line lacks stock.
 * @param {Array<{ listing: unknown, quantity: number, title?: string }>} items
 */
export async function reserveStockForOrderItems(items, session = null) {
  const opts = session ? { session } : {};
  for (const item of items) {
    const oid = listingObjectId(item);
    const qty = itemQty(item);
    if (!oid) {
      throw new Error("Invalid product on order");
    }

    const updated = await Listing.findOneAndUpdate(
      {
        _id: oid,
        "inventory.status": { $in: SELLABLE_STATUSES },
        "inventory.stockQty": { $gte: qty },
      },
      { $inc: { "inventory.stockQty": -qty } },
      { new: true, ...opts }
    );

    if (!updated) {
      let listingQuery = Listing.findById(oid);
      if (session) listingQuery = listingQuery.session(session);
      const listing = await listingQuery.lean();
      const name = listing?.title || item.title || "Product";
      const available = Math.max(0, Number(listing?.inventory?.stockQty) || 0);
      const status = listing?.inventory?.status || "unknown";
      throw new Error(
        `Not enough stock for "${name}" (requested ${qty}, available ${available}, status: ${status})`
      );
    }

    await syncListingStatusFromStock(updated, session);
  }
}

/**
 * Restore stock when an order is cancelled or rejected (after it was reserved).
 */
export async function restoreStockForOrderItems(items, session = null) {
  const opts = session ? { session } : {};
  for (const item of items) {
    const oid = listingObjectId(item);
    const qty = itemQty(item);
    if (!oid) continue;

    const updated = await Listing.findByIdAndUpdate(
      oid,
      { $inc: { "inventory.stockQty": qty } },
      { new: true, ...opts }
    );
    if (updated) await syncListingStatusFromStock(updated, session);
  }
}

/**
 * Reserve stock and create order atomically when possible; compensate on standalone MongoDB.
 */
export async function createOrderWithStockReservation(orderPayload, items) {
  const lineItems = Array.isArray(items) ? items : [];

  if (await supportsMongoTransactions()) {
    return withOptionalTransaction(async (session) => {
      await reserveStockForOrderItems(lineItems, session);
      if (session) {
        const [doc] = await Order.create([{ ...orderPayload, inventoryReserved: true, inventoryReleased: false }], {
          session,
        });
        return doc;
      }
      return Order.create({ ...orderPayload, inventoryReserved: true, inventoryReleased: false });
    });
  }

  await reserveStockForOrderItems(lineItems, null);
  try {
    return await Order.create({ ...orderPayload, inventoryReserved: true, inventoryReleased: false });
  } catch (e) {
    await restoreStockForOrderItems(lineItems, null).catch(() => {});
    throw e;
  }
}

const RELEASE_STATUSES = new Set(["cancelled", "rejected"]);

/**
 * If order had stock reserved and moves to cancelled/rejected, put quantity back.
 */
export async function releaseOrderInventoryIfNeeded(order, nextStatus) {
  if (!order || !RELEASE_STATUSES.has(String(nextStatus || "").toLowerCase())) return order;
  if (!order.inventoryReserved || order.inventoryReleased) return order;

  await withOptionalTransaction(async (session) => {
    await restoreStockForOrderItems(order.items || [], session);
    order.inventoryReleased = true;
    await order.save(session ? { session } : undefined);
  });
  return order;
}
