import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaPlus, FaPercent, FaTag, FaEdit, FaTrashAlt, FaTicketAlt } from "react-icons/fa";
import { PromotionsAPI } from "../../lib/api";

const money = (cents) => new Intl.NumberFormat(undefined, { style: "currency", currency: "AUD" }).format((cents || 0) / 100);

const typeLabel = (type, value) => {
  if (type === "percentage") return `${value}% off`;
  return `${money(value)} off`;
};

const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "short" }) : "—");

export default function PromotionsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "percentage",
    value: "",
    code: "",
    minPurchaseDollars: "",
    startDate: "",
    endDate: "",
    active: true,
  });

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await PromotionsAPI.list();
      const data = res?.data?.data ?? res?.data ?? {};
      const items = data.items ?? [];
      setList(Array.isArray(items) ? items : []);
    } catch (e) {
      setError(e.message || "Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      type: "percentage",
      value: "",
      code: "",
      minPurchaseDollars: "",
      startDate: "",
      endDate: "",
      active: true,
    });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setForm({
      name: p.name || "",
      type: p.type || "percentage",
      value: p.type === "fixed_amount" ? (p.value / 100).toFixed(2) : String(p.value || ""),
      code: p.code || "",
      minPurchaseDollars: p.minPurchaseCents ? (p.minPurchaseCents / 100).toFixed(2) : "",
      startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "",
      endDate: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : "",
      active: p.active !== false,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const minCents = form.minPurchaseDollars ? Math.round(parseFloat(form.minPurchaseDollars) * 100) : 0;
    const valueNum = form.type === "fixed_amount" ? Math.round(parseFloat(form.value) * 100) : Math.round(parseFloat(form.value));
    if (!form.name?.trim()) return setError("Name is required");
    if (valueNum < 1 || (form.type === "percentage" && valueNum > 100)) return setError("Invalid discount value");
    if (!form.startDate || !form.endDate) return setError("Start and end dates are required");
    if (new Date(form.startDate) >= new Date(form.endDate)) return setError("End date must be after start date");

    const payload = {
      name: form.name.trim(),
      type: form.type,
      value: valueNum,
      code: form.code?.trim() || "",
      minPurchaseCents: minCents,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      active: form.active,
    };

    try {
      if (editingId) {
        await PromotionsAPI.update(editingId, payload);
        setToast("Promotion updated");
      } else {
        await PromotionsAPI.create(payload);
        setToast("Promotion created");
      }
      closeForm();
      fetchList();
    } catch (err) {
      setError(err.message || "Save failed");
    }
    setTimeout(() => setToast(""), 2500);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await PromotionsAPI.delete(id);
      setToast("Promotion deleted");
      fetchList();
    } catch (err) {
      setError(err.message || "Delete failed");
    }
    setTimeout(() => setToast(""), 2500);
  };

  const now = new Date();
  const isActive = (p) => p.active && new Date(p.startDate) <= now && new Date(p.endDate) >= now;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions & discounts</h1>
          <p className="mt-1 text-sm text-gray-500">Create coupon codes or store-wide sales. Customers enter codes at checkout.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <FaPlus />
          New promotion
        </button>
      </div>

      {toast && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{toast}</div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {showForm && (
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{editingId ? "Edit promotion" : "New promotion"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name (internal)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Summer Sale 2025"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Discount type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="percentage">Percentage off</option>
                  <option value="fixed_amount">Fixed amount off (AUD)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {form.type === "percentage" ? "Percentage (e.g. 10)" : "Amount (AUD, e.g. 5.00)"}
                </label>
                <input
                  type={form.type === "percentage" ? "number" : "number"}
                  min={form.type === "percentage" ? 1 : 0}
                  max={form.type === "percentage" ? 100 : undefined}
                  step={form.type === "fixed_amount" ? "0.01" : "1"}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percentage" ? "10" : "5.00"}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Coupon code (optional)</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SAVE10 — leave empty for automatic sale"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 uppercase focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1 text-xs text-gray-500">Customers enter this at checkout. Empty = promotion applies by date (automatic sale).</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Minimum purchase (AUD, optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.minPurchaseDollars}
                onChange={(e) => setForm({ ...form, minPurchaseDollars: e.target.value })}
                placeholder="0"
                className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Start date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">End date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
                {editingId ? "Update" : "Create"}
              </button>
              <button type="button" onClick={closeForm} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FaTag className="text-2xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No promotions yet</h3>
            <p className="mt-2 text-sm text-gray-500">Create a coupon code or set a sale period. Customers can use codes at checkout.</p>
            <button type="button" onClick={openCreate} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
              <FaPlus />
              Create promotion
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p.code ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"}`}>
                    {p.code ? <FaTicketAlt /> : <FaPercent />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{p.name}</div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{typeLabel(p.type, p.type === "fixed_amount" ? p.value / 100 : p.value)}</span>
                      {p.code && <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">{p.code}</span>}
                      <span>· {formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                      {p.minPurchaseCents > 0 && <span>· Min {money(p.minPurchaseCents)}</span>}
                    </div>
                    <div className="mt-1">
                      {isActive(p) ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Active now</span>
                      ) : !p.active ? (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                      ) : new Date(p.endDate) < now ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">Ended</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Scheduled</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(p)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" title="Edit">
                    <FaEdit />
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(p._id, p.name)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50" title="Delete">
                    <FaTrashAlt />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-900">
        <strong>Tip:</strong> Customers enter the coupon code at checkout on the cart page. Set a minimum purchase and date range to control when the offer is valid. Discount applies to your products in the cart.
      </div>
    </div>
  );
}
