import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [humanCheck, setHumanCheck] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const canSubmit = humanCheck && gdprConsent && email && password;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: any) {
      toast({ title: t('registerFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-sm text-center">
            <CardHeader>
              <Mail className="h-10 w-10 text-primary mx-auto mb-2" />
              <CardTitle>{t('registerCheckEmail')}</CardTitle>
              <CardDescription>{t('registerCheckEmailDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                {t('backToHome')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <UserPlus className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>{t('registerTitle')}</CardTitle>
            <CardDescription>{t('registerDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="text"
                placeholder={t('registerNamePlaceholder')}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
              />
              <Input
                type="email"
                placeholder={t('registerEmailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder={t('adminPasswordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="gdpr-consent"
                  checked={gdprConsent}
                  onCheckedChange={(checked) => setGdprConsent(checked === true)}
                />
                <label htmlFor="gdpr-consent" className="text-sm leading-tight cursor-pointer select-none">
                  {t('registerGdprConsent')}{' '}
                  <Link to="/privacy-policy" className="text-primary underline" target="_blank">
                    {t('registerGdprLink')}
                  </Link>.
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="human-check-register"
                  checked={humanCheck}
                  onCheckedChange={(checked) => setHumanCheck(checked === true)}
                />
                <label htmlFor="human-check-register" className="text-sm font-medium leading-none cursor-pointer select-none">
                  {t('registerCaptcha')}
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('registerSigningUp')}</> : t('registerBtn')}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" className="text-sm text-primary hover:underline">
                {t('registerHaveAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
