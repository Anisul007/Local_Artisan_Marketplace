// src/components/shop/ProductCard.jsx
import { Link } from "react-router-dom";

export default function ProductCard({ item }) {
  const img = item.images?.find(i=>i.isPrimary)?.url || item.images?.[0]?.url;
  const money = (cents, cur="AUD") =>
    new Intl.NumberFormat(undefined,{style:"currency",currency:cur}).format((cents||0)/100);

  return (
    <Link to={`/product/${item.slug || item._id}`} className="block bg-white border rounded-xl overflow-hidden hover:shadow-md transition">
      <div className="aspect-square bg-gray-100">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src={img || "/images/placeholder.svg"} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/images/placeholder.svg"; }} />
      </div>
      <div className="p-3">
        <div className="line-clamp-1 font-medium">{item.title}</div>
        <div className="text-sm text-gray-600">{money(item.pricing?.priceCents, item.pricing?.currency)}</div>
        {item.inventory?.status === "oos" && (
          <div className="mt-1 text-xs text-amber-700">Out of stock</div>
        )}
      </div>
    </Link>
  );
}
