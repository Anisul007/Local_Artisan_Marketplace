import Reveal from "../../ux/Reveal";

export default function Makers() {
  const items = [
    { title: "Next Romance Jewellery", img: "/images/m1.jpg" },
    { title: "Roving Design",          img: "/images/m2.jpg" },
    { title: "Tiger and Hare",         img: "/images/m3.jpg" },
    { title: "High Tees",              img: "/images/m4.jpg" },
  ];
  return (
    <section className="section">
      <div className="container">
        <h2 className="text-3xl font-bold mb-2">Handmade brands you’ll fall in love with.</h2>
        <p className="mb-6 text-gray-600 max-w-3xl">
          Behind every handcrafted item is a passionate Aussie Maker working hard to create original designs.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {items.map((m, i) => (
            <Reveal key={m.title} delay={i * 0.05}>
              <a className="block border rounded-2xl overflow-hidden hover:shadow-lg transition">
                <div className="aspect-[16/9] bg-gray-100">
                  <img src={m.img} alt={m.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 font-semibold">{m.title}</div>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

