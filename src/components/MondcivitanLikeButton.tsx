import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Props {
  reportId: string;
  themeId: string;
}

const CLIENT_ID_KEY = 'newsfriend-client-id';

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(CLIENT_ID_KEY, id);
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
      const [{ count: total }, { data: own }] = await Promise.all([
        supabase
          .from('reflection_likes')
          .select('*', { count: 'exact', head: true })
          .eq('report_id', reportId)
          .eq('theme_id', themeId),
        supabase
          .from('reflection_likes')
          .select('id')
          .eq('report_id', reportId)
          .eq('theme_id', themeId)
          .eq('client_id', clientId)
          .maybeSingle(),
      ]);
      if (!active) return;
      setCount(total ?? 0);
      setLiked(!!own);
    })();
    return () => { active = false; };
  }, [reportId, themeId, clientId]);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (liked) {
      const prev = count;
      setLiked(false);
      setCount(c => Math.max(0, c - 1));
      const { error } = await supabase
        .from('reflection_likes')
        .delete()
        .eq('report_id', reportId)
        .eq('theme_id', themeId)
        .eq('client_id', clientId);
      if (error) { setLiked(true); setCount(prev); }
    } else {
      const prev = count;
      setLiked(true);
      setCount(c => c + 1);
      const { error } = await supabase
        .from('reflection_likes')
        .insert({ report_id: reportId, theme_id: themeId, client_id: clientId });
      if (error) { setLiked(false); setCount(prev); }
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 flex justify-end">
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
