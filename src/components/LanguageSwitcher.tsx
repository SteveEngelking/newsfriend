import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggle = () => setLanguage(language === 'en' ? 'de' : 'en');

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      title={language === 'en' ? 'Auf Deutsch wechseln' : 'Switch to English'}
      className="relative"
    >
      <Languages className="h-4 w-4" />
      <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold uppercase leading-none">
        {language === 'en' ? 'DE' : 'EN'}
      </span>
    </Button>
  );
}
