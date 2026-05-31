import mongoose from "mongoose";
import Order from "../models/Order.js";
import Review from "../models/Review.js";
import AbuseReport from "../models/AbuseReport.js";
import User from "../models/User.js";
import { isDeliveredOrderStatus } from "./review-eligibility.js";

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
  return canonicalStatus(status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

/**
 * @param {string|import('mongoose').Types.ObjectId} customerId
 */
export async function buildCustomerNotificationFeed(customerId) {
  const customerObjId = new mongoose.Types.ObjectId(String(customerId));
  const user = await User.findById(customerObjId).select("notificationsLastSeenAt").lean();
  const lastSeenAt = user?.notificationsLastSeenAt || null;

  const items = [];
  const orders = await Order.find({ customer: customerObjId })
    .sort({ createdAt: -1 })
    .limit(80)
    .select("orderNumber status messages statusHistory createdAt updatedAt estimatedDelivery items.title items.slug items.listing")
    .lean();

  const deliveredOrders = orders.filter((o) => isDeliveredOrderStatus(o.status));
  const pendingReviewListingIds = [];
  for (const order of deliveredOrders) {
    for (const item of order.items || []) {
      if (item?.listing) pendingReviewListingIds.push(item.listing);
    }
  }
  const reviewedListingIds = new Set(
    pendingReviewListingIds.length
      ? (
          await Review.find({
            customerId: customerObjId,
            productId: { $in: pendingReviewListingIds },
          })
            .select("productId")
            .lean()
        ).map((r) => String(r.productId))
      : []
  );

  for (const order of orders) {
    const orderId = String(order._id);
    const orderNumber = order.orderNumber || orderId;
    const orderLink = `/orders/${orderId}/success`;

    pushItem(items, {
      id: `order-placed-${orderId}`,
      type: "order_placed",
      category: "orders",
      title: "Order placed",
      body: `We received your order ${orderNumber}. You'll get updates here as the seller processes it.`,
      createdAt: toIso(order.createdAt),
      linkTo: orderLink,
      meta: { orderId, orderNumber, status: canonicalStatus(order.status) },
    });

    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    for (const ev of history) {
      const role = String(ev.actorRole || "system");
      if (role === "customer") continue;
      const toStatus = prettyStatus(ev.to);
      pushItem(items, {
        id: `status-${orderId}-${toIso(ev.createdAt)}-${ev.to}`,
        type: "order_status",
        category: "orders",
        title: `Order ${orderNumber} — ${toStatus}`,
        body: ev.note ? truncate(ev.note) : `Your order status is now ${toStatus}.`,
        createdAt: toIso(ev.createdAt || order.updatedAt),
        linkTo: orderLink,
        meta: { orderId, orderNumber, status: canonicalStatus(ev.to) },
      });
    }

    const st = canonicalStatus(order.status);
    if (["cancelled", "rejected", "completed"].includes(st) && history.length === 0) {
      pushItem(items, {
        id: `status-current-${orderId}-${st}`,
        type: "order_status",
        category: "orders",
        title: `Order ${orderNumber} — ${prettyStatus(st)}`,
        body: `Your order is ${prettyStatus(st).toLowerCase()}.`,
        createdAt: toIso(order.updatedAt || order.createdAt),
        linkTo: orderLink,
        meta: { orderId, orderNumber, status: st },
      });
    }

    const msgs = Array.isArray(order.messages) ? [...order.messages] : [];
    msgs.sort((a, b) => new Date(a.sentAt || 0) - new Date(b.sentAt || 0));

    const vendorMsgs = msgs.filter((m) => m.fromRole === "vendor");
    if (vendorMsgs.length > 0) {
      const last = vendorMsgs[vendorMsgs.length - 1];
      const lastOverall = msgs[msgs.length - 1];
      if (lastOverall?.fromRole === "vendor") {
        pushItem(items, {
          id: `vendor-msg-${orderId}-${last._id || last.sentAt}`,
          type: "vendor_message",
          category: "messages",
          title: "Message from seller",
          body: truncate(last.text) || `New message about order ${orderNumber}.`,
          createdAt: toIso(last.sentAt || order.updatedAt),
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
        title: "Platform update",
        body: truncate(last.text) || `Artisan Avenue posted an update on order ${orderNumber}.`,
        createdAt: toIso(last.sentAt || order.updatedAt),
        linkTo: orderLink,
        meta: { orderId, orderNumber },
      });
    }

    if (isDeliveredOrderStatus(order.status)) {
      const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      const deliveredEvent = [...history]
        .reverse()
        .find((ev) => isDeliveredOrderStatus(ev.to));
      const deliveredAt = toIso(deliveredEvent?.createdAt || order.updatedAt || order.createdAt);

      for (const item of order.items || []) {
        const listingId = item?.listing ? String(item.listing) : "";
        if (!listingId || reviewedListingIds.has(listingId)) continue;
        const productLink = item.slug ? `/product/${item.slug}` : `/shop`;
        pushItem(items, {
          id: `review-invite-${orderId}-${listingId}`,
          type: "review_invite",
          category: "orders",
          title: "Share your review",
          body: `Your order ${orderNumber} was delivered. Tell others about ${item.title || "your purchase"}.`,
          createdAt: deliveredAt,
          linkTo: productLink,
          meta: { orderId, orderNumber, listingId, productTitle: item.title || "" },
        });
      }
    }
  }

  const abuseReports = await AbuseReport.find({
    reporter: customerObjId,
    reporterRole: { $in: ["customer", "other"] },
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
        title: "Report submitted",
        body: `Your report (${r.reason || "issue"}) is queued for admin review.`,
        createdAt: toIso(r.createdAt),
        linkTo: "/account/report-abuse",
        meta: { reportId: String(r._id), status: st },
      });
    } else {
      const note = r.actionNote ? ` ${truncate(r.actionNote, 100)}` : "";
      pushItem(items, {
        id: `abuse-${st}-${r._id}-${toIso(r.resolvedAt || r.updatedAt)}`,
        type: "abuse_report_update",
        category: "reports",
        title: `Report ${st.replace(/_/g, " ")}`,
        body: `Admin updated your report about ${r.targetLabel || r.targetType || "a listing"}.${note}`,
        createdAt: toIso(r.resolvedAt || r.updatedAt || r.createdAt),
        linkTo: "/account/report-abuse",
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
    orderUpdates: withRead.filter((it) => it.category === "orders" && it.unread).length,
    reviewInvites: withRead.filter((it) => it.type === "review_invite" && it.unread).length,
    vendorMessages: withRead.filter((it) => it.type === "vendor_message" && it.unread).length,
    platformMessages: withRead.filter((it) => it.type === "platform_message" && it.unread).length,
    reports: withRead.filter((it) => it.category === "reports" && it.unread).length,
    lastSeenAt: toIso(lastSeenAt),
  };

  return { items: withRead, summary, lastSeenAt };
}

export async function markCustomerNotificationsSeen(customerId) {
  const now = new Date();
  await User.findByIdAndUpdate(customerId, { $set: { notificationsLastSeenAt: now } });
  return now;
}
