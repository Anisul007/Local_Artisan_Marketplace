#!/usr/bin/env node
/**
 * One-time setup for Artisan Avenue (client handoff).
 * Run from project root: node scripts/setup.mjs
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVER = path.join(ROOT, "server");

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function runNpm(cwd, args) {
  log(`\n→ npm ${args.join(" ")}  (${path.relative(ROOT, cwd) || "."})`);
  const r = spawnSync("npm", args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) fail(`npm ${args.join(" ")} failed in ${cwd}`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyIfMissing(src, dest) {
  try {
    await fs.access(dest);
    return false;
  } catch {
    await ensureDir(path.dirname(dest));
    await fs.copyFile(src, dest);
    return true;
  }
}

async function main() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 18 || nodeMajor > 22) {
    log(`⚠️  Node ${process.version} detected. Recommended: Node 18–22 (see README).`);
  } else {
    log(`✓ Node ${process.version}`);
  }

  const envExample = path.join(SERVER, ".env.example");
  const envFile = path.join(SERVER, ".env");
  try {
    await fs.access(envExample);
  } catch {
    fail("Missing server/.env.example");
  }

  try {
    await fs.access(envFile);
    log("✓ server/.env already exists (left unchanged)");
  } catch {
    await fs.copyFile(envExample, envFile);
    log("✓ Created server/.env from server/.env.example");
  }

  const dirs = [
    path.join(SERVER, "Public", "uploads"),
    path.join(SERVER, "Public", "uploads", "vendor-logos"),
    path.join(SERVER, "Public", "images"),
    path.join(SERVER, ".mail-previews"),
  ];
  for (const d of dirs) {
    await ensureDir(d);
  }
  log("✓ Upload & mail preview folders ready");

  const logoSrc = path.join(ROOT, "Public", "images", "logo.webp");
  const logoDest = path.join(SERVER, "Public", "images", "logo.webp");
  try {
    if (await copyIfMissing(logoSrc, logoDest)) {
      log("✓ Copied brand logo for PDF reports");
    }
  } catch {
    log("⚠️  Could not copy logo.webp (PDF reports may omit logo)");
  }

  runNpm(ROOT, ["install"]);
  runNpm(SERVER, ["install"]);

  log("\n══════════════════════════════════════════════════════════");
  log("  Setup complete!");
  log("══════════════════════════════════════════════════════════");
  log("\n1. Install & start MongoDB (local or Atlas — see README.md)");
  log("2. Seed demo data (optional but recommended):");
  log("     npm run seed");
  log("3. Start the app:");
  log("     npm run dev:all");
  log("     — or two terminals: npm run dev:server  +  npm run dev:client");
  log("\n   Website:  http://localhost:5173");
  log("   API:      http://localhost:4000/api/health");
  log("\n   Demo admin: admin@artisan.test / AdminPass123!");
  log("   Demo vendor: elena.russo@artisan.demo / Password1");
  log("\nFull guide: README.md\n");
}

main().catch((e) => fail(e.message || String(e)));
