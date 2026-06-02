import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { hasConsent } from '@/lib/consent';

interface Props {
  reportId: string;
  themeId: string;
}

const CLIENT_ID_KEY = 'newsfriend-client-id';

function getClientId(): string {
  // Persistent ID only when the user has consented to statistics tracking.
  // Without consent, fall back to a session-only ID so likes still work in-tab
  // but no cross-session identifier is stored.
  const persistAllowed = hasConsent('statistics');
  const store = persistAllowed ? localStorage : sessionStorage;
  let id = store.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    try { store.setItem(CLIENT_ID_KEY, id); } catch {}
  }
  return id;
}

export function MondcivitanLikeButton({ reportId, themeId }: Props) {
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const clientId = getClientId();

  useEffect(() => {
    let active = true;
    (async () => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const ownUrl = `${supabaseUrl}/rest/v1/reflection_likes` +
        `?select=id` +
        `&report_id=eq.${encodeURIComponent(reportId)}` +
        `&theme_id=eq.${encodeURIComponent(themeId)}` +
        `&client_id=eq.${encodeURIComponent(clientId)}` +
        `&limit=1`;
      const [countRes, ownRes] = await Promise.all([
        supabase.rpc('get_reflection_like_count', {
          _report_id: reportId,
          _theme_id: themeId,
        }),
        fetch(ownUrl, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'x-client-id': clientId,
          },
        }).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      if (!active) return;
      const total = typeof countRes.data === 'number' ? countRes.data : 0;
      setCount(total);
      setLiked(Array.isArray(ownRes) && ownRes.length > 0);
    })();
    return () => { active = false; };
  }, [reportId, themeId, clientId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const baseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'x-client-id': clientId,
    };
    if (liked) {
      const prev = count;
      setLiked(false);
      setCount(c => Math.max(0, c - 1));
      const url = `${supabaseUrl}/rest/v1/reflection_likes` +
        `?report_id=eq.${encodeURIComponent(reportId)}` +
        `&theme_id=eq.${encodeURIComponent(themeId)}` +
        `&client_id=eq.${encodeURIComponent(clientId)}`;
      const res = await fetch(url, { method: 'DELETE', headers: baseHeaders });
      if (!res.ok) { setLiked(true); setCount(prev); }
    } else {
      const prev = count;
      setLiked(true);
      setCount(c => c + 1);
      const res = await fetch(`${supabaseUrl}/rest/v1/reflection_likes`, {
        method: 'POST',
        headers: { ...baseHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ report_id: reportId, theme_id: themeId, client_id: clientId }),
      });
      if (!res.ok) { setLiked(false); setCount(prev); }
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 flex justify-start">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={toggle}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? 'Unlike reflection' : 'Like reflection'}
        className={cn(
          'gap-1.5 h-8 px-2 text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/30',
          liked && 'text-amber-800 dark:text-amber-300'
        )}
      >
        <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
        <span className="text-xs font-medium tabular-nums">{count}</span>
      </Button>
    </div>
  );
}
