import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const SITE_NAME = "NewsFriend"
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

    const { type, announcementId, specialEditionId } = await req.json()

    if (!['daily_report', 'announcement', 'special_edition'].includes(type)) {
      return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For daily_report, fetch the latest report data per language
    let reportsByLanguage: Record<string, { introduction: string; themeHeadlines: string[]; bannerImageUrl?: string }> = {}
    if (type === 'daily_report') {
      for (const lang of ['en', 'de']) {
        const { data: latestReport } = await supabase
          .from('generated_reports')
          .select('report_data')
          .eq('language', lang)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestReport?.report_data) {
          const rd = latestReport.report_data as any
          reportsByLanguage[lang] = {
            introduction: (rd.introduction || '').slice(0, 500),
            themeHeadlines: (rd.themes || []).slice(0, 10).map((t: any) => t.headline || '').filter(Boolean),
            bannerImageUrl: rd.bannerImageUrl || undefined,
          }
        }
      }
      // Fallback: if only one language exists, use it for both
      if (!reportsByLanguage['en'] && reportsByLanguage['de']) reportsByLanguage['en'] = reportsByLanguage['de']
      if (!reportsByLanguage['de'] && reportsByLanguage['en']) reportsByLanguage['de'] = reportsByLanguage['en']

      if (Object.keys(reportsByLanguage).length === 0) {
        return new Response(JSON.stringify({ sent: 0, message: 'No recent reports found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Special edition: fetch the chosen edition (admin-curated, single record)
    let specialEditionData: { topic: string; headline: string; summary: string; language: string } | null = null
    if (type === 'special_edition') {
      if (!specialEditionId) {
        return new Response(JSON.stringify({ error: 'specialEditionId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const { data: se } = await supabase
        .from('special_editions').select('topic, language, report_data').eq('id', specialEditionId).single()
      if (!se) {
        return new Response(JSON.stringify({ error: 'Special edition not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const rd = (se as any).report_data || {}
      specialEditionData = {
        topic: se.topic,
        headline: rd.headline || se.topic,
        summary: (rd.summary || '').slice(0, 600),
        language: se.language,
      }
    }

    // Get subscribers with their profile info (email + preferred language)
    // Special editions reuse daily-report subscribers (per spec).
    const column = (type === 'daily_report' || type === 'special_edition') ? 'notify_daily_reports' : 'notify_announcements'
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
      .select('email, preferred_language, user_id')
      .in('user_id', userIds)

    if (profilesError) throw profilesError
    let validProfiles = profiles?.filter(p => p.email) || []

    // For special editions, only send to subscribers whose preferred language
    // matches the edition's language. (e.g. a German edition goes only to DE users.)
    if (type === 'special_edition' && specialEditionData) {
      const editionLang = specialEditionData.language === 'de' ? 'de' : 'en'
      validProfiles = validProfiles.filter(p => {
        const lang = ((p as any).preferred_language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en'
        return lang === editionLang
      })
    }

    if (validProfiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No valid emails' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For announcements, fetch data once
    let announcementData: { title: string; content: string } | null = null
    if (type === 'announcement' && announcementId) {
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
      announcementData = announcement
    }

    // Group profiles by language for efficient rendering
    const dateKey = new Date().toISOString().slice(0, 10)
    let sentCount = 0

    // Pre-render templates per language
    const renderedByLang: Record<string, { html: string; plainText: string; subject: string }> = {}

    for (const profile of validProfiles) {
      const lang = (profile as any).preferred_language || 'en'
      const email = profile.email!
      const normalizedEmail = email.toLowerCase()

      try {
        // Check suppression
        const { data: suppressed } = await supabase
          .from('suppressed_emails')
          .select('id')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (suppressed) { console.log(`Skipping suppressed: ${email}`); continue }

        // Check/create unsubscribe token
        let unsubscribeToken: string
        const { data: existingToken } = await supabase
          .from('email_unsubscribe_tokens')
          .select('token, used_at')
          .eq('email', normalizedEmail)
          .maybeSingle()

        if (existingToken && existingToken.used_at) { console.log(`Skipping unsubscribed: ${email}`); continue }
        else if (existingToken) { unsubscribeToken = existingToken.token }
        else {
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

        // Build template data based on type and language
        let templateName: string
        let templateData: Record<string, any>

        if (type === 'daily_report') {
          templateName = 'daily-report-notification'
          const reportData = reportsByLanguage[lang] || reportsByLanguage['en'] || Object.values(reportsByLanguage)[0]
          templateData = { ...reportData, language: lang }
        } else if (type === 'special_edition') {
          templateName = 'special-edition-notification'
          templateData = { ...specialEditionData!, language: specialEditionData!.language, editionId: specialEditionId }
        } else {
          templateName = 'announcement-notification'
          templateData = { title: announcementData!.title, content: announcementData!.content }
        }

        // Render per-language (with caching)
        const cacheKey = `${templateName}-${lang}`
        if (!renderedByLang[cacheKey]) {
          const template = TEMPLATES[templateName]
          if (!template) { console.error(`Template '${templateName}' not found`); continue }
          const html = await renderAsync(React.createElement(template.component, templateData))
          const plainText = await renderAsync(React.createElement(template.component, templateData), { plainText: true })
          const resolvedSubject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject
          renderedByLang[cacheKey] = { html, plainText, subject: resolvedSubject }
        }

        const { html, plainText, subject } = renderedByLang[cacheKey]
        const messageId = crypto.randomUUID()
        const idempotencyKey = `${templateName}-${announcementId || specialEditionId || 'daily'}-${normalizedEmail}-${dateKey}`

        await supabase.from('email_send_log').insert({
          message_id: messageId,
          template_name: templateName,
          recipient_email: email,
          status: 'pending',
        })

        const { error: enqueueError } = await supabase.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: email,
            from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
            sender_domain: SENDER_DOMAIN,
            subject,
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
      total: validProfiles.length,
      message: `Notification queued for ${sentCount}/${validProfiles.length} subscribers`,
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
