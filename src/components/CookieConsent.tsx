import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link } from 'react-router-dom';
import { Cookie, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  getConsent,
  setConsent,
  OPEN_SETTINGS_EVENT,
} from '@/lib/consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: false, statistics: false });
  const { t } = useLanguage();

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
    setPrefs({ preferences: existing.preferences, statistics: existing.statistics });
  }, []);

  useEffect(() => {
    const open = () => {
      const existing = getConsent();
      if (existing) setPrefs({ preferences: existing.preferences, statistics: existing.statistics });
      setShowDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  const acceptAll = () => {
    setConsent({ preferences: true, statistics: true, marketing: false });
    setVisible(false);
    setShowDetails(false);
  };

  const rejectNonEssential = () => {
    setConsent({ preferences: false, statistics: false, marketing: false });
    setVisible(false);
    setShowDetails(false);
  };

  const saveCustom = () => {
    setConsent({ preferences: prefs.preferences, statistics: prefs.statistics, marketing: false });
    setVisible(false);
    setShowDetails(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4"
          role="dialog"
          aria-label={t('cookieDialogLabel')}
          aria-modal="false"
        >
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {t('cookieMessage')}{' '}
                  <Link to="/page/cookie-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {t('cookiePolicyLink')}
                  </Link>{' '}
                  {t('cookieAnd')}{' '}
                  <Link to="/page/privacy-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {t('cookiePrivacyLink')}
                  </Link>.
                </p>

                {showDetails && (
                  <div className="space-y-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                    <CategoryRow
                      label={t('cookieCatNecessary')}
                      desc={t('cookieCatNecessaryDesc')}
                      checked
                      disabled
                    />
                    <CategoryRow
                      label={t('cookieCatPreferences')}
                      desc={t('cookieCatPreferencesDesc')}
                      checked={prefs.preferences}
                      onChange={(v) => setPrefs(p => ({ ...p, preferences: v }))}
                    />
                    <CategoryRow
                      label={t('cookieCatStatistics')}
                      desc={t('cookieCatStatisticsDesc')}
                      checked={prefs.statistics}
                      onChange={(v) => setPrefs(p => ({ ...p, statistics: v }))}
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={acceptAll}>
                    {t('cookieAcceptAll')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={rejectNonEssential}>
                    {t('cookieEssentialOnly')}
                  </Button>
                  {showDetails ? (
                    <Button size="sm" variant="secondary" onClick={saveCustom}>
                      {t('cookieSavePrefs')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowDetails(true)}
                      className="gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      {t('cookieCustomize')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CategoryRow({
  label,
  desc,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}
