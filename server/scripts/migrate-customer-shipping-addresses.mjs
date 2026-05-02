import mongoose from "mongoose";
import User from "../src/models/User.js";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artisan-avenue";

function parseAddressText(raw = "") {
  const txt = String(raw || "").trim();
  if (!txt) return null;
  const parts = txt.split(",").map((p) => p.trim()).filter(Boolean);
  const line1 = parts[0] || txt;
  const tail = parts.slice(1).join(" ");
  const postcodeMatch = tail.match(/\b(\d{4})\b/);
  const postcode = postcodeMatch ? postcodeMatch[1] : "";
  const stateMatch = tail.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
  const state = stateMatch ? stateMatch[1].toUpperCase() : "";
  const city = tail
    .replace(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .trim();
  return { line1, line2: "", city, state, postcode, country: "AU", phone: "" };
}

async function run() {
  await mongoose.connect(uri);
  const customers = await User.find({ role: "customer" });
  let updated = 0;
  for (const c of customers) {
    const current = c.shippingAddress || {};
    const hasStructured =
      current.line1 || current.line2 || current.city || current.state || current.postcode || current.phone;
    if (hasStructured) continue;
    const parsed = parseAddressText(c.address || "");
    if (!parsed) continue;
    c.shippingAddress = parsed;
    await c.save();
    updated += 1;
  }
  console.log(JSON.stringify({ scanned: customers.length, updated }, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
