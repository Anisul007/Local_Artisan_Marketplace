import Reveal from "../../ux/Reveal";

export default function Hero() {
  return (
    <section
      className="relative bg-cover bg-center min-h-[70vh] grid place-items-center overflow-hidden"
      style={{ backgroundImage: "url('/images/hero.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Reveal>
        <div className="relative bg-white/80 backdrop-blur p-8 rounded-xl max-w-xl">
          <h4 className="uppercase tracking-[0.25em] text-gray-600">The Make It Collective</h4>
          <h1 className="text-4xl font-bold mt-2">Australia’s Home of Handmade</h1>
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

