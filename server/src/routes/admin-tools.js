import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import User from "../models/User.js";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import AbuseReport from "../models/AbuseReport.js";
import ContactMessage from "../models/ContactMessage.js";
import Category from "../models/Category.js";
import Brand from "../models/Brand.js";
import Review from "../models/Review.js";
import Promotion from "../models/Promotion.js";
import PlatformSetting from "../models/PlatformSetting.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import VendorProfile from "../models/VendorProfile.js";
import { sendMail } from "../utils/email.js";
import { notifyContactResolved } from "./contact-messages.js";

const router = Router();

function requireAdmin(req, res, next) {
  if (req?.user?.role !== "admin") {
    return res.status(403).json({ ok: false, message: "Admin access only" });
  }
  next();
}

function escapeCsv(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Missing / null isActive is treated as active (same as User schema default: true). */
function explicitIsActive(doc) {
  if (!doc || typeof doc !== "object") return doc;
  return { ...doc, isActive: doc.isActive !== false };
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
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "binary");
}

router.use(requireAuth, requireAdmin);

/** Counts for admin sidebar notification dots */
router.get("/notifications/summary", async (_req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [
      pendingListings,
      contactMessagesNew,
      abuseReportsNew,
      unverifiedCustomers,
      unverifiedVendors,
      ordersNew,
      openOrderIssues,
      recentVendorOrderMessages,
    ] = await Promise.all([
      Listing.countDocuments({ "moderation.status": "pending" }),
      ContactMessage.countDocuments({ status: "new" }),
      AbuseReport.countDocuments({ status: "new" }),
      User.countDocuments({ role: "customer", isVerified: false }),
      User.countDocuments({ role: "vendor", isVerified: false }),
      Order.countDocuments({
        status: "new",
        $or: [{ "adminMeta.newOrderSeenAt": null }, { "adminMeta.newOrderSeenAt": { $exists: false } }],
      }),
      Order.countDocuments({ "issues.status": "open" }),
      Order.countDocuments({
        messages: { $elemMatch: { fromRole: "vendor", sentAt: { $gte: weekAgo } } },
      }),
    ]);
    return res.json({
      ok: true,
      data: {
        pendingListings,
        contactMessagesNew,
        abuseReportsNew,
        unverifiedCustomers,
        unverifiedVendors,
        ordersNew,
        openOrderIssues,
        recentVendorOrderMessages,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/dashboard", async (req, res, next) => {
  try {
    const [
      totalCustomers,
      totalVendors,
      totalAdmins,
      totalOrders,
      totalListings,
      activeListings,
      pendingListings,
      revenueArr,
    ] = await Promise.all([
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "vendor" }),
      User.countDocuments({ role: "admin" }),
      Order.countDocuments({}),
      Listing.countDocuments({}),
      Listing.countDocuments({
        "inventory.status": "active",
        archivedAt: { $in: [null, undefined] },
      }),
      Listing.countDocuments({ "moderation.status": "pending" }),
      Order.aggregate([{ $group: { _id: null, totalCents: { $sum: "$totalCents" } } }]),
    ]);

    const platformRevenueCents = Number(revenueArr[0]?.totalCents || 0);

    /** New customers + vendors per month (excludes admin accounts) */
    const monthlyUserGrowth = await User.aggregate([
      { $match: { role: { $in: ["customer", "vendor"] } } },
      {
        $group: {
          _id: { $substr: ["$createdAt", 0, 7] },
          customers: { $sum: { $cond: [{ $eq: ["$role", "customer"] }, 1, 0] } },
          vendors: { $sum: { $cond: [{ $eq: ["$role", "vendor"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: "$_id",
          customers: 1,
          vendors: 1,
          count: { $add: ["$customers", "$vendors"] },
        },
      },
    ]);

    const monthlyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $substr: ["$createdAt", 0, 7] },
          count: { $sum: 1 },
          revenueCents: { $sum: "$totalCents" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", count: 1, revenueCents: 1 } },
    ]);

    const monthlyListings = await Listing.aggregate([
      { $group: { _id: { $substr: ["$createdAt", 0, 7] }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, month: "$_id", count: 1 } },
    ]);

    return res.json({
      ok: true,
      data: {
        counters: {
          totalCustomers,
          totalVendors,
          totalAdmins,
          totalMembers: totalCustomers + totalVendors + totalAdmins,
          totalOrders,
          totalListings,
          activeListings,
          pendingListings,
          platformRevenueCents,
        },
        trends: {
          monthlyUserGrowth,
          monthlyOrders,
          monthlyListings,
        },
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/listings/pending", async (req, res, next) => {
  try {
    const items = await Listing.find({ "moderation.status": "pending" })
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate("vendor", "firstName lastName email")
      .lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.patch("/listings/:id/moderate", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid listing id" });
    const decision = String(req.body?.decision || "").trim().toLowerCase();
    const note = String(req.body?.note || "").trim();
    if (!["approve", "reject"].includes(decision)) return res.status(400).json({ ok: false, message: "decision must be approve or reject" });

    const listing = await Listing.findById(id).populate("vendor", "email firstName").exec();
    if (!listing) return res.status(404).json({ ok: false, message: "Listing not found" });

    listing.moderation = listing.moderation || {};
    listing.moderation.status = decision === "approve" ? "approved" : "rejected";
    listing.moderation.reviewedAt = new Date();
    listing.moderation.reviewedBy = req.user.id;
    listing.moderation.reviewNote = note;
    if (decision === "reject") listing.inventory.status = "draft";
    await listing.save();

    if (listing.vendor?.email) {
      await sendMail({
        to: listing.vendor.email,
        subject: `Listing ${decision === "approve" ? "approved" : "rejected"}: ${listing.title}`,
        text: `Your listing "${listing.title}" has been ${decision}d by admin.${note ? `\n\nNote: ${note}` : ""}`,
        html: `<p>Your listing "<strong>${listing.title}</strong>" has been <strong>${decision}d</strong> by admin.</p>${note ? `<p>Note: ${note}</p>` : ""}`,
      });
    }

    return res.json({ ok: true, message: `Listing ${decision}d`, data: listing.toObject() });
  } catch (e) {
    next(e);
  }
});

router.get("/vendors", async (req, res, next) => {
  try {
    const needsVerify = String(req.query.needsVerify || "").trim() === "1";
    const accountStatus = String(req.query.accountStatus || "all").trim().toLowerCase();
    const where = { role: "vendor" };
    // $ne: false includes docs with no isActive field (legacy) — { isActive: true } would exclude them
    if (accountStatus === "active") where.isActive = { $ne: false };
    else if (accountStatus === "deactivated") where.isActive = false;
    let items = await User.find(where)
      .select("_id firstName lastName email isActive isVerified createdAt deactivatedAt updatedAt username")
      .sort({ createdAt: -1 })
      .lean();
    if (needsVerify) items = items.filter((u) => u.isVerified === false);
    items = items.map(explicitIsActive);
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

/** Full admin view of a customer or vendor (not admins). */
router.get("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid user id" });
    const user = await User.findById(id)
      .select("-passwordHash -resetCodeHash -resetCodeExpires -resetCodeAttempts -lastResetRequestAt -verifyCodeHash -verifyCodeExpires -lastVerifyEmailAt")
      .lean();
    if (!user) return res.status(404).json({ ok: false, message: "User not found" });
    if (!["customer", "vendor"].includes(user.role)) return res.status(404).json({ ok: false, message: "User not found" });

    if (user.role === "customer") {
      const [ordersCount, reviewsCount, paymentsCount] = await Promise.all([
        Order.countDocuments({ customer: id }),
        Review.countDocuments({ customerId: id }),
        PaymentTransaction.countDocuments({ customer: id }),
      ]);
      const ordersPreview = await Order.find({ customer: id })
        .sort({ createdAt: -1 })
        .limit(40)
        .select("orderNumber status totalCents currency createdAt")
        .lean();
      return res.json({
        ok: true,
        data: {
          user: userOut,
          ordersCount,
          reviewsCount,
          paymentsCount,
          ordersPreview,
        },
      });
    }

    const vendorProfile = await VendorProfile.findOne({ user: id }).lean();
    const listingsCount = await Listing.countDocuments({ vendor: id });
    const listingsPreview = await Listing.find({ vendor: id })
      .sort({ updatedAt: -1 })
      .limit(40)
      .select("title inventory.status moderation.status pricing.priceCents pricing.currency seo.slug updatedAt createdAt")
      .lean();
    const promotionsCount = await Promotion.countDocuments({ vendor: id });
    return res.json({
      ok: true,
      data: {
        user: userOut,
        vendorProfile,
        listingsCount,
        listingsPreview,
        promotionsCount,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/vendors/:id/deactivate", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) return res.status(404).json({ ok: false, message: "Vendor not found" });
    vendor.isActive = false;
    vendor.deactivatedAt = new Date();
    await vendor.save();
    return res.json({ ok: true, message: "Vendor deactivated", data: vendor.safe() });
  } catch (e) {
    next(e);
  }
});

router.patch("/vendors/:id/reactivate", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    const vendor = await User.findOne({ _id: id, role: "vendor" });
    if (!vendor) return res.status(404).json({ ok: false, message: "Vendor not found" });
    vendor.isActive = true;
    vendor.deactivatedAt = null;
    await vendor.save();
    return res.json({ ok: true, message: "Vendor reactivated", data: vendor.safe() });
  } catch (e) {
    next(e);
  }
});

/**
 * Permanently remove vendor: listings, reviews on those listings, vendor promos, profile, user.
 * Historical orders keep listing ids as references to deleted listings (snapshot fields still on order lines).
 */
router.delete("/vendors/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid vendor id" });
    const vendor = await User.findOne({ _id: id, role: "vendor" }).select("_id email").lean();
    if (!vendor) return res.status(404).json({ ok: false, message: "Vendor not found" });

    const listingIds = (await Listing.find({ vendor: id }).select("_id").lean()).map((x) => x._id);
    if (listingIds.length) {
      await Review.deleteMany({ productId: { $in: listingIds } });
      await Listing.deleteMany({ _id: { $in: listingIds } });
    }
    await Promotion.deleteMany({ vendor: id });
    await VendorProfile.deleteOne({ user: id });
    await User.deleteOne({ _id: id, role: "vendor" });
    return res.json({ ok: true, message: "Vendor account and related shop data removed" });
  } catch (e) {
    next(e);
  }
});

router.get("/abuse-reports", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const where = status ? { status } : {};
    const items = await AbuseReport.find(where).sort({ createdAt: -1 }).limit(300).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.patch("/abuse-reports/:id/action", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid report id" });
    const status = String(req.body?.status || "").trim();
    const actionNote = String(req.body?.actionNote || "").trim();
    if (!["in_review", "resolved"].includes(status)) return res.status(400).json({ ok: false, message: "status must be in_review or resolved" });
    const report = await AbuseReport.findById(id);
    if (!report) return res.status(404).json({ ok: false, message: "Report not found" });
    report.status = status;
    report.actionNote = actionNote;
    if (status === "resolved") {
      report.resolvedAt = new Date();
      report.resolvedBy = req.user.id;
    }
    await report.save();
    return res.json({ ok: true, data: report.toObject() });
  } catch (e) {
    next(e);
  }
});

router.get("/contact-messages", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const where = status ? { status } : {};
    const items = await ContactMessage.find(where).sort({ createdAt: -1 }).limit(400).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.post("/contact-messages/:id/respond", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid message id" });
    const responseText = String(req.body?.response || "").trim();
    if (!responseText) return res.status(400).json({ ok: false, message: "response is required" });
    const item = await ContactMessage.findById(id);
    if (!item) return res.status(404).json({ ok: false, message: "Contact message not found" });
    item.responses = Array.isArray(item.responses) ? item.responses : [];
    item.responses.push({ admin: req.user.id, message: responseText, sentAt: new Date() });
    item.status = "resolved";
    item.resolvedAt = new Date();
    item.resolvedBy = req.user.id;
    await item.save();

    await notifyContactResolved(item, responseText);
    return res.json({ ok: true, message: "Response sent and message marked resolved", data: item.toObject() });
  } catch (e) {
    next(e);
  }
});

router.get("/customers", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim().toLowerCase();
    const where = { role: "customer" };
    if (status === "blocked") where.isActive = false;
    if (status === "active") where.isActive = { $ne: false };
    let rows = await User.find(where)
      .select("_id firstName lastName email isActive isVerified createdAt deactivatedAt")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    if (q) {
      rows = rows.filter((u) => `${u.firstName || ""} ${u.lastName || ""} ${u.email || ""}`.toLowerCase().includes(q));
    }
    const needsVerify = String(req.query.needsVerify || "").trim() === "1";
    if (needsVerify) rows = rows.filter((u) => u.isVerified === false);
    const customerIds = rows.map((u) => u._id);
    const ordersAgg = await Order.aggregate([
      { $match: { customer: { $in: customerIds } } },
      { $group: { _id: "$customer", ordersCount: { $sum: 1 }, spentCents: { $sum: "$totalCents" } } },
    ]);
    const orderMap = new Map(ordersAgg.map((x) => [String(x._id), x]));
    const data = rows.map((u) =>
      explicitIsActive({
        ...u,
        ordersCount: Number(orderMap.get(String(u._id))?.ordersCount || 0),
        spentCents: Number(orderMap.get(String(u._id))?.spentCents || 0),
        suspicious: Number(orderMap.get(String(u._id))?.ordersCount || 0) > 30,
      })
    );
    return res.json({ ok: true, data: { items: data } });
  } catch (e) {
    next(e);
  }
});

router.patch("/customers/:id/block", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid customer id" });
    const user = await User.findOne({ _id: id, role: "customer" });
    if (!user) return res.status(404).json({ ok: false, message: "Customer not found" });
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();
    return res.json({ ok: true, message: "Customer blocked", data: user.safe() });
  } catch (e) {
    next(e);
  }
});

