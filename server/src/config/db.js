import mongoose from "mongoose";

export async function connectDB(uri) {
  const u = (uri || process.env.MONGO_URI || "").trim();
  if (!u) {
    console.error("❌ MONGO_URI is not set. Create server/.env from server/.env.example and set MONGO_URI.");
    process.exit(1);
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(u, { autoIndex: true });
  console.log("✅ MongoDB connected");
}
