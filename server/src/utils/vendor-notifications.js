import mongoose from "mongoose";
import Listing from "../models/Listing.js";
import Order from "../models/Order.js";
import Promotion from "../models/Promotion.js";
import AbuseReport from "../models/AbuseReport.js";
import Review from "../models/Review.js";
import VendorProfile from "../models/VendorProfile.js";

const statusAlias = {
  processing: "in_progress",
  shipped: "in_progress",
  delivered: "completed",
};

function canonicalStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return statusAlias[s] || s || "new";
}

function truncate(text, max = 140) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function toIso(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

function isUnread(createdAt, lastSeenAt) {
  if (!createdAt) return false;
  if (!lastSeenAt) return true;
  return new Date(createdAt).getTime() > new Date(lastSeenAt).getTime();
}

function pushItem(items, item) {
  if (!item?.id) return;
  items.push(item);
}

async function vendorOrderRows(vendorObjId) {
  return Order.aggregate([
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
        orderNumber: { $first: "$orderNumber" },
        status: { $first: "$status" },
        messages: { $first: "$messages" },
        issues: { $first: "$issues" },
        createdAt: { $first: "$createdAt" },
        updatedAt: { $first: "$updatedAt" },
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 200 },
  ]);
}

/**
 * @param {string|import('mongoose').Types.ObjectId} vendorId
 */
