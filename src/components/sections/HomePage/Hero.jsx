import { useState, useEffect } from "react";
import Reveal from "../../ux/Reveal";

// Eight hero images (first is local; rest placeholder – replace with your final assets)
const HERO_SLIDES = [
  "/images/hero.png",
  "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=1600&q=80",
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=80",
  "https://images.unsplash.com/photo-1602874801006-4e411eaa806b?w=1600&q=80",
  "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?w=1600&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=80",
  "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=1600&q=80",
  "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1600&q=80",
];

const SLIDE_DURATION_MS = 5000;
const TRANSITION_MS = 700;

// Strip has real slides + clone of first so we can animate 8→1 seamlessly, then jump back
const SLIDES_STRIP = [...HERO_SLIDES, HERO_SLIDES[0]];
const N = HERO_SLIDES.length;

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);

  useEffect(() => {
    const advance = () => {
      setIndex((prev) => {
        if (prev === N - 1) {
          // Go to clone of first (index N) so slide animates left to "first" again
          return N;
        }
        return prev + 1;
      });
    };

    const t = setInterval(advance, SLIDE_DURATION_MS);
    return () => clearInterval(t);
  }, []);

  // When we land on the clone (index N), after the transition instantly reset to 0 so loop is seamless
  useEffect(() => {
    if (index !== N) return;

    const tid = setTimeout(() => {
      setEnableTransition(false);
      setIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEnableTransition(true));
      });
    }, TRANSITION_MS);

    return () => clearTimeout(tid);
  }, [index]);

  return (
    <section className="relative min-h-[70vh] grid place-items-center overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 flex"
        style={{
          width: `${SLIDES_STRIP.length * 100}%`,
          transform: `translateX(-${(index / SLIDES_STRIP.length) * 100}%)`,
          transition: enableTransition ? `transform ${TRANSITION_MS}ms ease-out` : "none",
        }}
      >
        {SLIDES_STRIP.map((src, i) => (
          <div
            key={i}
            className="shrink-0 bg-cover bg-center"
            style={{
              width: `${100 / SLIDES_STRIP.length}%`,
              backgroundImage: `url(${src})`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-black/25" />
      <Reveal>
        <div className="relative z-10 bg-white/80 backdrop-blur p-8 rounded-xl max-w-xl mx-4">
          <h4 className="uppercase tracking-[0.25em] text-gray-600">The Make It Collective</h4>
          <h1 className="text-4xl font-bold mt-2">Australia's Home of Handmade</h1>
          <p className="mt-3 text-gray-700">
            Your go-to marketplace for locally handcrafted products, small batch and unique creations.
          </p>
          <div className="flex gap-4 mt-5">
            <a href="/shop" className="px-6 py-3 rounded-xl bg-orange-700 text-white font-semibold hover:bg-orange-800">
              Shop Handmade
            </a>
            <a href="/for-vendors" className="px-6 py-3 rounded-xl border-2 border-orange-700 text-orange-800 font-semibold hover:bg-orange-50">
              For Vendors
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
