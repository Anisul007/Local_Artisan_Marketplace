import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ReportAbuseForm from "../../components/ReportAbuseForm";
import { AbuseReportsAPI } from "../../lib/api";
import { useEffect, useState } from "react";

const STATUS_LABEL = { new: "Submitted", in_review: "In review", resolved: "Resolved" };

export default function ReportAbusePage() {
  const { user, loading } = useAuth();
  const [sp] = useSearchParams();
  const [mine, setMine] = useState([]);

  const targetType = sp.get("targetType") || sp.get("type") || "other";
  const targetId = sp.get("targetId") || sp.get("id") || "";
  const targetLabel = sp.get("targetLabel") || sp.get("label") || "";
  const lockTarget = Boolean(targetId && targetType !== "other");

  useEffect(() => {
    if (!user) return;
    AbuseReportsAPI.listMine()
      .then((r) => {
        const d = r?.data?.data ?? r?.data ?? {};
        if (r?.ok && Array.isArray(d.items)) setMine(d.items);
      })
      .catch(() => {});
  }, [user]);

  if (loading) {
    return <main className="max-w-3xl mx-auto px-4 py-12"><div className="h-32 rounded-xl bg-gray-200 animate-pulse" /></main>;
  }
  if (!user) return <Navigate to={`/login?next=/account/report-abuse${window.location.search}`} replace />;
  if (user.role === "vendor") return <Navigate to={`/vendor/report-abuse${window.location.search}`} replace />;

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-gray-900">Report abuse or a policy issue</h1>
      <p className="mt-1 text-gray-600">Reports go to our admin team for review.</p>

      <div className="mt-6">
        <ReportAbuseForm
          audience="customer"
          initialTargetType={targetType}
          initialTargetId={targetId}
          initialTargetLabel={targetLabel}
          lockTarget={lockTarget}
          backTo="/account"
          backLabel="Back to dashboard"
        />
      </div>

      {mine.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Your recent reports</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((r) => (
              <li key={r._id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="font-medium text-gray-900">{r.reason}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {r.targetType !== "other" ? `${r.targetType}${r.targetLabel ? `: ${r.targetLabel}` : ""} · ` : ""}
                  {STATUS_LABEL[r.status] || r.status} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
