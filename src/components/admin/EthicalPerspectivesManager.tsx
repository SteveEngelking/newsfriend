import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, Scale, Pencil, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { IconPicker, getIconComponent } from '@/components/IconPicker';

interface EthicalPerspective {
  id: string;
  name: string;
  icon: string;
  description: string;
  prompt_instruction: string;
  color_bg: string;
  color_border: string;
  color_heading: string;
  color_text: string;
  sort_order: number;
  enabled: boolean;
}

export function EthicalPerspectivesManager() {
  const [perspectives, setPerspectives] = useState<EthicalPerspective[]>([]);
  const [open, setOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<EthicalPerspective>>({});
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🌿');
  const [newDescription, setNewDescription] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => { loadPerspectives(); }, []);

  const loadPerspectives = async () => {
    const { data } = await supabase
      .from('ethical_perspectives')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setPerspectives(data as unknown as EthicalPerspective[]);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await supabase.from('ethical_perspectives').update({ enabled } as any).eq('id', id);
    setPerspectives(prev => prev.map(p => p.id === id ? { ...p, enabled } : p));
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...perspectives];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((p, i) => { p.sort_order = i; });
    setPerspectives(updated);
    await Promise.all(updated.map(p =>
      supabase.from('ethical_perspectives').update({ sort_order: p.sort_order } as any).eq('id', p.id)
    ));
  };

  const handleMoveDown = async (index: number) => {
    if (index >= perspectives.length - 1) return;
    const updated = [...perspectives];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((p, i) => { p.sort_order = i; });
    setPerspectives(updated);
    await Promise.all(updated.map(p =>
      supabase.from('ethical_perspectives').update({ sort_order: p.sort_order } as any).eq('id', p.id)
    ));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('ethical_perspectives').delete().eq('id', id);
    setPerspectives(prev => prev.filter(p => p.id !== id));
    toast({ title: t('ethicalDeleted') });
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('ethical_perspectives').insert({
        name: newName.trim(),
        icon: newIcon.trim() || '🌿',
        description: newDescription.trim(),
        prompt_instruction: newPrompt.trim(),
        sort_order: perspectives.length,
      } as any);
      if (error) {
        toast({ title: t('adminError'), description: error.message, variant: 'destructive' });
      } else {
        setNewName('');
        setNewIcon('🌿');
        setNewDescription('');
        setNewPrompt('');
        await loadPerspectives();
        toast({ title: t('ethicalAdded') });
      }
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message || 'Network error', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (p: EthicalPerspective) => {
    setEditingId(p.id);
    setEditData({ name: p.name, icon: p.icon, description: p.description, prompt_instruction: p.prompt_instruction });
  };

  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('ethical_perspectives').update(editData as any).eq('id', editingId);
      if (error) throw error;
      await loadPerspectives();
      setEditingId(null);
      toast({ title: t('ethicalUpdated') });
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message || 'Network error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = perspectives.filter(p => p.enabled).length;

  return (
    <Card className="border-border/60">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                {t('ethicalPerspectivesTitle')}
                <span className="text-xs font-normal text-muted-foreground">
                  {enabledCount} {t('sourceActive')}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
            <CardDescription>{t('ethicalPerspectivesDesc')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <AnimatePresence mode="popLayout">
              {perspectives.map((p, index) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(checked) => handleToggle(p.id, checked)}
                  />
                  {editingId === p.id ? (
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex gap-2">
                        <div className="w-36">
                          <IconPicker
                            value={editData.icon || ''}
                            onChange={v => setEditData(d => ({ ...d, icon: v }))}
                          />
                        </div>
                        <Input
                          value={editData.name || ''}
                          onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                          className="flex-1 text-sm h-8"
                          placeholder="Name"
                        />
                      </div>
                      <Input
                        value={editData.description || ''}
                        onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                        className="text-sm h-8"
                        placeholder="Short description"
                      />
                      <Textarea
                        value={editData.prompt_instruction || ''}
                        onChange={e => setEditData(d => ({ ...d, prompt_instruction: e.target.value }))}
                        className="text-sm min-h-[60px]"
                        placeholder="AI prompt instruction"
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={handleSaveEdit} disabled={saving}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1.5">
                          {(() => { const IC = getIconComponent(p.icon); return <IC className="h-4 w-4 text-primary shrink-0" />; })()}
                          {p.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{p.description}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMoveDown(index)} disabled={index === perspectives.length - 1}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => startEdit(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <p className="text-sm font-medium">{t('ethicalAddNew')}</p>
              <div className="flex gap-2">
                <div className="w-36">
                  <IconPicker value={newIcon} onChange={setNewIcon} />
                </div>
                <Input placeholder={t('ethicalNamePlaceholder')} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 text-sm" />
              </div>
              <Input placeholder={t('ethicalDescPlaceholder')} value={newDescription} onChange={e => setNewDescription(e.target.value)} className="text-sm" />
              <Textarea placeholder={t('ethicalPromptPlaceholder')} value={newPrompt} onChange={e => setNewPrompt(e.target.value)} className="text-sm min-h-[60px]" />
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !newPrompt.trim() || adding}>
                <Plus className="h-4 w-4 mr-1" /> {t('ethicalAddBtn')}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
