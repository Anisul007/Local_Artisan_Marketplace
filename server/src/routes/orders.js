import { Router } from "express";
import Order from "../models/Order.js";
import Listing from "../models/Listing.js";
import Promotion from "../models/Promotion.js";
import { requireAuth } from "../middleware/auth.js";
import { sendMail } from "../utils/email.js";

const router = Router();

function getOrderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AA-${t}-${r}`;
}

/** Compute discount (cents) for a coupon code. orderItems must have { listing, vendorId, priceCents, quantity }. */
async function computeCouponDiscount(code, orderItems) {
  const codeStr = String(code || "").trim().toUpperCase();
  if (!codeStr) return { discountCents: 0 };
  const now = new Date();
  const promo = await Promotion.findOne({
    code: codeStr,
    active: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).lean();
  if (!promo) return { discountCents: 0, error: "Invalid or expired code" };

  const vendorStr = promo.vendor.toString();
  let applicableSubtotalCents = 0;
  for (const row of orderItems) {
    const lid = (row.listing && row.listing.toString) ? row.listing.toString() : String(row.listing || "");
    if (!lid) continue;
    const rowVendor = row.vendorId && row.vendorId.toString ? row.vendorId.toString() : "";
    if (rowVendor !== vendorStr) continue;
    const inScope = !promo.listingIds || promo.listingIds.length === 0 || promo.listingIds.some((id) => id.toString() === lid);
    if (!inScope) continue;
    applicableSubtotalCents += (Number(row.priceCents) || 0) * (Math.max(1, Math.floor(Number(row.quantity)) || 1));
  }
  if (applicableSubtotalCents < (promo.minPurchaseCents || 0))
    return { discountCents: 0, error: "Minimum purchase not met" };

  let discountCents = promo.type === "percentage"
    ? Math.round((applicableSubtotalCents * promo.value) / 100)
    : Math.min(promo.value, applicableSubtotalCents);
  discountCents = Math.max(0, discountCents);
  return { discountCents };
}

// POST /api/orders — create order (from cart payload), require auth
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    if (!customerId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { items = [], shipping = {}, couponCode } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "Cart is empty" });
    }

    let subtotalCents = 0;
    const orderItems = [];
    for (const row of items) {
      const listingId = row.listingId || row.listing;
      const qty = Math.max(1, Math.floor(Number(row.quantity)) || 1);
      if (!listingId) continue;
      const listing = await Listing.findById(listingId).lean();
      if (!listing || listing.inventory?.status !== "active") {
        return res.status(400).json({ ok: false, message: `Product no longer available: ${row.title || listingId}` });
      }
      const priceCents = Number(listing.pricing?.priceCents) || 0;
      if (priceCents <= 0) continue;
      orderItems.push({
        listing: listing._id,
        vendorId: listing.vendor,
        title: listing.title || row.title || "Item",
        slug: listing.seo?.slug || "",
        priceCents,
        quantity: qty,
        currency: listing.pricing?.currency || "AUD",
      });
      subtotalCents += priceCents * qty;
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ ok: false, message: "No valid items" });
    }

    let discountCents = 0;
    const codeToUse = (couponCode && String(couponCode).trim()) || "";
    if (codeToUse) {
      const result = await computeCouponDiscount(codeToUse, orderItems);
      if (result.error) return res.status(400).json({ ok: false, message: result.error });
      discountCents = Math.min(result.discountCents, subtotalCents);
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);

    const orderNumber = getOrderNumber();
    const estimatedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const itemsToSave = orderItems.map(({ vendorId: _v, ...rest }) => rest);

    const order = await Order.create({
      orderNumber,
      customer: customerId,
      items: itemsToSave,
      totalCents,
      discountCents: discountCents || 0,
      couponCode: codeToUse,
      currency: orderItems[0]?.currency || "AUD",
      status: "processing",
      shipping: {
        fullName: shipping.fullName || "",
        line1: shipping.line1 || "",
        line2: shipping.line2 || "",
        city: shipping.city || "",
        state: shipping.state || "",
        postcode: shipping.postcode || "",
        country: shipping.country || "AU",
        phone: shipping.phone || "",
      },
      estimatedDelivery,
      notes: shipping.notes || "",
    });

    const populated = await Order.findById(order._id).populate("customer", "email firstName lastName").lean();

    // Send order confirmation email
    try {
      const to = populated.customer?.email || req.user?.email;
      if (to) {
        const itemsList = orderItems.map((i) => `  • ${i.title} × ${i.quantity} — ${(i.priceCents * i.quantity / 100).toFixed(2)} ${i.currency}`).join("\n");
        const discountLine = discountCents > 0 ? `\nDiscount (${codeToUse}): -${(discountCents / 100).toFixed(2)} AUD\n` : "";
        await sendMail({
          to,
          subject: `Order confirmed: ${orderNumber}`,
          text: `Your order ${orderNumber} has been placed.\n\nItems:\n${itemsList}\n\nSubtotal: ${(subtotalCents / 100).toFixed(2)} AUD${discountLine}\nTotal: ${(totalCents / 100).toFixed(2)} AUD\nEstimated delivery: ${estimatedDelivery.toLocaleDateString()}\n\nThank you for shopping with Artisan Avenue!`,
          html: `
            <p>Your order <strong>${orderNumber}</strong> has been placed.</p>
            <h3>Items</h3>
            <ul>${orderItems.map((i) => `<li>${i.title} × ${i.quantity} — ${(i.priceCents * i.quantity / 100).toFixed(2)} ${i.currency}</li>`).join("")}</ul>
            <p><strong>Subtotal:</strong> ${(subtotalCents / 100).toFixed(2)} AUD</p>
            ${discountCents > 0 ? `<p><strong>Discount (${codeToUse}):</strong> -${(discountCents / 100).toFixed(2)} AUD</p>` : ""}
            <p><strong>Total:</strong> ${(totalCents / 100).toFixed(2)} AUD</p>
            <p><strong>Estimated delivery:</strong> ${estimatedDelivery.toLocaleDateString()}</p>
            <p>Thank you for shopping with Artisan Avenue!</p>
          `,
        });
      }
    } catch (e) {
      console.warn("[orders] Confirmation email failed:", e?.message || e);
    }

    return res.status(201).json({
      ok: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalCents: order.totalCents,
        estimatedDelivery: order.estimatedDelivery,
        items: orderItems,
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/orders — list my orders (customer)
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    if (!customerId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const orders = await Order.find({ customer: customerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ ok: true, data: { orders } });
  } catch (e) {
    next(e);
  }
});

// GET /api/orders/:id — single order (owner only)
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id;
    const order = await Order.findOne({ _id: req.params.id, customer: customerId }).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    return res.json({ ok: true, data: order });
  } catch (e) {
    next(e);
  }
});

export default router;
