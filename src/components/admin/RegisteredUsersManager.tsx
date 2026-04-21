import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Trash2, Loader2, Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface UserProfile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  notify_daily_reports?: boolean;
  notify_announcements?: boolean;
  is_admin?: boolean;
}

export function RegisteredUsersManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Load profiles
      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, created_at')
        .order('created_at', { ascending: false });
      if (profErr) throw profErr;

      // Load notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, notify_daily_reports, notify_announcements');

      // Load admin roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id');

      const adminSet = new Set((roles ?? []).map(r => r.user_id));
      const prefsMap = new Map((prefs ?? []).map(p => [p.user_id, p]));

      const merged: UserProfile[] = (profiles ?? []).map(p => ({
        ...p,
        notify_daily_reports: prefsMap.get(p.user_id)?.notify_daily_reports ?? false,
        notify_announcements: prefsMap.get(p.user_id)?.notify_announcements ?? false,
        is_admin: adminSet.has(p.user_id),
      }));

      setUsers(merged);
    } catch (err: any) {
      toast({ title: t('adminError') || 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('adminRegisteredDeleteConfirm') || 'Are you sure you want to delete this user? This cannot be undone.')) return;
    setDeletingId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast({ title: t('adminRegisteredDeleted') || 'User deleted' });
    } catch (err: any) {
      toast({ title: t('adminError') || 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" /> {t('adminRegisteredTitle') || 'Registered Users'}
        </CardTitle>
        <CardDescription>{t('adminRegisteredDesc') || 'View and manage all registered users and their notification preferences.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('adminRegisteredNone') || 'No registered users yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('adminRegisteredColEmail') || 'Email'}</TableHead>
                  <TableHead>{t('adminRegisteredColName') || 'Name'}</TableHead>
                  <TableHead>{t('adminRegisteredColRole') || 'Role'}</TableHead>
                  <TableHead className="text-center">{t('adminRegisteredColNotif') || 'Notifications'}</TableHead>
                  <TableHead>{t('adminRegisteredColDate') || 'Joined'}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium text-sm">{user.email || '—'}</TableCell>
                    <TableCell className="text-sm">{user.display_name || '—'}</TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <Badge variant="default" className="text-xs">Admin</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{t('adminRegisteredRoleUser') || 'User'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {user.notify_daily_reports ? (
                          <Bell className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                        {user.notify_announcements ? (
                          <Bell className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!user.is_admin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => handleDeleteUser(user.user_id)}
                          disabled={deletingId === user.user_id}
                        >
                          {deletingId === user.user_id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              {t('adminRegisteredDeleteBtn') || 'Delete'}
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-2">
              {users.length} {t('adminRegisteredTotal') || 'total users'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
