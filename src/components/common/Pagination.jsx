// src/components/common/Pagination.jsx
export default function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  const prev = () => page > 1 && onPage(page - 1);
  const next = () => page < pages && onPage(page + 1);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3), Math.max(0, page - 3) + 5
  );

  return (
    <div className="flex items-center gap-2 text-sm">
      <button className="px-3 py-1 rounded border" onClick={prev} disabled={page===1}>Prev</button>
      {nums.map(n => (
        <button
          key={n}
          className={`px-3 py-1 rounded border ${n===page ? "bg-indigo-600 text-white border-indigo-600" : ""}`}
          onClick={()=>onPage(n)}
        >{n}</button>
      ))}
      <button className="px-3 py-1 rounded border" onClick={next} disabled={page===pages}>Next</button>
    </div>
  );
}
