import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Newspaper, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ReportRow { id: string; title: string; created_at: string; language: string }
interface SpecialRow { id: string; topic: string; approved_at: string | null; created_at: string; language: string }

function formatDate(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

const Archive = () => {
  const { t, language } = useLanguage();
  const locale = language === 'de' ? 'de-DE' : 'en-GB';
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [specials, setSpecials] = useState<SpecialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, s] = await Promise.all([
        supabase.from('generated_reports')
          .select('id, title, created_at, language')
          .order('created_at', { ascending: false })
          .limit(5000),
        supabase.from('special_editions')
          .select('id, topic, approved_at, created_at, language')
          .eq('status', 'approved')
          .order('approved_at', { ascending: false })
          .limit(5000),
      ]);
      if (cancelled) return;
      setReports((r.data as ReportRow[]) || []);
      setSpecials((s.data as SpecialRow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: reports.slice(0, 100).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://www.newsfriend.org/report/${r.id}`,
      name: r.title,
    })),
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <SEO
        title={t('archiveTitle')}
        description={t('archiveDescription')}
        path="/archive"
        lang={language}
        jsonLd={itemListJsonLd}
      />
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t('archiveTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('archiveDescription')}</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
              <Newspaper className="h-5 w-5 text-primary" />
              {t('archiveDaily')} <span className="text-sm text-muted-foreground font-normal">({reports.length})</span>
            </h2>
            {reports.length === 0 ? (
              <p className="text-muted-foreground">{t('archiveEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border border border-border rounded-md">
                {reports.map((r) => (
                  <li key={r.id} className="p-3 hover:bg-muted/40 transition-colors">
                    <Link to={`/report/${r.id}`} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <span className="font-medium text-foreground hover:text-primary">{r.title}</span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(r.created_at, locale)} · {r.language?.toUpperCase()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {specials.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-3">
                <Star className="h-5 w-5 text-primary" />
                {t('archiveSpecial')} <span className="text-sm text-muted-foreground font-normal">({specials.length})</span>
              </h2>
              <ul className="divide-y divide-border border border-border rounded-md">
                {specials.map((s) => (
                  <li key={s.id} className="p-3 hover:bg-muted/40 transition-colors">
                    <Link to={`/report/${s.id}`} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                      <span className="font-medium text-foreground hover:text-primary">{s.topic}</span>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {formatDate(s.approved_at || s.created_at, locale)} · {s.language?.toUpperCase()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Archive;
