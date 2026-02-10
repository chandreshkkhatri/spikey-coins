import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { users, wallets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const loginSchema = z.object({
  idToken: z.string().min(1),
});

const SESSION_EXPIRY = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(request: NextRequest) {
  try {
    if (!adminAuth) {
      return NextResponse.json(
        { success: false, error: "Auth not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { idToken } = loginSchema.parse(body);

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY,
    });

    // Upsert user in PostgreSQL
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, decoded.uid))
      .limit(1);

    let user = existingUser;

    if (!user) {
      // New user — create user record + wallets
      const [newUser] = await db
        .insert(users)
        .values({
          firebaseUid: decoded.uid,
          email: decoded.email!,
        })
        .returning();

      user = newUser;

      // Create USDT and USDC wallets
      await db.insert(wallets).values([
        { userId: user.id, currency: "USDT" },
        { userId: user.id, currency: "USDC" },
      ]);
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });

    response.cookies.set("__session", sessionCookie, {
      maxAge: SESSION_EXPIRY / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 401 }
    );
  }
}
