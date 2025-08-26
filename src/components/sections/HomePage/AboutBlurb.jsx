import Reveal from "../../ux/Reveal";

export default function AboutBlurb() {
  return (
    <section className="section bg-[#3b7f78] text-white">
      <div className="container grid md:grid-cols-2 items-center gap-8">
        <Reveal>
          <div>
            <h4 className="uppercase tracking-wide opacity-90">Inspired Giving</h4>
            <h2 className="text-3xl font-bold mb-4">Handmade Gifts For Every Occasion</h2>
            <p className="mb-6 opacity-90">
              Discover curated fashion, vegan beauty, upcycled jewellery, ceramics, homewares,
              textiles, toys and more made by local artisans.
            </p>
            <a href="/about" className="border px-5 py-3 inline-block rounded-lg hover:bg-white hover:text-[#3b7f78]">
              About Us
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1} y={30}>
          <img src="/images/about.jpg" alt="About Makers" className="rounded-xl shadow-lg" />
        </Reveal>
      </div>
    </section>
  );
}

