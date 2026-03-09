import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Newspaper } from 'lucide-react';

interface Props {
  onSearch: (topic: string) => void;
  onDailyNews: () => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, onDailyNews, isLoading }: Props) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading) onSearch(topic.trim());
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Enter a news topic to fact-check..."
            className="pl-10 h-12 text-base"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={!topic.trim() || isLoading} className="h-12 px-6">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analyze'}
        </Button>
      </form>
      <div className="flex justify-center">
        <Button 
          onClick={onDailyNews} 
          variant="outline" 
          disabled={isLoading}
          className="gap-2"
        >
          <Newspaper className="h-4 w-4" />
          News of the Day
        </Button>
      </div>
    </div>
  );
}
