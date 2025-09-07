// frontend/src/pages/Blog.jsx
// A polished, responsive blog page for Artisan Avenue using React + TailwindCSS
// Features: hero, search, category filters, tag cloud, cards grid, sidebar widgets,
// "like"/bookmark interactions (local state), and simple pagination.

import React, { useMemo, useState } from "react";

// --- Dummy content (replace with data from your API/CMS later) ---
const CATEGORIES = [
  "All",
  "Vendor Stories",
  "How‑Tos",
  "Materials",
  "Sustainability",
  "Events",
  "Announcements",
];

const TAGS = [
  "ceramics",
  "textiles",
  "woodwork",
  "market",
  "behind‑the‑scenes",
  "packaging",
  "pricing",
  "branding",
];

const POSTS = [
  // ... (same posts as before)
];

// --- Utility components ---
function CategoryPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={
        "px-3 py-1 rounded-full text-sm border transition " +
        (active
          ? "bg-emerald-500 text-white border-emerald-500 shadow"
          : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200")
      }
    >
      {label}
    </button>
  );
}

function Tag({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-700 border border-gray-300 hover:border-emerald-500 hover:text-emerald-600 transition"
    >
      #{label}
    </button>
  );
}

function Separator() {
  return <div className="h-px w-full bg-gray-200" />;
}

