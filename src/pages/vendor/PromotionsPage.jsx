export default function PromotionsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <h1 className="text-xl font-extrabold text-gray-900">Promotions</h1>
        <p className="text-sm text-gray-600">Create coupon codes or sale events.</p>
      </div>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="text-sm text-gray-600">No promotions yet.</div>
      </div>
    </div>
  );
}
