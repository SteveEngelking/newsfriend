
CREATE TABLE public.mondcivitan_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  title text NOT NULL DEFAULT 'Mondcivitan Reflection',
  description text NOT NULL DEFAULT 'Reflections inspired by the Mondcivitan Republic — Servant of Mankind.',
  prompt_instruction text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mondcivitan_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mondcivitan settings"
ON public.mondcivitan_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can insert mondcivitan settings"
ON public.mondcivitan_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update mondcivitan settings"
ON public.mondcivitan_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_mondcivitan_settings_updated_at
BEFORE UPDATE ON public.mondcivitan_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.mondcivitan_settings (id, title, description, prompt_instruction)
VALUES (
  1,
  'Mondcivitan Reflection',
  'Reflections inspired by the Mondcivitan Republic — Servant of Mankind.',
  $$MONDCIVITAN REFLECTION: For EACH theme, you MUST also write a "mondcivitanReflection" — a thoughtful paragraph reflecting on the news story from the standpoint of the Mondcivitan Republic — Servant of Mankind. The Mondcivitan Republic is an international servant nation that EXISTS NOW in the minds and lives of its citizens. It was constituted in 1953 without territory on the initiative of Hugh J. Schonfield and others, embodying the International Arbitration League founded by Nobel Peace Prize winner Sir William Randal Cremer. Its ideals also resonate in John Lennon's song "Imagine".

Its citizens live by seven principles: No-one is an Enemy, No-one is a Foreigner, Service to All, Complete Impartiality, Work for Peace, True Democracy, Equity and Justice.

Write in DIRECT PRESENT TENSE as a citizen actively living these principles TODAY. The Republic IS real. The citizens ARE responding to events NOW. NEVER use conditional words like "would", "could", "should", "might", "if", "were", "imagine if", or hypothetical framing like "if nations followed" or "were leaders to adopt". Speak from the LIVED REALITY of Mondcivitan citizens — how they ACTUALLY understand, respond to, and act on each story right now, and what their principles REVEAL about it. Be specific about which principles apply to each story.$$
);
