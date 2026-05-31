import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminAPI } from "../../lib/api";

const money = (cents) => new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" }).format((Number(cents) || 0) / 100);

function sortCustomers(list) {
  return [...list].sort((a, b) => {
    const au = a.isVerified === false ? 1 : 0;
    const bu = b.isVerified === false ? 1 : 0;
    if (bu !== au) return bu - au;
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });
}

export default function AdminCustomersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [attention, setAttention] = useState("");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    const needsVerify = attention === "unverified" ? "1" : "";
    const r = await AdminAPI.customers({ q, status, needsVerify }).catch(() => null);
    if (!r?.ok) return setErr("Could not load customers");
    const d = r?.data?.data ?? r?.data ?? {};
    let list = Array.isArray(d.items) ? d.items : [];
    if (attention !== "unverified") list = sortCustomers(list);
    setItems(list);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, attention]);

  async function openOrders(userId) {
    setSelected(userId);
    const r = await AdminAPI.customerOrders(userId).catch(() => null);
    const d = r?.data?.data ?? r?.data ?? {};
    setOrders(Array.isArray(d.items) ? d.items : []);
  }

  async function toggleBlock(c) {
    if (c.isActive) await AdminAPI.blockCustomer(c._id);
    else await AdminAPI.unblockCustomer(c._id);
    await load();
  }

  async function removeCustomer(c) {
    setErr("");
    const typed = window.prompt(`Permanently delete customer ${c.email}?\nOnly allowed if they have no orders or payments.\nType the email to confirm.`);
    if (typed !== c.email) {
      if (typed !== null) setErr("Email did not match.");
      return;
    }
    const r = await AdminAPI.deleteCustomer(c._id).catch(() => null);
    if (!r?.ok) return setErr(r?.data?.message || "Could not delete customer");
    if (selected === c._id) {
      setSelected(null);
      setOrders([]);
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <h1 className="admin-card-title">Customer Management</h1>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer..." className="admin-input" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
          <select value={attention} onChange={(e) => setAttention(e.target.value)} className="admin-select">
            <option value="">All customers</option>
            <option value="unverified">Needs email verification only</option>
          </select>
        </div>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 space-y-2">
          {items.map((c) => {
            const needsEmail = c.isVerified === false;
            return (
              <div
                key={c._id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                  needsEmail ? "border-l-4 border-l-rose-500 border-y border-r border-gray-200 bg-rose-500/[0.06]" : "border border-gray-200 bg-gray-50"
                }`}
              >
                <Link to={`/admin/users/${c._id}`} className="min-w-0 flex-1 rounded-lg outline-none ring-[#4b0082]/30 transition hover:bg-gray-50 focus-visible:ring-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {c.firstName} {c.lastName}
                    </span>
                    {needsEmail && (
                      <span className="shrink-0 rounded-full bg-rose-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">Email not verified</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{c.email}</div>
                  <div className="text-xs text-gray-500">
                    Orders: {c.ordersCount || 0} · Spent: {money(c.spentCents || 0)} · {c.suspicious ? "Suspicious user" : "Normal"}
                  </div>
                  <div className="text-[11px] text-[#4b0082] font-medium">View full profile →</div>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => openOrders(c._id)} className="admin-btn admin-btn-sm admin-btn-outline">
                    Quick order history
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBlock(c)}
                    className={`admin-btn admin-btn-sm ${c.isActive ? "admin-btn-danger" : "admin-btn-success"}`}
                  >
                    {c.isActive ? "Block" : "Unblock"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCustomer(c)}
                    className="admin-btn admin-btn-sm admin-btn-ghost-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="admin-muted">No customers found.</p>}
        </div>
      </div>

      {selected && (
        <div className="admin-card">
          <h2 className="text-lg font-semibold text-gray-900">Customer Order History</h2>
          <div className="mt-3 space-y-2 text-sm">
            {orders.map((o) => (
              <div key={o._id} className="admin-row px-3 py-2">
                <div className="font-semibold text-gray-900">{o.orderNumber}</div>
                <div className="text-xs text-gray-500">
                  {o.status} · {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"} · {money(o.totalCents)}
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="admin-muted">No orders for this customer.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
