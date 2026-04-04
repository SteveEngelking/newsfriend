import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Invite {
  id: string;
  email: string;
  created_at: string;
  used_at: string | null;
}

export function AdminUsersManager() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [admins, setAdmins] = useState<{ user_id: string; email: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    const { data: inviteData } = await supabase
      .from('admin_invites')
      .select('*')
      .order('created_at', { ascending: false });
    if (inviteData) setInvites(inviteData);

    // Load admin list via edge function
    try {
      const { data, error } = await supabase.functions.invoke('list-admins', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!error && data?.admins) setAdmins(data.admins);
    } catch {
      // Function may not exist yet
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('invite-admin', {
        body: { email: inviteEmail.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast({ title: t('adminInviteSent'), description: `${inviteEmail} ${t('adminInviteSentDesc')}` });
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      toast({ title: t('adminInviteFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    await supabase.from('admin_invites').delete().eq('id', id);
    loadData();
  };

  const handleRemoveAdmin = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('remove-admin', {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: t('adminRemoved') });
      loadData();
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> {t('adminInviteTitle')}
          </CardTitle>
          <CardDescription>{t('adminInviteDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={t('adminInvitePlaceholder')}
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInvite} disabled={isLoading || !inviteEmail.trim()}>
              <UserPlus className="h-4 w-4 mr-2" /> {t('adminInviteBtn')}
            </Button>
          </div>
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('adminPendingInvites')}</p>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                  <div>
                    <span className="font-medium">{inv.email}</span>
                    {inv.used_at ? (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">{t('adminAccepted')}</span>
                    ) : (
                      <span className="ml-2 text-xs text-muted-foreground">{t('adminPending')}</span>
                    )}
                  </div>
                  {!inv.used_at && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteInvite(inv.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {admins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" /> {t('adminCurrentAdmins')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.user_id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                  <span className="font-medium">{admin.email}</span>
                  {admin.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> {t('adminRemoveBtn')}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
