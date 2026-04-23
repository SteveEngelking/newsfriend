import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LogIn, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SEO } from '@/components/SEO';
import { PasswordInput } from '@/components/PasswordInput';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [humanCheck, setHumanCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanCheck) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/account');
    } catch (err: any) {
      toast({ title: t('adminLoginFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <SEO title="Sign in" description="Sign in to your NewsFriend account to manage notification preferences and questions." path="/login" noindex />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <LogIn className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle>{t('loginTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder={t('adminEmailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder={t('adminPasswordPlaceholder')}
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="human-check-login"
                  checked={humanCheck}
                  onCheckedChange={(checked) => setHumanCheck(checked === true)}
                />
                <label htmlFor="human-check-login" className="text-sm font-medium leading-none cursor-pointer select-none">
                  {t('registerCaptcha')}
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || !humanCheck}>
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('adminSigningIn')}</> : t('adminSignIn')}
              </Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <GoogleSignInButton label="Continue with Google" />
            <div className="mt-4 text-center space-y-2">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline block">
                {t('forgotPwLink')}
              </Link>
              <Link to="/register" className="text-sm text-primary hover:underline block">
                {t('adminNoAccount')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
