import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import { sendMail } from "../utils/email.js";

const router = Router();
const ORDER_STATUSES = ["new", "accepted", "rejected", "in_progress", "completed", "cancelled"];

const statusAlias = {
  processing: "in_progress",
  shipped: "in_progress",
  delivered: "completed",
};

function canonicalStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return statusAlias[s] || s || "new";
}

function prettyStatus(status) {
  return canonicalStatus(status).replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function simplePdfBuffer(title, lines = []) {
  const toPdfText = (v) =>
    String(v ?? "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  const allLines = [title, "", ...lines].slice(0, 55);
  const drawOps = ["BT", "/F1 11 Tf", "50 770 Td"];
  for (let i = 0; i < allLines.length; i += 1) {
    if (i > 0) drawOps.push("0 -14 Td");
    drawOps.push(`(${toPdfText(allLines[i])}) Tj`);
  }
  drawOps.push("ET");
  const stream = drawOps.join("\n");
  const streamLength = Buffer.byteLength(stream, "binary");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${streamLength} >> stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

async function vendorOwnsOrder(vendorId, orderId) {
  const vendorObjId = new mongoose.Types.ObjectId(vendorId);
  const orderObjId = new mongoose.Types.ObjectId(orderId);
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
  return owned.length > 0;
}

// GET /api/vendor/summary
router.get("/summary", requireAuth, async (req, res, next) => {
  try {
    const vendor = req.user._id || req.user.id;
    const active = await Listing.countDocuments({ vendor, "inventory.status": "active" });
    res.json({ ok: true, revenueToday: 0, orders: 0, conversion: 0, aov: 0, listingsActive: active });
  } catch (e) { next(e); }
});

// GET /api/vendor/notifications/summary — sidebar badges (orders / messages / issues)
router.get("/notifications/summary", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") {
      return res.status(403).json({ ok: false, message: "Vendor access only" });
    }
    const vendorId = req.user?._id || req.user?.id;
    if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    }
    const vendorObjId = new mongoose.Types.ObjectId(vendorId);

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
      {
        $group: {
          _id: "$_id",
          status: { $first: "$status" },
          messages: { $first: "$messages" },
          issues: { $first: "$issues" },
        },
      },
    ];
    const rows = await Order.aggregate(pipeline);

    let newOrders = 0;
    let awaitingReply = 0;
    let openIssues = 0;
    const attentionOrderIds = new Set();

    for (const r of rows) {
      const st = canonicalStatus(r.status);
      if (st === "new") newOrders += 1;

      const msgs = Array.isArray(r.messages) ? r.messages : [];
      if (msgs.length > 0) {
        const sorted = [...msgs].sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
        const last = sorted[sorted.length - 1];
        if (last && (last.fromRole === "customer" || last.fromRole === "system")) {
          awaitingReply += 1;
        }
      }

      const issues = Array.isArray(r.issues) ? r.issues : [];
      openIssues += issues.filter((i) => i.status === "open").length;

      let needs = false;
      if (st === "new") needs = true;
      if (msgs.length > 0) {
        const sorted = [...msgs].sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));
        const last = sorted[sorted.length - 1];
        if (last && (last.fromRole === "customer" || last.fromRole === "system")) needs = true;
      }
      if (issues.some((i) => i.status === "open")) needs = true;
      if (needs) attentionOrderIds.add(String(r._id));
    }

    return res.json({
      ok: true,
      data: {
        newOrders,
        awaitingReply,
        openIssues,
        ordersNeedingAttention: attentionOrderIds.size,
      },
    });
  } catch (e) {
    next(e);
  }
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

