import type { NextRequest } from "next/server";
import { getSession, clearAuthCookies } from "@/lib/auth";
import { json } from "@/lib/api";
import { writeAudit, auditActor } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session) {
    await writeAudit(req, auditActor(session), { action: "logout" });
  }
  await clearAuthCookies();
  return json({ status: "logged_out" });
}
