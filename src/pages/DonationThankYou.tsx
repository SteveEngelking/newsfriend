import { Heart, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const DonationThankYou = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-lg mx-auto text-center space-y-8 py-16">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10"
      >
        <Heart className="h-12 w-12 text-primary" fill="currentColor" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h1 className="text-4xl font-bold tracking-tight">
          {t('supportThankYou')}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
          {t('supportThankYouDesc')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span>{t('donationImpactMessage')}</span>
        <Sparkles className="h-4 w-4 text-primary" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-3 justify-center pt-4"
      >
        <Button asChild variant="outline" className="gap-2">
          <Link to="/support">
            <ArrowLeft className="h-4 w-4" />
            {t('supportBackBtn')}
          </Link>
        </Button>
        <Button asChild>
          <Link to="/">
            {t('backToHome')}
          </Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default DonationThankYou;
