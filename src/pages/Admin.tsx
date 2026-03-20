import { useState, useEffect, useCallback } from 'react';
import { NewsSource } from '@/lib/types';
import { fetchSources, saveEnabledState } from '@/lib/sources';
import { SourceManager } from '@/components/SourceManager';
import { ScheduleManager } from '@/components/ScheduleManager';
import { ImpressumEditor } from '@/components/ImpressumEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, LogOut, UserPlus, Shield, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AdminState = 'loading' | 'login' | 'no-admin-exists' | 'not-admin' | 'admin';

const Admin = () => {
  const [adminState, setAdminState] = useState<AdminState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{ id: string; email: string; created_at: string; used_at: string | null }[]>([]);
  const { toast } = useToast();

  const checkAdminStatus = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Check if any admin exists to decide if we show first-admin setup
      setAdminState('login');
      return;
    }

    // User is logged in — check if they're an admin via edge function
    try {
      const { data, error } = await supabase.functions.invoke('check-admin-status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      
      if (data.isAdmin) {
        setAdminState('admin');
      } else if (data.noAdminsExist) {
        setAdminState('no-admin-exists');
      } else {
        setAdminState('not-admin');
      }
    } catch {
      setAdminState('not-admin');
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });
    checkAdminStatus();
    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  useEffect(() => {
    if (adminState === 'admin') {
      fetchSources().then(setSources);
      loadInvites();
    }
  }, [adminState]);

  const loadInvites = async () => {
    const { data } = await supabase.from('admin_invites').select('*').order('created_at', { ascending: false });
    if (data) setInvites(data);
  };

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
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupAndClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error: signupError } = await supabase.auth.signUp({ email, password });
      if (signupError) throw signupError;

      // Wait for session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Account created!', description: 'Please check your email to verify, then sign in.' });
        setAdminState('login');
        return;
      }

      const { data, error } = await supabase.functions.invoke('setup-first-admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast({ title: data.message || 'You are now the first admin!' });
      checkAdminStatus();
    } catch (err: any) {
      toast({ title: 'Setup failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
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
      toast({ title: 'Invite sent', description: `${inviteEmail} can now sign up as admin.` });
      setInviteEmail('');
      loadInvites();
    } catch (err: any) {
      toast({ title: 'Invite failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    await supabase.from('admin_invites').delete().eq('id', id);
    loadInvites();
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
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Your account does not have admin privileges. Contact an existing admin to receive an invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
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
              <CardTitle>Initial Admin Setup</CardTitle>
              <CardDescription>No admin account exists yet. Create one to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignupAndClaimAdmin} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Setting up...' : 'Create Admin Account'}
                </Button>
              </form>
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
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-bold tracking-tight">Admin Settings</h2>
          <p className="text-muted-foreground text-sm">
            Manage news sources, schedules, and admin access.
          </p>
        </motion.div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>

      {/* Admin Invites Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Invite Admin
          </CardTitle>
          <CardDescription>Invite new administrators by email. They will receive admin access when they sign up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@example.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleInvite} disabled={isLoading || !inviteEmail.trim()}>
              <UserPlus className="h-4 w-4 mr-2" /> Invite
            </Button>
          </div>
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Pending & Used Invites</p>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                  <div>
                    <span className="font-medium">{inv.email}</span>
                    {inv.used_at ? (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">✓ Accepted</span>
                    ) : (
                      <span className="ml-2 text-xs text-muted-foreground">Pending</span>
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

      <SourceManager sources={sources} onChange={handleSourcesChange} />
      <ScheduleManager sources={sources} />
      <ImpressumEditor />
    </div>
  );
};

export default Admin;
