import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Loader2, Bot, UserCircle, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Comment {
  id: string;
  question: string;
  ai_response: string | null;
  admin_reply: string | null;
  created_at: string;
}

const Comments = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [question, setQuestion] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sess) => {
      setSession(sess);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadComments();
  }, [session]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('user_comments')
      .select('id, question, ai_response, admin_reply, created_at')
      .order('created_at', { ascending: false });
    if (data) setComments(data);
  };

  const handleSubmit = async () => {
    if (!question.trim() || question.trim().length < 3) return;
    setSubmitting(true);
    try {
      const id = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from('user_comments')
        .insert({ id, user_id: session.user.id, question: question.trim() });
      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke('answer-comment', {
        body: { question: question.trim(), commentId: id },
      });
      if (error) throw error;

      setQuestion('');
      await loadComments();
      toast({ title: t('commentSubmitted') });
    } catch (err: any) {
      toast({ title: t('commentSubmitFailed'), description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
              <CardTitle>{t('commentsTitle')}</CardTitle>
              <CardDescription>{t('commentsLoginRequired')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => navigate('/login')} className="w-full">{t('navLogin')}</Button>
              <Button variant="outline" onClick={() => navigate('/register')} className="w-full">{t('navRegister')}</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-2xl font-bold tracking-tight">{t('commentsTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('commentsDesc')}</p>
      </motion.div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <Textarea
            placeholder={t('commentsPlaceholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={submitting}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{question.length}/2000</span>
            <Button onClick={handleSubmit} disabled={submitting || question.trim().length < 3} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? t('commentSubmitting') : t('commentSubmitBtn')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('commentsNone')}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-3">
                    <UserCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {c.ai_response && (
                    <div className="flex gap-3 pl-2 border-l-2 border-primary/20 ml-2">
                      <Bot className="h-5 w-5 text-primary/70 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('commentAiResponse')}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{c.ai_response}</p>
                      </div>
                    </div>
                  )}

                  {c.admin_reply && (
                    <div className="flex gap-3 pl-2 border-l-2 border-verified ml-2">
                      <Shield className="h-5 w-5 text-verified mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-verified mb-1">{t('commentAdminReply')}</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{c.admin_reply}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Comments;
