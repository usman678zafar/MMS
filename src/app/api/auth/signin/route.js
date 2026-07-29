import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request) {
  try {
    const { email, password } = loginSchema.parse(await request.json());

    await connectDB();
    const attempts = mongoose.connection.db.collection("loginattempts");
    await attempts.createIndex(
      { created_at: 1 },
      { expireAfterSeconds: ATTEMPT_WINDOW_MS / 1000 },
    );

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const identifier = `${ip}:${email}`;
    const since = new Date(Date.now() - ATTEMPT_WINDOW_MS);
    const attemptCount = await attempts.countDocuments({
      identifier,
      created_at: { $gte: since },
    });

    if (attemptCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { success: false, error: "Too many sign-in attempts. Try again later." },
        { status: 429 },
      );
    }

    const user = await User.findOne({ email });

    const isValidPassword =
      user &&
      user.is_active !== false &&
      (await bcrypt.compare(password, user.password));

    if (!isValidPassword) {
      await attempts.insertOne({ identifier, created_at: new Date() });
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    await attempts.deleteMany({ identifier });
    await createSession(user._id);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
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
