import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog, type IAuditLog } from "@/lib/models/AuditLog";
import { requestMeta } from "@/lib/api";
import type { SessionClaims } from "@/lib/auth";

type AuditInput = {
  action: IAuditLog["action"];
  searchType?: IAuditLog["searchType"];
  searchedValue?: string;
  purpose?: string;
  sessionId?: string;
  resultAccessed?: boolean;
  resultCount?: number;
  location?: string;
};

/**
 * Central audit writer. Every meaningful action funnels through here so the
 * mobile audit trail stays consistent with the desktop schema.
 */
export async function writeAudit(
  req: NextRequest,
  actor: { userId: string; username: string },
  input: AuditInput
) {
  await connectDB();
  const meta = requestMeta(req);
  await AuditLog.create({
    userId: actor.userId,
    username: actor.username,
    device: meta.device,
    userAgent: meta.userAgent,
    ip: meta.ip,
    source: meta.source,
    resultAccessed: input.resultAccessed ?? false,
    ...input,
  });
}

/** Convenience for authenticated actions where the session is already known. */
export function auditActor(session: SessionClaims) {
  return { userId: session.sub, username: session.username };
}
