import { useEffect, useState } from "react";
import { CategoriesAPI } from "../../lib/api";

/**
 * Multi-select category chips. Returns array of category IDs.
 */
export default function CategorySelect({ value = [], onChange, required = true }) {
  const [opts, setOpts] = useState([]);

  useEffect(() => {
    let mounted = true;
    CategoriesAPI.list().then(r => {
      if (mounted) setOpts(r.data || []);
    });
    return () => { mounted = false; };
  }, []);

  const toggle = (id) => {
    const set = new Set(value);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange([...set]);
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        Categories {required && <span className="text-red-600">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {opts.map(c => {
          const active = value.includes(c._id);
          return (
            <button
              type="button"
              key={c._id}
              className={`px-3 py-1 rounded-full text-sm ${active ? "bg-indigo-600 text-white" : "border bg-white"}`}
              onClick={() => toggle(c._id)}
              title={c.description || c.name}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
