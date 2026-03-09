
CREATE TABLE public.news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- Anyone can read sources
CREATE POLICY "Anyone can read sources" ON public.news_sources FOR SELECT USING (true);

-- Anyone can insert sources
CREATE POLICY "Anyone can insert sources" ON public.news_sources FOR INSERT WITH CHECK (true);

-- Anyone can delete sources
CREATE POLICY "Anyone can delete sources" ON public.news_sources FOR DELETE USING (true);

-- Seed with default sources
INSERT INTO public.news_sources (id, name, url) VALUES
  ('reuters', 'Reuters', 'https://www.reuters.com'),
  ('apnews', 'AP News', 'https://apnews.com'),
  ('bbc', 'BBC News', 'https://www.bbc.com/news'),
  ('cnn', 'CNN', 'https://www.cnn.com'),
  ('aljazeera', 'Al Jazeera', 'https://www.aljazeera.com'),
  ('npr', 'NPR', 'https://www.npr.org'),
  ('guardian', 'The Guardian', 'https://www.theguardian.com'),
  ('foxnews', 'Fox News', 'https://www.foxnews.com');
