import { useState } from 'react';
import { Search, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SearchResult {
  id: string;
  kind: 'daily' | 'special';
  title: string;
  language: string;
  created_at: string;
  snippet: string;
}

interface Props {
  onOpenReport: (kind: 'daily' | 'special', id: string) => void;
}

export function ReportSearch({ onOpenReport }: Props) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const doSearchAll = async () => {
    const term = q.trim();
    if (term.length < 2) return;
    setBusy(true);
    try {
      const { data } = await supabase.rpc('search_reports' as any, { q: term });
      setResults(((data as any) || []).filter((r: SearchResult) => r.language === language));
    } finally {
      setBusy(false);
    }
  };

  const doFindOnPage = () => {
    const term = q.trim();
    if (!term) return;
    // Native browser find via Selection — fall back to scrolling first match.
    const w = window as any;
    if (typeof w.find === 'function') {
      w.find(term, false, false, true, false, true, false);
    } else {
      const idx = document.body.innerText.toLowerCase().indexOf(term.toLowerCase());
      if (idx >= 0) {
        const range = document.createRange();
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        let node: Node | null;
        let count = 0;
        while ((node = walker.nextNode())) {
          const text = node.nodeValue || '';
          const i = text.toLowerCase().indexOf(term.toLowerCase());
          if (i >= 0) {
            range.setStart(node, i);
            range.setEnd(node, i + term.length);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            (node.parentElement as HTMLElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
          count++;
        }
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          {t('searchReportsTitle')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('searchReportsTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('searchReportsPlaceholder')}
            onKeyDown={e => { if (e.key === 'Enter') doSearchAll(); }}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={doSearchAll} disabled={busy || q.trim().length < 2} size="sm" className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {t('searchReportsBtn')}
            </Button>
            <Button onClick={doFindOnPage} variant="outline" size="sm" disabled={!q.trim()}>
              {t('searchReportsInPage')}
            </Button>
          </div>

          {results !== null && (
            <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
              {results.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t('searchReportsNoResults')}</p>
              ) : results.map(r => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => { onOpenReport(r.kind, r.id); setOpen(false); }}
                  className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {r.kind === 'special' ? '★' : '📰'} {r.kind}
                    </span>
                    <span>{new Date(r.created_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB')}</span>
                  </div>
                  <div className="text-sm font-medium flex items-start gap-1">
                    <span className="flex-1">{r.title}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.snippet}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
