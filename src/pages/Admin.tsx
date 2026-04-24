import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewsSource } from '@/lib/types';
import { fetchSources, saveEnabledState } from '@/lib/sources';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogOut, Shield, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { SEO } from '@/components/SEO';

type AdminState = 'loading' | 'no-admin-exists' | 'not-admin' | 'admin';

const Admin = () => {
  const [adminState, setAdminState] = useState<AdminState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const statusCheckRef = useRef(0);

  const checkAdminStatus = useCallback(async (sessionOverride?: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
    const requestId = ++statusCheckRef.current;
    const session = sessionOverride ?? (await supabase.auth.getSession()).data.session;
    if (!mountedRef.current || requestId !== statusCheckRef.current) return;

    if (!session) {
      navigate('/login?redirect=/admin', { replace: true });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (!mountedRef.current || requestId !== statusCheckRef.current) return;

      if (data.isAdmin) setAdminState('admin');
      else if (data.noAdminsExist) setAdminState('no-admin-exists');
      else setAdminState('not-admin');
    } catch {
      if (!mountedRef.current || requestId !== statusCheckRef.current) return;
      setAdminState('not-admin');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        statusCheckRef.current += 1;
        if (mountedRef.current) setAdminState('login');
        return;
      }

      window.setTimeout(() => {
        if (mountedRef.current) {
          void checkAdminStatus(session);
        }
      }, 0);
    });

    void checkAdminStatus();

    return () => {
      mountedRef.current = false;
      statusCheckRef.current += 1;
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  useEffect(() => {
    if (adminState === 'admin') fetchSources().then(setSources);
  }, [adminState]);

  const handleSourcesChange = useCallback((newSources: NewsSource[]) => {
    setSources(newSources);
    saveEnabledState(newSources);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast({ title: t('adminLoginFailed'), description: err.message, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      toast({ title: t('adminSignUpSuccess') });
    } catch (err: any) {
      toast({ title: t('adminSignUpFailed'), description: err.message, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleClaimAdmin = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: t('adminError'), description: t('adminMustBeLoggedIn'), variant: 'destructive' }); return; }
      const { data, error } = await supabase.functions.invoke('setup-first-admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast({ title: data.message || t('adminClaimBtn') });
      checkAdminStatus();
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAdminState('login');
  };

  if (adminState === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (adminState === 'not-admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <Shield className="h-8 w-8 text-destructive mx-auto mb-2" />
            <CardTitle>{t('adminAccessDenied')}</CardTitle>
            <CardDescription>{t('adminAccessDeniedDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> {t('adminSignOut')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminState === 'no-admin-exists') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>{t('adminClaimTitle')}</CardTitle>
              <CardDescription>{t('adminClaimDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleClaimAdmin} className="w-full" disabled={isLoading}>
                {isLoading ? t('adminClaimingBtn') : t('adminClaimBtn')}
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="w-full gap-2">
                <LogOut className="h-4 w-4" /> {t('adminSignOut')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (adminState === 'login') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>{isSignUp ? t('adminSignUp') : t('adminLogin')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
                <Input type="email" placeholder={t('adminEmailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required />
                <Input type="password" placeholder={t('adminPasswordPlaceholder')} value={password} onChange={e => setPassword(e.target.value)} required />
                <div className="flex items-center space-x-2">
                  <Checkbox id="human-check" checked={humanCheck} onCheckedChange={(checked) => setHumanCheck(checked === true)} />
                  <label htmlFor="human-check" className="text-sm font-medium leading-none cursor-pointer select-none">I am a human</label>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !humanCheck}>
                  {isLoading ? (isSignUp ? t('adminSigningUp') : t('adminSigningIn')) : (isSignUp ? t('adminSignUp') : t('adminSignIn'))}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary hover:underline">
                  {isSignUp ? t('adminHaveAccount') : t('adminNoAccount')}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEO title="Admin" description="NewsFriend administrative dashboard." path="/admin" noindex />
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold tracking-tight">{t('adminSettings')}</h2>
          <p className="text-muted-foreground text-sm">{t('adminSettingsDesc')}</p>
        </motion.div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> {t('adminSignOut')}
        </Button>
      </div>

      <AdminTabs sources={sources} onSourcesChange={handleSourcesChange} />
    </div>
  );
};

export default Admin;
