"use client";

/**
 * Client-side cache of file-session METADATA so a field officer can open the
 * app offline and still see / continue their sessions for up to 48 hours.
 *
 * SECURITY: only non-sensitive session metadata is stored here — never raw
 * search results or PII (aligns with "no local sensitive storage").
 */
export interface CachedSession {
  _id: string;
  title: string;
  caseRef: string;
  status: "open" | "closed";
  searchCount: number;
  lastActiveAt: string;
  createdAt: string;
}

const KEY = "infolog.sessions.v1";
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

type Envelope = { savedAt: number; data: CachedSession[] };

export function cacheSessions(sessions: CachedSession[]) {
  if (typeof window === "undefined") return;
  try {
    const env: Envelope = { savedAt: Date.now(), data: sessions };
    localStorage.setItem(KEY, JSON.stringify(env));
  } catch {
    /* storage may be unavailable/full — non-fatal */
  }
}

export function getCachedSessions(): { sessions: CachedSession[]; expired: boolean } {
  if (typeof window === "undefined") return { sessions: [], expired: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: [], expired: false };
    const env = JSON.parse(raw) as Envelope;
    const age = Date.now() - env.savedAt;
    if (age > TTL_MS) {
      localStorage.removeItem(KEY);
      return { sessions: [], expired: true };
    }
    return { sessions: env.data, expired: false };
  } catch {
    return { sessions: [], expired: false };
  }
}

export function clearCachedSessions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