// GET /api/vendor/orders?page=1&limit=20&status=new&q=AA-...&sortBy=date|status
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
    const status = canonicalStatus(req.query.status);
    const sortBy = String(req.query.sortBy || "date").trim().toLowerCase();
    const sortDir = String(req.query.sortDir || "desc").trim().toLowerCase() === "asc" ? "asc" : "desc";
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

    if (req.query.status) {
      pipeline.push({ $match: { status: { $in: ORDER_STATUSES.concat(["processing", "shipped", "delivered"]) } } });
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
          statusHistory: { $first: "$statusHistory" },
          messages: { $first: "$messages" },
          issues: { $first: "$issues" },
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
      const mappedStatus = canonicalStatus(r.status);
      return {
        _id: r._id,
        code: r.orderNumber,
        status: mappedStatus,
        placedAt: r.createdAt,
        isNew: mappedStatus === "new",
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
        statusHistory: Array.isArray(r.statusHistory) ? r.statusHistory : [],
        messages: Array.isArray(r.messages) ? r.messages : [],
        issues: Array.isArray(r.issues) ? r.issues : [],
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

    if (req.query.status) items = items.filter((o) => o.status === status);

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
        if (o.status === "completed") {
          acc.completedOrders += 1;
          acc.completedRevenueCents += Number(o.vendorTotalCents || 0);
        }
        return acc;
      },
      {
        totalOrders: 0,
        totalUnits: 0,
        revenueCents: 0,
        completedOrders: 0,
        completedRevenueCents: 0,
        statusBreakdown: {
          new: 0,
          accepted: 0,
          rejected: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        },
      }
    );

    items.sort((a, b) => {
      if (sortBy === "status") {
        const order = { new: 1, accepted: 2, in_progress: 3, completed: 4, rejected: 5, cancelled: 6 };
        const cmp = (order[a.status] || 99) - (order[b.status] || 99);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = new Date(a.placedAt || 0).getTime() - new Date(b.placedAt || 0).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

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
    const nextStatus = canonicalStatus(req.body?.status);
    const allowed = ORDER_STATUSES;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ ok: false, message: "Invalid order id" });
    }
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const owned = await vendorOwnsOrder(vendorId, id);
    if (!owned) {
      return res.status(404).json({ ok: false, message: "Order not found for this vendor" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });

    const current = canonicalStatus(order.status);
    const transitions = {
      new: ["accepted", "rejected"],
      accepted: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      rejected: [],
      cancelled: [],
    };
    if (!transitions[current]?.includes(nextStatus)) {
      return res.status(400).json({
        ok: false,
        message: `Invalid transition from ${prettyStatus(current)} to ${prettyStatus(nextStatus)}`,
      });
    }

    order.isNewForVendor = false;
    if (["accepted", "rejected"].includes(nextStatus)) {
      order.vendorDecisionAt = new Date();
    }
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      from: current,
      to: nextStatus,
      actorRole: "vendor",
      actor: req.user?._id || req.user?.id,
      note: `Vendor changed order to ${prettyStatus(nextStatus)}`,
    });
    order.status = nextStatus;
    await order.save();

    const customer = await User.findById(order.customer).select("email firstName").lean();
    if (customer?.email) {
      const first = String(customer.firstName || "").trim();
      const greet = first ? `Hi ${first},` : "Hi,";
      let subject = `Order update: ${order.orderNumber}`;
      let text = `${greet}\n\nYour order ${order.orderNumber} is now ${prettyStatus(nextStatus)}.\n\nYou can view details and messages anytime in your account under My orders.\n`;
      let html = `<p>${greet}</p><p>Your order <strong>${order.orderNumber}</strong> is now <strong>${prettyStatus(nextStatus)}</strong>.</p><p>You can view details and messages anytime in your account under <strong>My orders</strong>.</p>`;

      if (nextStatus === "accepted") {
        subject = `Your order ${order.orderNumber} was accepted`;
        text = `${greet}\n\nGood news — a vendor has accepted your order ${order.orderNumber}. They will prepare your items next.\n\nWe’ll email you again when the status changes.\n`;
        html = `<p>${greet}</p><p>Good news — a vendor has <strong>accepted</strong> your order <strong>${order.orderNumber}</strong>. They will prepare your items next.</p><p>We’ll email you again when the status changes.</p>`;
      } else if (nextStatus === "rejected") {
        subject = `Your order ${order.orderNumber} could not be fulfilled`;
        text = `${greet}\n\nA vendor has declined order ${order.orderNumber}. You will not be charged for items from this seller, or any refund will follow your payment provider’s timing.\n\nOpen My orders in your account for the latest status.\n`;
        html = `<p>${greet}</p><p>A vendor has <strong>declined</strong> order <strong>${order.orderNumber}</strong>. You will not be charged for items from this seller, or any refund will follow your payment provider’s timing.</p><p>Open <strong>My orders</strong> in your account for the latest status.</p>`;
      }

      try {
        await sendMail({ to: customer.email, subject, text, html });
      } catch (mailErr) {
        console.warn("[vendor-misc] Customer notify mail:", mailErr?.message || mailErr);
      }
    }

    return res.json({ ok: true, data: { _id: order._id, status: order.status, statusLabel: prettyStatus(order.status) } });
  } catch (e) {
    next(e);
  }
});

