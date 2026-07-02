import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { getSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { json, error } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

/** Confirm a code against the pending secret and switch two-factor on. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return error("Not authenticated", 401);

  const { token } = await req.json().catch(() => ({}));
  if (!token) return error("Enter the 6-digit code from your authenticator app.");

  await connectDB();
  const user = await User.findById(session.sub).select("+totpSecret");
  if (!user?.totpSecret) return error("Start two-factor setup first.", 400);
  if (!(await verifyTotp(String(token), user.totpSecret))) {
    return error("Incorrect code. Check your authenticator app and try again.", 400);
  }

  user.totpEnabled = true;
  await user.save();

  await writeAudit(req, { userId: session.sub, username: session.username }, {
    action: "mfa_enable",
  });

  return json({ enabled: true });
}
