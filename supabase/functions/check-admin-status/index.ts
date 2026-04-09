import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if this user is already admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleData) {
      return new Response(JSON.stringify({ isAdmin: true, noAdminsExist: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this user has a pending invite and auto-grant admin role
    const { data: invite } = await adminClient
      .from("admin_invites")
      .select("id")
      .eq("email", userEmail)
      .is("used_at", null)
      .maybeSingle();

    if (invite) {
      await adminClient.from("user_roles").insert({ user_id: userId, role: "admin" });
      await adminClient.from("admin_invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id);
      
      return new Response(JSON.stringify({ isAdmin: true, noAdminsExist: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if ANY admin exists
    const { data: anyAdmin } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    return new Response(JSON.stringify({ 
      isAdmin: false, 
      noAdminsExist: !anyAdmin || anyAdmin.length === 0 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
