import type { NextRequest } from "next/server";
import { requireSession, json, error } from "@/lib/api";
import { writeAudit, auditActor } from "@/lib/audit";
import { isSearchType } from "@/lib/search";

/** Log that a user opened/accessed a specific result record (audit trail). */
export async function POST(req: NextRequest) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const { searchType, value, sessionId } = await req.json().catch(() => ({}));
  if (!searchType || !isSearchType(searchType)) {
    return error("Valid searchType required.");
  }
  if (!sessionId) return error("sessionId required.");

  await writeAudit(req, auditActor(guard.session), {
    action: "result_access",
    searchType,
    searchedValue: value ? String(value) : undefined,
    sessionId: String(sessionId),
    resultAccessed: true,
  });

  return json({ status: "recorded" });
}
