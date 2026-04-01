import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Separator } from '@/components/ui/separator';
import { Globe, Users, BookOpen, Landmark, Heart, Scale, GraduationCap } from 'lucide-react';

const MondcivitanHistory = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
            <Globe className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('mondHistoryTitle')}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t('mondHistoryTagline')}</p>
      </header>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          {t('mondHistoryOriginsTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryOriginsDesc1')}</p>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryOriginsDesc2')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('mondHistoryGrowthTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryGrowthDesc1')}</p>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryGrowthDesc2')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          {t('mondHistoryRepublicTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryRepublicDesc1')}</p>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryRepublicDesc2')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          {t('mondHistoryArbitrationTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryArbitrationDesc')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          {t('mondHistoryPrinciplesTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryPrinciplesDesc')}</p>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-5">
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

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          {t('mondHistoryProjectsTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryProjectsDesc1')}</p>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryProjectsDesc2')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          {t('mondHistoryTrustTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryTrustDesc')}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          {t('mondHistoryLegacyTitle')}
        </h2>
        <p className="text-muted-foreground leading-relaxed">{t('mondHistoryLegacyDesc')}</p>
      </section>

      <Separator />

      <footer className="text-center text-sm text-muted-foreground pb-8">
        <p>{t('mondHistoryFooter')}</p>
      </footer>
    </div>
  );
};

export default MondcivitanHistory;
