import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Cookie } from 'lucide-react';

export default function CookiePolicy() {
  const { language } = useLanguage();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('cms_pages')
      .select('title_en, title_de, content_en, content_de')
      .eq('slug', 'cookie-policy')
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
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Cookie className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </div>
      {html && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
