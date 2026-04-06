import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

const MondcivitanHistory = () => {
  const { language } = useLanguage();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('cms_pages')
      .select('title_en, title_de, content_en, content_de')
      .eq('slug', 'mondcivitan-history')
      .eq('published', true)
      .single()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setTitle(language === 'de' ? (d.title_de || d.title_en) : d.title_en);
          setHtml(language === 'de' ? (d.content_de || d.content_en) : d.content_en);
        }
        setLoading(false);
      });
  }, [language]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </header>
      <Separator />
      {html && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      <Separator />
    </div>
  );
};

export default MondcivitanHistory;
