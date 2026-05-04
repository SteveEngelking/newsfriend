import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, ExternalLink, ChevronUp, ChevronDown, X } from 'lucide-react';
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

const HIT_ATTR = 'data-search-hit';

function clearHighlights() {
  document.querySelectorAll(`mark[${HIT_ATTR}]`).forEach(el => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });
}

function highlightInPage(term: string): HTMLElement[] {
  clearHighlights();
  if (!term.trim()) return [];
  // Confine search to the actual report area when present, else fall back to body.
  const root = (document.querySelector('[data-report-content]') as HTMLElement) || document.body;
  const lowered = term.toLowerCase();
  const hits: HTMLElement[] = [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      const tag = p.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || tag === 'INPUT') return NodeFilter.FILTER_REJECT;
      if (p.closest('[data-search-skip]')) return NodeFilter.FILTER_REJECT;
      return (node.nodeValue || '').toLowerCase().includes(lowered)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });

  const targets: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) targets.push(n as Text);

  for (const textNode of targets) {
    const text = textNode.nodeValue || '';
    const frag = document.createDocumentFragment();
    let i = 0;
    const lower = text.toLowerCase();
    while (i < text.length) {
      const idx = lower.indexOf(lowered, i);
      if (idx === -1) {
        frag.appendChild(document.createTextNode(text.slice(i)));
        break;
      }
      if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
      const mark = document.createElement('mark');
      mark.setAttribute(HIT_ATTR, '');
      mark.style.backgroundColor = 'hsl(var(--primary) / 0.35)';
      mark.style.color = 'inherit';
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 1px';
      mark.textContent = text.slice(idx, idx + term.length);
      frag.appendChild(mark);
      hits.push(mark);
      i = idx + term.length;
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  return hits;
}

function focusHit(el: HTMLElement, all: HTMLElement[]) {
  all.forEach(h => {
    h.style.outline = '';
    h.style.backgroundColor = 'hsl(var(--primary) / 0.35)';
  });
  el.style.outline = '2px solid hsl(var(--primary))';
  el.style.backgroundColor = 'hsl(var(--primary) / 0.6)';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function ReportSearch({ onOpenReport }: Props) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);

  const hitsRef = useRef<HTMLElement[]>([]);
  const [hitCount, setHitCount] = useState(0);
  const [hitIndex, setHitIndex] = useState(0);

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
    const hits = highlightInPage(term);
    hitsRef.current = hits;
    setHitCount(hits.length);
    if (hits.length > 0) {
      setHitIndex(0);
      focusHit(hits[0], hits);
      setOpen(false);
    } else {
      setHitIndex(0);
    }
  };

  const goTo = (delta: number) => {
    const hits = hitsRef.current;
    if (!hits.length) return;
    const next = (hitIndex + delta + hits.length) % hits.length;
    setHitIndex(next);
    focusHit(hits[next], hits);
  };

  const clearAll = () => {
    clearHighlights();
    hitsRef.current = [];
    setHitCount(0);
    setHitIndex(0);
  };

  // Clear highlights on unmount
  useEffect(() => () => clearHighlights(), []);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" />
            {t('searchReportsTitle')}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl" data-search-skip>
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
              <Button
                onClick={() => { setQ(''); setResults(null); clearAll(); }}
                variant="ghost"
                size="sm"
                disabled={!q && !results && hitCount === 0}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                {t('searchReportsClear')}
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

      {hitCount > 0 && (
        <div
          data-search-skip
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border shadow-lg rounded-full px-3 py-1.5"
          role="status"
        >
          <span className="text-xs text-muted-foreground">
            {hitIndex + 1} / {hitCount} {t('searchReportsMatches')}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goTo(-1)} aria-label={t('searchReportsPrev')}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => goTo(1)} aria-label={t('searchReportsNext')}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearAll} aria-label={t('searchReportsClear')}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
