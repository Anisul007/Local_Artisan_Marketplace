import { useEffect, useState } from "react";
import { AdminAPI } from "../../lib/api";

export default function AdminCatalogPage() {
  const [cats, setCats] = useState([]);
  const [brands, setBrands] = useState([]);
  const [catName, setCatName] = useState("");
  const [brandName, setBrandName] = useState("");

  async function load() {
    const [c, b] = await Promise.all([AdminAPI.categories().catch(() => null), AdminAPI.brands().catch(() => null)]);
    setCats(Array.isArray((c?.data?.data ?? c?.data ?? {}).items) ? (c.data.data ?? c.data).items : []);
    setBrands(Array.isArray((b?.data?.data ?? b?.data ?? {}).items) ? (b.data.data ?? b.data).items : []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="admin-card">
        <h1 className="text-lg font-bold text-white">Category Management</h1>
        <div className="mt-2 flex gap-2">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="New category name" className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
          <button
            onClick={async () => {
              if (!catName.trim()) return;
              await AdminAPI.createCategory({ name: catName.trim() });
              setCatName("");
              await load();
            }}
            className="admin-btn admin-btn-sm admin-btn-brand"
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {cats.map((c) => (
            <div key={c._id} className="flex items-center justify-between admin-row px-3 py-2 text-sm">
              <div className="text-gray-900">{c.name}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await AdminAPI.updateCategory(c._id, { isVisible: !c.isVisible });
                    await load();
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900"
                >
                  {c.isVisible ? "Hide" : "Show"}
                </button>
                <button onClick={async () => { await AdminAPI.deleteCategory(c._id); await load(); }} className="admin-btn admin-btn-sm admin-btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <h1 className="text-lg font-bold text-white">Brand Management</h1>
        <div className="mt-2 flex gap-2">
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="New brand name" className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400" />
          <button
            onClick={async () => {
              if (!brandName.trim()) return;
              await AdminAPI.createBrand({ name: brandName.trim() });
              setBrandName("");
              await load();
            }}
            className="admin-btn admin-btn-sm admin-btn-brand"
          >
            Add
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {brands.map((b) => (
            <div key={b._id} className="flex items-center justify-between admin-row px-3 py-2 text-sm">
              <div className="text-gray-900">{b.name}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await AdminAPI.updateBrand(b._id, { isVisible: !b.isVisible });
                    await load();
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900"
                >
                  {b.isVisible ? "Hide" : "Show"}
                </button>
                <button onClick={async () => { await AdminAPI.deleteBrand(b._id); await load(); }} className="admin-btn admin-btn-sm admin-btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
