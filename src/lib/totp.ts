import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

/**
 * TOTP (RFC 6238) second factor. The user scans the QR with any authenticator
 * app — Microsoft Authenticator, Google Authenticator, Authy — which then shows
 * a rolling 6-digit code. This is standard TOTP; InfoLog remains the identity
 * provider (we are NOT federating to Microsoft/Entra).
 */

const ISSUER = process.env.NEXT_PUBLIC_RP_NAME ?? "InfoLog Mobile";

/** New base32 shared secret to store against the user. */
export function generateTotpSecret(): string {
  return generateSecret();
}

/** otpauth:// URI encoding issuer, account and secret — what the QR contains. */
export function totpKeyUri(account: string, secret: string): string {
  return generateURI({ issuer: ISSUER, label: account, secret });
}

/** Render the otpauth URI as a PNG data URL for an <img>. */
export function totpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}

/**
 * Check a user-entered code against their secret. `epochTolerance: 30` accepts
 * the adjacent 30s window on each side to absorb phone/server clock drift.
 */
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
  try {
    const res = await verify({
      secret,
      token: token.replace(/\s+/g, ""),
      epochTolerance: 30,
    });
    return res.valid;
  } catch {
    return false;
  }
}
