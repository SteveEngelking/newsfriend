import { Facebook, Twitter, Mail, Link, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toast } from '@/hooks/use-toast';

interface ShareButtonsProps {
  title?: string;
  url?: string;
}

export function ShareButtons({ title, url }: ShareButtonsProps) {
  const { t } = useLanguage();
  const shareUrl = url || window.location.href;
  const shareTitle = title || 'NewsFriend — AI-powered news analysis';

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`,
      className: 'hover:text-green-600',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      className: 'hover:text-blue-600',
    },
    {
      name: 'X',
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      className: 'hover:text-foreground',
    },
    {
      name: 'Email',
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareTitle}\n\n${shareUrl}`)}`,
      className: 'hover:text-red-500',
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t('shareLinkCopied') });
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-sm text-muted-foreground mr-1">{t('shareWithFriends')}:</span>
      {shareLinks.map((link) => (
        <Button
          key={link.name}
          variant="ghost"
          size="icon"
          className={`h-8 w-8 text-muted-foreground ${link.className}`}
          asChild
        >
          <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${link.name}`}>
            <link.icon className="h-4 w-4" />
          </a>
        </Button>
      ))}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        onClick={copyLink}
        aria-label="Copy link"
      >
        <Link className="h-4 w-4" />
      </Button>
    </div>
  );
}
