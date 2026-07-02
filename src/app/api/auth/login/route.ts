import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { WebAuthnCredential } from "@/lib/models/WebAuthnCredential";
import {
  signSession,
  setSessionCookie,
  clearAuthCookies,
  signPreAuth,
  setPreAuthCookie,
} from "@/lib/auth";
import { json, error } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

/**
 * InfoLog identity portal — email + password authenticate against InfoLog's
 * identity system and issue a full session. Biometric unlock is OPTIONAL and
 * handled separately (offered after login / used as a faster unlock).
 */
export async function POST(req: NextRequest) {
  const { email, password, location } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return error("Email and password are required.");
  }

  await connectDB();
  const user = await User.findOne({ email: String(email).toLowerCase().trim() });

  // Don't reveal whether the account exists.
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    return error("Invalid credentials.", 401);
  }

  const permissions = user.permissions.map((p) => String(p));

  // Two-factor gate: if TOTP is enabled, DON'T issue a full session yet — hand
  // out a short-lived pre-auth token and make the client complete /mfa/verify.
  if (user.totpEnabled) {
    const preauth = await signPreAuth(user._id.toString());
    await clearAuthCookies();
    await setPreAuthCookie(preauth);
    return json({ status: "mfa_required" });
  }

  const token = await signSession({
    sub: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
    permissions,
    amr: ["pwd"],
  });
  await clearAuthCookies();
  await setSessionCookie(token);

  await writeAudit(req, { userId: user._id.toString(), username: user.username }, {
    action: "login",
    location: typeof location === "string" ? location : undefined,
  });

  const biometricEnrolled =
    (await WebAuthnCredential.countDocuments({ userId: user._id })) > 0;

  return json({
    status: "authenticated",
    biometricEnrolled,
    user: {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      permissions,
    },
  });
}
