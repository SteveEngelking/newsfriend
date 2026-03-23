import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-full border border-border bg-muted/50 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('de')}
        className={`h-7 rounded-full px-2.5 text-xs font-semibold transition-all ${
          language === 'de'
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
        }`}
      >
        DE
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage('en')}
        className={`h-7 rounded-full px-2.5 text-xs font-semibold transition-all ${
          language === 'en'
            ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
        }`}
      >
        EN
      </Button>
    </div>
  );
}
