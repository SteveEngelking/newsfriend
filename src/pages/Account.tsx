import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, User, Bell, Loader2, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const Account = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [notifyDailyReports, setNotifyDailyReports] = useState(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'SIGNED_OUT' || !sess) {
        navigate('/login');
        return;
      }
      setSession(sess);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) {
        navigate('/login');
        return;
      }
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setLoading(true);
      const [profileRes, prefsRes] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', session.user.id).single(),
        supabase.from('notification_preferences').select('notify_daily_reports, notify_announcements').eq('user_id', session.user.id).single(),
      ]);
      if (profileRes.data) setDisplayName(profileRes.data.display_name || '');
      if (prefsRes.data) {
        setNotifyDailyReports(prefsRes.data.notify_daily_reports);
        setNotifyAnnouncements(prefsRes.data.notify_announcements);
      }
      setLoading(false);
    };
    load();
  }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const [profileRes, prefsRes] = await Promise.all([
        supabase.from('profiles').update({ display_name: displayName }).eq('user_id', session.user.id),
        supabase.from('notification_preferences').update({
          notify_daily_reports: notifyDailyReports,
          notify_announcements: notifyAnnouncements,
        }).eq('user_id', session.user.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (prefsRes.error) throw prefsRes.error;
      toast({ title: t('accountSaved') });
    } catch (err: any) {
      toast({ title: t('accountSaveFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading || !session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t('accountTitle')}</h2>
            <p className="text-muted-foreground text-sm">{session.user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> {t('adminSignOut')}
          </Button>
        </div>
      </motion.div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" /> {t('accountProfileTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('accountEmailLabel')}</Label>
            <Input value={session.user.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>{t('registerNamePlaceholder')}</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" /> {t('accountNotificationsTitle')}
          </CardTitle>
          <CardDescription>{t('accountNotificationsDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-daily">{t('accountNotifyDailyReports')}</Label>
            <Switch id="notify-daily" checked={notifyDailyReports} onCheckedChange={setNotifyDailyReports} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-announcements">{t('accountNotifyAnnouncements')}</Label>
            <Switch id="notify-announcements" checked={notifyAnnouncements} onCheckedChange={setNotifyAnnouncements} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {t('accountSaveBtn')}
      </Button>
    </div>
  );
};

export default Account;