router.patch("/customers/:id/unblock", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid customer id" });
    const user = await User.findOne({ _id: id, role: "customer" });
    if (!user) return res.status(404).json({ ok: false, message: "Customer not found" });
    user.isActive = true;
    user.deactivatedAt = null;
    await user.save();
    return res.json({ ok: true, message: "Customer unblocked", data: user.safe() });
  } catch (e) {
    next(e);
  }
});

router.get("/customers/:id/orders", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid customer id" });
    const items = await Order.find({ customer: id }).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

/** Permanently remove customer only when they have no orders or payment records. */
router.delete("/customers/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid customer id" });
    const user = await User.findOne({ _id: id, role: "customer" }).select("_id").lean();
    if (!user) return res.status(404).json({ ok: false, message: "Customer not found" });
    const ordersCount = await Order.countDocuments({ customer: id });
    if (ordersCount > 0) {
      return res.status(409).json({
        ok: false,
        message: `This customer has ${ordersCount} order(s). Deleting would break order history. Block the account instead, or contact engineering if you need a GDPR-style erasure workflow.`,
        data: { ordersCount },
      });
    }
    const paymentsCount = await PaymentTransaction.countDocuments({ customer: id });
    if (paymentsCount > 0) {
      return res.status(409).json({
        ok: false,
        message: `This customer has ${paymentsCount} payment record(s). Remove or archive those before deleting the account.`,
        data: { paymentsCount },
      });
    }
    await Review.deleteMany({ customerId: id });
    await User.deleteOne({ _id: id, role: "customer" });
    return res.json({ ok: true, message: "Customer account deleted" });
  } catch (e) {
    next(e);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const where = {};
    if (status) where["inventory.status"] = status;
    let items = await Listing.find(where).sort({ updatedAt: -1 }).limit(500).populate("vendor", "firstName lastName email").lean();
    if (q) {
      items = items.filter((p) => `${p.title || ""} ${p.description || ""}`.toLowerCase().includes(q));
    }
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.patch("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid product id" });
    const allowed = ["title", "description", "pricing", "inventory", "isFeatured", "moderation"];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
    const doc = await Listing.findByIdAndUpdate(id, patch, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: "Product not found" });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.patch("/products/:id/force-unpublish", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid product id" });
    const doc = await Listing.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: "Product not found" });
    doc.inventory.status = "draft";
    doc.moderation = doc.moderation || {};
    doc.moderation.status = "rejected";
    await doc.save();
    return res.json({ ok: true, message: "Product unpublished", data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid product id" });
    await Listing.findByIdAndDelete(id);
    return res.json({ ok: true, message: "Product removed" });
  } catch (e) {
    next(e);
  }
});

