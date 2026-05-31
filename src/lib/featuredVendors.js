import { PublicListingsAPI, PublicVendorsAPI } from "./api";

/** Load featured vendors for home/about pages (uses list API, falls back to listings). */
export async function loadFeaturedVendors(limit = 6) {
  const listRes = await PublicVendorsAPI.list(limit).catch(() => null);
  const fromList = listRes?.ok ? listRes?.data?.data?.items ?? listRes?.data?.items : null;
  if (Array.isArray(fromList) && fromList.length > 0) {
    return fromList.slice(0, limit);
  }

  const pages = [1, 2];
  const listingResults = await Promise.all(
    pages.map((pageNum) => PublicListingsAPI.browse({ page: pageNum, sort: "popular" }).catch(() => ({ ok: false })))
  );

  const rawItems = listingResults.flatMap((r) => {
    const data = r?.data?.data ?? r?.data ?? {};
    return Array.isArray(data?.items) ? data.items : [];
  });

  const freq = new Map();
  const fallback = new Map();

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
        bio: "",
        primaryCategories: [],
        address: {},
        stats: { products: 0 },
      });
    }
  }

  const topIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  const profiles = await Promise.all(
    topIds.map((id) =>
      PublicVendorsAPI.get(id)
        .then((r) => (r?.ok && r?.data?.data ? r.data.data : null))
        .catch(() => null)
    )
  );

  return profiles.map((p, idx) => p || fallback.get(topIds[idx]) || { id: topIds[idx] }).slice(0, limit);
}

export function vendorCardBlurb(vendor) {
  const bio = String(vendor?.bio || "").trim();
  if (bio) return bio.length > 140 ? `${bio.slice(0, 137)}…` : bio;
  const cat = vendor?.primaryCategories?.[0];
  if (cat) {
    return `Specialist in ${cat.replace(/-/g, " ")} — handmade pieces from a local Australian maker.`;
  }
  const count = vendor?.stats?.products ?? 0;
  if (count > 0) return `${count} handcrafted product${count === 1 ? "" : "s"} in their storefront.`;
  return "Discover this maker’s story, products, and reviews on Artisan Avenue.";
}
