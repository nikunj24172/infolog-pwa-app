"use client";

/**
 * OFFLINE biometric unlock.
 *
 * The normal biometric *login* (src/app/api/auth/biometric/login/verify) sends
 * the WebAuthn assertion to the server to verify — that needs a network round
 * trip. Offline we can't do that, so we run the SAME platform-authenticator
 * ceremony (Face ID / fingerprint / Windows Hello) purely on-device and treat a
 * successful user-verification gesture as the gate to decrypt the 48h cache.
 *
 * The gesture is verified by the device's secure enclave, so no server is
 * involved. We can't check signature/revocation offline — that's an accepted
 * limitation, mitigated by: the encrypted cache, the 48h TTL, and the fact that
 * the ceremony still requires the enrolled authenticator + the live biometric.
 *
 * HARDENING (later): use the WebAuthn PRF extension to DERIVE the AES key from
 * this ceremony, so the cache is cryptographically undecryptable without it.
 */

function base64urlToBytes(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    b64url.length + ((4 - (b64url.length % 4)) % 4),
    "="
  );
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** True if this browser can do WebAuthn at all. */
export function biometricSupported(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

/**
 * Prompt the platform authenticator locally. Resolves true only if the user
 * passes biometric user-verification. `credentialIds` are the base64url IDs of
 * the user's enrolled passkeys (from /api/auth/me, cached in `me`); passing them
 * restricts the prompt to this user's own credentials.
 */
export async function unlockWithBiometric(credentialIds: string[]): Promise<boolean> {
  if (!biometricSupported()) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials = (credentialIds ?? []).map((id) => ({
      id: base64urlToBytes(id) as BufferSource,
      type: "public-key" as const,
    }));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        userVerification: "required", // forces fingerprint/face, not just presence
        timeout: 60_000,
        ...(allowCredentials.length ? { allowCredentials } : {}),
      },
    });

    return assertion !== null;
  } catch {
    // User cancelled, no matching credential, or authenticator error.
    return false;
  }
}