router.post("/products/bulk", async (req, res, next) => {
  try {
    const action = String(req.body?.action || "").trim();
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((x) => mongoose.Types.ObjectId.isValid(x)) : [];
    if (ids.length === 0) return res.status(400).json({ ok: false, message: "ids required" });
    if (action === "delete") {
      await Listing.deleteMany({ _id: { $in: ids } });
      return res.json({ ok: true, message: "Products deleted" });
    }
    if (action === "feature") {
      await Listing.updateMany({ _id: { $in: ids } }, { $set: { isFeatured: true } });
      return res.json({ ok: true, message: "Products featured" });
    }
    if (action === "unfeature") {
      await Listing.updateMany({ _id: { $in: ids } }, { $set: { isFeatured: false } });
      return res.json({ ok: true, message: "Products unfeatured" });
    }
    if (action === "unpublish") {
      await Listing.updateMany({ _id: { $in: ids } }, { $set: { "inventory.status": "draft" } });
      return res.json({ ok: true, message: "Products unpublished" });
    }
    return res.status(400).json({ ok: false, message: "Unknown bulk action" });
  } catch (e) {
    next(e);
  }
});

router.get("/categories", async (_req, res, next) => {
  try {
    const items = await Category.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.post("/categories", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const slug = String(req.body?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();
    const parent = req.body?.parent || null;
    const sortOrder = Number(req.body?.sortOrder || 0);
    const isVisible = req.body?.isVisible !== false;
    if (!name || !slug) return res.status(400).json({ ok: false, message: "name/slug required" });
    const parentDoc = parent ? await Category.findById(parent).lean() : null;
    const path = parentDoc ? `${parentDoc.path}/${slug}` : slug;
    const doc = await Category.create({ name, slug, parent, path, sortOrder, isVisible, isActive: true });
    return res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.patch("/categories/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid category id" });
    const patch = {};
    ["name", "slug", "isActive", "isVisible", "sortOrder", "parent"].forEach((k) => {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    });
    const doc = await Category.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return res.status(404).json({ ok: false, message: "Category not found" });
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid category id" });
    await Category.findByIdAndDelete(id);
    return res.json({ ok: true, message: "Category deleted" });
  } catch (e) {
    next(e);
  }
});

router.get("/brands", async (_req, res, next) => {
  try {
    const items = await Brand.find({}).sort({ sortOrder: 1, name: 1 }).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.post("/brands", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const slug = String(req.body?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();
    if (!name || !slug) return res.status(400).json({ ok: false, message: "name/slug required" });
    const doc = await Brand.create({
      name,
      slug,
      isActive: req.body?.isActive !== false,
      isVisible: req.body?.isVisible !== false,
      sortOrder: Number(req.body?.sortOrder || 0),
    });
    return res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.patch("/brands/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid brand id" });
    const patch = {};
    ["name", "slug", "isActive", "isVisible", "sortOrder"].forEach((k) => {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    });
    const doc = await Brand.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return res.status(404).json({ ok: false, message: "Brand not found" });
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

router.delete("/brands/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid brand id" });
    await Brand.findByIdAndDelete(id);
    return res.json({ ok: true, message: "Brand deleted" });
  } catch (e) {
    next(e);
  }
});

router.get("/orders", async (req, res, next) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = String(req.query.q || "").trim().toLowerCase();
    const status = String(req.query.status || "").trim();
    const where = {};
    if (status) where.status = status;
    let items = await Order.find(where).populate("customer", "firstName lastName email").sort({ createdAt: -1 }).limit(500).lean();
    if (q) items = items.filter((o) => `${o.orderNumber || ""} ${o.customer?.email || ""}`.toLowerCase().includes(q));
    const slim = items.map((o) => {
      const { messages = [], issues = [], ...rest } = o;
      const hasRecentVendorMessage =
        Array.isArray(messages) &&
        messages.some((m) => m.fromRole === "vendor" && m.sentAt && new Date(m.sentAt) >= weekAgo);
      const st = String(o.status || "").toLowerCase();
      const unseenNew =
        st === "new" && !o.adminMeta?.newOrderSeenAt;
      return {
        ...rest,
        messagesPreview: Array.isArray(messages)
          ? messages.slice(-3).map((m) => ({
              fromRole: m.fromRole,
              text: m.text,
              sentAt: m.sentAt,
            }))
          : [],
        messagesCount: Array.isArray(messages) ? messages.length : 0,
        issuesOpenCount: Array.isArray(issues) ? issues.filter((i) => i.status === "open").length : 0,
        hasRecentVendorMessage,
        isNewOrder: st === "new",
        countsAsNewOrderDot: unseenNew,
      };
    });
    return res.json({ ok: true, data: { items: slim } });
  } catch (e) {
    next(e);
  }
});

