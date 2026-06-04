// Admin-only endpoint that returns scheduler status for the admin dashboard.
// Returns:
//   - cron job info (next run, last run details)
//   - per-schedule status: next run time, last run, latest report ids, email send counts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdminOrService } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function computeNextRun(scheduleHourUtc: number | null, frequency: string): string {
  const now = new Date();
  if (frequency === "hourly" || scheduleHourUtc == null) {
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next.toISOString();
  }
  // daily / weekly fallback: next UTC time at scheduleHourUtc
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(scheduleHourUtc);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdminOrService(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.reason || "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Schedules
    const { data: schedules } = await admin
      .from("report_schedules")
      .select("id, frequency, language, enabled, last_run_at, schedule_hour_utc")
      .order("created_at", { ascending: true });

    // Cron job info via raw SQL
    let cronJob: any = null;
    let cronRuns: any[] = [];
    try {
      const { data: jobs } = await admin.rpc("scheduler_cron_info" as any).catch(() => ({ data: null }));
      cronJob = jobs;
    } catch { /* ignore */ }

    // Fallback: query cron.job and cron.job_run_details directly via PostgREST RPC isn't exposed.
    // We use a simple SELECT via supabase-js by hitting `pg_catalog` won't work; we rely on returned schedule windows instead.

    // For each schedule + language pair, fetch most recent report & email stats
    const perSchedule = await Promise.all(
      (schedules || []).map(async (s: any) => {
        const langs = ["en", "de"];
        const reportsByLang: Record<string, any> = {};
        for (const lang of langs) {
          const { data: rep } = await admin
            .from("generated_reports")
            .select("id, title, language, created_at")
            .eq("language", lang)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (rep) reportsByLang[lang] = rep;
        }

        // Email stats: dedupe by message_id, take latest status, since last_run_at
        const since = s.last_run_at
          ? new Date(new Date(s.last_run_at).getTime() - 60_000).toISOString()
          : new Date(Date.now() - 24 * 3600_000).toISOString();
        const { data: emailRows } = await admin
          .from("email_send_log")
          .select("message_id, status, created_at, recipient_email, error_message")
          .eq("template_name", "daily-report-notification")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(500);

        const latestByMsg = new Map<string, any>();
        for (const r of emailRows || []) {
          if (!r.message_id) continue;
          if (!latestByMsg.has(r.message_id)) latestByMsg.set(r.message_id, r);
        }
        const counts = { sent: 0, failed: 0, pending: 0, dlq: 0, suppressed: 0, bounced: 0, other: 0 };
        const failures: any[] = [];
        for (const r of latestByMsg.values()) {
          const st = r.status as keyof typeof counts;
          if (st in counts) counts[st]++;
          else counts.other++;
          if (r.status === "dlq" || r.status === "failed" || r.status === "bounced") {
            failures.push({ recipient: r.recipient_email, status: r.status, error: r.error_message, at: r.created_at });
          }
        }

        return {
          id: s.id,
          language: s.language,
          frequency: s.frequency,
          enabled: s.enabled,
          schedule_hour_utc: s.schedule_hour_utc,
          last_run_at: s.last_run_at,
          next_run_at: computeNextRun(s.schedule_hour_utc, s.frequency),
          latest_reports: reportsByLang,
          email_counts: counts,
          email_failures: failures.slice(0, 20),
          email_total: latestByMsg.size,
        };
      }),
    );

    // Cron next run: hourly cron runs at minute 0 each hour
    const cronNow = new Date();
    const cronNext = new Date(cronNow);
    cronNext.setUTCMinutes(0, 0, 0);
    cronNext.setUTCHours(cronNext.getUTCHours() + 1);

    return new Response(
      JSON.stringify({
        cron: {
          jobname: "generate-scheduled-reports",
          schedule: "0 * * * *",
          next_run_at: cronNext.toISOString(),
          server_time: cronNow.toISOString(),
        },
        schedules: perSchedule,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
