// server/src/seed/categories.seed.js
import "dotenv/config.js";
import mongoose from "mongoose";
import Category from "../models/Category.js";

const DATA = [
  { name: "Accessories",   slug: "accessories",   path: "accessories" },
  { name: "Art & Prints",  slug: "art-prints",    path: "art-prints" },
  { name: "Body & Beauty", slug: "body-beauty",   path: "body-beauty" },
  { name: "Fashion",       slug: "fashion",       path: "fashion" },
  { name: "Home",          slug: "home",          path: "home" },
  { name: "Jewellery",     slug: "jewellery",     path: "jewellery" },
  { name: "Kids",          slug: "kids",          path: "kids" },
  { name: "Occasion",      slug: "occasion",      path: "occasion" },
  { name: "Pantry",        slug: "pantry",        path: "pantry" },
  { name: "Pets",          slug: "pets",          path: "pets" },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  // keep any children you might add later; upsert the 10
  for (const c of DATA) {
    await Category.updateOne(
      { slug: c.slug },
      { $set: { ...c, isActive: true } },
      { upsert: true }
    );
  }
  const total = await Category.countDocuments({});
  console.log("✅ Categories upserted:", DATA.length, "Total now:", total);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

