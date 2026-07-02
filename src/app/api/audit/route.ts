import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/lib/models/AuditLog";
import { requireSession, json } from "@/lib/api";
import { hasPermission } from "@/lib/auth";

/**
 * Audit trail viewer. Officers see their own activity; users with the
 * `audit:view` permission (supervisor/admin) can see the whole trail.
 */
export async function GET(req: NextRequest) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const canViewAll = hasPermission(guard.session, "audit:view");
  const filter: Record<string, unknown> = canViewAll
    ? {}
    : { userId: guard.session.sub };

  const action = req.nextUrl.searchParams.get("action");
  if (action) filter.action = action;

  await connectDB();
  const entries = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  return json({ scope: canViewAll ? "all" : "self", entries });
}
