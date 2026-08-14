import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request) {
  try {
    const { email, password } = loginSchema.parse(await request.json());

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const identifier = `${ip}:${email}`;
    const now = new Date();
    const since = new Date(now.getTime() - ATTEMPT_WINDOW_MS);
    const [attempt] = await db
      .select()
      .from(loginAttempts)
      .where(and(eq(loginAttempts.key, identifier), gt(loginAttempts.windowStartedAt, since)))
      .limit(1);
    const attemptCount = attempt?.count || 0;

    if (attemptCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: "Too many sign-in attempts. Try again later." },
        { status: 429 },
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = lower(${email})`)
      .limit(1);

    const isValidPassword =
      user &&
      user.isActive !== false &&
      (await bcrypt.compare(password, user.password));

    if (!isValidPassword) {
      await db
        .insert(loginAttempts)
        .values({ key: identifier, count: 1, windowStartedAt: now, updatedAt: now })
        .onConflictDoUpdate({
          target: loginAttempts.key,
          set: {
            count: attempt && attempt.windowStartedAt > since ? sql`${loginAttempts.count} + 1` : 1,
            windowStartedAt: attempt && attempt.windowStartedAt > since ? attempt.windowStartedAt : now,
            updatedAt: now,
          },
        });
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await db.delete(loginAttempts).where(eq(loginAttempts.key, identifier));
    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: Array.isArray(user.permissions) ? user.permissions : null,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Unable to sign in" },
      { status: 500 },
    );
  }
}
