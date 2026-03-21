import { Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('privacyTitle')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyIntroTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground space-y-3">
          <p>{t('privacyIntro1')}</p>
          <p>{t('privacyIntro2')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyDataTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyDataDesc')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{t('privacyDataUsage')}</strong></li>
            <li><strong>{t('privacyDataTechnical')}</strong></li>
            <li><strong>{t('privacyDataPreference')}</strong></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyLegalTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyLegalDesc')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>{t('privacyLegalConsent')}</strong></li>
            <li><strong>{t('privacyLegalInterest')}</strong></li>
            <li><strong>{t('privacyLegalContract')}</strong></li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyUseTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacyUse1')}</li>
            <li>{t('privacyUse2')}</li>
            <li>{t('privacyUse3')}</li>
            <li>{t('privacyUse4')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyRetentionTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyRetention')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyRightsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyRightsDesc')}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{t('privacyRight1')}</li>
            <li>{t('privacyRight2')}</li>
            <li>{t('privacyRight3')}</li>
            <li>{t('privacyRight4')}</li>
            <li>{t('privacyRight5')}</li>
            <li>{t('privacyRight6')}</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyThirdPartyTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyThirdParty')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('privacyContactTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('privacyContact')}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('privacyLastUpdated')}</p>
    </div>
  );
}
