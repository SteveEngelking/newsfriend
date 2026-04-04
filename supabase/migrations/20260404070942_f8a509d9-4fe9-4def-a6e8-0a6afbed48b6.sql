
-- Create ethical_perspectives table for dynamic ethical considerations management
CREATE TABLE public.ethical_perspectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT '🌿',
  description text NOT NULL DEFAULT '',
  prompt_instruction text NOT NULL DEFAULT '',
  color_bg text NOT NULL DEFAULT '#ecfdf5',
  color_border text NOT NULL DEFAULT '#a7f3d0',
  color_heading text NOT NULL DEFAULT '#065f46',
  color_text text NOT NULL DEFAULT '#064e3b',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ethical_perspectives ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed by edge functions and display)
CREATE POLICY "Anyone can read perspectives" ON public.ethical_perspectives
  FOR SELECT TO public USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert perspectives" ON public.ethical_perspectives
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update perspectives" ON public.ethical_perspectives
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete perspectives" ON public.ethical_perspectives
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current ethical perspectives
INSERT INTO public.ethical_perspectives (name, icon, description, prompt_instruction, color_bg, color_border, color_heading, color_text, sort_order) VALUES
('Albert Schweitzer', '🌿', 'Reverence for Life philosophy', 'Albert Schweitzer''s "Reverence for Life" philosophy: every living being has intrinsic worth, personal responsibility, compassion over ideology, service to others, ethical consistency.', '#ecfdf5', '#a7f3d0', '#065f46', '#064e3b', 0),
('Jesus of Nazareth', '✝', 'Love, Golden Rule, forgiveness', 'Jesus of Nazareth: love thy neighbour, the Golden Rule, forgiveness, care for the poor and marginalised, peace-making, speaking truth to power, mercy over judgement.', '#f0f9ff', '#bae6fd', '#0c4a6e', '#0c4a6e', 1),
('Stephen R. Covey', '🧭', '7 Habits of Highly Effective People', 'Stephen R. Covey (The 7 Habits of Highly Effective People): be proactive, begin with the end in mind, put first things first, think win-win, seek first to understand then to be understood, synergise, sharpen the saw. Apply these principles to global events and leadership.', '#eef2ff', '#c7d2fe', '#3730a3', '#312e81', 2),
('Mahatma Gandhi', '☸', 'Non-violence, truth, moral courage', 'Mahatma Gandhi: non-violence (ahimsa), truth (satya), self-discipline, service to others, civil disobedience against injustice, be the change you wish to see, strength through moral courage.', '#fff7ed', '#fed7aa', '#9a3412', '#7c2d12', 3),
('Buddha', '🪷', 'Compassion, mindfulness, Middle Way', 'Buddha: the Four Noble Truths, the Eightfold Path, compassion (karuna), loving-kindness (metta), non-attachment, mindfulness, the interdependence of all beings, the Middle Way.', '#fefce8', '#fde68a', '#854d0e', '#713f12', 4),
('Prophet Mohammed', '☪', 'Justice, mercy, community solidarity', 'Prophet Mohammed: justice and equity, mercy and compassion, care for the vulnerable, seeking knowledge, community solidarity (ummah), moderation, stewardship of the earth.', '#f0fdfa', '#99f6e4', '#134e4a', '#115e59', 5),
('Torah', '✡', 'Justice, tikkun olam, loving-kindness', 'Torah: justice (tzedek), loving-kindness (chesed), repair of the world (tikkun olam), sanctity of life, obligation to the stranger, truthfulness, communal responsibility.', '#f5f3ff', '#c4b5fd', '#5b21b6', '#4c1d95', 6),
('Oshi', '⛩', 'Reverence for nature, harmony, purity', 'Oshi (Shinto traditions): reverence for nature and kami, purity of heart and action, harmony with the natural world, gratitude, communal bonds, sincerity, respect for ancestors and tradition.', '#fff1f2', '#fecdd3', '#9f1239', '#881337', 7),
('Bhagwan Shree Rajneesh', '🪷', 'Awareness, freedom from conditioning', 'Bhagwan Shree Rajneesh (Osho): awareness and consciousness, living in the present moment, freedom from conditioning, celebrating life, meditation as transformation, courage to be authentic, love without attachment.', '#fdf4ff', '#f0abfc', '#86198f', '#701a75', 8),
('Bhagavad Gita', '🙏', 'Dharma, selfless action, equanimity', 'Bhagavad Gita: dharma (righteous duty), selfless action (nishkama karma), equanimity in success and failure, devotion and surrender, the eternal soul beyond material concerns, courage in the face of moral dilemmas, unity of all existence.', '#fffbeb', '#fcd34d', '#92400e', '#78350f', 9);
