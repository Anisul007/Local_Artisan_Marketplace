import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artisan-avenue";

const customers = [
  {
    firstName: "Ava",
    lastName: "Thompson",
    email: "ava.customer.demo@artisan.test",
    username: "ava_demo_customer",
    password: "DemoPass123",
    address: "12 River St, Melbourne VIC",
    dob: new Date("1997-04-12"),
  },
  {
    firstName: "Noah",
    lastName: "Bennett",
    email: "noah.customer.demo@artisan.test",
    username: "noah_demo_customer",
    password: "DemoPass123",
    address: "88 Market Rd, Sydney NSW",
    dob: new Date("1995-09-03"),
  },
];

async function run() {
  await mongoose.connect(uri);
  const inserted = [];

  for (const c of customers) {
    const passwordHash = await bcrypt.hash(c.password, 10);
    const doc = await User.findOneAndUpdate(
      { email: c.email.toLowerCase().trim() },
      {
        $set: {
          role: "customer",
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email.toLowerCase().trim(),
          username: c.username,
          passwordHash,
          address: c.address,
          dob: c.dob,
          isVerified: true,
          verifyCodeHash: undefined,
          verifyCodeExpires: undefined,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    inserted.push({
      id: String(doc._id),
      fullName: `${doc.firstName} ${doc.lastName}`,
      email: doc.email,
      username: doc.username,
      address: doc.address,
      dob: doc.dob?.toISOString().slice(0, 10),
      password: c.password,
    });
  }

  console.log(JSON.stringify(inserted, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});