router.get("/orders/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });

    await Order.updateOne(
      {
        _id: id,
        status: "new",
        $or: [{ "adminMeta.newOrderSeenAt": null }, { "adminMeta.newOrderSeenAt": { $exists: false } }],
      },
      { $set: { "adminMeta.newOrderSeenAt": new Date() } }
    );

    const order = await Order.findById(id)
      .populate("customer", "firstName lastName email")
      .populate({ path: "messages.fromUser", select: "firstName lastName email role" })
      .lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    return res.json({ ok: true, data: order });
  } catch (e) {
    next(e);
  }
});

/** Platform note visible to customer + vendor on the order thread */
router.post("/orders/:id/messages", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ ok: false, message: "Message is required" });
    const order = await Order.findById(id).populate("customer", "email firstName").exec();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    order.messages = Array.isArray(order.messages) ? order.messages : [];
    const adminActor = req.user?.id || req.user?._id;
    order.messages.push({
      fromRole: "system",
      fromUser: adminActor,
      text,
      sentAt: new Date(),
    });
    await order.save();

    const listingIds = [...new Set((order.items || []).map((it) => it.listing).filter(Boolean))];
    const listings = await Listing.find({ _id: { $in: listingIds } }).select("vendor").lean();
    const vendorIds = [...new Set(listings.map((l) => l.vendor).filter(Boolean))];
    const vendors = await User.find({ _id: { $in: vendorIds }, role: "vendor" }).select("email").lean();

    const subject = `Update on order ${order.orderNumber}`;
    const html = `<p><strong>Artisan Avenue</strong> added a note on order <strong>${order.orderNumber}</strong>:</p><p>${text}</p>`;
    const plain = `Artisan Avenue added a note on order ${order.orderNumber}:\n\n${text}`;

    if (order.customer?.email) {
      await sendMail({ to: order.customer.email, subject, text: plain, html }).catch(() => null);
    }
    for (const v of vendors) {
      if (v.email) await sendMail({ to: v.email, subject, text: plain, html }).catch(() => null);
    }

    return res.status(201).json({ ok: true, message: "Platform message posted" });
  } catch (e) {
    next(e);
  }
});

