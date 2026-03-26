// frontend/src/pages/ForMakers.jsx
// For Makers page with hardcoded brand colors (purple, orange, yellow)

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PublicListingsAPI, PublicVendorsAPI } from "../lib/api";
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
  const PLACEHOLDER = "/images/placeholder.svg";

  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendorsErr, setVendorsErr] = useState("");

  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [compareIds, setCompareIds] = useState([]);
  const [compareErr, setCompareErr] = useState("");

  const [planCraft, setPlanCraft] = useState("home");
  const [planStage, setPlanStage] = useState("just-starting"); // just-starting | growing | scaling
  const [planGoal, setPlanGoal] = useState("visibility"); // visibility | conversion | consistency
  const [checked, setChecked] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setVendorsLoading(true);
      setVendorsErr("");
      try {
        // Public listings don't expose a dedicated vendor list endpoint.
        // We derive vendor candidates from public listings, then hydrate each
        // vendor via /api/vendors/:id (PublicVendorsAPI).
        const pages = [1, 2];
        const listingResults = await Promise.all(
          pages.map((pageNum) => PublicListingsAPI.browse({ page: pageNum, sort: "popular" }).catch(() => ({ ok: false })))
        );

        const rawItems = listingResults.flatMap((r) => {
          const data = r?.data?.data ?? r?.data ?? {};
          return Array.isArray(data?.items) ? data.items : [];
        });

        const freq = new Map(); // vendorId -> occurrences
        const fallback = new Map(); // vendorId -> minimal card data

        for (const p of rawItems) {
          const v = p?.vendor;
          const id = v?._id || v?.id;
          if (!id) continue;
          const idStr = String(id);
          freq.set(idStr, (freq.get(idStr) || 0) + 1);
          if (!fallback.has(idStr)) {
            fallback.set(idStr, {
              id: idStr,
              businessName: v?.businessName || v?.displayName || v?.name || "Vendor",
              logoUrl: v?.logoUrl || v?.avatarUrl || "",
              primaryCategories: [],
              address: {},
              stats: { products: 0 },
            });
          }
        }

        const topIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id);
        const profiles = await Promise.all(
          topIds.map((id) =>
            PublicVendorsAPI.get(id)
              .then((r) => (r?.ok && r?.data?.data ? r.data.data : null))
              .catch(() => null)
          )
        );

        if (cancelled) return;

        const merged = profiles.map((p, idx) => p || fallback.get(topIds[idx]) || { id: topIds[idx] });
        setVendors(merged);
      } catch (e) {
        if (!cancelled) setVendorsErr(e?.message || "Failed to load featured vendors");
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    for (const v of vendors) {
      for (const c of v?.primaryCategories || []) set.add(c);
    }
    return [...set].sort();
  }, [vendors]);

  useEffect(() => {
    // If "home" isn't available in the dataset, pick the first available category.
    if (categories.length && !categories.includes(planCraft)) setPlanCraft(categories[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const filteredVendors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return vendors
      .slice()
      .sort((a, b) => Number(b?.stats?.products || 0) - Number(a?.stats?.products || 0))
      .filter((v) => {
        const name = String(v?.businessName || "").toLowerCase();
        const matchesQ = !needle || name.includes(needle);
        const matchesCat = activeCategory === "all" || (v?.primaryCategories || []).includes(activeCategory);
        return matchesQ && matchesCat;
      });
  }, [vendors, q, activeCategory]);

  const compareVendors = useMemo(
    () => compareIds.map((id) => vendors.find((v) => String(v?.id) === String(id))).filter(Boolean),
    [compareIds, vendors]
  );

  const toggleCompare = (id) => {
    setCompareErr("");
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        setCompareErr("You can compare up to 3 vendors.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const planTasks = useMemo(() => {
    const base = [
      { id: "profile", label: "Complete your vendor profile (logo, bio, categories, address)." },
      { id: "first-listing", label: "Create your first listing with a strong primary image." },
      { id: "pricing-stock", label: "Set pricing and stock quantities you can fulfill reliably." },
      { id: "trust", label: "Add trust signals: clear description and fulfillment expectations." },
    ];

    const stageAdd =
      planStage === "just-starting"
        ? [
            { id: "launch-3-5", label: `Launch 3-5 products in "${planCraft}" for fast feedback.` },
            { id: "first-conversion", label: "Improve conversion: keep titles specific and photos well-lit." },
          ]
        : planStage === "growing"
        ? [
            { id: "bundle", label: "Increase average order value with bundles or gift sets." },
            { id: "inventory-thresholds", label: "Use inventory thresholds so top items never go inactive." },
          ]
        : [
            { id: "seasonal", label: "Plan seasonal promos in advance (new drops + limited-time offers)." },
            { id: "optimize-top", label: "Optimize top listings: refresh photos and refine categories." },
          ];

    const goalAdd =
      planGoal === "visibility"
        ? [
            { id: "discoverability", label: "Boost discoverability: use accurate primary categories and clean slugs." },
            { id: "first-promo", label: "Run a small promo to earn early traffic and reviews." },
          ]
        : planGoal === "conversion"
        ? [
            { id: "photos", label: "Conversion upgrade: add more lifestyle photos and reduce ambiguity in titles." },
            { id: "pricing-tests", label: "Run pricing tests and watch for out-of-stock cycles." },
          ]
        : [
            { id: "restock", label: "Operational consistency: restock before popular items hit 0." },
            { id: "policies", label: "Reduce friction: align shipping/returns copy with your workflow." },
          ];

    return [...base, ...stageAdd, ...goalAdd];
  }, [planCraft, planStage, planGoal]);

  useEffect(() => {
    setChecked({});
  }, [planCraft, planStage, planGoal]);

  const planDoneCount = planTasks.reduce((acc, t) => acc + (checked[t.id] ? 1 : 0), 0);
  const planPct = planTasks.length ? Math.round((planDoneCount / planTasks.length) * 100) : 0;

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
      Preview active vendor storefronts, filter by craft category, and build a practical launch plan for your first month on Artisan Avenue.
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

      {/* Featured vendors + interactive plan */}
      <section style={{ backgroundColor: brand.yellow + "30" }} className="py-16">
        <div className="container">
          <h2 style={{ color: brand.purple }} className="text-2xl md:text-3xl font-bold text-center mb-3">
            Preview real vendor storefronts
          </h2>
          <p className="text-center max-w-3xl mx-auto text-sm text-gray-700">
            Search and filter active makers, then preview their store. Use the compare widget to see what a great shop has in common.
          </p>

          <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
            <div className="w-full md:w-[420px]">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search vendor name..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  activeCategory === "all"
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                All crafts
              </button>
              {categories.slice(0, 8).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    activeCategory === c
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {c.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {vendorsErr && <p className="mt-4 text-center text-red-600 font-medium">{vendorsErr}</p>}

          {vendorsLoading ? (
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 animate-pulse">
                  <div className="h-16 w-16 bg-gray-200 rounded-2xl" />
                  <div className="mt-4 h-4 bg-gray-200 rounded w-2/3" />
                  <div className="mt-2 h-3 bg-gray-200 rounded w-1/2" />
                  <div className="mt-4 h-10 bg-gray-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <p className="font-semibold">No vendors match your filters.</p>
              <p className="text-sm text-gray-600 mt-1">Try a different category or a shorter search term.</p>
            </div>
          ) : (
            <>
              <div className="mt-8 grid md:grid-cols-3 gap-6">
                {filteredVendors.slice(0, 12).map((v) => (
                  <div
                    key={v.id}
                    className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                          <img
                            src={v.logoUrl || PLACEHOLDER}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = PLACEHOLDER;
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{v.businessName || "Vendor"}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {v.primaryCategories?.[0] ? v.primaryCategories[0].replace(/-/g, " ") : "Handcrafted goods"}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mt-2">{v.stats?.products ?? 0} products</div>
                          {v.address?.city && (
                            <div className="text-xs text-gray-600 mt-1">
                              {v.address.city}
                              {v.address.state ? `, ${v.address.state}` : ""}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4">
                        <label className="flex items-center gap-2 text-xs text-gray-700 select-none">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(v.id)}
                            onChange={() => toggleCompare(v.id)}
                          />
                          Compare
                        </label>
                        <Link to={`/makers/${v.id}?tab=products`} className="text-sm font-semibold text-purple-700 hover:underline whitespace-nowrap">
                          Preview store →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {compareErr && <p className="mt-4 text-center text-sm text-red-600 font-medium">{compareErr}</p>}

              {compareVendors.length > 0 && (
                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Compare storefronts</h3>
                      <p className="text-sm text-gray-600 mt-1">Selected {compareVendors.length}/3</p>
                    </div>
                    <button type="button" onClick={() => setCompareIds([])} className="text-sm font-semibold text-gray-600 hover:text-gray-900">
                      Clear
                    </button>
                  </div>

                  <div className="mt-5 grid md:grid-cols-3 gap-4">
                    {compareVendors.map((v) => (
                      <div key={v.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                            <img
                              src={v.logoUrl || PLACEHOLDER}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = PLACEHOLDER;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{v.businessName || "Vendor"}</div>
                            <div className="text-xs text-gray-500 mt-1">{v.stats?.products ?? 0} products</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(v.primaryCategories || []).slice(0, 3).map((c) => (
                            <span key={c} className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-800 border border-purple-100">
                              {c.replace(/-/g, " ")}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3">
                          {v.address?.city ? (
                            <div className="text-xs text-gray-600">
                              {v.address.city}
                              {v.address.state ? `, ${v.address.state}` : ""}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">Location hidden</div>
                          )}
                        </div>

                        <div className="mt-4">
                          <Link to={`/makers/${v.id}?tab=products`} className="text-sm font-semibold text-purple-700 hover:underline">
                            Preview store →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* First-month plan builder */}
          <div className="mt-10 grid md:grid-cols-2 gap-6 items-start">
            <div className="rounded-2xl border border-purple-100 bg-white p-6">
              <h3 className="font-semibold text-gray-900">Your first-month plan (interactive)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose your craft, your stage, and what you want most. Then tick tasks as you go.
              </p>

              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Craft</label>
                  <select
                    value={planCraft}
                    onChange={(e) => setPlanCraft(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {categories.length ? (
                      categories.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/-/g, " ")}
                        </option>
                      ))
                    ) : (
                      <option value="home">Home</option>
                    )}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Stage</label>
                  <select
                    value={planStage}
                    onChange={(e) => setPlanStage(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="just-starting">Just starting</option>
                    <option value="growing">Growing</option>
                    <option value="scaling">Scaling</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Goal</label>
                  <select
                    value={planGoal}
                    onChange={(e) => setPlanGoal(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="visibility">Get discovered</option>
                    <option value="conversion">Convert better</option>
                    <option value="consistency">Stay consistent</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-purple-50 border border-purple-100 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-purple-900">Completion</div>
                    <div className="text-xs text-purple-800 mt-1">
                      {planDoneCount}/{planTasks.length} tasks complete
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-purple-900">{planPct}%</div>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: `${planPct}%` }} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900">Tick off tasks</h3>
              <p className="text-sm text-gray-600 mt-1">This checklist updates based on your choices.</p>
              <div className="mt-4 space-y-3">
                {planTasks.map((t) => (
                  <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!checked[t.id]}
                      onChange={(e) => setChecked((prev) => ({ ...prev, [t.id]: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-800">{t.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setChecked({})}
                  className="text-sm font-semibold text-gray-700 hover:text-gray-900"
                >
                  Reset checklist
                </button>
              </div>
            </div>
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


