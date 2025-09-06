import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  Loader2,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle,
  ShieldCheck,
  Truck,
  CreditCard,
} from "lucide-react";

/**
 * ContactPage.jsx — a polished, interactive Contact page for a dark theme site
 * - Tailwind CSS for styling (dark-first, pairs with your current palette)
 * - Framer Motion for tasteful micro‑interactions
 * - Client-side form validation + loading state (replace handleSubmit with your API)
 * - Copy-to-clipboard on contact chips
 * - FAQ accordion
 * - Map embed hero (replace src with your location)
 */

const inputBase =
  "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/20 transition";

const Section = ({ children, className = "" }) => (
  <section className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>{children}</section>
);

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const remaining = useMemo(() => 800 - form.message.length, [form.message]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.message.trim()) e.message = "Say hello—write a quick message.";
    if (form.message.length > 800) e.message = "Message is too long (800 max).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    try {
      setSubmitting(true);
      // TODO: hook up to your backend / Formspree / EmailJS
      await new Promise((r) => setTimeout(r, 1200));
      setToast("Thanks! We received your message.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setToast("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setTimeout(() => setToast(""), 2800);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard ✨");
      setTimeout(() => setToast(""), 1800);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0d1220] text-gray-100">
      {/* Hero with map */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
        <iframe
          title="Adelaide Handmade Market"
          className="w-full h-[42vh] md:h-[56vh] grayscale-[25%] contrast-125 brightness-90"
          src="https://maps.google.com/maps?q=Adelaide%20handmade%20market%20Adelaide%20SA&z=14&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <Section className="-mt-16 md:-mt-24 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-3 gap-6"
          >
            {/* Card: address */}
            <InfoCard
              icon={<MapPin className="w-5 h-5" />}
              title="Visit us"
              lines={["123 Maker Lane", "Melbourne, VIC 3000"]}
              action={{ label: "Get directions", href: "https://maps.google.com/?q=Adelaide%20handmade%20market%20Adelaide%20SA" }}
            />
            {/* Card: hours */}
            <InfoCard
              icon={<Clock className="w-5 h-5" />}
              title="Hours"
              lines={["Mon–Fri 9:00–17:30", "Sat 10:00–15:00", "Sun Closed"]}
            />
            {/* Card: contact quick actions */}
            <InfoCard
              icon={<Phone className="w-5 h-5" />}
              title="Contact"
              lines={["(+61) 04 1234 5678", "hello@artisanavenue.au"]}
              actions={[
                { label: "Copy phone", onClick: () => copy("+61412345678") },
                { label: "Copy email", onClick: () => copy("hello@artisanavenue.au") },
              ]}
            />
          </motion.div>
        </Section>
      </div>

      {/* Contact form */}
      <Section className="py-14 md:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5 }}
            className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 md:p-8 shadow-xl shadow-black/20"
          >
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-semibold">Let's make something beautiful</h2>
              <p className="mt-1 text-gray-400">Questions, commissions, wholesale—drop us a line and we’ll be in touch.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Name"
                  error={errors.name}
                  children={
                    <input
                      className={inputBase}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Maker"
                    />
                  }
                />
                <Field
                  label="Email"
                  error={errors.email}
                  children={
                    <input
                      className={inputBase}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      type="email"
                    />
                  }
                />
              </div>
              <Field
                label="Subject"
                error={errors.subject}
                children={
                  <input
                    className={inputBase}
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Custom order, press, partnership…"
                  />
                }
              />
              <Field
                label={
                  <div className="flex items-center justify-between">
                    <span>Message</span>
                    <span className={`text-xs ${remaining < 0 ? "text-rose-400" : "text-gray-400"}`}>
                      {remaining} chars
                    </span>
                  </div>
                }
                error={errors.message}
                children={
                  <textarea
                    rows={6}
                    className={`${inputBase} resize-none`}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us a bit about your idea…"
                  />
                }
              />

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-gray-900 font-semibold px-5 py-3 disabled:opacity-70"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Send message</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> We reply within 1–2 business days.
                </p>
              </div>
            </form>
          </motion.div>

          {/* Why contact / perks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="space-y-5"
          >
            <Bullet title="Custom pieces & commissions" icon={<MessageCircle className="w-5 h-5" />}>Work directly with makers to bring your idea to life.</Bullet>
            <Bullet title="Wholesale & stockists" icon={<Truck className="w-5 h-5" />}>We partner with boutiques for curated drops Australia‑wide.</Bullet>
            <Bullet title="Payments & logistics" icon={<CreditCard className="w-5 h-5" />}>Flexible options and carbon‑neutral shipping.</Bullet>

            <div className="pt-4">
              <h3 className="text-lg font-semibold mb-3">Prefer socials?</h3>
              <div className="flex items-center gap-3">
                <SocialChip icon={<Instagram className="w-4 h-4" />} label="Instagram" href="#" />
                <SocialChip icon={<Facebook className="w-4 h-4" />} label="Facebook" href="#" />
                <SocialChip icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" href="#" />
              </div>
            </div>

            <div className="pt-6">
              <h3 className="text-lg font-semibold mb-2">FAQ</h3>
              <Accordion
                items={[
                  {
                    q: "How long do commissions take?",
                    a: "Most custom orders are delivered in 2–4 weeks depending on complexity and maker availability.",
                  },
                  {
                    q: "Do you ship outside Australia?",
                    a: "Yes. International shipping rates are calculated at checkout based on destination and weight.",
                  },
                  {
                    q: "Can I return a custom piece?",
                    a: "Custom items are final sale, but we work with you to make sure you're thrilled before it ships.",
                  },
                ]}
              />
            </div>
          </motion.div>
        </div>
      </Section>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="rounded-xl bg-white text-gray-900 px-4 py-2 shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> {toast}
          </motion.div>
        </div>
      )}

      {/* Footer-ish spacer */}
      <div className="h-8" />
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-gray-300">{label}</div>
      {children}
      {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
    </label>
  );
}

function InfoCard({ icon, title, lines = [], action, actions }) {
  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 md:p-6 shadow-lg shadow-black/20">
      <div className="flex items-center gap-2 text-white mb-2">
        <div className="p-2 rounded-xl bg-white/10">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-0.5 text-gray-300">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      {action && (
        <a
          href={action.href}
          className="mt-3 inline-flex items-center gap-1 text-sm text-white hover:opacity-90"
        >
          {action.label} <ArrowRight className="w-3.5 h-3.5" />
        </a>
      )}
      {Array.isArray(actions) && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bullet({ title, icon, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 p-2 rounded-xl bg-white/10 text-white">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-gray-400">{children}</p>
      </div>
    </div>
  );
}

function SocialChip({ icon, label, href }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

function Accordion({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
      {items.map((it, i) => (
        <details
          key={i}
          open={open === i}
          onClick={(e) => {
            e.preventDefault();
            setOpen(open === i ? -1 : i);
          }}
          className="bg-white/[0.04]"
        >
          <summary className="cursor-pointer list-none select-none px-4 py-3 flex items-center justify-between">
            <span className="font-medium text-white">{it.q}</span>
            <ArrowRight className={`w-4 h-4 transition-transform ${open === i ? "rotate-90" : "rotate-0"}`} />
          </summary>
          <div className="px-4 pb-4 text-gray-300">{it.a}</div>
        </details>
      ))}
    </div>
  );
}

