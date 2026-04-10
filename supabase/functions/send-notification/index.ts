import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "newsfriend"
const SENDER_DOMAIN = "notify.schonfield.org"
const FROM_DOMAIN = "notify.schonfield.org"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

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

    const template = TEMPLATES[templateName]
    if (!template) {
      return new Response(JSON.stringify({ error: `Template '${templateName}' not found` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Pre-render the template once (same content for all recipients)
    const html = await renderAsync(React.createElement(template.component, templateData))
    const plainText = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
    const resolvedSubject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

    console.log(`Sending ${templateName} to ${emails.length} recipients`)
    console.log(`Recipients: ${emails.join(', ')}`)

    // Enqueue an email for each subscriber directly
    let sentCount = 0
    const dateKey = new Date().toISOString().slice(0, 10)

    for (const email of emails) {
      try {
        const normalizedEmail = email.toLowerCase()

        // Check suppression
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (suppressed) {
          console.log(`Skipping suppressed: ${email}`)
          continue
        }

        // Get or create unsubscribe token
        let unsubscribeToken: string
        const { data: existingToken } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existingToken && existingToken.used_at) {
          console.log(`Skipping unsubscribed: ${email}`)
          continue
        } else if (existingToken) {
          unsubscribeToken = existingToken.token
        } else {
          unsubscribeToken = generateToken()
          await supabase.from('email_unsubscribe_tokens').upsert(
            { token: unsubscribeToken, email: normalizedEmail },
            { onConflict: 'email', ignoreDuplicates: true }
          )
          const { data: storedToken } = await supabase
            .from('email_unsubscribe_tokens')
            .select('token')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (storedToken) unsubscribeToken = storedToken.token
        }

        const messageId = crypto.randomUUID()
        const idempotencyKey = `${templateName}-${announcementId || 'daily'}-${normalizedEmail}-${dateKey}`

        // Log pending
        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: email,
          status: 'pending',
        })

        // Enqueue
        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject: resolvedSubject,
            html,
            text: plainText,
            purpose: 'transactional',
            label: templateName,
            idempotency_key: idempotencyKey,
            unsubscribe_token: unsubscribeToken,
            queued_at: new Date().toISOString(),
          },
        })

        if (enqueueError) {
          console.error(`Failed to enqueue for ${email}:`, enqueueError)
        } else {
          sentCount++
        }
      } catch (err) {
        console.error(`Error processing ${email}:`, err)
      }
    }

    return new Response(JSON.stringify({
      sent: sentCount,
      total: emails.length,
      message: `Notification queued for ${sentCount}/${emails.length} subscribers`,
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
