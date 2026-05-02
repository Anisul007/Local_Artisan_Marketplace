import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/artisan-avenue";

const adminConfig = {
  firstName: process.env.ADMIN_FIRST_NAME || "System",
  lastName: process.env.ADMIN_LAST_NAME || "Admin",
  email: (process.env.ADMIN_EMAIL || "admin@artisan.test").toLowerCase().trim(),
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "AdminPass123!",
  displayName: process.env.ADMIN_DISPLAY_NAME || "Platform Admin",
  phone: process.env.ADMIN_PHONE || "",
  department: process.env.ADMIN_DEPARTMENT || "Operations",
  bio: process.env.ADMIN_BIO || "Platform administrator account.",
};

async function run() {
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash(adminConfig.password, 10);
  const admin = await User.findOneAndUpdate(
    { email: adminConfig.email },
    {
      $set: {
        role: "admin",
        firstName: adminConfig.firstName,
        lastName: adminConfig.lastName,
        email: adminConfig.email,
        username: adminConfig.username,
        passwordHash,
        isVerified: true,
        verifyCodeHash: undefined,
        verifyCodeExpires: undefined,
        adminProfile: {
          displayName: adminConfig.displayName,
          phone: adminConfig.phone,
          department: adminConfig.department,
          bio: adminConfig.bio,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        id: String(admin._id),
        role: admin.role,
        email: admin.email,
        username: admin.username,
        firstName: admin.firstName,
        lastName: admin.lastName,
        adminProfile: admin.adminProfile || {},
        password: adminConfig.password,
      },
      null,
      2
    )
  );

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
