import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { Permission, Role } from "@/lib/models/User";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export const SESSION_COOKIE = "infolog_session";
export const PREAUTH_COOKIE = "infolog_preauth";

const SESSION_TTL_SECONDS =
  Number(process.env.SESSION_TIMEOUT_MINUTES ?? 15) * 60;
const PREAUTH_TTL_SECONDS = 5 * 60;

export interface SessionClaims extends JWTPayload {
  sub: string; // userId
  username: string;
  name: string;
  role: Role;
  permissions: Permission[];
  amr: string[]; // authentication methods: ["pwd","otp"] / +["webauthn"]
  typ: "session";
}

export interface PreAuthClaims extends JWTPayload {
  sub: string;
  typ: "preauth";
}

async function sign(payload: JWTPayload, ttlSeconds: number): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

export async function signSession(
  claims: Omit<SessionClaims, "typ" | "iat" | "exp">
): Promise<string> {
  return sign({ ...claims, typ: "session" }, SESSION_TTL_SECONDS);
}

export async function signPreAuth(userId: string): Promise<string> {
  return sign({ sub: userId, typ: "preauth" }, PREAUTH_TTL_SECONDS);
}

export async function verifyToken<T extends JWTPayload>(
  token: string
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as T;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Set the authenticated session cookie (call from a route handler). */
export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...cookieOpts, maxAge: SESSION_TTL_SECONDS });
}

export async function setPreAuthCookie(token: string) {
  const store = await cookies();
  store.set(PREAUTH_COOKIE, token, { ...cookieOpts, maxAge: PREAUTH_TTL_SECONDS });
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PREAUTH_COOKIE);
}

/** Read + verify the session from cookies. Returns null if missing/expired. */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyToken<SessionClaims>(token);
  if (!claims || claims.typ !== "session") return null;
  return claims;
}

export async function getPreAuth(): Promise<PreAuthClaims | null> {
  const store = await cookies();
  const token = store.get(PREAUTH_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyToken<PreAuthClaims>(token);
  if (!claims || claims.typ !== "preauth") return null;
  return claims;
}

export function hasPermission(
  session: SessionClaims,
  perm: Permission
): boolean {
  return session.role === "admin" || session.permissions.includes(perm);
}

export { SESSION_TTL_SECONDS };
