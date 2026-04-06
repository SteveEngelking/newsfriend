import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from './NotFound';

interface PageData {
  title_en: string;
  title_de: string;
  content_en: string;
  content_de: string;
  published: boolean;
}

export default function CmsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    supabase
      .from('cms_pages')
      .select('title_en, title_de, content_en, content_de, published')
      .eq('slug', slug)
      .eq('published', true)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true);
        else setPage(data as unknown as PageData);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (notFound || !page) return <NotFound />;

  const title = language === 'de' ? (page.title_de || page.title_en) : page.title_en;
  const content = language === 'de' ? (page.content_de || page.content_en) : page.content_en;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <div
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}
