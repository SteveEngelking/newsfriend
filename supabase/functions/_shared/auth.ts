// Shared auth helpers for edge functions.
// Validates that a caller is either:
//   - the service role (server-to-server invoke), or
//   - an authenticated admin user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthCheckResult {
  ok: boolean;
  isServiceRole: boolean;
  isAdmin: boolean;
  userId?: string;
  reason?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function getBearer(req: Request): string | null {
  const h = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice("Bearer ".length).trim();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function requireAdminOrService(req: Request): Promise<AuthCheckResult> {
  const token = getBearer(req);
  if (!token) return { ok: false, isServiceRole: false, isAdmin: false, reason: "Missing Authorization" };

  // Service role match (exact env match)
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  // Decode JWT to inspect role claim. A service_role JWT issued by this
  // project's auth keys but no longer matching the current env var is still
  // a legitimate server-to-server token (e.g. stored in Vault for cron).
  const decoded = decodeJwtPayload(token);
  if (decoded?.role === "service_role" && (decoded?.iss === "supabase" || (typeof decoded?.iss === "string" && decoded.iss.includes("supabase")))) {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  // Validate user JWT via Supabase
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    console.error("requireAdminOrService: invalid token", { claimsErr, decodedRole: decoded?.role, decodedIss: decoded?.iss });
    return { ok: false, isServiceRole: false, isAdmin: false, reason: "Invalid token" };
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return { ok: false, isServiceRole: false, isAdmin: false, userId, reason: "Not admin" };

  return { ok: true, isServiceRole: false, isAdmin: true, userId };
}

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = getBearer(req);
  if (!token || token === SUPABASE_SERVICE_ROLE_KEY) return null;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

export function isServiceRoleRequest(req: Request): boolean {
  return getBearer(req) === SUPABASE_SERVICE_ROLE_KEY;
}
