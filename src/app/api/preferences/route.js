import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { userPreferencesSchema } from "@/lib/validation";

export async function PATCH(request) {
  try {
    const currentUser = await requireUser();
    const preferences = userPreferencesSchema.parse(await request.json());
    const [updatedUser] = await db
      .update(users)
      .set({ ...preferences, updatedAt: new Date() })
      .where(eq(users.id, currentUser.id))
      .returning({ language: users.language, theme: users.theme });

    return NextResponse.json({ success: true, preferences: updatedUser });
  } catch (error) {
    if (error?.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.issues?.[0]?.message || "Invalid preferences" },
        { status: 400 },
      );
    }
    console.error("Update preferences error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to update preferences" },
      { status: 500 },
    );
  }
}
