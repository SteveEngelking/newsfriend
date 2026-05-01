import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BannerSettings {
  daily: boolean;
  special: boolean;
  loaded: boolean;
}

export function useBannerSettings(): BannerSettings {
  const [settings, setSettings] = useState<BannerSettings>({ daily: true, special: true, loaded: false });

  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('banner_images_enabled, special_edition_banners_enabled')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setSettings({
          daily: data?.banner_images_enabled ?? false,
          special: data?.special_edition_banners_enabled ?? false,
          loaded: true,
        });
      });
    return () => { active = false; };
  }, []);

  return settings;
}
