import { Facebook, Twitter, Mail, Link, MessageCircle, Linkedin, Send } from 'lucide-react';
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
      getUrl: () => `https://wa.me/?text=${encodeURIComponent(`${shareTitle}\n${shareUrl}`)}`,
      className: 'hover:text-green-600',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      getUrl: () => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      className: 'hover:text-blue-600',
    },
    {
      name: 'X',
      icon: Twitter,
      getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`,
      className: 'hover:text-foreground',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      getUrl: () => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      className: 'hover:text-blue-700',
    },
    {
      name: 'Telegram',
      icon: Send,
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`,
      className: 'hover:text-sky-500',
    },
    {
      name: 'Email',
      icon: Mail,
      getUrl: () => `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareTitle}\n\n${shareUrl}`)}`,
      className: 'hover:text-red-500',
    },
  ];

  const openShare = (getUrl: () => string, name: string) => {
    const shareLink = getUrl();
    if (name === 'Email') {
      window.location.href = shareLink;
    } else {
      window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=400');
    }
  };

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
          onClick={() => openShare(link.getUrl, link.name)}
          aria-label={`Share on ${link.name}`}
        >
          <link.icon className="h-4 w-4" />
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
