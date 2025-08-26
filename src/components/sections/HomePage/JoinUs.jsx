import Reveal from "../../ux/Reveal";

export default function JoinUs() {
  return (
    <section className="section bg-[#3b7f78] text-white">
      <div className="container grid md:grid-cols-2 items-center gap-8">
        <Reveal>
          <div>
            <h4 className="uppercase tracking-wide opacity-90">Looking to sell?</h4>
            <h2 className="text-3xl font-bold mb-4">
              Join the Marketplace and get your brand in the hands of Australia’s conscious consumers.
            </h2>
            <p className="mb-6 opacity-90">
              Opportunity for Aussie makers, designers & creatives to sell, learn & connect.
            </p>
            <a href="/register" className="border px-5 py-3 inline-block rounded-lg hover:bg-white hover:text-[#3b7f78]">
              Find Out More
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1} y={30}>
          <img src="/images/join.jpg" alt="Join Makers" className="rounded-xl shadow-lg" />
        </Reveal>
      </div>
    </section>
  );
}

