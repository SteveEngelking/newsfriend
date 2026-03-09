import { useState } from 'react';
import { NewsSource } from '@/lib/types';
import { addSource, removeSource } from '@/lib/sources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Plus, ChevronDown, Newspaper, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface Props {
  sources: NewsSource[];
  onChange: (sources: NewsSource[]) => void;
}

export function SourceManager({ sources, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const toggle = (id: string) => {
    onChange(sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const handleRemove = async (id: string) => {
    const ok = await removeSource(id);
    if (ok) {
      onChange(sources.filter(s => s.id !== id));
    } else {
      toast({ title: 'Error', description: 'Failed to remove source', variant: 'destructive' });
    }
  };

  const handleAdd = async () => {
    const trimmedName = newName.trim();
    const trimmedUrl = newUrl.trim();
    if (!trimmedName || !trimmedUrl) return;
    if (trimmedName.length > 200) {
      toast({ title: 'Error', description: 'Source name must be under 200 characters', variant: 'destructive' });
      return;
    }
    let url = trimmedUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    try {
      new URL(url);
    } catch {
      toast({ title: 'Invalid URL', description: 'Please enter a valid URL', variant: 'destructive' });
      return;
    }
    setAdding(true);
    const result = await addSource(newName.trim(), url);
    if (result) {
      onChange([...sources, { id: result.id, name: newName.trim(), url, enabled: false }]);
      setNewName('');
      setNewUrl('');
      toast({ title: 'Source added', description: `${newName.trim()} is now available for all users.` });
    } else {
      toast({ title: 'Error', description: 'Failed to add source', variant: 'destructive' });
    }
    setAdding(false);
  };

  const enabledCount = sources.filter(s => s.enabled).length;

  return (
    <Card className="border-border/60">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                News Sources
                <span className="text-xs font-normal text-muted-foreground">
                  {enabledCount} active
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            <AnimatePresence mode="popLayout">
              {sources.map(source => (
                <motion.div
                  key={source.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                >
                  <Checkbox
                    checked={source.enabled}
                    onCheckedChange={() => toggle(source.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{source.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{source.url}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(source.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Source name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="text-sm"
              />
              <Input
                placeholder="https://..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !newUrl.trim() || adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
