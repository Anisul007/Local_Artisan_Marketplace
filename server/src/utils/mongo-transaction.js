import mongoose from "mongoose";

let transactionsSupported = null;

/** True when MongoDB is a replica set or mongos (required for multi-doc transactions). */
export async function supportsMongoTransactions() {
  if (transactionsSupported !== null) return transactionsSupported;
  try {
    const db = mongoose.connection?.db;
    if (!db) {
      transactionsSupported = false;
      return false;
    }
    const hello = await db.admin().command({ hello: 1 }).catch(() => db.admin().command({ ismaster: 1 }));
    transactionsSupported = Boolean(hello.setName) || hello.msg === "isdbgrid";
  } catch {
    transactionsSupported = false;
  }
  return transactionsSupported;
}

/**
 * Run fn(session) inside a transaction when the deployment supports it.
 * On standalone MongoDB (typical local dev), session is null and ops run normally.
 */
export async function withOptionalTransaction(fn) {
  if (!(await supportsMongoTransactions())) {
    return fn(null);
  }

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (e) {
    if (session.inTransaction()) {
      await session.abortTransaction().catch(() => {});
    }
    throw e;
  } finally {
    session.endSession();
  }
}