// --- Card ---
function BlogCard({ post }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <article className="group rounded-2xl overflow-hidden bg-white border border-gray-200 hover:border-emerald-400 transition shadow-sm">
      <div className="relative">
        <img
          src={post.cover}
          alt={post.title}
          className="h-56 w-full object-cover"
          loading="lazy"
        />
        {post.featured && (
          <div className="absolute top-3 left-3 text-xs font-semibold bg-emerald-500 text-white px-2.5 py-1 rounded-full">
            Featured
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => setSaved((s) => !s)}
            className={`rounded-full p-2 bg-white/80 backdrop-blur border ${
              saved ? "border-emerald-400" : "border-gray-300"
            }`}
            aria-label="Bookmark"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
                stroke={saved ? "#34d399" : "#333"}
                strokeWidth="1.5"
                fill={saved ? "#34d39922" : "none"}
              />
            </svg>
          </button>
          <button
            onClick={() => setLiked((l) => !l)}
            className="rounded-full p-2 bg-white/80 backdrop-blur border border-gray-300"
            aria-label="Like"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12.1 21s-7.1-4.35-9.1-8.4C1.1 9.2 3.2 6 6.5 6c1.9 0 3.3 1.1 3.9 2.2C10.9 7.1 12.3 6 14.2 6 17.5 6 19.6 9.2 21 12.6 19.2 16.65 12.1 21 12.1 21z"
                stroke={liked ? "#fb7185" : "#333"}
                strokeWidth="1.5"
                fill={liked ? "#fb718522" : "none"}
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="text-xs text-emerald-600 font-semibold tracking-wide">
          {post.category}
        </div>
        <h3 className="mt-1 text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition">
          <a href={`/blog/${post.id}`}>{post.title}</a>
        </h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{post.excerpt}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="text-xs text-gray-500">#{t}</span>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-7 h-7 rounded-full object-cover"
            />
            <div className="text-xs text-gray-500">
              <div className="text-gray-700 font-medium">{post.author.name}</div>
              <div>
                {post.date} • {post.readTime} min read
              </div>
            </div>
          </div>
          <a
            href={`/blog/${post.id}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-500"
          >
            Read →
          </a>
        </div>
      </div>
    </article>
  );
}

// --- Pagination ---
function Pagination({ page, totalPages, onPage }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-emerald-500 disabled:opacity-40"
      >
        Prev
      </button>
      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          onClick={() => onPage(i + 1)}
          className={`px-3 py-1.5 rounded-lg border text-sm ${
            page === i + 1
              ? "bg-emerald-500 text-white border-emerald-500"
              : "border-gray-300 text-gray-600 hover:border-emerald-500"
          }`}
        >
          {i + 1}
        </button>
      ))}
      <button
        onClick={() => onPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:border-emerald-500 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

// --- Sidebar widgets ---
function NewsletterBox() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="text-gray-900 font-semibold">Subscribe</h4>
      <p className="text-sm text-gray-600 mt-1">
        Monthly round‑ups of new vendors, guides, and events.
      </p>
      <form onSubmit={(e) => e.preventDefault()} className="mt-3 flex gap-2">
        <input
          className="px-3 py-2 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 w-full"
          placeholder="Your email"
        />
        <button className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400">
          Join
        </button>
      </form>
    </div>
  );
}

function PopularPosts() {
  const items = POSTS.slice(0, 3);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="text-gray-900 font-semibold">Popular</h4>
      <ul className="mt-3 space-y-3">
        {items.map((p) => (
          <li key={p.id} className="flex gap-3">
            <img src={p.cover} alt={p.title} className="w-16 h-12 rounded-lg object-cover" />
            <div>
              <a href={`/blog/${p.id}`} className="text-sm text-gray-800 hover:text-emerald-600 font-medium line-clamp-2">
                {p.title}
              </a>
              <div className="text-xs text-gray-500">{p.date}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TagCloud({ onPick }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h4 className="text-gray-900 font-semibold">Tags</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {TAGS.map((t) => (
          <Tag key={t} label={t} onClick={() => onPick(t)} />
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function BlogPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filtered = useMemo(() => {
    let list = POSTS;
    if (category !== "All") list = list.filter((p) => p.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  // reset to first page on filter changes
  React.useEffect(() => setPage(1), [query, category]);

  return (
    // Removed inline gradient styles — plain white background now
    <div className="min-h-screen bg-white text-gray-800">
      {/* Hero */}
      <section className="relative">
        {/* Image background only — no gradient overlay */}
        <img
          src="/images/blog/blog-bg.jpg"
          alt="Artisan Avenue Blog"
          className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0"
        />
        <div className="relative container py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="text-emerald-600 font-semibold">Artisan Avenue Blog</span>
            <h1 className="mt-2 text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight">
              Stories, Guides & Events for Vendors and Curious Shoppers
            </h1>
            <p className="mt-3 text-gray-700">
              Discover how things are made, meet local creators, and learn practical tips to grow your craft.
            </p>

            {/* Search + categories */}
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-70">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search articles, tags, vendors…"
                  className="w-full bg-transparent outline-none placeholder:text-gray-400"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <CategoryPill
                    key={c}
                    label={c}
                    active={category === c}
                    onClick={() => setCategory(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="container py-10 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Grid */}
        <div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {pageItems.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              No posts found. Try a different search or category.
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <NewsletterBox />
          <PopularPosts />
          <TagCloud onPick={(t) => setQuery(t)} />
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h4 className="text-gray-900 font-semibold">About the Blog</h4>
            <p className="text-sm text-gray-600 mt-2">
              We champion Australian vendors and sustainable, small‑batch goods. Expect practical guides, event roundups, and honest stories from the studio floor.
            </p>
          </div>
        </aside>
      </section>

      {/* CTA strip */}
      <section className="container mb-14">
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-orange-900 font-semibold text-xl">Are you a vendor?</h3>
            <p className="text-orange-800 text-sm mt-1">Share your process with our community. Pitch a story or tutorial.</p>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-orange-400 text-white font-semibold hover:bg-orange-500"
          >
            Pitch an Article
          </a>
        </div>
      </section>
    </div>
  );
}


/*
USAGE
-----
1) Save this file as: frontend/src/pages/Blog.jsx
2) Make sure these assets exist (place your own images):
   - /public/images/blog/hero.jpg
   - /public/images/blog/ceramics-studio.jpg
   - /public/images/blog/pricing-handmade.jpg
   - /public/images/blog/eco-packaging.jpg
   - /public/images/blog/natural-dyes.jpg
   - /public/images/blog/spring-market.jpg
   - /public/images/blog/wood-kitchenware.jpg
   - /public/images/avatars/mila.png, aa.png, sophie.png, cam.png, luca.png
3) Add a route to this page in your router (e.g., React Router):
   <Route path="/blog" element={<BlogPage />} />
4) Later, replace the POSTS array with data from your backend/CMS.
*/
   