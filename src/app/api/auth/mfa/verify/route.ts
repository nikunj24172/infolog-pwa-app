import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { WebAuthnCredential } from "@/lib/models/WebAuthnCredential";
import {
  getPreAuth,
  signSession,
  setSessionCookie,
  clearAuthCookies,
} from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { json, error } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

/**
 * Second step of password login: verify the TOTP code against the pre-auth
 * token issued by /api/auth/login, then promote to a full session.
 */
export async function POST(req: NextRequest) {
  const pre = await getPreAuth();
  if (!pre) return error("Your sign-in expired. Enter your password again.", 401);

  const { token, location } = await req.json().catch(() => ({}));
  if (!token) return error("Enter the 6-digit code from your authenticator app.");

  await connectDB();
  const user = await User.findById(pre.sub).select("+totpSecret");
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return error("Two-factor is not set up for this account.", 400);
  }
  if (!(await verifyTotp(String(token), user.totpSecret))) {
    return error("Incorrect code. Check your authenticator app and try again.", 400);
  }

  const permissions = user.permissions.map((p) => String(p));
  const sessionToken = await signSession({
    sub: user._id.toString(),
    username: user.username,
    name: user.name,
    role: user.role,
    permissions,
    amr: ["pwd", "otp"],
  });
  await clearAuthCookies(); // drops the pre-auth cookie too
  await setSessionCookie(sessionToken);

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
