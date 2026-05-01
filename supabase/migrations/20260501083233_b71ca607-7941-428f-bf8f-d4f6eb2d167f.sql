ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS special_edition_banners_enabled boolean NOT NULL DEFAULT false;