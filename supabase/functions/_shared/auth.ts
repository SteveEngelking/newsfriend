// Shared auth helpers for edge functions.
// Validates that a caller is either:
//   - the service role (server-to-server invoke), or
//   - an authenticated admin user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtVerify, createLocalJWKSet, createRemoteJWKSet } from "https://esm.sh/jose@5.9.6";

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

const SUPABASE_JWKS_RAW = Deno.env.get("SUPABASE_JWKS");
let jwks: ReturnType<typeof createLocalJWKSet> | ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (jwks) return jwks;
  if (SUPABASE_JWKS_RAW) {
    try {
      jwks = createLocalJWKSet(JSON.parse(SUPABASE_JWKS_RAW));
      return jwks;
    } catch (e) {
      console.error("Failed to parse SUPABASE_JWKS, falling back to remote", e);
    }
  }
  jwks = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
  try {
    const { payload } = await jwtVerify(token, getJwks());
    return payload as Record<string, unknown>;
  } catch (e) {
    console.error("verifyJwt failed", e);
    return null;
  }
}

async function verifyServiceRoleWithBackend(token: string): Promise<boolean> {
  const decoded = decodeJwtPayload(token);
  if (decoded?.role !== "service_role") return false;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_roles?select=id&limit=0`, {
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

  if (await verifyServiceRoleWithBackend(token)) {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  // Cryptographically verify JWT signature using project JWKS. This works for
  // both user JWTs and service-role JWTs (which have role=service_role and no
  // sub claim — supabase-js's getClaims rejects those, so we use jose directly).
  let claims = await verifyJwt(token);

  if ((claims as any)?.role === "service_role") {
    return { ok: true, isServiceRole: true, isAdmin: false };
  }

  if (!claims) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return { ok: false, isServiceRole: false, isAdmin: false, reason: "Invalid token" };
    }
    claims = claimsData.claims as Record<string, unknown>;
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
