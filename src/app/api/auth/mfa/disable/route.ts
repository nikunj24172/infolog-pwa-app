import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { getSession } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { json, error } from "@/lib/api";
import { writeAudit } from "@/lib/audit";

/** Turn two-factor off. Requires a current code so a walk-up device can't. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return error("Not authenticated", 401);

  const { token } = await req.json().catch(() => ({}));

  await connectDB();
  const user = await User.findById(session.sub).select("+totpSecret");
  if (!user) return error("User not found", 404);

  if (user.totpEnabled && user.totpSecret) {
    if (!(await verifyTotp(String(token ?? ""), user.totpSecret))) {
      return error("Enter a valid code to turn off two-factor.", 400);
    }
  }

  user.totpEnabled = false;
  user.totpSecret = undefined;
  await user.save();

  await writeAudit(req, { userId: session.sub, username: session.username }, {
    action: "mfa_disable",
  });

  return json({ enabled: false });
}
