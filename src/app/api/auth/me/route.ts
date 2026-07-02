import { connectDB } from "@/lib/db";
import { User } from "@/lib/models/User";
import { WebAuthnCredential } from "@/lib/models/WebAuthnCredential";
import { getSession } from "@/lib/auth";
import { json, error } from "@/lib/api";

export async function GET() {
  const session = await getSession();
  if (!session) return error("Not authenticated", 401);

  await connectDB();
  const creds = await WebAuthnCredential.find({ userId: session.sub }).select("credentialID");
  const credentialIds = creds.map((c) => c.credentialID);
  const user = await User.findById(session.sub).select("totpEnabled");

  return json({
    user: {
      id: session.sub,
      username: session.username,
      name: session.name,
      role: session.role,
      permissions: session.permissions,
      amr: session.amr,
    },
    biometricEnrolled: credentialIds.length > 0,
    // Sent so the client can run an OFFLINE unlock (local WebAuthn) against the
    // user's own passkeys without contacting the server.
    biometricCredentialIds: credentialIds,
    mfaEnabled: !!user?.totpEnabled,
    sessionExpiresAt: session.exp ? session.exp * 1000 : null,
  });
}
