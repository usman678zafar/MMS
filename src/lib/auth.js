import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongoose";
import { hasPermission } from "@/lib/rbac";

const SESSION_COOKIE = "mms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

let indexesPromise;

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const shouldUseSecureCookies = () => {
  const configuredUrl = process.env.APP_URL || process.env.NEXTAUTH_URL;
  if (configuredUrl) {
    try {
      return new URL(configuredUrl).protocol === "https:";
    } catch {
      return process.env.NODE_ENV === "production";
    }
  }
  return process.env.NODE_ENV === "production";
};

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  email: user.email,
  name: user.name,
  role: user.role,
  is_active: user.is_active !== false,
});

async function getCollections() {
  await connectDB();
  const db = mongoose.connection.db;

  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db
        .collection("sessions")
        .createIndex({ token_hash: 1 }, { unique: true }),
      db
        .collection("sessions")
        .createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
      db.collection("sessions").createIndex({ user_id: 1 }),
    ]).catch((error) => {
      indexesPromise = null;
      throw error;
    });
  }

  await indexesPromise;
  return {
    sessions: db.collection("sessions"),
    users: db.collection("users"),
  };
}

export async function createSession(userId) {
  const { sessions } = await getCollections();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  const objectId =
    typeof userId === "string"
      ? new mongoose.Types.ObjectId(userId)
      : userId;

  await sessions.insertOne({
    token_hash: hashToken(token),
    user_id: objectId,
    created_at: new Date(),
    expires_at: expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const { sessions } = await getCollections();
    await sessions.deleteOne({ token_hash: hashToken(token) });
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { sessions, users } = await getCollections();
  const session = await sessions.findOne({
    token_hash: hashToken(token),
    expires_at: { $gt: new Date() },
  });

  if (!session) return null;

  const user = await users.findOne({
    _id: session.user_id,
    is_active: { $ne: false },
  });

  return user ? sanitizeUser(user) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requirePermission(permission) {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw new Error("Forbidden");
  }
  return user;
}

export { sanitizeUser };
