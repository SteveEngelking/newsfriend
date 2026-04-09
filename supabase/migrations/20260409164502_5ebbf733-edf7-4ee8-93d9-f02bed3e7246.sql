
CREATE TABLE public.user_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  ai_response TEXT,
  admin_reply TEXT,
  admin_reply_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own comments"
ON public.user_comments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comments"
ON public.user_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all comments"
ON public.user_comments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update comments"
ON public.user_comments FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete comments"
ON public.user_comments FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_comments_updated_at
BEFORE UPDATE ON public.user_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
