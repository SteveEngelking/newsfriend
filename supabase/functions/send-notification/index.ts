const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { type, announcementId } = await req.json()

    if (!['daily_report', 'announcement'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get users who want this notification type
    const column = type === 'daily_report' ? 'notify_daily_reports' : 'notify_announcements'
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('user_id')
      .eq(column, true)

    if (prefsError) throw prefsError
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user emails from profiles
    const userIds = prefs.map(p => p.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .in('user_id', userIds)

    if (profilesError) throw profilesError

    const emails = profiles?.map(p => p.email).filter(Boolean) || []
    if (emails.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No valid emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build template info
    let templateName = ''
    let templateData: Record<string, any> = {}

    if (type === 'daily_report') {
      templateName = 'daily-report-notification'
    } else if (type === 'announcement' && announcementId) {
      const { data: announcement } = await supabase
        .from('admin_announcements')
        .select('title, content')
        .eq('id', announcementId)
        .single()

      if (!announcement) {
        return new Response(JSON.stringify({ error: 'Announcement not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      templateName = 'announcement-notification'
      templateData = { title: announcement.title, content: announcement.content }
    }

    console.log(`Sending ${templateName} to ${emails.length} recipients`)
    console.log(`Recipients: ${emails.join(', ')}`)

    // Send email to each subscriber via send-transactional-email
    let sentCount = 0
    for (const email of emails) {
      try {
        const { error } = await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName,
            recipientEmail: email,
            idempotencyKey: `${templateName}-${announcementId || 'daily'}-${email}-${new Date().toISOString().slice(0, 10)}`,
            templateData,
          },
        })
        if (!error) sentCount++
        else console.error(`Failed to send to ${email}:`, error)
      } catch (err) {
        console.error(`Error sending to ${email}:`, err)
      }
    }

    return new Response(JSON.stringify({ 
      sent: sentCount, 
      total: emails.length,
      message: `Notification sent to ${sentCount}/${emails.length} subscribers` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
