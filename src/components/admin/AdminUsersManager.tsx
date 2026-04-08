import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Trash2, Shield, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Invite {
  id: string;
  email: string;
  created_at: string;
  used_at: string | null;
}

interface SenderConfig {
  id: string;
  sender_name: string;
  sender_email: string;
  organization: string;
  reply_to_email: string;
}

export function AdminUsersManager() {
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<{ user_id: string; email: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [senderConfig, setSenderConfig] = useState<SenderConfig>({
    id: '',
    sender_name: '',
    sender_email: '',
    organization: '',
    reply_to_email: '',
  });
  const [isSavingSender, setIsSavingSender] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setCurrentUserId(session.user.id);

    // Load sender config
    const { data: senderData } = await supabase
      .from('email_sender_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (senderData) setSenderConfig(senderData as SenderConfig);

    // Load admin list via edge function
    try {
      const { data, error } = await supabase.functions.invoke('list-admins', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!error && data?.admins) setAdmins(data.admins);
    } catch {
      // Function may not exist yet
    }
  }, []);

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
      await loadData();
    } catch (err: any) {
      toast({ title: t('adminInviteFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!confirm(t('adminRemoveConfirm') || 'Are you sure you want to remove this admin?')) return;
    setRemovingId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('remove-admin', {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: t('adminRemoved') });
      // Optimistically remove from list immediately
      setAdmins(prev => prev.filter(a => a.user_id !== userId));
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally {
      setRemovingId(null);
    }
  };

  const handleSaveSenderConfig = async () => {
    setIsSavingSender(true);
    try {
      const { error } = await supabase
        .from('email_sender_config')
        .update({
          sender_name: senderConfig.sender_name,
          sender_email: senderConfig.sender_email,
          organization: senderConfig.organization,
          reply_to_email: senderConfig.reply_to_email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', senderConfig.id);
      if (error) throw error;
      toast({ title: t('adminSenderSaved') });
    } catch (err: any) {
      toast({ title: t('adminSenderSaveFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingSender(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Email Sender Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="h-5 w-5" /> {t('adminSenderInfoTitle')}
          </CardTitle>
          <CardDescription>{t('adminSenderInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{t('adminSenderName')}</Label>
              <Input
                value={senderConfig.sender_name}
                onChange={e => setSenderConfig(p => ({ ...p, sender_name: e.target.value }))}
                placeholder="NewsFriend Admin"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminSenderEmail')}</Label>
              <Input
                type="email"
                value={senderConfig.sender_email}
                onChange={e => setSenderConfig(p => ({ ...p, sender_email: e.target.value }))}
                placeholder="noreply@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminSenderOrg')}</Label>
              <Input
                value={senderConfig.organization}
                onChange={e => setSenderConfig(p => ({ ...p, organization: e.target.value }))}
                placeholder="Hugh & Helene Schonfield World Service Trust"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('adminSenderReplyTo')}</Label>
              <Input
                type="email"
                value={senderConfig.reply_to_email}
                onChange={e => setSenderConfig(p => ({ ...p, reply_to_email: e.target.value }))}
                placeholder="reply@example.com"
              />
            </div>
          </div>
          <Button onClick={handleSaveSenderConfig} disabled={isSavingSender}>
            {t('adminSenderSaveBtn')}
          </Button>
        </CardContent>
      </Card>

      {/* Invite Admin */}
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
        </CardContent>
      </Card>

      {/* Current Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> {t('adminCurrentAdmins')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('adminNoAdmins') || 'No admins found'}</p>
          ) : (
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.user_id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{admin.email}</span>
                    {admin.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground">({t('adminYou') || 'you'})</span>
                    )}
                  </div>
                  {admin.user_id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={removingId === admin.user_id}
                    >
                      {removingId === admin.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
