import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  FileText, Globe, Shield, Scale, BookOpen, Heart, Star, Home,
  Users, Settings, Info, HelpCircle, Mail, Phone, MapPin, Calendar,
  Clock, Bell, Search, Eye, Lock, Unlock, Award, Flag, Bookmark,
  Newspaper, Megaphone, Lightbulb, Compass, Zap, Coffee, Music,
  Camera, Film, Palette, Briefcase, GraduationCap, Landmark, Building,
  Church, Leaf, Sun, Moon, Cloud, Flame, Droplets, Wind, Mountain,
  TreePine, Anchor, Plane, Ship, Car, Train, Bike,
} from 'lucide-react';
import React from 'react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  FileText, Globe, Shield, Scale, BookOpen, Heart, Star, Home,
  Users, Settings, Info, HelpCircle, Mail, Phone, MapPin, Calendar,
  Clock, Bell, Search, Eye, Lock, Unlock, Award, Flag, Bookmark,
  Newspaper, Megaphone, Lightbulb, Compass, Zap, Coffee, Music,
  Camera, Film, Palette, Briefcase, GraduationCap, Landmark, Building,
  Church, Leaf, Sun, Moon, Cloud, Flame, Droplets, Wind, Mountain,
  TreePine, Anchor, Plane, Ship, Car, Train, Bike,
};

const ICON_NAMES = Object.keys(ICON_MAP);

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? ICON_NAMES.filter(n => n.toLowerCase().includes(filter.toLowerCase()))
    : ICON_NAMES;

  const SelectedIcon = ICON_MAP[value];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 w-full justify-start gap-2 text-sm font-normal">
          {SelectedIcon ? <SelectedIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
          {value || 'Select icon'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <Input
          placeholder="Search icons..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
        <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
          {filtered.map(name => {
            const Icon = ICON_MAP[name];
            return (
              <Button
                key={name}
                variant={value === name ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                title={name}
                onClick={() => { onChange(name); setOpen(false); }}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No icons found</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function getIconComponent(name: string): React.ComponentType<any> {
  return ICON_MAP[name] || FileText;
}
