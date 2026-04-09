import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Loader2, Save, Eye, EyeOff, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface NavItem {
  id: string;
  item_key: string;
  sort_order: number;
  visible: boolean;
}

const STATIC_LABELS: Record<string, { en: string; de: string }> = {
  home: { en: '🏠 Home', de: '🏠 Startseite' },
  support: { en: '❤️ Support Us', de: '❤️ Unterstützen' },
  comments: { en: '💬 Comments', de: '💬 Kommentare' },
  account: { en: '👤 Account / Login', de: '👤 Konto / Anmeldung' },
  admin: { en: '⚙️ Admin', de: '⚙️ Admin' },
  impressum: { en: '🏛️ Impressum', de: '🏛️ Impressum' },
};

export function NavOrderManager() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [cmsLabels, setCmsLabels] = useState<Record<string, { en: string; de: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: navData }, { data: cmsData }] = await Promise.all([
      supabase.from('nav_menu_order').select('*').order('sort_order'),
      supabase.from('cms_pages').select('slug, title_en, title_de, icon').eq('published', true),
    ]);

    if (navData) setItems(navData as unknown as NavItem[]);

    const labels: Record<string, { en: string; de: string }> = {};
    (cmsData ?? []).forEach((p: any) => {
      labels[`cms:${p.slug}`] = {
        en: `${p.icon || '📄'} ${p.title_en}`,
        de: `${p.icon || '📄'} ${p.title_de || p.title_en}`,
      };
    });
    setCmsLabels(labels);

    // Auto-add any CMS pages not yet in nav_menu_order
    if (navData && cmsData) {
      const existingKeys = new Set(navData.map((n: any) => n.item_key));
      const missing = cmsData.filter((p: any) => !existingKeys.has(`cms:${p.slug}`));
      if (missing.length > 0) {
        const maxOrder = Math.max(...navData.map((n: any) => n.sort_order), -1);
        const inserts = missing.map((p: any, i: number) => ({
          item_key: `cms:${p.slug}`,
          sort_order: maxOrder + 1 + i,
          visible: true,
        }));
        await supabase.from('nav_menu_order').insert(inserts);
        await loadData();
        return;
      }
    }
    setLoading(false);
  };

  const getLabel = (key: string) => {
    const lang = language === 'de' ? 'de' : 'en';
    if (STATIC_LABELS[key]) return STATIC_LABELS[key][lang];
    if (cmsLabels[key]) return cmsLabels[key][lang];
    return key;
  };

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const reordered = [...items];
    const [dragged] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, dragged);
    const updated = reordered.map((item, i) => ({ ...item, sort_order: i }));
    setItems(updated);
    setDirty(true);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleVisible = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], visible: !updated[index].visible };
    setItems(updated);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const item of items) {
        await supabase
          .from('nav_menu_order')
          .update({ sort_order: item.sort_order, visible: item.visible })
          .eq('id', item.id);
      }
      setDirty(false);
      toast({ title: t('navOrderSaved') || 'Menu order saved' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('navOrderTitle') || 'Menu Order'}</CardTitle>
            <CardDescription>{t('navOrderDesc') || 'Drag items to reorder the sidebar navigation.'}</CardDescription>
          </div>
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('cmsSaveBtn') || 'Save'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing ${
                  !item.visible ? 'opacity-50' : ''
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium">{getLabel(item.item_key)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => toggleVisible(index)}
                  title={item.visible ? 'Hide' : 'Show'}
                >
                  {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
