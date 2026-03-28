import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Separator } from '@/components/ui/separator';
import { Shield, Newspaper, Brain, Globe, Scale, Heart } from 'lucide-react';

const About = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
            <Newspaper className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('aboutTitle')}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t('aboutTagline')}</p>
      </header>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('aboutWhatTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('aboutWhatDesc')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('aboutHowTitle')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(['aboutStep1', 'aboutStep2', 'aboutStep3', 'aboutStep4'] as const).map((key, i) => (
            <div key={key} className="bg-muted/40 rounded-lg p-4 space-y-1">
              <div className="text-sm font-bold text-primary">{t('aboutStep')} {i + 1}</div>
              <p className="text-sm text-muted-foreground">{t(key)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {t('aboutPhilosophyTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('aboutPhilosophyDesc')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          {t('aboutMondcivitanTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('aboutMondcivitanDesc')}</p>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3">☮ {t('aboutMondcivitanPrinciples')}</p>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-amber-900 dark:text-amber-200">
            {['aboutPrinciple1','aboutPrinciple2','aboutPrinciple3','aboutPrinciple4','aboutPrinciple5','aboutPrinciple6','aboutPrinciple7'].map((k) => (
              <li key={k} className="flex items-start gap-2">
                <Scale className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                {t(k as any)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      <footer className="text-center text-sm text-muted-foreground pb-8">
        <p>{t('aboutFooter')}</p>
      </footer>
    </div>
  );
};

export default About;
