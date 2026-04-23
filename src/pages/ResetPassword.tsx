import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyRound, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { PasswordInput, validatePassword } from '@/components/PasswordInput';
import { SEO } from '@/components/SEO';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash. The client picks it up
    // automatically and emits a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setIsReady(true);
      }
    });
    // Also check existing session in case the event fired before mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setIsReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const passwordValid = validatePassword(password).valid;
  const canSubmit = passwordValid && password === confirm && isReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setIsDone(true);
      toast({ title: t('resetPwSuccessTitle'), description: t('resetPwSuccessDesc') });
      setTimeout(() => navigate('/account'), 1500);
    } catch (err: any) {
      toast({ title: t('resetPwFailedTitle'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <SEO title="Reset password" description="Set a new password for your NewsFriend account." path="/reset-password" noindex />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            {isDone ? (
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
            ) : (
              <KeyRound className="h-8 w-8 text-primary mx-auto mb-2" />
            )}
            <CardTitle>{t('resetPwTitle')}</CardTitle>
            {!isReady && !isDone && (
              <CardDescription>{t('resetPwWaiting')}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {isDone ? (
              <p className="text-sm text-center text-muted-foreground">{t('resetPwSuccessDesc')}</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder={t('resetPwNewPlaceholder')}
                  showGenerator
                  showRequirements
                />
                <PasswordInput
                  value={confirm}
                  onChange={setConfirm}
                  placeholder={t('resetPwConfirmPlaceholder')}
                />
                {confirm && password !== confirm && (
                  <p className="text-xs text-destructive">{t('resetPwMismatch')}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
                  {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('resetPwUpdating')}</> : t('resetPwUpdate')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
