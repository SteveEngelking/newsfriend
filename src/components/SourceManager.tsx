import { useState } from 'react';
import { NewsSource } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Plus, ChevronDown, Newspaper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  sources: NewsSource[];
  onChange: (sources: NewsSource[]) => void;
}

export function SourceManager({ sources, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const toggle = (id: string) => {
    onChange(sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const remove = (id: string) => {
    onChange(sources.filter(s => s.id !== id));
  };

  const add = () => {
    if (!newName.trim() || !newUrl.trim()) return;
    const id = `custom-${Date.now()}`;
    onChange([...sources, { id, name: newName.trim(), url: newUrl.trim(), enabled: false }]);
    setNewName('');
    setNewUrl('');
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
                    onClick={() => remove(source.id)}
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
              <Button size="sm" onClick={add} disabled={!newName.trim() || !newUrl.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