// POST /api/vendor/orders/:id/messages
router.post("/orders/:id/messages", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") return res.status(403).json({ ok: false, message: "Vendor access only" });
    const { id } = req.params;
    const text = String(req.body?.text || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    if (!text) return res.status(400).json({ ok: false, message: "Message is required" });

    const owned = await vendorOwnsOrder(req.user?._id || req.user?.id, id);
    if (!owned) return res.status(404).json({ ok: false, message: "Order not found for this vendor" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    order.messages = Array.isArray(order.messages) ? order.messages : [];
    const msg = {
      fromRole: "vendor",
      fromUser: req.user?._id || req.user?.id,
      text,
      sentAt: new Date(),
    };
    order.messages.push(msg);
    await order.save();

    const customer = await User.findById(order.customer).select("email firstName").lean();
    let deliveredNote = "Message saved on the order.";
    if (customer?.email) {
      const first = String(customer.firstName || "").trim();
      const greet = first ? `Hi ${first},` : "Hi,";
      const subject = `Message from your seller — order ${order.orderNumber}`;
      const textBody = `${greet}\n\nA vendor sent you a message about order ${order.orderNumber}:\n\n${text}\n\nOpen My orders in your Artisan Avenue account to read the full thread and reply.\n`;
      const htmlBody = `<p>${escapeHtml(greet)}</p><p>A vendor sent you a message about order <strong>${escapeHtml(order.orderNumber)}</strong>:</p><p style="white-space:pre-wrap">${escapeHtml(text)}</p><p>Open <strong>My orders</strong> in your Artisan Avenue account to read the full thread and reply.</p>`;
      try {
        const sent = await sendMail({
          to: customer.email,
          subject,
          text: textBody,
          html: htmlBody,
        });
        deliveredNote = sent ? "Message sent — the customer was emailed and can reply from My orders." : "Message saved on the order; email could not be sent (check mail configuration).";
      } catch (mailErr) {
        console.warn("[vendor-misc] Vendor message mail:", mailErr?.message || mailErr);
        deliveredNote = "Message saved on the order; email delivery failed.";
      }
    } else {
      console.warn("[vendor-misc] Vendor order message: customer has no email", order.customer);
      deliveredNote = "Message saved on the order; this customer has no email on file.";
    }

    return res.status(201).json({ ok: true, data: msg, message: deliveredNote });
  } catch (e) {
    next(e);
  }
});

// POST /api/vendor/orders/:id/issues
router.post("/orders/:id/issues", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") return res.status(403).json({ ok: false, message: "Vendor access only" });
    const { id } = req.params;
    const description = String(req.body?.description || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    if (!description) return res.status(400).json({ ok: false, message: "Issue description is required" });

    const owned = await vendorOwnsOrder(req.user?._id || req.user?.id, id);
    if (!owned) return res.status(404).json({ ok: false, message: "Order not found for this vendor" });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    order.issues = Array.isArray(order.issues) ? order.issues : [];
    const issue = {
      vendor: req.user?._id || req.user?.id,
      description,
      status: "open",
      createdAt: new Date(),
    };
    order.issues.push(issue);
    await order.save();
    return res.status(201).json({ ok: true, data: issue, message: "Issue submitted for admin review" });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendor/issues?status=open|in_review|resolved
router.get("/issues", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") return res.status(403).json({ ok: false, message: "Vendor access only" });
    const vendorId = req.user?._id || req.user?.id;
    const wantedStatus = String(req.query.status || "").trim();
    const match = { "issues.vendor": new mongoose.Types.ObjectId(vendorId) };
    if (wantedStatus) match["issues.status"] = wantedStatus;

    const rows = await Order.aggregate([
      { $match: match },
      { $unwind: "$issues" },
      { $match: { "issues.vendor": new mongoose.Types.ObjectId(vendorId) } },
      ...(wantedStatus ? [{ $match: { "issues.status": wantedStatus } }] : []),
      {
        $project: {
          _id: "$issues._id",
          orderId: "$_id",
          orderNumber: "$orderNumber",
          issueStatus: "$issues.status",
          description: "$issues.description",
          createdAt: "$issues.createdAt",
          orderStatus: "$status",
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    return res.json({ ok: true, data: { issues: rows } });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendor/analytics?from=2026-01-01&to=2026-12-31
router.get("/analytics", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") return res.status(403).json({ ok: false, message: "Vendor access only" });
    const vendorId = req.user?._id || req.user?.id;
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
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
      { $match: { "listingDoc.vendor": new mongoose.Types.ObjectId(vendorId) } },
      {
        $project: {
          status: 1,
          createdAt: 1,
          title: "$items.title",
          quantity: "$items.quantity",
          lineTotalCents: { $multiply: [{ $ifNull: ["$items.priceCents", 0] }, { $ifNull: ["$items.quantity", 0] }] },
        },
      },
    ]);

    const monthly = {};
    const productMap = {};
    let totalRevenueCents = 0;
    let completedOrders = 0;
    const completedOrderIds = new Set();

    for (const r of rows) {
      const month = new Date(r.createdAt).toISOString().slice(0, 7);
      if (!monthly[month]) monthly[month] = { month, revenueCents: 0, units: 0 };
      monthly[month].revenueCents += Number(r.lineTotalCents || 0);
      monthly[month].units += Number(r.quantity || 0);
      totalRevenueCents += Number(r.lineTotalCents || 0);
      if (canonicalStatus(r.status) === "completed") completedOrderIds.add(String(r._id || ""));
      const k = String(r.title || "Item");
      if (!productMap[k]) productMap[k] = { title: k, units: 0, revenueCents: 0 };
      productMap[k].units += Number(r.quantity || 0);
      productMap[k].revenueCents += Number(r.lineTotalCents || 0);
    }
    completedOrders = completedOrderIds.size;
    const estimatedProfitCents = Math.round(totalRevenueCents * 0.35);
    const bestSellers = Object.values(productMap).sort((a, b) => b.units - a.units).slice(0, 5);
    const monthlySales = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));

    return res.json({
      ok: true,
      data: {
        totalRevenueCents,
        completedOrders,
        estimatedProfitCents,
        monthlySales,
        bestSellers,
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/vendor/reports/export?format=csv|pdf&from=...&to=...
router.get("/reports/export", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "vendor") return res.status(403).json({ ok: false, message: "Vendor access only" });
    const vendorId = req.user?._id || req.user?.id;
    const format = String(req.query.format || "csv").toLowerCase();
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const rows = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
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
      { $match: { "listingDoc.vendor": new mongoose.Types.ObjectId(vendorId) } },
      {
        $project: {
          orderNumber: 1,
          createdAt: 1,
          status: 1,
          title: "$items.title",
          quantity: "$items.quantity",
          priceCents: "$items.priceCents",
          lineTotalCents: { $multiply: [{ $ifNull: ["$items.priceCents", 0] }, { $ifNull: ["$items.quantity", 0] }] },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    if (format === "pdf") {
      const lines = rows.slice(0, 150).map(
        (r) =>
          `${r.orderNumber} | ${new Date(r.createdAt).toLocaleDateString()} | ${prettyStatus(r.status)} | ${r.title} x${r.quantity} | ${(Number(r.lineTotalCents || 0) / 100).toFixed(2)} AUD`
      );
      const pdf = simplePdfBuffer("Vendor Sales Report", lines);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="sales-report-${Date.now()}.pdf"`);
      return res.send(pdf);
    }

    const header = ["order_id", "date", "status", "product", "quantity", "unit_price_aud", "line_total_aud"];
    const body = rows.map((r) =>
      [
        r.orderNumber,
        new Date(r.createdAt).toISOString(),
        canonicalStatus(r.status),
        r.title,
        Number(r.quantity || 0),
        (Number(r.priceCents || 0) / 100).toFixed(2),
        (Number(r.lineTotalCents || 0) / 100).toFixed(2),
      ]
        .map(escapeCsv)
        .join(",")
    );
    const csv = [header.join(","), ...body].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="sales-report-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (e) {
    next(e);
  }
});

export default router;
