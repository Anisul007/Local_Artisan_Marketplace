import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import User from "../models/User.js";

const router = Router();

// GET /api/vendor/summary
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user._id || req.user.id;
    const active = await Listing.countDocuments({ vendor, "inventory.status": "active" });
    res.json({ ok: true, revenueToday: 0, orders: 0, conversion: 0, aov: 0, listingsActive: active });
  } catch (e) { next(e); }
});

// GET /api/vendor/products?limit=6
router.get("/products", requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user._id || req.user.id;
    const limit = Math.min(parseInt(req.query.limit || "6", 10), 24);
    const items = await Listing.find({ vendor, archivedAt: { $in: [null, undefined] } })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();
    const mapped = items.map((l) => ({
      _id: l._id,
      name: l.title,
      price: (l?.pricing?.priceCents || 0) / 100,
      stock: l?.inventory?.stockQty ?? 0,
      imageUrl: (l.images || []).find((i) => i?.isPrimary)?.url || (l.images || [])[0]?.url || "",
    }));
    res.json({ ok: true, items: mapped });
  } catch (e) { next(e); }
});

// GET /api/vendor/orders?page=1&limit=20&status=processing&q=AA-...
router.get("/orders", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor access only" });
    }

    const vendorId = req.user?._id || req.user?.id;
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }
    const vendorObjId = new mongoose.Types.ObjectId(vendorId);

    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10) || 20, 1), 200);
    const status = String(req.query.status || "").trim();
    const q = String(req.query.q || "").trim().toLowerCase();

    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "listings",
          localField: "items.listing",
          foreignField: "_id",
          as: "listingDoc",
        },
      },
      { $unwind: "$listingDoc" },
      { $match: { "listingDoc.vendor": vendorObjId } },
    ];

    if (status) {
      pipeline.push({ $match: { status } });
    }

    pipeline.push(
      {
        $group: {
          _id: "$_id",
          orderNumber: { $first: "$orderNumber" },
          customer: { $first: "$customer" },
          status: { $first: "$status" },
          totalCents: { $first: "$totalCents" },
          discountCents: { $first: "$discountCents" },
          couponCode: { $first: "$couponCode" },
          currency: { $first: "$currency" },
          shipping: { $first: "$shipping" },
          estimatedDelivery: { $first: "$estimatedDelivery" },
          createdAt: { $first: "$createdAt" },
          vendorItems: { $push: "$items" },
          vendorTotalCents: {
            $sum: { $multiply: [{ $ifNull: ["$items.priceCents", 0] }, { $ifNull: ["$items.quantity", 0] }] },
          },
          vendorItemCount: { $sum: { $ifNull: ["$items.quantity", 0] } },
        },
      },
      { $sort: { createdAt: -1 } }
    );

    const rows = await Order.aggregate(pipeline);
    const customerIds = [...new Set(rows.map((r) => String(r.customer || "")).filter(Boolean))];
    const customers = await User.find({ _id: { $in: customerIds } })
      .select("_id firstName lastName email")
      .lean();
    const customerMap = new Map(customers.map((u) => [String(u._id), u]));

    let items = rows.map((r) => {
      const c = customerMap.get(String(r.customer || "")) || null;
      return {
        _id: r._id,
        code: r.orderNumber,
        status: r.status,
        placedAt: r.createdAt,
        estimatedDelivery: r.estimatedDelivery || null,
        currency: r.currency || "AUD",
        totalCents: Number(r.totalCents || 0),
        vendorTotalCents: Number(r.vendorTotalCents || 0),
        vendorItemCount: Number(r.vendorItemCount || 0),
        discountCents: Number(r.discountCents || 0),
        couponCode: r.couponCode || "",
        customer: c
          ? {
              id: c._id,
              name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Customer",
              email: c.email || "",
            }
          : { id: null, name: "Customer", email: "" },
        shipping: r.shipping || {},
        items: (r.vendorItems || []).map((it) => ({
          listingId: it.listing,
          title: it.title || "Item",
          slug: it.slug || "",
          priceCents: Number(it.priceCents || 0),
          quantity: Number(it.quantity || 0),
          currency: it.currency || r.currency || "AUD",
          lineTotalCents: Number(it.priceCents || 0) * Number(it.quantity || 0),
        })),
      };
    });

    if (q) {
      items = items.filter((o) => {
        const inOrder = String(o.code || "").toLowerCase().includes(q);
        const inCustomer = String(o.customer?.name || "").toLowerCase().includes(q);
        const inEmail = String(o.customer?.email || "").toLowerCase().includes(q);
        const inItems = (o.items || []).some((it) => String(it.title || "").toLowerCase().includes(q));
        return inOrder || inCustomer || inEmail || inItems;
      });
    }

    const summary = items.reduce(
      (acc, o) => {
        acc.totalOrders += 1;
        acc.totalUnits += Number(o.vendorItemCount || 0);
        acc.revenueCents += Number(o.vendorTotalCents || 0);
        if (acc.statusBreakdown[o.status] != null) acc.statusBreakdown[o.status] += 1;
        return acc;
      },
      {
        totalOrders: 0,
        totalUnits: 0,
        revenueCents: 0,
        statusBreakdown: {
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        },
      }
    );

    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    return res.json({
      ok: true,
      items: paged,
      summary,
      pagination: { page, pages, total, limit },
    });
  } catch (e) {
    next(e);
  }
});

// PATCH /api/vendor/orders/:id/status
router.patch("/orders/:id/status", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor access only" });
    }
    const vendorId = req.user?._id || req.user?.id;
    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").trim();
    const allowed = ["processing", "shipped", "delivered", "cancelled"];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    // Ensure this vendor has at least one listing in the target order
    const vendorObjId = new mongoose.Types.ObjectId(vendorId);
    const orderObjId = new mongoose.Types.ObjectId(id);
    const owned = await Order.aggregate([
      { $match: { _id: orderObjId } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "listings",
          localField: "items.listing",
          foreignField: "_id",
          as: "listingDoc",
        },
      },
      { $unwind: "$listingDoc" },
      { $match: { "listingDoc.vendor": vendorObjId } },
      { $limit: 1 },
    ]);
    if (!owned.length) {
      return res.status(404).json({ ok: false, message: "Order not found for this vendor" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    // Basic forward-only status transitions (cancel can happen before delivered)
    const rank = { processing: 1, shipped: 2, delivered: 3, cancelled: 4 };
    const current = String(order.status || "processing");
    if (current === "delivered" && nextStatus !== "delivered") {
      return res.status(400).json({ ok: false, message: "Delivered orders cannot be changed" });
    }
    if (current === "cancelled" && nextStatus !== "cancelled") {
      return res.status(400).json({ ok: false, message: "Cancelled orders cannot be changed" });
    }
    if (nextStatus !== "cancelled" && rank[nextStatus] < rank[current]) {
      return res.status(400).json({ ok: false, message: "Cannot move order status backwards" });
    }

    order.status = nextStatus;
    await order.save();
    return res.json({ ok: true, data: { _id: order._id, status: order.status } });
  } catch (e) {
    next(e);
  }
});

export default router;
