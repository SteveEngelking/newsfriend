import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  stage: 'searching' | 'analyzing';
  progress: number;
  message: string;
}

export function LoadingState({ stage, progress, message }: Props) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/20">
        <CardContent className="p-6 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center space-y-2 w-full max-w-md">
            <p className="text-sm font-medium">
              {stage === 'searching' ? t('loadingSearching') : t('loadingAnalyzing')}
            </p>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