export async function buildVendorNotificationFeed(vendorId) {
  const vendorObjId = new mongoose.Types.ObjectId(String(vendorId));
  const profile = await VendorProfile.findOne({ user: vendorId }).select("notificationsLastSeenAt").lean();
  const lastSeenAt = profile?.notificationsLastSeenAt || null;

  const items = [];
  const orders = await vendorOrderRows(vendorObjId);

  for (const row of orders) {
    const orderId = String(row._id);
    const orderNumber = row.orderNumber || orderId;
    const st = canonicalStatus(row.status);
    const orderLink = `/vendor/orders?order=${orderId}`;

    if (st === "new") {
      pushItem(items, {
        id: `order-new-${orderId}`,
        type: "order_new",
        category: "orders",
        title: "New order",
        body: `Order ${orderNumber} is waiting for you to accept or decline.`,
        createdAt: toIso(row.createdAt),
        linkTo: orderLink,
        meta: { orderId, orderNumber },
      });
    }

    const msgs = Array.isArray(row.messages) ? [...row.messages] : [];
    msgs.sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));

    const customerMsgs = msgs.filter((m) => m.fromRole === "customer");
    if (customerMsgs.length > 0) {
      const last = customerMsgs[customerMsgs.length - 1];
      const lastOverall = msgs[msgs.length - 1];
      if (lastOverall?.fromRole === "customer") {
        pushItem(items, {
          id: `order-msg-${orderId}-${last._id || last.sentAt}`,
          type: "order_message",
          category: "messages",
          title: "Customer message",
          body: truncate(last.text) || "New message on your order.",
          createdAt: toIso(last.sentAt || row.updatedAt),
          linkTo: orderLink,
          meta: { orderId, orderNumber },
        });
      }
    }

    const systemMsgs = msgs.filter((m) => m.fromRole === "system");
    if (systemMsgs.length > 0) {
      const last = systemMsgs[systemMsgs.length - 1];
      pushItem(items, {
        id: `platform-msg-${orderId}-${last._id || last.sentAt}`,
        type: "platform_message",
        category: "messages",
        title: "Platform message",
        body: truncate(last.text) || "Artisan Avenue posted an update on this order.",
        createdAt: toIso(last.sentAt || row.updatedAt),
        linkTo: orderLink,
        meta: { orderId, orderNumber },
      });
    }

    const issues = Array.isArray(row.issues) ? row.issues : [];
    for (const issue of issues) {
      if (String(issue.vendor) !== String(vendorId)) continue;
      const issueId = String(issue._id || "");
      const status = String(issue.status || "open");
      if (status === "open") {
        pushItem(items, {
          id: `issue-open-${orderId}-${issueId}`,
          type: "order_issue",
          category: "issues",
          title: "Open order issue",
          body: truncate(issue.description) || "An issue was reported on this order.",
          createdAt: toIso(issue.createdAt || row.updatedAt),
          linkTo: orderLink,
          meta: { orderId, orderNumber, issueId, issueStatus: status },
        });
      } else {
        pushItem(items, {
          id: `issue-${status}-${orderId}-${issueId}`,
          type: "order_issue_update",
          category: "issues",
          title: `Issue ${status.replace(/_/g, " ")}`,
          body: `Order ${orderNumber}: ${truncate(issue.description) || "Issue status updated."}`,
          createdAt: toIso(issue.createdAt || row.updatedAt),
          linkTo: orderLink,
          meta: { orderId, orderNumber, issueId, issueStatus: status },
        });
      }
    }
  }

  const promos = await Promotion.find({ vendor: vendorObjId, scope: "vendor" })
    .select("name code moderation active updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();

  for (const p of promos) {
    const mod = p.moderation?.status || "pending";
    const reviewedAt = p.moderation?.reviewedAt;
    const label = p.name || p.code || "Promotion";

    if (mod === "pending") {
      pushItem(items, {
        id: `promo-pending-${p._id}`,
        type: "promotion_pending",
        category: "moderation",
        title: "Promotion awaiting approval",
        body: `"${label}" is pending admin review before it can go live.`,
        createdAt: toIso(p.updatedAt || p.createdAt),
        linkTo: "/vendor/promotions",
        meta: { promotionId: String(p._id) },
      });
    } else if (reviewedAt && (mod === "approved" || mod === "rejected")) {
      const note = p.moderation?.reviewNote ? ` Note: ${truncate(p.moderation.reviewNote, 80)}` : "";
      pushItem(items, {
        id: `promo-${mod}-${p._id}-${toIso(reviewedAt)}`,
        type: "promotion_decision",
        category: "moderation",
        title: mod === "approved" ? "Promotion approved" : "Promotion rejected",
        body: `"${label}" was ${mod}.${note}`,
        createdAt: toIso(reviewedAt),
        linkTo: "/vendor/promotions",
        meta: { promotionId: String(p._id), decision: mod },
      });
    }
  }

  const listings = await Listing.find({ vendor: vendorObjId })
    .select("title slug moderation updatedAt createdAt")
    .sort({ updatedAt: -1 })
    .limit(40)
    .lean();

  for (const l of listings) {
    const mod = l.moderation?.status || "pending";
    const reviewedAt = l.moderation?.reviewedAt;
    const title = l.title || "Listing";

    if (mod === "pending") {
      pushItem(items, {
        id: `listing-pending-${l._id}`,
        type: "listing_pending",
        category: "moderation",
        title: "Listing awaiting approval",
        body: `"${truncate(title, 60)}" is pending admin review.`,
        createdAt: toIso(l.updatedAt || l.createdAt),
        linkTo: `/vendor/listings/${l._id}/edit`,
        meta: { listingId: String(l._id) },
      });
    } else if (reviewedAt && (mod === "approved" || mod === "rejected")) {
      const note = l.moderation?.reviewNote ? ` ${truncate(l.moderation.reviewNote, 80)}` : "";
      pushItem(items, {
        id: `listing-${mod}-${l._id}-${toIso(reviewedAt)}`,
        type: "listing_decision",
        category: "moderation",
        title: mod === "approved" ? "Listing approved" : "Listing rejected",
        body: `"${truncate(title, 60)}" was ${mod}.${note}`,
        createdAt: toIso(reviewedAt),
        linkTo: `/vendor/listings`,
        meta: { listingId: String(l._id), decision: mod },
      });
    }
  }

  const listingIds = listings.map((l) => l._id);
  if (listingIds.length > 0) {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const reviews = await Review.find({
      productId: { $in: listingIds },
      createdAt: { $gte: since },
    })
      .select("rating comment createdAt productId moderationStatus")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const listingTitleMap = new Map(listings.map((l) => [String(l._id), l.title || "Product"]));

    for (const rev of reviews) {
      const productTitle = listingTitleMap.get(String(rev.productId)) || "your product";
      pushItem(items, {
        id: `review-${rev._id}`,
        type: "review",
        category: "reviews",
        title: rev.moderationStatus === "pending" ? "Review pending moderation" : "New customer review",
        body:
          rev.moderationStatus === "pending"
            ? `${rev.rating}★ review on "${truncate(productTitle, 50)}" is awaiting platform moderation.`
            : `${rev.rating}★ review on "${truncate(productTitle, 50)}": ${truncate(rev.comment) || "No comment."}`,
        createdAt: toIso(rev.createdAt),
        linkTo: "/vendor/reviews",
        meta: { reviewId: String(rev._id), rating: rev.rating },
      });
    }
  }

  const abuseReports = await AbuseReport.find({
    reporter: vendorObjId,
    reporterRole: "vendor",
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  for (const r of abuseReports) {
    const st = r.status || "new";
    if (st === "new") {
      pushItem(items, {
        id: `abuse-new-${r._id}`,
        type: "abuse_report",
        category: "reports",
        title: "Abuse report submitted",
        body: `Your report (${r.reason || "issue"}) is queued for admin review.`,
        createdAt: toIso(r.createdAt),
        linkTo: "/vendor/report-abuse",
        meta: { reportId: String(r._id), status: st },
      });
    } else {
      const note = r.actionNote ? ` ${truncate(r.actionNote, 100)}` : "";
      pushItem(items, {
        id: `abuse-${st}-${r._id}-${toIso(r.resolvedAt || r.updatedAt)}`,
        type: "abuse_report_update",
        category: "reports",
        title: `Abuse report ${st.replace(/_/g, " ")}`,
        body: `Admin updated your report about ${r.targetLabel || r.targetType || "a target"}.${note}`,
        createdAt: toIso(r.resolvedAt || r.updatedAt || r.createdAt),
        linkTo: "/vendor/report-abuse",
        meta: { reportId: String(r._id), status: st },
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const withRead = items.map((it) => ({
    ...it,
    unread: isUnread(it.createdAt, lastSeenAt),
  }));

  const unreadCount = withRead.filter((it) => it.unread).length;

  const summary = {
    unreadTotal: unreadCount,
    newOrders: withRead.filter((it) => it.type === "order_new" && it.unread).length,
    awaitingReply: withRead.filter((it) => it.type === "order_message" && it.unread).length,
    platformMessages: withRead.filter((it) => it.type === "platform_message" && it.unread).length,
    openIssues: withRead.filter((it) => it.type === "order_issue" && it.unread).length,
    moderation: withRead.filter((it) => it.category === "moderation" && it.unread).length,
    reports: withRead.filter((it) => it.category === "reports" && it.unread).length,
    ordersNeedingAttention: withRead.filter(
      (it) =>
        it.unread &&
        ["order_new", "order_message", "platform_message", "order_issue"].includes(it.type)
    ).length,
    lastSeenAt: toIso(lastSeenAt),
  };

  return { items: withRead, summary, lastSeenAt };
}

export async function markVendorNotificationsSeen(vendorId) {
  const now = new Date();
  await VendorProfile.findOneAndUpdate(
    { user: vendorId },
    { $set: { notificationsLastSeenAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return now;
}