const ADMIN_ORDER_STATUSES = [
  "new",
  "accepted",
  "rejected",
  "in_progress",
  "processing",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
];

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    const status = String(req.body?.status || "").trim();
    if (!status) return res.status(400).json({ ok: false, message: "status required" });
    if (!ADMIN_ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ ok: false, message: `Invalid status. Use one of: ${ADMIN_ORDER_STATUSES.join(", ")}` });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    const prev = String(order.status || "");
    order.status = status;
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({ from: prev, to: status, actorRole: "system", actor: req.user.id, note: "Admin override" });
    await order.save();
    return res.json({ ok: true, data: order.toObject() });
  } catch (e) {
    next(e);
  }
});

router.patch("/orders/:id/cancel", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    const prev = String(order.status || "");
    order.status = "cancelled";
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({ from: prev, to: "cancelled", actorRole: "system", actor: req.user.id, note: "Admin cancelled order" });
    await order.save();
    return res.json({ ok: true, message: "Order cancelled", data: order.toObject() });
  } catch (e) {
    next(e);
  }
});

router.patch("/orders/:id/return", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid order id" });
    const state = String(req.body?.state || "").trim();
    if (!["requested", "approved", "declined", "received"].includes(state)) {
      return res.status(400).json({ ok: false, message: "Invalid return state" });
    }
    const order = await Order.findByIdAndUpdate(
      id,
      { $set: { "adminMeta.returnStatus": state, "adminMeta.returnUpdatedAt": new Date() } },
      { new: true }
    ).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    return res.json({ ok: true, data: order });
  } catch (e) {
    next(e);
  }
});

