const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify the caller is an admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Create the invite record
    const { error: inviteError } = await adminClient
      .from('admin_invites')
      .upsert({ email: normalizedEmail, invited_by: user.id, used_at: null }, { onConflict: 'email' });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to send invite email via Supabase Auth
    const { error: authInviteError } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      redirectTo: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/admin`,
    });

    if (authInviteError) {
      console.error('Auth invite email error:', authInviteError);

      // If user already exists, grant admin role directly
      if (authInviteError.message?.includes('already been registered')) {
        // Find the existing user
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === normalizedEmail);

        if (existingUser) {
          // Grant admin role directly
          const { error: roleError } = await adminClient
            .from('user_roles')
            .upsert({ user_id: existingUser.id, role: 'admin' }, { onConflict: 'user_id,role' });

          // Mark invite as used
          await adminClient.from('admin_invites').update({ used_at: new Date().toISOString() }).eq('email', normalizedEmail);

          if (roleError) {
            console.error('Role grant error:', roleError);
          }

          return new Response(JSON.stringify({ 
            success: true, 
            message: `${normalizedEmail} already has an account and has been granted admin access directly.`,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Invite created for ${normalizedEmail}`,
        emailWarning: `Invite record saved but email delivery may have failed: ${authInviteError.message}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Invite sent to ${normalizedEmail}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-admin error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
