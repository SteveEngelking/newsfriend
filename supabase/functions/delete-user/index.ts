const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const targetUserId: string = body.userId || user.id
    const selfDelete = targetUserId === user.id

    // If deleting someone else, must be admin
    if (!selfDelete) {
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()

      if (!roleData) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Admins can't delete other admins through this function
      const { data: targetRole } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
        .eq('role', 'admin')
        .maybeSingle()

      if (targetRole) {
        return new Response(JSON.stringify({ error: 'Cannot delete another admin. Use remove-admin instead.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Get email for cleanup
    let targetEmail: string | null = null
    try {
      const { data: targetUser } = await adminClient.auth.admin.getUserById(targetUserId)
      targetEmail = targetUser?.user?.email ?? null
    } catch {}

    // Delete related data (profiles, notification_preferences, user_comments, user_roles)
    await Promise.all([
      adminClient.from('profiles').delete().eq('user_id', targetUserId),
      adminClient.from('notification_preferences').delete().eq('user_id', targetUserId),
      adminClient.from('user_comments').delete().eq('user_id', targetUserId),
      adminClient.from('user_roles').delete().eq('user_id', targetUserId),
    ])

    // Clean up invites
    if (targetEmail) {
      await adminClient.from('admin_invites').delete().eq('email', targetEmail.toLowerCase())
    }

    // Delete the auth user (may already be gone for orphaned profiles)
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
    if (authDeleteError && !authDeleteError.message.includes('not found')) {
      console.error('Failed to delete auth user:', authDeleteError.message)
      return new Response(JSON.stringify({ error: 'Failed to delete user: ' + authDeleteError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
