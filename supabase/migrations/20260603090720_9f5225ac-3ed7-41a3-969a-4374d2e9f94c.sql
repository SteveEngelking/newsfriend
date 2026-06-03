DO $$
BEGIN
  PERFORM net.http_post(
    url := 'https://kitduddwitnsaqfwdpxd.supabase.co/functions/v1/generate-scheduled-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
END $$;