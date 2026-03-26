import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Reveal from "../../ux/Reveal";
import { PublicListingsAPI } from "../../../lib/api";

const PLACEHOLDER = "/images/placeholder.svg";

export default function Makers() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We don't have a dedicated public vendors endpoint, so derive brands from public listings.
    // This keeps the home page in sync with Shop Handmade products.
    PublicListingsAPI.browse({ page: 1, sort: "newest" })
      .then((res) => {
        const data = res?.data?.data ?? res?.data ?? {};
        const raw = Array.isArray(data?.items) ? data.items : [];
        const map = new Map();
        for (const p of raw) {
          const v = p?.vendor;
          const id = v?._id || v?.id;
          const name = v?.businessName || v?.displayName || v?.name;
          if (!id || !name) continue;
          if (map.has(String(id))) continue;
          map.set(String(id), {
            id: String(id),
            title: name,
            img: v?.logoUrl || v?.avatarUrl || "",
          });
        }
        setVendors(Array.from(map.values()).slice(0, 4));
      })
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, []);

  const cards = useMemo(() => {
    if (vendors.length > 0) return vendors;
    return [
      { id: "placeholder-1", title: "Local makers", img: "/images/m1.jpg" },
      { id: "placeholder-2", title: "Small-batch studios", img: "/images/m2.jpg" },
      { id: "placeholder-3", title: "Handcrafted goods", img: "/images/m3.jpg" },
      { id: "placeholder-4", title: "Independent brands", img: "/images/m4.jpg" },
    ];
  }, [vendors]);

  return (
    <section className="section">
      <div className="container">
        <h2 className="text-3xl font-bold mb-2">Handmade brands you’ll fall in love with.</h2>
        <p className="mb-6 text-gray-600 max-w-3xl">
          Behind every handcrafted item is a passionate Aussie Vendor working hard to create original designs.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {loading
            ? [1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-2xl overflow-hidden bg-white animate-pulse">
                  <div className="aspect-[16/9] bg-gray-200" />
                  <div className="p-3">
                    <div className="h-5 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))
            : cards.map((m, i) => (
                <Reveal key={m.id || m.title} delay={i * 0.05}>
                  <Link to={`/makers/${m.id}`} className="block border rounded-2xl overflow-hidden hover:shadow-lg transition">
                    <div className="aspect-[16/9] bg-gray-100">
                      <img
                        src={m.img || PLACEHOLDER}
                        alt={m.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = PLACEHOLDER;
                        }}
                      />
                    </div>
                    <div className="p-3 font-semibold">{m.title}</div>
                  </Link>
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  );
}

