import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { getSession } from "@/lib/auth";
import { generateTotpSecret, totpKeyUri, totpQrDataUrl } from "@/lib/totp";
import { json, error } from "@/lib/api";

/**
 * Begin TOTP enrollment for the signed-in user: mint a secret, store it as
 * PENDING (totpEnabled stays false until a code is confirmed via /enable), and
 * return the QR + manual key to scan with an authenticator app.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return error("Not authenticated", 401);

  await connectDB();
  const user = await User.findById(session.sub).select("+totpSecret");
  if (!user) return error("User not found", 404);
  if (user.totpEnabled) return error("Two-factor is already enabled.", 409);

  const secret = generateTotpSecret();
  user.totpSecret = secret; // pending until confirmed
  user.totpEnabled = false;
  await user.save();

  const uri = totpKeyUri(user.email, secret);
  const qr = await totpQrDataUrl(uri);

  return json({ secret, uri, qr });
}
