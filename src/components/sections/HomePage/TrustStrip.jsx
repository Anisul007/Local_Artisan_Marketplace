import Reveal from "../../ux/Reveal";
export default function TrustStrip() {
  const items = [
    "New Aussie Makers added every week!",
    "Unique, novel & customisable gift ideas",
    "Ethically-driven brands for conscious consumers",
  ];
  return (
    <section className="bg-[#3b7f78] text-white py-4">
      <Reveal>
        <div className="container grid md:grid-cols-3 gap-3 text-center">
          {items.map((t) => (
            <div key={t} className="rounded-xl py-3 bg-white/10 hover:bg-white/15 transition">{t}</div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
