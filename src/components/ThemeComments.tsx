import { useEffect, useState } from 'react';
import { Loader2, MessageSquare, Send, Trash2, Bot, UserCircle, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface ThemeComment {
  id: string;
  user_id: string;
  content: string;
  ai_analysis: string | null;
  display_name: string | null;
  created_at: string;
}

interface Props {
  reportId: string;
  themeId: string;
  themeHeadline: string;
  themeSummary?: string;
}

export function ThemeComments({ reportId, themeId, themeHeadline, themeSummary }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ThemeComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
  }, [session]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('theme_comments')
      .select('id, user_id, content, ai_analysis, display_name, created_at')
      .eq('report_id', reportId)
      .eq('theme_id', themeId)
      .order('created_at', { ascending: false });
    setComments((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportId, themeId]);

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || !session) return;
    setSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const { error: insertError } = await supabase.from('theme_comments').insert({
        id,
        user_id: session.user.id,
        report_id: reportId,
        theme_id: themeId,
        content: trimmed,
        display_name: session.user.user_metadata?.display_name || null,
      });
      if (insertError) throw insertError;

      setText('');
      await load();

      // Fire-and-await AI analysis
      const { error: aiError } = await supabase.functions.invoke('analyze-theme-comment', {
        body: {
          commentId: id,
          content: trimmed,
          themeHeadline,
          themeSummary,
          language,
        },
      });
      if (aiError) console.warn('AI analysis failed:', aiError);
      await load();
      toast({ title: t('commentSubmitted') });
    } catch (e: any) {
      toast({ title: t('commentSubmitFailed'), description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('theme_comments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    setComments(c => c.filter(x => x.id !== id));
  };

  const saveEdit = async (id: string) => {
    const trimmed = editText.trim();
    if (trimmed.length < 3) return;
    const { error } = await supabase.from('theme_comments').update({ content: trimmed }).eq('id', id);
    if (error) {
      toast({ title: 'Edit failed', description: error.message, variant: 'destructive' });
      return;
    }
    setEditingId(null);
    setEditText('');
    await load();
  };

  return (
    <div className="mt-4 border rounded-lg bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/40 transition-colors rounded-lg"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          {t('themeCommentsTitle')}
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground">({comments.length})</span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          {session ? (
            <div className="space-y-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('themeCommentsPlaceholder')}
                rows={3}
                maxLength={2000}
                disabled={submitting}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{text.length}/2000</span>
                <Button onClick={submit} disabled={submitting || text.trim().length < 3} size="sm" className="gap-2">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {submitting ? t('commentSubmitting') : t('commentSubmitBtn')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('themeCommentsLoginRequired')}</p>
          )}

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('themeCommentsNone')}</p>
          ) : (
            <ul className="space-y-3">
              {comments.map(c => {
                const canEdit = isAdmin;
                const canDelete = isAdmin || (session && session.user.id === c.user_id);
                return (
                  <li key={c.id} className="bg-background border rounded-md p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <UserCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">
                            {c.display_name || t('themeCommentsAnon')} · {new Date(c.created_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB')}
                          </span>
                          <div className="flex gap-1">
                            {canEdit && editingId !== c.id && (
                              <button
                                onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                                className="text-muted-foreground hover:text-primary"
                                aria-label="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => deleteComment(c.id)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editingId === c.id ? (
                          <div className="space-y-2">
                            <Textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} maxLength={2000} />
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 gap-1">
                                <X className="h-3 w-3" /> {t('themeCommentsCancel')}
                              </Button>
                              <Button size="sm" onClick={() => saveEdit(c.id)} className="h-7 gap-1">
                                <Check className="h-3 w-3" /> {t('themeCommentsSave')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                        )}
                      </div>
                    </div>
                    {c.ai_analysis && editingId !== c.id && (
                      <div className="flex gap-2 pl-2 border-l-2 border-primary/30 ml-1">
                        <Bot className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('themeCommentsAiLabel')}</p>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.ai_analysis}</p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
