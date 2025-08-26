import Reveal from "../../ux/Reveal";

export default function Testimonials() {
  const cards = [
    {
      title: "Get found and be a part of a motivated group of creatives",
      text: "When I ask customers how they found out about my business, 4 out of 5 will say The Make It Collective...",
      author: "Jayde — A Little Coy",
    },
    {
      title: "Built our brand presence",
      text: "Being part of The Make It Collective has helped build our brand’s presence online...",
      author: "Lhasa & Yomi — Snafu Design",
    },
  ];
  return (
    <section className="section">
      <h2 className="text-3xl font-bold text-center mb-10">Testimonials</h2>
      <div className="container grid md:grid-cols-2 gap-8">
        {cards.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.05}>
            <div className="bg-gray-50 p-6 rounded-xl border">
              <h3 className="font-semibold text-xl">{c.title}</h3>
              <p className="text-gray-600 mt-3">{c.text}</p>
              <div className="mt-4 text-sm text-gray-700">{c.author}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

