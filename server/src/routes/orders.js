import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Listing from "../models/Listing.js";
import Promotion from "../models/Promotion.js";
import VendorProfile from "../models/VendorProfile.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendMail } from "../utils/email.js";
import User from "../models/User.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import { chargePayment } from "../utils/payment-gateway.js";

const router = Router();

function getOrderNumber() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AA-${t}-${r}`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function moneyLine(cents, currency = "AUD") {
  const n = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "AUD" }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency || "AUD"}`;
  }
}

function listingOwnerId(it) {
  const v = it?.vendorId;
  if (v == null) return "";
  if (typeof v === "object" && v.toString) return String(v.toString());
  return String(v);
}

/**
 * Notify vendors by email when a *new* order is placed (order creation only — not status updates).
 * Each seller gets one email: their line items (with prices), customer contact + shipping, order ID.
 * Uses User.email, or VendorProfile.contactEmail when login email is empty.
 */
async function sendVendorNewOrderEmails({
  orderNumber,
  orderItems,
  customerName,
  customerEmail,
  shipping,
  estimatedDelivery,
}) {
  const idStrs = [...new Set((orderItems || []).map((it) => listingOwnerId(it)).filter(Boolean))];
  const vendorObjectIds = idStrs.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (vendorObjectIds.length === 0) {
    console.warn("[orders] New order: no vendor ids on line items; skipping vendor notify");
    return;
  }

  const users = await User.find({ _id: { $in: vendorObjectIds } }).select("_id email firstName role").lean();
  if (users.length === 0) {
    console.warn("[orders] New order: no User documents for vendor ids", idStrs);
    return;
  }

  const profiles = await VendorProfile.find({ user: { $in: vendorObjectIds } }).select("user contactEmail").lean();
  const contactByUser = new Map(profiles.map((p) => [String(p.user), String(p.contactEmail || "").trim()]));

  const displayCustomer = String(customerName || "").trim() || "Customer";
  const displayEmail = String(customerEmail || "").trim();
  const ship = shipping && typeof shipping === "object" ? shipping : {};
  const shipName = String(ship.fullName || "").trim();
  const shipPhone = String(ship.phone || "").trim();
  const addressParts = [ship.line1, ship.line2, ship.city, ship.state, ship.postcode, ship.country].filter(Boolean);
  const addressBlock = addressParts.length ? addressParts.join(", ") : "—";
  const deliveryStr = estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : "—";

  const safeOrder = escapeHtml(orderNumber);
  const safeCustomer = escapeHtml(displayCustomer);
  const safeEmail = escapeHtml(displayEmail);
  const safeShipName = escapeHtml(shipName);
  const safePhone = escapeHtml(shipPhone);
  const safeAddress = escapeHtml(addressBlock);

  for (const v of users) {
    const vid = String(v._id);
    const loginEmail = String(v.email || "").trim();
    const profileEmail = contactByUser.get(vid) || "";
    const to = loginEmail || profileEmail;
    if (!to) {
      console.warn("[orders] New order: vendor has no User.email and no VendorProfile.contactEmail", vid);
      continue;
    }
    if (v.role !== "vendor") {
      console.warn("[orders] New order: listing owner is not role=vendor; emailing anyway", vid, v.role);
    }

    const myItems = (orderItems || []).filter((it) => listingOwnerId(it) === vid);
    const vendorSubtotalCents = myItems.reduce((s, i) => s + (Number(i.priceCents) || 0) * (Math.max(1, Number(i.quantity) || 1)), 0);
    const primaryCurrency = myItems[0]?.currency || "AUD";

    const itemsText = myItems
      .map((i) => {
        const cur = i.currency || primaryCurrency;
        const line = (Number(i.priceCents) || 0) * (Math.max(1, Number(i.quantity) || 1));
        return `  • ${i.title} × ${i.quantity} — ${moneyLine(i.priceCents, cur)} each, line ${moneyLine(line, cur)}`;
      })
      .join("\n");

    const itemsHtmlRows = myItems
      .map((i) => {
        const cur = i.currency || primaryCurrency;
        const line = (Number(i.priceCents) || 0) * (Math.max(1, Number(i.quantity) || 1));
        return `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;">${escapeHtml(i.title)}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:center;">${i.quantity}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${escapeHtml(moneyLine(i.priceCents, cur))}</td><td style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">${escapeHtml(moneyLine(line, cur))}</td></tr>`;
      })
      .join("");

    const customerText = [
      `Customer name: ${displayCustomer}`,
      displayEmail ? `Account email: ${displayEmail}` : null,
      shipName && shipName !== displayCustomer ? `Ship to name: ${shipName}` : null,
      shipPhone ? `Phone: ${shipPhone}` : null,
      `Shipping address: ${addressBlock}`,
      `Estimated delivery: ${deliveryStr}`,
    ]
      .filter(Boolean)
      .join("\n");

    const text = `You have a new order to fulfil — please open your vendor dashboard to accept or reject.

Order ID: ${orderNumber}

——— Customer details ———
${customerText}

——— Items from your store on this order ———
${itemsText || "  (no line items matched)"}

Your subtotal (your items only): ${moneyLine(vendorSubtotalCents, primaryCurrency)}

The customer has already completed checkout for the full order. Coordinate shipping using the details above.`;

    const html = `
        <p>You have a <strong>new order</strong> to fulfil. Open your <strong>vendor dashboard</strong> to accept or reject.</p>
        <p><strong>Order ID:</strong> ${safeOrder}</p>
        <h3 style="margin:16px 0 8px;font-size:14px;">Customer details</h3>
        <table style="border-collapse:collapse;width:100%;max-width:520px;margin-bottom:16px;font-size:14px;">
          <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;width:140px;">Name</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeCustomer}</td></tr>
          ${displayEmail ? `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Email</td><td style="padding:6px 8px;border:1px solid #e5e7eb;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>` : ""}
          ${shipName && shipName !== displayCustomer ? `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Ship to</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeShipName}</td></tr>` : ""}
          ${shipPhone ? `<tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Phone</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safePhone}</td></tr>` : ""}
          <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;vertical-align:top;">Address</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${safeAddress}</td></tr>
          <tr><td style="padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Est. delivery</td><td style="padding:6px 8px;border:1px solid #e5e7eb;">${escapeHtml(deliveryStr)}</td></tr>
        </table>
        <h3 style="margin:16px 0 8px;font-size:14px;">Your products on this order</h3>
        <table style="border-collapse:collapse;width:100%;max-width:520px;margin-bottom:12px;font-size:14px;">
          <thead><tr style="background:#f3f4f6;"><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:left;">Item</th><th style="padding:6px 8px;border:1px solid #e5e7eb;">Qty</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">Unit</th><th style="padding:6px 8px;border:1px solid #e5e7eb;text-align:right;">Line</th></tr></thead>
          <tbody>${itemsHtmlRows || `<tr><td colspan="4" style="padding:8px;border:1px solid #e5e7eb;">No items</td></tr>`}</tbody>
        </table>
        <p><strong>Your subtotal (your items only):</strong> ${escapeHtml(moneyLine(vendorSubtotalCents, primaryCurrency))}</p>
        <p style="color:#6b7280;font-size:13px;">This email is sent when a new order is placed. The order may include items from other sellers; only your lines are listed above.</p>
      `;

    try {
      const sent = await sendMail({
        to,
        subject: `New order ${orderNumber} — ${displayCustomer} — action needed`,
        text,
        html,
      });
      if (!sent) console.warn("[orders] New order vendor email not sent (mail unavailable):", to);
    } catch (e) {
      console.warn("[orders] Vendor new-order email failed:", to, e?.message || e);
    }
  }
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
router.post(
  "/",
  requireAuth,
  validate({
    body: [
      (b = {}) => (Array.isArray(b.items) && b.items.length > 0 ? null : "Cart is empty"),
      (b = {}) => {
        const shipping = b.shipping || {};
        return typeof shipping.fullName === "string" && shipping.fullName.trim() ? null : "shipping.fullName is required";
      },
      (b = {}) => {
        const shipping = b.shipping || {};
        return typeof shipping.line1 === "string" && shipping.line1.trim() ? null : "shipping.line1 is required";
      },
      (b = {}) => {
        const shipping = b.shipping || {};
        return typeof shipping.city === "string" && shipping.city.trim() ? null : "shipping.city is required";
      },
      (b = {}) => {
        const shipping = b.shipping || {};
        return typeof shipping.postcode === "string" && shipping.postcode.trim() ? null : "shipping.postcode is required";
      },
      (b = {}) => {
        const p = b.payment || {};
        return typeof p.cardName === "string" && p.cardName.trim() ? null : "payment.cardName is required";
      },
      (b = {}) => {
        const p = b.payment || {};
        return typeof p.cardNumber === "string" && p.cardNumber.trim() ? null : "payment.cardNumber is required";
      },
      (b = {}) => {
        const p = b.payment || {};
        return typeof p.expiry === "string" && p.expiry.trim() ? null : "payment.expiry is required";
      },
      (b = {}) => {
        const p = b.payment || {};
        return typeof p.cvc === "string" && p.cvc.trim() ? null : "payment.cvc is required";
      },
    ],
  }),
  async (req, res, next) => {
  try {
    if (req.user?.role === "vendor") {
      return res.status(403).json({
        ok: false,
        message: "Vendor accounts cannot place orders. Please use a customer account to purchase.",
      });
    }
    const customerId = req.user?.id || req.user?._id;
    if (!customerId) return res.status(401).json({ ok: false, message: "Unauthorized" });

    const { items = [], shipping = {}, couponCode, payment = {} } = req.body || {};
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
    const paymentAttempt = await chargePayment({
      amountCents: totalCents,
      currency: orderItems[0]?.currency || "AUD",
      payment,
    });
    if (!paymentAttempt.ok) {
      await PaymentTransaction.create({
        order: null,
        customer: customerId,
        amountCents: totalCents,
        currency: orderItems[0]?.currency || "AUD",
        status: "failed",
        gatewayReference: "",
        refundStatus: "none",
        refundReason: paymentAttempt.message || "Payment failed",
      }).catch(() => null);
      return res.status(402).json({ ok: false, message: paymentAttempt.message || "Payment failed" });
    }

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
      status: "new",
      isNewForVendor: true,
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
      statusHistory: [{ from: "", to: "new", actorRole: "system", note: "Order placed" }],
    });

    const populated = await Order.findById(order._id).populate("customer", "email firstName lastName").lean();
    const cust = populated?.customer;
    const customerName =
      [cust?.firstName, cust?.lastName].filter(Boolean).join(" ").trim() ||
      String(shipping?.fullName || "").trim() ||
      cust?.email ||
      [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" ").trim() ||
      req.user?.email ||
      "Customer";

    await PaymentTransaction.create({
      order: order._id,
      customer: customerId,
      amountCents: totalCents,
      currency: order.currency || "AUD",
      status: "paid",
      gatewayReference: paymentAttempt?.data?.gatewayReference || order.orderNumber,
      refundStatus: "none",
    });

    // Send order confirmation email to customer
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

    // Send "new order" notifications to involved vendors
    try {
      await sendVendorNewOrderEmails({
        orderNumber,
        orderItems,
        customerName,
        customerEmail: populated?.customer?.email || req.user?.email || "",
        shipping: order.shipping || {},
        estimatedDelivery: order.estimatedDelivery,
      });
    } catch (e) {
      console.warn("[orders] Vendor notification email failed:", e?.message || e);
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
  }
);

async function vendorEmailsForOrder(order) {
  const ids = [...new Set((order.items || []).map((it) => it.listing).filter(Boolean))];
  const listings = await Listing.find({ _id: { $in: ids } }).select("vendor").lean();
  const vendorObjectIds = [...new Set(listings.map((l) => l.vendor).filter(Boolean))];
  if (vendorObjectIds.length === 0) return [];
  const users = await User.find({ _id: { $in: vendorObjectIds } }).select("_id email").lean();
  const profiles = await VendorProfile.find({ user: { $in: vendorObjectIds } }).select("user contactEmail").lean();
  const contactByUser = new Map(profiles.map((p) => [String(p.user), String(p.contactEmail || "").trim()]));
  const out = [];
  for (const u of users) {
    const to = String(u.email || "").trim() || contactByUser.get(String(u._id)) || "";
    if (to) out.push(to);
  }
  return [...new Set(out)];
}

// POST /api/orders/:id/messages — customer message to vendor(s) on thread
router.post("/:id/messages", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({ ok: false, message: "Only customers can post here" });
    }
    const customerId = req.user.id || req.user._id;
    const { id } = req.params;
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, message: "Message is required" });
    const order = await Order.findOne({ _id: id, customer: customerId });
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    order.messages = Array.isArray(order.messages) ? order.messages : [];
    order.messages.push({
      fromRole: "customer",
      fromUser: customerId,
      text,
      sentAt: new Date(),
    });
    await order.save();

    const emails = await vendorEmailsForOrder(order);
    for (const to of emails) {
      await sendMail({
        to,
        subject: `Customer message — order ${order.orderNumber}`,
        text: `The customer sent a message on order ${order.orderNumber}:\n\n${text}`,
        html: `<p>The customer sent a message on order <strong>${order.orderNumber}</strong>:</p><p>${text}</p>`,
      }).catch(() => null);
    }

    return res.status(201).json({ ok: true, message: "Message sent" });
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
