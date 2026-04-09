import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Megaphone, Trash2, Send, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  published: boolean;
  created_at: string;
}

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadAnnouncements = async () => {
    const { data } = await supabase
      .from('admin_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAnnouncements(data as Announcement[]);
  };

  useEffect(() => { loadAnnouncements(); }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('admin_announcements').insert({ title: title.trim(), content: content.trim(), published: true });
      if (error) throw error;
      toast({ title: t('announcementCreated') });
      setTitle('');
      setContent('');
      loadAnnouncements();
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('admin_announcements').delete().eq('id', id);
    if (error) toast({ title: t('adminError'), description: error.message, variant: 'destructive' });
    else loadAnnouncements();
  };

  const handleSendNotification = async (announcement: Announcement) => {
    setSending(announcement.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: { type: 'announcement', announcementId: announcement.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      toast({ title: t('announcementSent'), description: `${data.sent} ${t('announcementRecipients')}` });
    } catch (err: any) {
      toast({ title: t('adminError'), description: err.message, variant: 'destructive' });
    } finally { setSending(null); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> {t('announcementsTitle')}
        </CardTitle>
        <CardDescription>{t('announcementsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 border rounded-lg p-4 bg-muted/30">
          <Input
            placeholder={t('announcementTitlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <Textarea
            placeholder={t('announcementContentPlaceholder')}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
          />
          <Button onClick={handleCreate} disabled={loading || !title.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('announcementCreateBtn')}
          </Button>
        </div>

        {announcements.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">{t('announcementNone')}</p>
        )}

        {announcements.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 border rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{a.title}</p>
              {a.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>}
              <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendNotification(a)}
                disabled={sending === a.id}
                className="gap-1"
              >
                {sending === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {t('announcementSendBtn')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
