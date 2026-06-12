import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Require an authenticated caller (the newly-registered user's JWT).
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.slice('Bearer '.length).trim();
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerEmail = (claimsData.claims.email as string | undefined)?.toLowerCase();

    const { newUserEmail, newUserName } = await req.json();
    if (!newUserEmail || typeof newUserEmail !== 'string') {
      return new Response(JSON.stringify({ error: 'newUserEmail required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // The caller may only request notifications about their own registration.
    if (!callerEmail || callerEmail !== newUserEmail.toLowerCase().trim()) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Anti-abuse: only send if the email matches a real auth user created in the
    // last 10 minutes. This blocks anonymous callers from spamming admin inboxes
    // with arbitrary addresses while still allowing the signup flow to notify.
    const normalizedNewEmail = newUserEmail.toLowerCase().trim();
    const { data: usersList } = await supabase.auth.admin.listUsers();
    const matchingUser = (usersList?.users || []).find(
      u => (u.email || '').toLowerCase() === normalizedNewEmail
    );
    if (!matchingUser) {
      return new Response(JSON.stringify({ error: 'Unknown user' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const createdAt = matchingUser.created_at ? new Date(matchingUser.created_at).getTime() : 0;
    const ageMs = Date.now() - createdAt;
    if (!createdAt || ageMs > 10 * 60 * 1000) {
      return new Response(JSON.stringify({ error: 'User is not freshly registered' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all admin user_ids
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (!roles?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No admins' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve admin emails via auth admin API
    const { data: listData } = await supabase.auth.admin.listUsers();
    const adminEmails = (listData?.users || [])
      .filter(u => roles.some(r => r.user_id === u.id))
      .map(u => u.email)
      .filter((e): e is string => !!e);

    const registeredAt = new Date().toUTCString();
    let sent = 0;

    for (const adminEmail of adminEmails) {
      const idempotencyKey = `new-user-admin-${newUserEmail.toLowerCase()}-${adminEmail.toLowerCase()}`;
      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'new-user-admin',
          recipientEmail: adminEmail,
          idempotencyKey,
          templateData: { newUserEmail, newUserName: newUserName || '', registeredAt },
        },
      });
      if (error) console.error(`Failed to notify ${adminEmail}:`, error);
      else sent++;
    }

    return new Response(JSON.stringify({ sent, total: adminEmails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('notify-admin-registration error', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
