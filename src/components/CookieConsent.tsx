import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONSENT_KEY = 'cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

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
                  We use cookies and local storage to remember your preferences and provide essential functionality.
                  By continuing, you agree to our{' '}
                  <Link to="/cookie-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    Cookie Policy
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy-policy" className="text-primary underline underline-offset-2 hover:text-primary/80">
                    Privacy Policy
                  </Link>.
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={accept}>
                    Accept All
                  </Button>
                  <Button size="sm" variant="outline" onClick={decline}>
                    Essential Only
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
