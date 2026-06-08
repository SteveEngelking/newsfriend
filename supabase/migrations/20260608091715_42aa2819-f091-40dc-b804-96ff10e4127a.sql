
-- Restrict anonymous reads of prompt_instruction columns
REVOKE SELECT ON public.ethical_perspectives FROM anon;
GRANT SELECT (id, name, icon, description, color_bg, color_border, color_heading, color_text, sort_order, enabled, created_at) ON public.ethical_perspectives TO anon;

REVOKE SELECT ON public.mondcivitan_settings FROM anon;
GRANT SELECT (id, updated_at) ON public.mondcivitan_settings TO anon;

-- Fix mutable search_path on SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = pgmq, public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = pgmq, public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = pgmq, public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = pgmq, public;
