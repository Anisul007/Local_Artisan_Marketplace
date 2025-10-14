import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PublicListingsAPI } from "../lib/api";

function money(cents, cur = "AUD") {
  if (typeof cents !== "number") return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(cents / 100);
}

export default function Product() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    PublicListingsAPI.bySlug(slug).then(r => setItem(r.data)).catch(e => setErr(e.message || "Not found"));
  }, [slug]);

  if (err) return <div className="p-6">{err}</div>;
  if (!item) return <div className="p-6">Loading…</div>;

  const img = item.images?.find(i => i.isPrimary);

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-6">
      <div className="border rounded overflow-hidden bg-gray-100 aspect-square">
        {img?.url
          ? <img src={img.url} alt={img.alt || item.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-400">No image</div>
        }
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">{item.title}</h1>
        <div className="text-xl mb-4">{money(item.pricing?.priceCents, item.pricing?.currency)}</div>
        <p className="text-gray-700 leading-relaxed mb-6">{item.description}</p>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded bg-gray-900 text-white">Add to cart</button>
          <button className="px-4 py-2 rounded border">Wishlist</button>
        </div>
      </div>
    </div>
  );
}
