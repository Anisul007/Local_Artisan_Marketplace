import { motion } from "framer-motion";
import {
  FaUsers,
  FaGlobe,
  FaHeart,
  FaStore,
  FaHandshake,
  FaCheckCircle,
  FaLightbulb,
} from "react-icons/fa";

const brand = {
  purple: "#4b0082",
  orange: "#ff6600",
  yellow: "#ffd166",
};

export default function About() {
  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#4b0082] to-[#ff6600] text-white py-20">
        <div className="absolute inset-0">
          <img
            src="/images/about.jpg"
            alt="Crafts background"
            className="h-full w-full object-cover opacity-20"
          />
        </div>
        <div className="relative mx-auto max-w-5xl text-center px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            About Artisan Avenue
          </h1>
          <p className="text-lg max-w-2xl mx-auto">
            Empowering artisans, connecting communities, and celebrating
            handmade creativity across Australia.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-[#4b0082]">
              Our Mission
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed">
              Artisan Avenue was founded to bridge the gap between passionate
              vendors and conscious buyers. Every handcrafted item tells a story
              — of tradition, creativity, and sustainability. Our mission is to
              give artisans a digital home where they can showcase their talents
              and reach customers who truly value craftsmanship.
            </p>
          </div>
          <img
            src="/images/join.jpg"
            alt="Our Mission"
            className="rounded-2xl shadow-lg"
          />
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gradient-to-br from-[#ffd166]/30 to-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12 text-[#4b0082]">Our Values</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <FaHeart />,
                title: "Passion",
                text: "We celebrate creativity and uniqueness in every product.",
              },
              {
                icon: <FaUsers />,
                title: "Community",
                text: "Connecting local vendors with customers who care.",
              },
              {
                icon: <FaGlobe />,
                title: "Sustainability",
                text: "Encouraging ethical, eco-friendly production.",
              },
              {
                icon: <FaHandshake />,
                title: "Trust",
                text: "Building long-lasting relationships with artisans and buyers.",
              },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
              >
                <div className="text-3xl text-[#ff6600] mb-3">{v.icon}</div>
                <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12 text-[#4b0082]">
            Why Choose Artisan Avenue?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaCheckCircle />,
                title: "Authentic Products",
                text: "Every item is crafted by real artisans, not mass-produced.",
              },
              {
                icon: <FaLightbulb />,
                title: "Unique Creativity",
                text: "Find original designs you won’t see anywhere else.",
              },
              {
                icon: <FaStore />,
                title: "Support Local",
                text: "Your purchases directly empower small businesses and creators.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
              >
                <div className="text-3xl text-[#ff6600] mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEW: Meet the Makers Section */}
      <section className="py-16 bg-gradient-to-r from-[#4b0082]/90 to-[#ff6600]/90 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-12">Meet the Vendors</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((m) => (
              <div
                key={m}
                className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 shadow-sm"
              >
                <img
                  src={`/images/m${m}.jpg`}
                  alt={`Vendor ${m}`}
                  className="w-full h-40 object-cover rounded-xl mb-4"
                />
                <h3 className="text-lg font-bold">Artisan {m}</h3>
                <p className="text-sm opacity-80">
                  Specialist in handmade crafts, creating timeless pieces.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#4b0082]">
            Our Journey
          </h2>
          <div className="space-y-8 max-w-3xl mx-auto">
            {[
              {
                year: "2024",
                text: "Artisan Avenue was launched to provide a digital home for local artisans.",
              },
              {
                year: "2025",
                text: "We expanded with vendor dashboards and tools to empower sellers.",
              },
              {
                year: "Future",
                text: "Our goal is to grow into the #1 platform for artisans in Australia and beyond.",
              },
            ].map((j, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-[#ff6600] text-white grid place-items-center font-bold text-lg">
                  {j.year}
                </div>
                <p className="text-gray-700 leading-relaxed">{j.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-[#ff6600] to-[#ffd166] text-center text-white">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Join the Movement
        </h2>
        <p className="max-w-2xl mx-auto mb-6 text-lg">
          Whether you’re a creator looking to showcase your craft or a customer
          searching for unique handmade treasures, Artisan Avenue is your home.
        </p>
        <a
          href="/register"
          className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-[#ff6600] hover:bg-gray-100"
        >
          Get Started
        </a>
      </section>
    </main>
  );
}
