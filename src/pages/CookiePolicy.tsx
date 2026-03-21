import { Cookie } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function CookiePolicy() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Cookie className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">{t('cookiePolicyTitle')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cookieWhatTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('cookieWhatDesc')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cookieWeUseTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('cookieTableCookie')}</th>
                  <th className="px-3 py-2 font-medium">{t('cookieTableType')}</th>
                  <th className="px-3 py-2 font-medium">{t('cookieTablePurpose')}</th>
                  <th className="px-3 py-2 font-medium">{t('cookieTableDuration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2 font-mono">theme</td>
                  <td className="px-3 py-2">{t('cookieEssential')}</td>
                  <td className="px-3 py-2">{t('cookieTheme')}</td>
                  <td className="px-3 py-2">{t('cookiePersistent')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">cookie-consent</td>
                  <td className="px-3 py-2">{t('cookieEssential')}</td>
                  <td className="px-3 py-2">{t('cookieConsentPurpose')}</td>
                  <td className="px-3 py-2">{t('cookie1Year')}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-mono">sb-*</td>
                  <td className="px-3 py-2">{t('cookieFunctional')}</td>
                  <td className="px-3 py-2">{t('cookieSession')}</td>
                  <td className="px-3 py-2">{t('cookieSessionDuration')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cookieStrictTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('cookieStrictDesc')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('cookieManageTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>{t('cookieManage1')}</p>
          <p>{t('cookieManage2')}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t('cookiePolicyLastUpdated')}</p>
    </div>
  );
}
