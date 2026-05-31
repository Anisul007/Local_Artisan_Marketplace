import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Loader2 } from "lucide-react";
import { AbuseReportsAPI } from "../lib/api";

const CUSTOMER_REASONS = [
  "Fraudulent or misleading listing",
  "Counterfeit or prohibited item",
  "Harassment or abusive behavior",
  "Order or payment problem",
  "Other",
];

const VENDOR_REASONS = [
  "Abusive or threatening customer",
  "Fraudulent order or chargeback risk",
  "Buyer policy violation",
  "Spam or harassment",
  "Other",
];

const CUSTOMER_TARGETS = [
  { value: "listing", label: "Product / listing" },
  { value: "vendor", label: "Seller / vendor shop" },
  { value: "order", label: "Order" },
  { value: "other", label: "Other" },
];

const VENDOR_TARGETS = [
  { value: "order", label: "Order" },
  { value: "customer", label: "Customer account" },
  { value: "listing", label: "Another listing (marketplace)" },
  { value: "other", label: "Other" },
];

const inputClass =
  "mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100";

export default function ReportAbuseForm({
  audience = "customer",
  initialTargetType = "other",
  initialTargetId = "",
  initialTargetLabel = "",
  lockTarget = false,
  backTo = "/account",
  backLabel = "Back to dashboard",
}) {
  const reasons = audience === "vendor" ? VENDOR_REASONS : CUSTOMER_REASONS;
  const targetOptions = audience === "vendor" ? VENDOR_TARGETS : CUSTOMER_TARGETS;

  const [targetType, setTargetType] = useState(initialTargetType || "other");
  const [targetId, setTargetId] = useState(initialTargetId || "");
  const [targetLabel, setTargetLabel] = useState(initialTargetLabel || "");
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const needsReference = targetType !== "other";
  const detailsLeft = useMemo(() => 4000 - details.length, [details]);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErr("");
    setOk("");
    if (!reason.trim()) return setErr("Please choose a reason.");
    if (needsReference && !targetId.trim()) return setErr("Please enter the reference ID for this report.");
    if (details.length > 4000) return setErr("Details are too long (4000 characters max).");

    setSubmitting(true);
    try {
      const r = await AbuseReportsAPI.create({
        targetType,
        targetId: targetId.trim(),
        targetLabel: targetLabel.trim(),
        reason: reason.trim(),
        details: details.trim(),
      });
      if (!r?.ok) throw new Error(r?.data?.message || "Could not submit report");
      setOk(r?.data?.message || "Report submitted. Thank you.");
      if (!lockTarget) {
        setTargetType("other");
        setTargetId("");
        setTargetLabel("");
      }
      setDetails("");
    } catch (e) {
      setErr(e?.message || "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Report a concern</h2>
          <p className="mt-1 text-sm text-gray-600">
            Use this form for safety, fraud, harassment, or policy issues. False reports may lead to account action.
          </p>
        </div>
      </div>

      {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      {ok && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{ok}</div>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          What are you reporting?
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value)}
            disabled={lockTarget}
            className={inputClass}
          >
            {targetOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {needsReference && (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Reference ID
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                readOnly={lockTarget && Boolean(initialTargetId)}
                placeholder="Order, listing, or user ID"
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Short label (optional)
              <input
                value={targetLabel}
                onChange={(e) => setTargetLabel(e.target.value)}
                readOnly={lockTarget && Boolean(initialTargetLabel)}
                placeholder="e.g. Order #1042 or product name"
                className={inputClass}
              />
            </label>
          </>
        )}

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Reason
          <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass}>
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700 sm:col-span-2">
          Details
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={5}
            placeholder="What happened? Include dates, order numbers, and any evidence we should know."
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-gray-500">{detailsLeft} characters left</span>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4b0082] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit report
        </button>
        <Link to={backTo} className="text-sm font-semibold text-purple-700 hover:underline">
          {backLabel}
        </Link>
      </div>
    </form>
  );
}
