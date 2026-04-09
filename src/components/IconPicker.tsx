import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

const EMOJI_ICONS = [
  '🌿', '✝', '🧭', '☸', '🪷', '☪', '✡', '⛩', '🙏', '☮',
  '🕊', '⚖', '🔥', '💡', '📖', '🌍', '🌏', '🌎', '❤', '🕉',
  '✨', '🌟', '🌙', '☀', '🏛', '🎓', '🤝', '👁', '🗝', '🧘',
  '🌺', '🌸', '⚡', '🦋', '🐚', '🏔', '🌊', '🍃', '💎', '🔔',
  '📜', '🪶', '🎭', '🎵', '🌈', '🕯', '⭐', '🧿', '🫂', '💫',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-start gap-2 text-sm font-normal">
          <span className="text-lg">{value || '🌿'}</span>
          <span className="text-muted-foreground text-xs">Change icon</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <div className="grid grid-cols-10 gap-1 mb-2">
          {EMOJI_ICONS.map(emoji => (
            <Button
              key={emoji}
              variant={value === emoji ? 'default' : 'ghost'}
              size="icon"
              className="h-8 w-8 text-lg"
              onClick={() => { onChange(emoji); setOpen(false); }}
            >
              {emoji}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 border-t pt-2">
          <Input
            placeholder="Custom emoji..."
            value={custom}
            onChange={e => setCustom(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="h-8"
            disabled={!custom.trim()}
            onClick={() => { onChange(custom.trim()); setCustom(''); setOpen(false); }}
          >
            Use
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
