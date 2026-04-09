import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Send, Loader2, MessageSquare, Bot, UserCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Comment {
  id: string;
  user_id: string;
  question: string;
  ai_response: string | null;
  admin_reply: string | null;
  admin_reply_sent: boolean;
  created_at: string;
  userEmail?: string;
  userName?: string;
}

export function CommentsManager() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useLanguage();

  const loadComments = async () => {
    const { data } = await supabase
      .from('user_comments')
      .select('*')
      .order('created_at', { ascending: false });
    if (!data) return;

    // Fetch user profiles for display
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email, display_name')
      .in('user_id', userIds);

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    );

    setComments(
      data.map((c: any) => {
        const profile = profileMap.get(c.user_id);
        return {
          ...c,
          userEmail: profile?.email || '',
          userName: profile?.display_name || '',
        };
      })
    );
  };

  useEffect(() => { loadComments(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t('commentDeleteConfirm'))) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('user_comments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: t('commentDeleted') });
      loadComments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSendReply = async (comment: Comment) => {
    const reply = replyTexts[comment.id]?.trim();
    if (!reply) return;
    setSending(comment.id);
    try {
      // Update the comment with admin reply
      const { error: updateError } = await supabase
        .from('user_comments')
        .update({ admin_reply: reply, admin_reply_sent: true })
        .eq('id', comment.id);
      if (updateError) throw updateError;

      // Send email to user
      if (comment.userEmail) {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'admin-reply',
            recipientEmail: comment.userEmail,
            idempotencyKey: `admin-reply-${comment.id}`,
            templateData: {
              userName: comment.userName || undefined,
              originalQuestion: comment.question.substring(0, 300),
              adminReply: reply,
            },
          },
        });
      }

      toast({ title: t('commentReplySent') });
      setReplyTexts((prev) => ({ ...prev, [comment.id]: '' }));
      loadComments();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {t('adminCommentsTitle')}
        </CardTitle>
        <CardDescription>{t('adminCommentsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t('adminCommentsNone')}</p>
        ) : (
          comments.map((c) => (
            <Card key={c.id} className="border">
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2 items-start">
                    <UserCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {c.userName || c.userEmail || 'Unknown'} · {new Date(c.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium mt-1">{c.question}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                  >
                    {deleting === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </div>

                {c.ai_response && (
                  <div className="flex gap-2 pl-2 border-l-2 border-primary/20 ml-2">
                    <Bot className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{c.ai_response}</p>
                  </div>
                )}

                {c.admin_reply && c.admin_reply_sent && (
                  <div className="flex gap-2 pl-2 border-l-2 border-verified ml-2">
                    <Send className="h-4 w-4 text-verified mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-verified mb-1">{t('commentReplySentLabel')}</p>
                      <p className="text-sm whitespace-pre-wrap">{c.admin_reply}</p>
                    </div>
                  </div>
                )}

                {!c.admin_reply_sent && (
                  <div className="space-y-2 pt-2">
                    <Textarea
                      placeholder={t('commentReplyPlaceholder')}
                      value={replyTexts[c.id] || ''}
                      onChange={(e) =>
                        setReplyTexts((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      rows={2}
                    />
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => handleSendReply(c)}
                      disabled={sending === c.id || !(replyTexts[c.id]?.trim())}
                    >
                      {sending === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {t('commentSendReplyBtn')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
