import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Newspaper } from 'lucide-react';

interface Props {
  onSearch: (topic: string) => void;
  onDailyNews: (articlesPerSource: number) => void;
  isLoading: boolean;
}

export function SearchBar({ onSearch, onDailyNews, isLoading }: Props) {
  const [topic, setTopic] = useState('');
  const [articlesPerSource, setArticlesPerSource] = useState(8);

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
      <div className="flex items-center justify-center gap-3">
        <Button 
          onClick={() => onDailyNews(articlesPerSource)} 
          variant="outline" 
          disabled={isLoading}
          className="gap-2"
        >
          <Newspaper className="h-4 w-4" />
          News of the Day
        </Button>
        <div className="flex items-center gap-2">
          <label htmlFor="articles-count" className="text-sm text-muted-foreground whitespace-nowrap">
            Articles/source:
          </label>
          <Input
            id="articles-count"
            type="number"
            min={3}
            max={15}
            value={articlesPerSource}
            onChange={e => setArticlesPerSource(Math.min(15, Math.max(3, parseInt(e.target.value) || 8)))}
            className="w-16 h-9 text-center"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
