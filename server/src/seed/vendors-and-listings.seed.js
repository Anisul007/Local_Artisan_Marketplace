// server/src/seed/vendors-and-listings.seed.js
import "dotenv/config.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import VendorProfile from "../models/VendorProfile.js";
import Listing from "../models/Listing.js";
import Category from "../models/Category.js";

const SEED_PASSWORD = "Password1";

const CATEGORY_DATA = [
  { name: "Accessories", slug: "accessories", path: "accessories" },
  { name: "Art & Prints", slug: "art-prints", path: "art-prints" },
  { name: "Body & Beauty", slug: "body-beauty", path: "body-beauty" },
  { name: "Fashion", slug: "fashion", path: "fashion" },
  { name: "Home", slug: "home", path: "home" },
  { name: "Jewellery", slug: "jewellery", path: "jewellery" },
  { name: "Kids", slug: "kids", path: "kids" },
  { name: "Occasion", slug: "occasion", path: "occasion" },
  { name: "Pantry", slug: "pantry", path: "pantry" },
  { name: "Pets", slug: "pets", path: "pets" },
];

const PLACEHOLDER_IMAGE = "https://placehold.co/600x600/e9d5ff/6d28d9?text=Handmade";

/** 5 demo vendors × 4 listings = 20 products. Categories spread: home, fashion, accessories, jewellery, pantry, kids, body-beauty, art-prints, pets (occasion empty). */
const VENDORS = [
  {
    user: {
      firstName: "Elena",
      lastName: "Russo",
      email: "elena.russo@artisan.demo",
      username: "elenarusso",
      role: "vendor",
      businessName: "Elena's Ceramics",
      phone: "+61 412 345 678",
      website: "https://elenasceramics.demo",
      bio: "Handcrafted stoneware and porcelain in Melbourne. Every piece is wheel-thrown and glazed by hand. Sustainable, lead-free glazes.",
      address: { line1: "12 Potter Lane", city: "Melbourne", state: "VIC", postcode: "3000", country: "AU" },
      primaryCategories: ["home"],
    },
    listings: [
      { title: "Hand-Thrown Ceramic Vase – Terracotta", description: "A beautiful wheel-thrown vase in warm terracotta with a matte glaze. Perfect for a single stem or dried flowers. Approx 22cm height. Food-safe glaze, dishwasher safe. Made in Melbourne.", priceCents: 8500, categorySlug: "home", slug: "hand-thrown-ceramic-vase-terracotta", imageUrl: "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?w=800&q=80" },
      { title: "Set of 4 Stoneware Coffee Mugs", description: "Set of four handcrafted mugs in speckled grey stoneware. Comfortable to hold, microwave and dishwasher safe. Each mug holds 320ml. Slight variations make each one unique.", priceCents: 12000, categorySlug: "home", slug: "set-of-4-stoneware-coffee-mugs", imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80" },
      { title: "Small Ceramic Bowl – Speckled White", description: "Hand-thrown small bowl ideal for dips, nuts or jewellery. Speckled white glaze, food-safe. Approx 12cm diameter. Perfect gift for a minimalist home.", priceCents: 4200, categorySlug: "home", slug: "small-ceramic-bowl-speckled-white", imageUrl: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=80" },
      { title: "Large Serving Platter – Ocean Glaze", description: "Stunning handcrafted platter with an ocean-blue glaze. Perfect for cheese, charcuterie or bread. Approx 38cm. Lead-free, food-safe. A centrepiece for the table.", priceCents: 18500, categorySlug: "home", slug: "large-serving-platter-ocean-glaze", imageUrl: "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=800&q=80" },
    ],
  },
  {
    user: {
      firstName: "Marcus",
      lastName: "Webb",
      email: "marcus.webb@artisan.demo",
      username: "marcuswebb",
      role: "vendor",
      businessName: "Webb Leather Co",
      phone: "+61 423 456 789",
      website: "https://webbleather.demo",
      bio: "Small-batch leather goods from the Blue Mountains. Belts, wallets, and bags made with full-grain leather and solid brass hardware.",
      address: { line1: "5 Craft Road", city: "Katoomba", state: "NSW", postcode: "2780", country: "AU" },
      primaryCategories: ["fashion", "accessories"],
    },
    listings: [
      { title: "Full-Grain Leather Belt – Natural", description: "Hand-cut and hand-finished belt in vegetable-tanned natural leather. Brass buckle, 36mm width. Sizes 80–110cm. Ages beautifully with use and develops a rich patina over time.", priceCents: 12900, categorySlug: "fashion", slug: "full-grain-leather-belt-natural", imageUrl: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80" },
      { title: "Minimalist Leather Card Holder", description: "Slim card holder with two card slots and a central pocket for notes. Made from Italian vegetable-tanned leather. Fits up to 6 cards. Perfect everyday carry.", priceCents: 5900, categorySlug: "accessories", slug: "minimalist-leather-card-holder", imageUrl: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&q=80" },
      { title: "Leather Crossbody Bag – Chestnut", description: "Compact crossbody bag in full-grain chestnut leather. Adjustable strap, inner zip pocket. Hand-stitched. Fits phone, wallet and keys. Timeless everyday bag.", priceCents: 18900, categorySlug: "accessories", slug: "leather-crossbody-bag-chestnut", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80" },
      { title: "Canvas & Leather Tote – Olive", description: "Everyday tote with sturdy canvas body and leather handles. Internal pocket for keys/phone. Comfortable shoulder carry and durable enough for markets and work.", priceCents: 16900, categorySlug: "fashion", slug: "canvas-leather-tote-olive", imageUrl: "https://images.unsplash.com/photo-1520975958225-1a37b9f4f09c?w=800&q=80" },
    ],
  },
  {
    user: {
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@artisan.demo",
      username: "priyasharma",
      role: "vendor",
      businessName: "Priya's Jewellery Studio",
      phone: "+61 434 567 890",
      website: "https://priyajewellery.demo",
      bio: "Contemporary jewellery from Sydney. Sterling silver and recycled metals, often combined with natural stones. Each piece is designed and made in-house.",
      address: { line1: "88 Design Way", city: "Sydney", state: "NSW", postcode: "2000", country: "AU" },
      primaryCategories: ["jewellery", "fashion"],
    },
    listings: [
      { title: "Sterling Silver Hoop Earrings – Medium", description: "Classic hoop earrings in sterling silver, 25mm diameter. Lightweight and comfortable for all-day wear. Hypoallergenic, nickel-free. Presented in a small gift box.", priceCents: 6500, categorySlug: "jewellery", slug: "sterling-silver-hoop-earrings-medium", imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80" },
      { title: "Labradorite Pendant on Silver Chain", description: "A single labradorite cabochon set in sterling silver, on a 45cm sterling silver chain. Labradorite shows a beautiful blue flash. Chain length adjustable. Gift-ready packaging.", priceCents: 8900, categorySlug: "jewellery", slug: "labradorite-pendant-silver-chain", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80" },
      { title: "Stacking Rings Set – Mixed Finish", description: "Set of three thin sterling silver stacking rings: one polished, one brushed, one with a subtle hammered texture. Wear together or alone. Sizes 54–62 (AU M–S).", priceCents: 7200, categorySlug: "jewellery", slug: "stacking-rings-set-mixed-finish", imageUrl: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80" },
      { title: "Gold-Filled Drop Earrings – Small", description: "Elegant drop earrings in gold-filled wire with a tiny freshwater pearl. Lightweight and versatile. Hypoallergenic. Gift box included.", priceCents: 4800, categorySlug: "jewellery", slug: "gold-filled-drop-earrings-small", imageUrl: "https://images.unsplash.com/photo-1600721391689-2564bb8055de?w=800&q=80" },
    ],
  },
  {
    user: {
      firstName: "James",
      lastName: "Ng",
      email: "james.ng@artisan.demo",
      username: "jamesng",
      role: "vendor",
      businessName: "Wild Honey Co",
      phone: "+61 445 678 901",
      website: "https://wildhoneyco.demo",
      bio: "Single-origin honey and small-batch preserves from regional NSW. We work with local beekeepers and growers. No additives, just real food.",
      address: { line1: "22 Hive Road", city: "Orange", state: "NSW", postcode: "2800", country: "AU" },
      primaryCategories: ["pantry"],
    },
    listings: [
      { title: "Orange Blossom Honey – 500g Jar", description: "Single-origin honey from Orange region. Light, floral and perfect for tea or toast. Raw and unfiltered. Glass jar, recyclable. Shelf life 12+ months when stored cool.", priceCents: 1800, categorySlug: "pantry", slug: "orange-blossom-honey-500g", imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80" },
      { title: "Strawberry & Rhubarb Jam – 280g", description: "Small-batch jam made with local strawberries and rhubarb. No artificial colours or flavours. Perfect with scones or yoghurt. Refrigerate after opening.", priceCents: 1200, categorySlug: "pantry", slug: "strawberry-rhubarb-jam-280g", imageUrl: "https://images.unsplash.com/photo-1568909344668-6f14a01f72a6?w=800&q=80" },
      { title: "Bush Honey – 250g Squeeze Bottle", description: "Australian bush honey from native flora. Rich, dark and distinctive. Squeeze bottle for easy drizzling. Ideal for baking and glazes.", priceCents: 1400, categorySlug: "pantry", slug: "bush-honey-250g-squeeze", imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc5003?w=800&q=80" },
      { title: "Lemon Myrtle Shortbread – 180g", description: "Buttery shortbread made in small batches with Australian lemon myrtle. Crisp, fragrant and perfect with tea. Packed in a recyclable kraft box.", priceCents: 1100, categorySlug: "pantry", slug: "lemon-myrtle-shortbread-180g", imageUrl: "https://images.unsplash.com/photo-1519869325930-281384150729?w=800&q=80" },
    ],
  },
  {
    user: {
      firstName: "Mia",
      lastName: "Taylor",
      email: "mia.taylor@artisan.demo",
      username: "miataylor",
      role: "vendor",
      businessName: "Wick & Co",
      phone: "+61 467 890 123",
      website: "https://wickandco.demo",
      bio: "Soy wax candles, natural soap, and curated handmade picks from the Adelaide Hills. Small-batch production with botanical ingredients.",
      address: { line1: "3 Candle Lane", city: "Adelaide", state: "SA", postcode: "5000", country: "AU" },
      primaryCategories: ["body-beauty", "kids", "art-prints", "pets"],
    },
    listings: [
      { title: "Lavender & Eucalyptus Soy Candle – 200g", description: "Soy wax candle with lavender and eucalyptus essential oils. Approx 40-hour burn. Recyclable tin. Hand-poured in Adelaide. Calming and fresh.", priceCents: 3200, categorySlug: "body-beauty", slug: "lavender-eucalyptus-soy-candle-200g", imageUrl: "https://images.unsplash.com/photo-1608571423539-e951b9b3871e?w=800&q=80" },
      { title: "Wooden Rainbow Stacker", description: "Classic rainbow stacker in sustainably sourced timber. Non-toxic, child-safe oil finish. Six arches for stacking and building. Ages 12 months+. Made in Australia.", priceCents: 4500, categorySlug: "kids", slug: "wooden-rainbow-stacker", imageUrl: "https://images.unsplash.com/photo-1607753724987-727c2d76f8fd?w=800&q=80" },
      { title: "Botanical Line Art Print – A3", description: "Minimal botanical line art print, A3 size. Printed with archival inks on 300gsm cotton paper. Ships flat with backing board.", priceCents: 3500, categorySlug: "art-prints", slug: "botanical-line-art-print-a3", imageUrl: "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?w=800&q=80" },
      { title: "Dog Bandana – Sage Gingham", description: "Soft cotton bandana in sage gingham. Adjustable tie. Comfortable and washable. Available in sizes S–L.", priceCents: 1800, categorySlug: "pets", slug: "dog-bandana-sage-gingham", imageUrl: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80" },
    ],
  },
];

async function ensureCategories() {
  for (const c of CATEGORY_DATA) {
    await Category.updateOne({ slug: c.slug }, { $set: { ...c, isActive: true } }, { upsert: true });
  }
}

function slugify(s) {
  return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  await ensureCategories();
  const categories = await Category.find({}).lean();
  const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c._id]));

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  for (const v of VENDORS) {
    const u = v.user;
    const existingUser = await User.findOne({ email: u.email.toLowerCase() });
    let userId;
    if (existingUser) {
      userId = existingUser._id;
      console.log("Vendor already exists:", u.email);
    } else {
      const vendorUser = await User.create({
        role: "vendor",
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email.toLowerCase(),
        username: u.username,
        passwordHash,
        isVerified: true,
        vendor: {
          businessName: u.businessName,
          phone: u.phone,
          website: u.website,
          description: u.bio,
          primaryCategories: u.primaryCategories,
        },
      });
      userId = vendorUser._id;
      console.log("Created vendor user:", u.email);
    }

    await VendorProfile.updateOne(
      { user: userId },
      {
        $set: {
          user: userId,
          businessName: u.businessName,
          contactEmail: u.email,
          phone: u.phone,
          website: u.website,
          bio: u.bio,
          address: u.address || {},
          primaryCategories: u.primaryCategories || [],
        },
      },
      { upsert: true }
    );
    console.log("Upserted vendor profile for", u.businessName);

    for (const prod of v.listings) {
      const catId = categoryBySlug[prod.categorySlug] || categories[0]._id;
      const slug = prod.slug || `${slugify(prod.title)}-${Date.now()}`;
      const imageUrl = prod.imageUrl || PLACEHOLDER_IMAGE;
      const images = prod.images && prod.images.length
        ? prod.images.map((img, i) => ({
            url: typeof img === "string" ? img : img.url,
            alt: (typeof img === "string" ? prod.title : img.alt) || prod.title,
            isPrimary: i === 0,
            sortOrder: i,
          }))
        : [{ url: imageUrl, alt: prod.title, isPrimary: true, sortOrder: 0 }];

      const existing = await Listing.findOne({ "seo.slug": slug });
      if (existing) {
        await Listing.updateOne(
          { _id: existing._id },
          {
            $set: {
              vendor: userId,
              title: prod.title,
              description: prod.description,
              pricing: { currency: "AUD", priceCents: prod.priceCents, compareAtCents: prod.compareAtCents || 0 },
              primaryCategory: catId,
              categories: [catId],
              images,
              seo: { slug, metaTitle: prod.title, metaDescription: (prod.description || "").slice(0, 160) },
              "inventory.status": "active",
              ...(prod.stockQty != null ? { "inventory.stockQty": prod.stockQty } : {}),
            },
          }
        );
        console.log("Updated listing images:", prod.title);
      } else {
        await Listing.create({
          vendor: userId,
          title: prod.title,
          description: prod.description,
          pricing: { currency: "AUD", priceCents: prod.priceCents, compareAtCents: prod.compareAtCents || 0 },
          primaryCategory: catId,
          categories: [catId],
          images,
          seo: { slug, metaTitle: prod.title, metaDescription: (prod.description || "").slice(0, 160) },
          inventory: { stockQty: prod.stockQty != null ? prod.stockQty : 10, status: "active" },
          ratingsCount: 0,
          ratingAvg: 0,
        });
        console.log("Created listing:", prod.title);
      }
    }
  }

  const allowedSlugs = VENDORS.flatMap((v) => v.listings.map((p) => p.slug));
  const pruneRes = await Listing.deleteMany({ "seo.slug": { $nin: allowedSlugs } });
  if (pruneRes.deletedCount > 0) {
    console.log("Removed", pruneRes.deletedCount, "listings not in this seed (slugs outside the 20-product catalog).");
  }

  const vendorCount = await User.countDocuments({ role: "vendor" });
  const listingCount = await Listing.countDocuments({ "inventory.status": "active" });
  console.log("✅ Seed done. Vendors (all roles in DB):", vendorCount, "Active listings:", listingCount);
  console.log("This seed defines", allowedSlugs.length, "products across", VENDORS.length, "vendors.");
  console.log("Seed vendor login: elena / marcus / priya / james / mia @ *.artisan.demo — password:", SEED_PASSWORD);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
