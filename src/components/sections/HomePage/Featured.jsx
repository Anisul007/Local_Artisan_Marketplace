import { useState } from "react";
import Reveal from "../../ux/Reveal";
import Modal from "../../ux/Modal";

const products = [
  { name: "Thinking of you… Card",       price: 5.95, img: "/images/prod1.jpg" },
  { name: "Wine themed Birthday Card",   price: 5.95, img: "/images/prod2.jpg" },
  { name: "Golf themed Birthday Card",   price: 5.95, img: "/images/prod3.jpg" },
  { name: "Happy Birthday Card",         price: 5.95, img: "/images/prod4.jpg" },
];

export default function Featured() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);

  return (
    <section className="section">
      <div className="container">
        <h2 className="text-3xl font-bold mb-6">Featured Products</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.05} y={18}>
              <div className="border rounded-2xl overflow-hidden bg-white p-3
                              hover:shadow-xl hover:-translate-y-1 transition">
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden rounded-xl">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="mt-3">
                  <div className="text-orange-700 font-bold">${p.price.toFixed(2)}</div>
                  <div className="font-semibold">{p.name}</div>
                </div>
                <button className="mt-3 w-full rounded-xl border py-2 hover:bg-gray-50"
                        onClick={() => { setSel(p); setOpen(true); }}>
                  Quick view
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)}>
        {sel && (
          <div className="grid grid-cols-[1fr_1.2fr] gap-4">
            <img src={sel.img} alt={sel.name} className="rounded-xl" />
            <div>
              <h3 className="text-xl font-bold">{sel.name}</h3>
              <div className="text-orange-700 font-bold mt-1">${sel.price.toFixed(2)}</div>
              <p className="mt-2 text-gray-600">Small-batch, slow-made by a local maker.</p>
              <button className="mt-4 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold">
                Add to cart
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
