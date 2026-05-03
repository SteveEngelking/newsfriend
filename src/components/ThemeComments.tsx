import { useEffect, useMemo, useState } from 'react';
import { Loader2, MessageSquare, Send, Trash2, Bot, UserCircle, Pencil, Check, X, Reply } from 'lucide-react';
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
  parent_id: string | null;
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
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingBusy, setReplyingBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(false); setProfileName(''); return; }
    supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }).then(({ data }) => {
      setIsAdmin(!!data);
    });
    supabase.from('profiles').select('display_name').eq('user_id', session.user.id).maybeSingle().then(({ data }) => {
      setProfileName((data as any)?.display_name || session.user.user_metadata?.display_name || '');
    });
  }, [session]);

  // Lightweight count fetch (always shown to highlight presence of comments)
  const fetchCount = async () => {
    const { count: c } = await supabase
      .from('theme_comments')
      .select('id', { count: 'exact', head: true })
      .eq('report_id', reportId)
      .eq('theme_id', themeId);
    setCount(c || 0);
  };

  useEffect(() => { fetchCount(); /* eslint-disable-next-line */ }, [reportId, themeId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('theme_comments')
      .select('id, user_id, content, ai_analysis, display_name, parent_id, created_at')
      .eq('report_id', reportId)
      .eq('theme_id', themeId)
      .order('created_at', { ascending: true });
    const list = (data as any) || [];
    setComments(list);
    setCount(list.length);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportId, themeId]);

  const insertComment = async (content: string, parentId: string | null) => {
    if (!session) return null;
    const id = crypto.randomUUID();
    const display = profileName || session.user.user_metadata?.display_name || (session.user.email ? session.user.email.split('@')[0] : null);
    const { error: insertError } = await supabase.from('theme_comments').insert({
      id,
      user_id: session.user.id,
      report_id: reportId,
      theme_id: themeId,
      content,
      display_name: display,
      parent_id: parentId,
    });
    if (insertError) throw insertError;
    return id;
  };

  const triggerAi = async (commentId: string, content: string) => {
    const { error: aiError } = await supabase.functions.invoke('analyze-theme-comment', {
      body: { commentId, content, themeHeadline, themeSummary, language },
    });
    if (aiError) console.warn('AI analysis failed:', aiError);
  };

  const submit = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 3 || !session) return;
    setSubmitting(true);
    try {
      const id = await insertComment(trimmed, null);
      setText('');
      await load();
      if (id) await triggerAi(id, trimmed);
      await load();
      toast({ title: t('commentSubmitted') });
    } catch (e: any) {
      toast({ title: t('commentSubmitFailed'), description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    const trimmed = replyText.trim();
    if (trimmed.length < 3 || !session) return;
    setReplyingBusy(true);
    try {
      const id = await insertComment(trimmed, parentId);
      setReplyText('');
      setReplyToId(null);
      await load();
      if (id) await triggerAi(id, trimmed);
      await load();
    } catch (e: any) {
      toast({ title: t('commentSubmitFailed'), description: e.message, variant: 'destructive' });
    } finally {
      setReplyingBusy(false);
    }
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase.from('theme_comments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
      return;
    }
    await load();
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

  // Build a tree (one nesting level for display, deeper replies are flattened under root chain)
  const { roots, repliesByParent } = useMemo(() => {
    const rs: ThemeComment[] = [];
    const map: Record<string, ThemeComment[]> = {};
    for (const c of comments) {
      if (!c.parent_id) rs.push(c);
      else (map[c.parent_id] ||= []).push(c);
    }
    rs.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    return { roots: rs, repliesByParent: map };
  }, [comments]);

  const renderComment = (c: ThemeComment, depth = 0) => {
    const canEdit = isAdmin;
    const canDelete = isAdmin || (session && session.user.id === c.user_id);
    const replies = repliesByParent[c.id] || [];
    return (
      <li key={c.id} className={depth === 0 ? 'bg-background border rounded-md p-3 space-y-2' : 'bg-muted/30 border rounded-md p-3 space-y-2 ml-6'}>
        <div className="flex items-start gap-2">
          <UserCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                {c.display_name || t('themeCommentsAnon')} · {new Date(c.created_at).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-GB')}
              </span>
              <div className="flex gap-1">
                {session && editingId !== c.id && (
                  <button
                    onClick={() => { setReplyToId(c.id); setReplyText(''); }}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Reply"
                    title={t('themeCommentsReply')}
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                )}
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

        {replyToId === c.id && session && (
          <div className="space-y-2 pt-1">
            <Textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={t('themeCommentsReplyPlaceholder')}
              disabled={replyingBusy}
            />
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => { setReplyToId(null); setReplyText(''); }} className="h-7">
                {t('themeCommentsCancel')}
              </Button>
              <Button size="sm" onClick={() => submitReply(c.id)} disabled={replyingBusy || replyText.trim().length < 3} className="h-7 gap-1">
                {replyingBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                {t('commentSubmitBtn')}
              </Button>
            </div>
          </div>
        )}

        {replies.length > 0 && (
          <ul className="space-y-2 pt-2">
            {replies
              .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))
              .map(r => renderComment(r, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  const hasComments = count > 0;

  return (
    <div className={`mt-4 border rounded-lg ${hasComments ? 'border-destructive/40 bg-destructive/5' : 'bg-muted/20'}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-muted/40 transition-colors rounded-lg"
      >
        <span className={`flex items-center gap-2 ${hasComments ? 'font-bold text-destructive' : 'font-medium'}`}>
          <MessageSquare className={`h-4 w-4 ${hasComments ? 'text-destructive' : 'text-primary'}`} />
          {t('themeCommentsTitle')}
          {hasComments && <span className="text-xs">({count})</span>}
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
          ) : roots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t('themeCommentsNone')}</p>
          ) : (
            <ul className="space-y-3">
              {roots.map(c => renderComment(c, 0))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