router.get("/payments", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const where = status ? { status } : {};
    const items = await PaymentTransaction.find(where).sort({ createdAt: -1 }).limit(500).populate("order", "orderNumber").populate("customer", "email firstName lastName").lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.patch("/payments/:id/refund", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid payment id" });
    const decision = String(req.body?.decision || "").trim();
    const reason = String(req.body?.reason || "").trim();
    if (!["approve", "decline", "process"].includes(decision)) return res.status(400).json({ ok: false, message: "Invalid refund decision" });
    const map = { approve: "approved", decline: "declined", process: "processed" };
    const doc = await PaymentTransaction.findById(id);
    if (!doc) return res.status(404).json({ ok: false, message: "Payment not found" });
    doc.refundStatus = map[decision];
    doc.refundReason = reason;
    if (map[decision] === "processed") doc.status = "refunded";
    await doc.save();
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

async function getSettingsDoc() {
  return PlatformSetting.findOneAndUpdate({ key: "default" }, { $setOnInsert: { key: "default" } }, { upsert: true, new: true });
}

router.get("/shipping-settings", async (_req, res, next) => {
  try {
    const doc = await getSettingsDoc();
    return res.json({ ok: true, data: doc.shipping || {} });
  } catch (e) {
    next(e);
  }
});

router.put("/shipping-settings", async (req, res, next) => {
  try {
    const doc = await getSettingsDoc();
    doc.shipping = { ...(doc.shipping || {}), ...(req.body || {}) };
    await doc.save();
    return res.json({ ok: true, data: doc.shipping });
  } catch (e) {
    next(e);
  }
});

router.get("/reviews", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const where = status ? { moderationStatus: status } : {};
    const items = await Review.find(where).sort({ createdAt: -1 }).limit(500).populate("productId", "title").populate("customerId", "firstName lastName email").lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.patch("/reviews/:id/moderate", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid review id" });
    const action = String(req.body?.action || "").trim();
    if (!["approve", "reject", "delete"].includes(action)) return res.status(400).json({ ok: false, message: "Invalid action" });
    if (action === "delete") {
      await Review.findByIdAndDelete(id);
      return res.json({ ok: true, message: "Review deleted" });
    }
    const status = action === "approve" ? "approved" : "rejected";
    const doc = await Review.findByIdAndUpdate(id, { $set: { moderationStatus: status, moderationNote: String(req.body?.note || "") } }, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: "Review not found" });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.get("/promotions/global", async (_req, res, next) => {
  try {
    const items = await Promotion.find({ scope: "global" }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
});

router.post("/promotions/global", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const type = String(req.body?.type || "percentage");
    const value = Number(req.body?.value || 0);
    const code = String(req.body?.code || "").trim().toUpperCase();
    const startDate = new Date(req.body?.startDate || Date.now());
    const endDate = new Date(req.body?.endDate || Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (!name || !value || !code) return res.status(400).json({ ok: false, message: "name/code/value required" });
    const doc = await Promotion.create({
      scope: "global",
      vendor: null,
      name,
      type,
      value,
      code,
      startDate,
      endDate,
      active: true,
      featuredCampaign: !!req.body?.featuredCampaign,
      listingIds: [],
      minPurchaseCents: Number(req.body?.minPurchaseCents || 0),
    });
    return res.status(201).json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.patch("/promotions/global/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid promotion id" });
    const patch = {};
    ["name", "type", "value", "code", "startDate", "endDate", "active", "featuredCampaign", "minPurchaseCents"].forEach((k) => {
      if (req.body?.[k] !== undefined) patch[k] = req.body[k];
    });
    const doc = await Promotion.findOneAndUpdate({ _id: id, scope: "global" }, patch, { new: true }).lean();
    if (!doc) return res.status(404).json({ ok: false, message: "Promotion not found" });
    return res.json({ ok: true, data: doc });
  } catch (e) {
    next(e);
  }
});

router.delete("/promotions/global/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ ok: false, message: "Invalid promotion id" });
    await Promotion.findOneAndDelete({ _id: id, scope: "global" });
    return res.json({ ok: true, message: "Global promotion deleted" });
  } catch (e) {
    next(e);
  }
});

router.get("/settings", async (_req, res, next) => {
  try {
    const doc = await getSettingsDoc();
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const doc = await getSettingsDoc();
    const allowed = ["store", "email", "tax", "currency", "commissions", "maintenanceMode", "shipping", "payment"];
    for (const k of allowed) {
      if (req.body?.[k] !== undefined) {
        doc[k] = { ...(doc[k] || {}), ...(req.body[k] || {}) };
      }
    }
    await doc.save();
    return res.json({ ok: true, data: doc.toObject() });
  } catch (e) {
    next(e);
  }
});

router.get("/reports/export", async (req, res, next) => {
  try {
    const format = String(req.query.format || "excel").toLowerCase();
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const [users, vendors, orders] = await Promise.all([
      User.countDocuments({ role: { $in: ["customer", "admin"] }, createdAt: { $gte: from, $lte: to } }),
      User.countDocuments({ role: "vendor", createdAt: { $gte: from, $lte: to } }),
      Order.find({ createdAt: { $gte: from, $lte: to } }).select("orderNumber status totalCents createdAt").lean(),
    ]);
    const totalRevenueCents = orders.reduce((s, o) => s + Number(o.totalCents || 0), 0);

    if (format === "pdf") {
      const lines = [
        `From: ${from.toISOString().slice(0, 10)} To: ${to.toISOString().slice(0, 10)}`,
        `Users: ${users}`,
        `Vendors: ${vendors}`,
        `Orders: ${orders.length}`,
        `Revenue: ${(totalRevenueCents / 100).toFixed(2)} AUD`,
      ];
      const pdf = simplePdfBuffer("Platform Report", lines);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="platform-report-${Date.now()}.pdf"`);
      return res.send(pdf);
    }

    const rows = [
      ["metric", "value"],
      ["from", from.toISOString().slice(0, 10)],
      ["to", to.toISOString().slice(0, 10)],
      ["total_users", users],
      ["total_vendors", vendors],
      ["total_orders", orders.length],
      ["total_revenue_aud", (totalRevenueCents / 100).toFixed(2)],
      [],
      ["order_number", "status", "date", "total_aud"],
      ...orders.map((o) => [o.orderNumber, o.status, new Date(o.createdAt).toISOString(), (Number(o.totalCents || 0) / 100).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="platform-report-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (e) {
    next(e);
  }
});

export default router;
