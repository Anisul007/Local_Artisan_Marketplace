// src/components/sections/HomePage/Categories.jsx
import { Link } from "react-router-dom";
import Reveal from "../../ux/Reveal";

const cats = [
  { name: "Accessories",   slug: "accessories", img: "/images/cat-accessories.jpg" },
  { name: "Art & Prints",  slug: "art-prints",  img: "/images/cat-art.jpg" },
  { name: "Body & Beauty", slug: "body-beauty", img: "/images/cat-beauty.jpg" },
  { name: "Fashion",       slug: "fashion",     img: "/images/cat-fashion.jpg" },
  { name: "Home",          slug: "home",        img: "/images/cat-home.jpg" },
  { name: "Jewellery",     slug: "jewellery",   img: "/images/cat-jewellery.jpg" },
  { name: "Kids",          slug: "kids",        img: "/images/cat-kids.jpg" },
  { name: "Occasion",      slug: "occasion",    img: "/images/cat-occasion.jpg" },
  { name: "Pantry",        slug: "pantry",      img: "/images/cat-pantry.jpg" },
  { name: "Pets",          slug: "pets",        img: "/images/cat-pets.jpg" },
];

export default function Categories() {
  return (
    <section className="section">
      <div className="container flex items-center justify-between mb-6">
        <h2 className="text-4xl font-extrabold">Shop by category</h2>
        <Link to="/shop" className="text-orange-700 font-semibold hover:underline">VIEW ALL</Link>
      </div>

      <div className="container grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {cats.map((c, i) => (
          <Reveal key={c.name} delay={i * 0.05} y={18}>
            <Link
              to={`/shop?category=${encodeURIComponent(c.slug)}`}
              className="group block rounded-2xl overflow-hidden border bg-white transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* image */}
                <img
                  src={c.img}
                  alt={c.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { e.currentTarget.src = "/images/fallback.svg"; }}
                />

                {/* hover fade over entire tile */}
                <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-60" />

                {/* ALWAYS visible label (above overlay) */}
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <span
                    className="px-6 py-2 rounded-md bg-orange-800/85 text-white text-lg font-semibold shadow-md
                               transition transform group-hover:scale-105"
                  >
                    {c.name}
                  </span>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}



