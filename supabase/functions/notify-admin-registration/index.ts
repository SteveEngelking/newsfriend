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
    const { newUserEmail, newUserName } = await req.json();
    if (!newUserEmail || typeof newUserEmail !== 'string') {
      return new Response(JSON.stringify({ error: 'newUserEmail required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

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
