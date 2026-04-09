import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IconPicker, RenderIcon } from '@/components/IconPicker';

interface CmsPage {
  id: string;
  slug: string;
  title_en: string;
  title_de: string;
  content_en: string;
  content_de: string;
  show_in_nav: boolean;
  nav_order: number;
  icon: string;
  published: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export function CmsPageManager() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);
  const [isNew, setIsNew] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const isMountedRef = useRef(true);

  const fetchPages = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('cms_pages')
        .select('*')
        .order('nav_order', { ascending: true });

      if (isMountedRef.current && data) {
        setPages(data as unknown as CmsPage[]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchPages();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPages]);

  const handleSave = async () => {
    if (!editingPage || saving) return;
    const { id, created_at, updated_at, ...rest } = editingPage;

    if (!rest.slug || !rest.title_en) {
      toast({ title: t('cmsSlugRequired'), variant: 'destructive' });
      return;
    }

    // Sanitize slug
    rest.slug = rest.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');

    try {
      setSaving(true);
      if (isNew) {
        const { error } = await supabase.from('cms_pages').insert(rest);
        if (error) throw error;
        toast({ title: t('cmsPageCreated') });
      } else {
        const { error } = await supabase.from('cms_pages').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        toast({ title: t('cmsPageUpdated') });
      }
      if (isMountedRef.current) {
        setEditingPage(null);
        setIsNew(false);
      }
      await fetchPages();
    } catch (err: any) {
      toast({ title: t('cmsSaveFailed'), description: err.message, variant: 'destructive' });
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleDelete = async (page: CmsPage) => {
    if (page.is_system) return;
    if (!confirm(t('cmsDeleteConfirm'))) return;
    const { error } = await supabase.from('cms_pages').delete().eq('id', page.id);
    if (error) {
      toast({ title: t('cmsDeleteFailed'), variant: 'destructive' });
    } else {
      toast({ title: t('cmsPageDeleted') });
      fetchPages();
    }
  };

  const startNew = () => {
    setEditingPage({
      id: '',
      slug: '',
      title_en: '',
      title_de: '',
      content_en: '<p></p>',
      content_de: '<p></p>',
      show_in_nav: true,
      nav_order: pages.length,
      icon: 'FileText',
      published: true,
      is_system: false,
      created_at: '',
      updated_at: '',
    });
    setIsNew(true);
  };

  if (editingPage) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => { setEditingPage(null); setIsNew(false); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-lg">{isNew ? t('cmsNewPage') : t('cmsEditPage')}</CardTitle>
              <CardDescription>{isNew ? t('cmsNewPageDesc') : editingPage.slug}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('cmsSlug')}</Label>
              <Input
                value={editingPage.slug}
                onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })}
                placeholder="my-page"
                disabled={editingPage.is_system}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cmsIcon')}</Label>
              <IconPicker
                value={editingPage.icon}
                onChange={icon => setEditingPage({ ...editingPage, icon })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('cmsTitleEn')}</Label>
              <Input
                value={editingPage.title_en}
                onChange={e => setEditingPage({ ...editingPage, title_en: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('cmsTitleDe')}</Label>
              <Input
                value={editingPage.title_de}
                onChange={e => setEditingPage({ ...editingPage, title_de: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={editingPage.published}
                onCheckedChange={v => setEditingPage({ ...editingPage, published: v })}
              />
              <Label>{t('cmsPublished')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editingPage.show_in_nav}
                onCheckedChange={v => setEditingPage({ ...editingPage, show_in_nav: v })}
              />
              <Label>{t('cmsShowInNav')}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Label>{t('cmsNavOrder')}</Label>
              <Input
                type="number"
                className="w-20"
                value={editingPage.nav_order}
                onChange={e => setEditingPage({ ...editingPage, nav_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <Tabs defaultValue="en">
            <TabsList>
              <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
              <TabsTrigger value="de">🇩🇪 Deutsch</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="mt-4">
              <RichTextEditor
                key={`en-${editingPage.id || 'new'}`}
                content={editingPage.content_en}
                onChange={html => setEditingPage({ ...editingPage, content_en: html })}
              />
            </TabsContent>
            <TabsContent value="de" className="mt-4">
              <RichTextEditor
                key={`de-${editingPage.id || 'new'}`}
                content={editingPage.content_de}
                onChange={html => setEditingPage({ ...editingPage, content_de: html })}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('cmsSaveBtn')}
            </Button>
            <Button variant="outline" onClick={() => { setEditingPage(null); setIsNew(false); }} disabled={saving}>{t('cmsCancelBtn')}</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('cmsPagesTitle')}</CardTitle>
            <CardDescription>{t('cmsPagesDesc')}</CardDescription>
          </div>
          <Button size="sm" onClick={startNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> {t('cmsNewPage')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : pages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">{t('cmsNoPages')}</p>
        ) : (
          <div className="space-y-2">
            {pages.map(page => (
              <div key={page.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <RenderIcon value={page.icon} className="h-4 w-4" />
                    <span className="font-medium text-sm truncate">{page.title_en}</span>
                    {page.is_system && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                    {!page.published && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <EyeOff className="h-3 w-3" /> Draft
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">/{page.slug}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPage(page); setIsNew(false); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!page.is_system && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(page)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
