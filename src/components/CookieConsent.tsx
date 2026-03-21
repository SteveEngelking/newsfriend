import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const CONSENT_KEY = 'cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
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
        >
          <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card shadow-lg p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {t('cookieMessage')}{' '}
                  <Link to="/cookie-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {t('cookiePolicyLink')}
                  </Link>{' '}
                  {t('cookieAnd')}{' '}
                  <Link to="/privacy-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    {t('cookiePrivacyLink')}
                  </Link>.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={accept}>
                    {t('cookieAcceptAll')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={decline}>
                    {t('cookieEssentialOnly')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
