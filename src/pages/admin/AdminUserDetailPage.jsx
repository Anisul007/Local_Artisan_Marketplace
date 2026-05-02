import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../lib/api";

const money = (cents, currency = "AUD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "AUD" }).format((Number(cents) || 0) / 100);

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr("");
    const r = await AdminAPI.userDetail(userId).catch(() => null);
    if (!r?.ok) {
      setData(null);
      return setErr(r?.data?.message || "Could not load user");
    }
    setData(r?.data?.data ?? r?.data ?? null);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDeleteCustomer() {
    const u = data?.user;
    if (!u || u.role !== "customer") return;
    const typed = window.prompt(`This permanently deletes the customer account.\nType the email to confirm:\n${u.email}`);
    if (typed !== u.email) {
      if (typed !== null) window.alert("Email did not match. Nothing was deleted.");
      return;
    }
    setBusy(true);
    const r = await AdminAPI.deleteCustomer(u._id).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      return setErr(r?.data?.message || "Delete failed");
    }
    navigate("/admin/customers", { replace: true });
  }

  async function confirmDeleteVendor() {
    const u = data?.user;
    if (!u || u.role !== "vendor") return;
    const typed = window.prompt(`This permanently deletes the vendor, all their listings, reviews on those listings, and promotions.\nType DELETE to confirm.`);
    if (typed !== "DELETE") {
      if (typed !== null) window.alert("Confirmation text did not match.");
      return;
    }
    setBusy(true);
    const r = await AdminAPI.deleteVendor(u._id).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      return setErr(r?.data?.message || "Delete failed");
    }
    navigate("/admin/vendors", { replace: true });
  }

  async function toggleVendorActive() {
    const u = data?.user;
    if (!u || u.role !== "vendor") return;
    setBusy(true);
    if (u.isActive) await AdminAPI.deactivateVendor(u._id).catch(() => null);
    else await AdminAPI.reactivateVendor(u._id).catch(() => null);
    setBusy(false);
    await load();
  }

  async function toggleCustomerBlock() {
    const u = data?.user;
    if (!u || u.role !== "customer") return;
    setBusy(true);
    if (u.isActive) await AdminAPI.blockCustomer(u._id).catch(() => null);
    else await AdminAPI.unblockCustomer(u._id).catch(() => null);
    setBusy(false);
    await load();
  }

  if (err && !data) {
    return (
      <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl">
        <p className="text-sm text-red-400">{err}</p>
        <Link to="/admin/customers" className="mt-3 inline-block text-sm text-cyan-300 underline">
          Back to customers
        </Link>
      </div>
    );
  }

  if (!data?.user) return <p className="text-slate-400">Loading…</p>;

  const u = data.user;
  const listBack = u.role === "vendor" ? "/admin/vendors" : "/admin/customers";
  const listLabel = u.role === "vendor" ? "All vendors" : "All customers";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={listBack} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
          ← {listLabel}
        </Link>
      </div>

      {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}

      <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              {u.firstName} {u.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-400">{u.email}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/15 px-2 py-0.5 uppercase text-slate-200">{u.role}</span>
              {u.isVerified === false && <span className="rounded-full bg-rose-600/90 px-2 py-0.5 text-white">Email not verified</span>}
              <span className={`rounded-full px-2 py-0.5 ${u.isActive ? "bg-emerald-500/25 text-emerald-200" : "bg-white/20 text-slate-300"}`}>
                {u.isActive ? "Active" : u.role === "customer" ? "Blocked" : "Deactivated"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {u.role === "vendor" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleVendorActive}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${u.isActive ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
                >
                  {u.isActive ? "Deactivate account" : "Reactivate account"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmDeleteVendor}
                  className="rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                >
                  Delete vendor &amp; shop data
                </button>
              </>
            )}
            {u.role === "customer" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleCustomerBlock}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${u.isActive ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
                >
                  {u.isActive ? "Block account" : "Unblock account"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmDeleteCustomer}
                  className="rounded-lg border border-red-400/60 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                >
                  Delete customer account
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">User ID</dt>
                <dd className="break-all text-right text-slate-200">{String(u._id)}</dd>
              </div>
              {u.username && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Username</dt>
                  <dd className="text-slate-200">{u.username}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-200">{fmtDate(u.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Updated</dt>
                <dd className="text-slate-200">{fmtDate(u.updatedAt)}</dd>
              </div>
              {u.deactivatedAt && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Deactivated / blocked at</dt>
                  <dd className="text-slate-200">{fmtDate(u.deactivatedAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          {u.role === "customer" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Profile &amp; stats</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Orders</dt>
                  <dd className="text-slate-200">{data.ordersCount ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Reviews written</dt>
                  <dd className="text-slate-200">{data.reviewsCount ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Payment records</dt>
                  <dd className="text-slate-200">{data.paymentsCount ?? 0}</dd>
                </div>
                {u.address && (
                  <div>
                    <dt className="text-slate-500">Address (legacy)</dt>
                    <dd className="mt-1 text-slate-200">{u.address}</dd>
                  </div>
                )}
                {u.shippingAddress && Object.values(u.shippingAddress).some(Boolean) && (
                  <div>
                    <dt className="text-slate-500">Shipping address</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-slate-200">
                      {[u.shippingAddress.line1, u.shippingAddress.line2, u.shippingAddress.city, u.shippingAddress.state, u.shippingAddress.postcode, u.shippingAddress.country]
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                )}
                {u.dob && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Date of birth</dt>
                    <dd className="text-slate-200">{fmtDate(u.dob)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {u.role === "vendor" && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Shop stats</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Listings</dt>
                  <dd className="text-slate-200">{data.listingsCount ?? 0}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Promotions</dt>
                  <dd className="text-slate-200">{data.promotionsCount ?? 0}</dd>
                </div>
              </dl>
              {data.vendorProfile && (
                <div className="mt-4 border-t border-white/10 pt-3 text-sm">
                  <h3 className="text-xs font-semibold text-slate-400">Vendor profile</h3>
                  <dl className="mt-2 space-y-2">
                    {data.vendorProfile.businessName && (
                      <div>
                        <dt className="text-slate-500">Business</dt>
                        <dd className="text-slate-200">{data.vendorProfile.businessName}</dd>
                      </div>
                    )}
                    {data.vendorProfile.contactEmail && (
                      <div>
                        <dt className="text-slate-500">Contact email</dt>
                        <dd className="text-slate-200">{data.vendorProfile.contactEmail}</dd>
                      </div>
                    )}
                    {data.vendorProfile.phone && (
                      <div>
                        <dt className="text-slate-500">Phone</dt>
                        <dd className="text-slate-200">{data.vendorProfile.phone}</dd>
                      </div>
                    )}
                    {data.vendorProfile.website && (
                      <div>
                        <dt className="text-slate-500">Website</dt>
                        <dd className="break-all text-cyan-300">
                          <a href={data.vendorProfile.website} target="_blank" rel="noreferrer">
                            {data.vendorProfile.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {data.vendorProfile.bio && (
                      <div>
                        <dt className="text-slate-500">Bio</dt>
                        <dd className="text-slate-200">{data.vendorProfile.bio}</dd>
                      </div>
                    )}
                    {data.vendorProfile.address && Object.values(data.vendorProfile.address).some(Boolean) && (
                      <div>
                        <dt className="text-slate-500">Business address</dt>
                        <dd className="mt-1 text-slate-200">
                          {[
                            data.vendorProfile.address.line1,
                            data.vendorProfile.address.line2,
                            data.vendorProfile.address.city,
                            data.vendorProfile.address.state,
                            data.vendorProfile.address.postcode,
                            data.vendorProfile.address.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {u.role === "customer" && Array.isArray(data.ordersPreview) && data.ordersPreview.length > 0 && (
        <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
          <h2 className="text-lg font-semibold text-white">Recent orders</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.ordersPreview.map((o) => (
              <li key={o._id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="font-medium text-white">{o.orderNumber}</div>
                <div className="text-xs text-slate-400">
                  {o.status} · {fmtDate(o.createdAt)} · {money(o.totalCents, o.currency)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {u.role === "vendor" && Array.isArray(data.listingsPreview) && data.listingsPreview.length > 0 && (
        <div className="rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-xl shadow-black/25">
          <h2 className="text-lg font-semibold text-white">Listings (latest)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.listingsPreview.map((l) => (
              <li key={l._id} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
                <div className="font-medium text-white">{l.title}</div>
                <div className="text-xs text-slate-400">
                  {l?.inventory?.status} · moderation: {l?.moderation?.status} · {money(l?.pricing?.priceCents, l?.pricing?.currency)} · /product/{l?.seo?.slug}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
