// frontend/src/pages/ForMakers.jsx
// For Makers page with hardcoded brand colors (purple, orange, yellow)

import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaStore, FaTruck, FaDollarSign, FaUsers, FaChevronDown } from "react-icons/fa";

const brand = {
  purple: "#4b0082",
  orange: "#ff6600",
  yellow: "#ffd166",
};

const FAQS = [
  { q: "How do I become a vendor?", a: "Click 'Join as a Vendor' and complete the registration form with your business details. Our team will verify and approve you within ~48 hours." },
  { q: "Is there a fee to list my products?", a: "We charge a small commission per sale. There are no upfront listing fees—vendors earn as they sell." },
  { q: "How do I manage orders and inventory?", a: "You’ll get a personalized dashboard where you can track orders, manage stock, set discounts, and communicate with customers." },
  { q: "Do you handle shipping?", a: "Yes, we integrate with local couriers. You can choose self-shipping or use our partnered rates." }
];

export default function ForMakersPage() {
  const [open, setOpen] = useState(null);

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#333", minHeight: "100vh" }}>
      {/* Hero */}
     <section
  style={{
    backgroundImage: `linear-gradient(
      rgba(75, 0, 130, 0.8),   /* purple with 80% opacity */
      rgba(255, 102, 0, 0.8)   /* orange with 80% opacity */
    ), url("/images/makers-bg.jpg")`, // put your hero bg image in public/images
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  <div className="container py-20 md:py-28 text-center">
    <motion.h1
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      style={{ color: "#fff" }}
      className="text-4xl md:text-6xl font-extrabold"
    >
      Empowering Local Vendors
    </motion.h1>
    <p className="mt-4 max-w-2xl mx-auto text-lg text-white">
      Join Artisan Avenue and showcase your creations to customers who value craftsmanship and sustainability.
    </p>
    <div className="mt-8 flex justify-center gap-4">
      <a
        href="/register?role=vendor"
        style={{ backgroundColor: "#ffd166", color: "#4b0082" }} // yellow btn, purple text
        className="px-6 py-3 rounded-xl font-semibold shadow hover:opacity-90"
      >
        Join as a Vendor
      </a>
      <a
        href="/contact"
        style={{
          border: "1px solid #ffd166",
          color: "#fff",
          backgroundColor: "transparent",
        }}
        className="px-6 py-3 rounded-xl hover:bg-[#ff6600] hover:text-white"
      >
        Contact Us
      </a>
    </div>
  </div>
</section>



      {/* How it works */}
      <section className="container py-14">
        <h2 style={{ color: brand.purple }} className="text-2xl md:text-3xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: "Apply", desc: "Tell us about your brand and products. Approvals in ~48 hours.", Icon: FaUsers },
            { title: "Set Up Shop", desc: "Create listings, set stock & pricing, and customize your storefront.", Icon: FaStore },
            { title: "Start Selling", desc: "Manage orders, print labels, and ship with integrated couriers.", Icon: FaTruck }
          ].map(({ title, desc, Icon }, i) => (
            <div key={i} className="rounded-2xl p-6 transition shadow" style={{ backgroundColor: brand.yellow + "20", border: `1px solid ${brand.yellow}` }}>
              <div className="flex items-center gap-3">
                <Icon style={{ color: brand.orange }} className="text-3xl" />
                <h3 style={{ color: brand.purple }} className="font-semibold text-lg">{title}</h3>
              </div>
              <p style={{ color: "#555" }} className="mt-2 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="container pb-4 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {[{
          Icon: FaStore, title: "Your Own Storefront", desc: "Customize your shop, upload products, and tell your brand story."
        },{
          Icon: FaDollarSign, title: "Fair Earnings", desc: "Low commission model ensures you keep most of what you earn."
        },{
          Icon: FaTruck, title: "Simplified Logistics", desc: "Access discounted shipping or manage your own deliveries."
        },{
          Icon: FaUsers, title: "Community Support", desc: "Connect with fellow vendors, share tips, and grow together."
        }].map(({ Icon, title, desc }, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} className="rounded-2xl p-6 transition shadow"
            style={{ backgroundColor: "#fff", border: `1px solid ${brand.purple}30` }}>
            <Icon style={{ color: brand.orange }} className="text-3xl mb-3" />
            <h3 style={{ color: brand.purple }} className="font-semibold">{title}</h3>
            <p style={{ color: "#555" }} className="text-sm mt-2">{desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Testimonials */}
      <section style={{ backgroundColor: brand.yellow + "30" }} className="py-16">
        <div className="container">
          <h2 style={{ color: brand.purple }} className="text-2xl md:text-3xl font-bold text-center mb-10">What Vendors Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-6 transition shadow"
                style={{ backgroundColor: "#fff", border: `1px solid ${brand.orange}40` }}>
                <p style={{ color: "#333" }} className="italic">“Artisan Avenue gave me visibility I couldn’t get alone. My sales tripled in 3 months.”</p>
                <div style={{ color: brand.orange }} className="mt-4 text-sm font-semibold">— Vendor {i}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <h2 style={{ color: brand.purple }} className="text-2xl md:text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl overflow-hidden shadow" style={{ backgroundColor: "#fff", border: `1px solid ${brand.purple}40` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex justify-between items-center px-5 py-3 text-left"
                style={{ color: "#333" }}
              >
                <span>{faq.q}</span>
                <FaChevronDown className={`transition-transform ${open === i ? "rotate-180" : ""}`} style={{ color: open === i ? brand.orange : "#999" }} />
              </button>
              {open === i && <div style={{ color: "#555" }} className="px-5 pb-4 text-sm">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl p-8 text-center shadow" style={{ backgroundColor: brand.purple, color: "#fff" }}>
          <h3 className="text-2xl font-bold">Ready to showcase your craft?</h3>
          <p style={{ color: brand.yellow }} className="mt-2">Join our growing marketplace of vendors and reach customers nationwide.</p>
          <a href="/register?role=vendor" className="mt-6 inline-block px-6 py-3 rounded-xl font-semibold hover:opacity-90"
             style={{ backgroundColor: brand.orange, color: "#fff" }}>
            Become a Vendor
          </a>
        </div>
      </section>
    </div>
  );
}


