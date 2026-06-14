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

async function verifyServiceRoleWithBackend(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: {
        apikey: token,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      await res.body?.cancel();
      return false;
    }
    await res.text();
    return true;
  } catch (e) {
    console.error("service role backend verification failed", e);
    return false;
  }
}

export async function requireAdminOrService(req: Request): Promise<AuthCheckResult> {
  const token = getBearer(req);
  if (!token) return { ok: false, isServiceRole: false, isAdmin: false, reason: "Missing Authorization" };

  // Fast path: exact env match for service role.
  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  const claims = claimsData?.claims as Record<string, unknown> | undefined;

  if ((claimsError || !claims?.sub) && await verifyServiceRoleWithBackend(token)) {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  if (claimsError || !claims) {
    return { ok: false, isServiceRole: false, isAdmin: false, reason: "Invalid token" };
  }

  const userId = claims.sub as string | undefined;
  if (!userId) {
    return { ok: false, isServiceRole: false, isAdmin: false, reason: "Invalid token" };
  }

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
