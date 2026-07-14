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
  source: 'question' | 'theme';
  question: string;
  ai_response: string | null;
  admin_reply: string | null;
  admin_reply_sent: boolean;
  created_at: string;
  reportId?: string;
  reportTitle?: string;
  themeId?: string;
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
    const [userResult, themeResult] = await Promise.all([
      supabase.from('user_comments').select('*').order('created_at', { ascending: false }),
      supabase
        .from('theme_comments')
        .select('id, user_id, report_id, theme_id, content, ai_analysis, display_name, created_at')
        .order('created_at', { ascending: false }),
    ]);

    if (userResult.error || themeResult.error) {
      toast({
        title: 'Error',
        description: userResult.error?.message || themeResult.error?.message,
        variant: 'destructive',
      });
      return;
    }

    const userComments: Comment[] = (userResult.data || []).map((comment) => ({
      ...comment,
      source: 'question',
    }));
    const themeComments: Comment[] = (themeResult.data || []).map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      source: 'theme',
      question: comment.content,
      ai_response: comment.ai_analysis,
      admin_reply: null,
      admin_reply_sent: false,
      created_at: comment.created_at,
      reportId: comment.report_id,
      themeId: comment.theme_id,
      userName: comment.display_name || '',
    }));
    const data = [...userComments, ...themeComments].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Fetch user profiles for display
    const userIds = [...new Set(data.map((comment) => comment.user_id))];
    const reportIds = [...new Set(themeComments.map((comment) => comment.reportId as string))];
    const profiles = userIds.length
      ? (await supabase.from('profiles').select('user_id, email, display_name').in('user_id', userIds)).data
      : [];
    const reports = reportIds.length
      ? (await supabase.from('generated_reports').select('id, title').in('id', reportIds)).data
      : [];

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p])
    );
    const reportMap = new Map(
      (reports || []).map((report: any) => [report.id, report.title])
    );

    setComments(
      data.map((comment) => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          userEmail: profile?.email || '',
          userName: comment.userName || profile?.display_name || '',
          reportTitle: comment.reportId ? reportMap.get(comment.reportId) || '' : undefined,
        };
      })
    );
  };

  useEffect(() => { loadComments(); }, []);

  const handleDelete = async (comment: Comment) => {
    if (!confirm(t('commentDeleteConfirm'))) return;
    setDeleting(comment.id);
    try {
      const table = comment.source === 'theme' ? 'theme_comments' : 'user_comments';
      const { error } = await supabase.from(table).delete().eq('id', comment.id);
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
                      {c.source === 'theme' && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {c.reportTitle || c.reportId} · {c.themeId}
                        </p>
                      )}
                      <p className="text-sm font-medium mt-1">{c.question}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(c)}
                    disabled={deleting === c.id}
                    aria-label={t('commentDeleteConfirm')}
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

                {c.source === 'question' && !c.admin_reply_sent && (
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
