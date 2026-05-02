import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BannerSettings {
  daily: boolean;
  special: boolean;
  themeComments: boolean;
  loaded: boolean;
}

export function useBannerSettings(): BannerSettings {
  const [settings, setSettings] = useState<BannerSettings>({
    daily: true,
    special: true,
    themeComments: false,
    loaded: false,
  });

  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('banner_images_enabled, special_edition_banners_enabled, theme_comments_enabled')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!active) return;
        setSettings({
          daily: data?.banner_images_enabled ?? false,
          special: data?.special_edition_banners_enabled ?? false,
          themeComments: data?.theme_comments_enabled ?? false,
          loaded: true,
        });
      });
    return () => { active = false; };
  }, []);

  return settings;
}
