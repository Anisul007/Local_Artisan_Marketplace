import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUsers,
  FaGlobe,
  FaHeart,
  FaStore,
  FaHandshake,
  FaCheckCircle,
  FaLightbulb,
  FaLeaf,
  FaPaintBrush,
  FaShippingFast,
} from "react-icons/fa";
import { loadFeaturedVendors, vendorCardBlurb } from "../../lib/featuredVendors";

const brand = {
  purple: "#4b0082",
  orange: "#ff6600",
  yellow: "#ffd166",
};

const PLACEHOLDER = "/images/placeholder.svg";

export default function About() {
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadFeaturedVendors(6)
      .then((items) => {
        if (!cancelled) setVendors(items);
      })
      .finally(() => {
        if (!cancelled) setVendorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#4b0082] to-[#ff6600] text-white py-20">
        <div className="absolute inset-0">
          <img
            src="/images/about.webp"
            alt="Crafts background"
            className="h-full w-full object-cover opacity-20"
            fetchPriority="high"
          />
        </div>
        <div className="relative mx-auto max-w-5xl text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-extrabold mb-4"
          >
            About Artisan Avenue
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg max-w-2xl mx-auto"
          >
            Empowering artisans, connecting communities, and celebrating
            handmade creativity across Australia. Every stitch, brush stroke,
            and carve is part of a bigger story.
          </motion.p>
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
              and reach customers who truly value craftsmanship. <br /> <br />
              Fun fact: Did you know 72% of our vendors use recycled or
              eco-friendly materials? Every purchase you make supports local
              innovation while reducing environmental impact.
            </p>
          </div>
          <div className="grid gap-4">
            <img
              src="/images/join.webp"
              alt="Our Mission"
              loading="lazy"
              className="rounded-2xl shadow-lg"
            />
            <img
              src="/images/community.webp"
              alt="Community"
              loading="lazy"
              className="rounded-2xl shadow-lg hidden md:block"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-[#ffd166]/40 to-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
          {[
            { num: "500+", text: "Active Vendors Across Australia" },
            { num: "10k+", text: "Unique Handmade Products" },
            { num: "85%", text: "Eco-friendly & Sustainable Crafts" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="bg-white rounded-2xl shadow-lg p-8"
            >
              <h3 className="text-4xl font-extrabold text-[#ff6600]">
                {s.num}
              </h3>
              <p className="mt-2 text-gray-700">{s.text}</p>
            </motion.div>
          ))}
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
                whileHover={{ scale: 1.05 }}
                className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-gray-100 transition"
              >
                <div className="text-3xl text-[#ff6600] mb-3">{v.icon}</div>
                <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
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
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100 hover:shadow-lg transition"
              >
                <div className="text-3xl text-[#ff6600] mb-3">{f.icon}</div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Vendors */}
      <section className="py-16 bg-gradient-to-r from-[#4b0082]/90 to-[#ff6600]/90 text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-3">Meet the Vendors</h2>
          <p className="mb-10 max-w-2xl mx-auto text-sm text-white/90">
            Click a maker to view their full profile — bio, products, and customer reviews.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
            {vendorsLoading
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="rounded-2xl bg-white/10 backdrop-blur-sm p-6 animate-pulse">
                    <div className="w-full h-40 bg-white/20 rounded-xl mb-4" />
                    <div className="h-5 bg-white/20 rounded w-2/3 mx-auto" />
                    <div className="h-3 bg-white/20 rounded w-full mt-3" />
                  </div>
                ))
              : vendors.length === 0
              ? (
                  <p className="col-span-full text-white/90">
                    Featured makers will appear here once vendors publish active listings.{" "}
                    <Link to="/for-vendors" className="underline font-semibold">
                      Become a vendor
                    </Link>
                  </p>
                )
              : vendors.map((v, i) => (
                  <motion.div key={v.id} whileHover={{ scale: 1.03 }} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={`/makers/${v.id}?tab=about`}
                      className="block rounded-2xl bg-white/10 backdrop-blur-sm p-6 shadow-sm text-left hover:bg-white/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <div className="w-full h-40 rounded-xl mb-4 overflow-hidden bg-white/20 flex items-center justify-center">
                        <img
                          src={v.logoUrl || PLACEHOLDER}
                          alt={v.businessName || "Vendor"}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER;
                          }}
                        />
                      </div>
                      <h3 className="text-lg font-bold text-center">{v.businessName || "Vendor"}</h3>
                      {v.primaryCategories?.[0] && (
                        <p className="text-xs text-center text-white/70 mt-1 capitalize">
                          {v.primaryCategories[0].replace(/-/g, " ")}
                        </p>
                      )}
                      <p className="text-sm opacity-90 mt-3 text-center line-clamp-3">{vendorCardBlurb(v)}</p>
                      <p className="mt-4 text-center text-sm font-semibold underline decoration-white/50">
                        View profile →
                      </p>
                    </Link>
                  </motion.div>
                ))}
          </div>
          {vendors.length > 0 && (
            <Link
              to="/for-vendors"
              className="mt-10 inline-block rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold hover:bg-white/25 transition"
            >
              Explore all vendor storefronts
            </Link>
          )}
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
          Together, let’s celebrate handmade creativity and build a sustainable
          future.
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
