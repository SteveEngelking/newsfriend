import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/SEO';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: anonKey } }
        );
        const data = await res.json();
        if (res.ok && data.valid === true) setStatus('valid');
        else if (data.reason === 'already_unsubscribed') setStatus('already');
        else setStatus('invalid');
      } catch {
        setStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <SEO title="Unsubscribe" description="Unsubscribe from NewsFriend email notifications." path="/unsubscribe" noindex />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            {status === 'loading' && <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 animate-spin" />}
            {status === 'valid' && <MailX className="h-10 w-10 text-primary mx-auto mb-2" />}
            {status === 'success' && <CheckCircle className="h-10 w-10 text-primary mx-auto mb-2" />}
            {status === 'already' && <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />}
            {(status === 'invalid' || status === 'error') && <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-2" />}

            <CardTitle>
              {status === 'loading' && 'Verifying...'}
              {status === 'valid' && 'Unsubscribe from Emails'}
              {status === 'success' && 'Successfully Unsubscribed'}
              {status === 'already' && 'Already Unsubscribed'}
              {status === 'invalid' && 'Invalid Link'}
              {status === 'error' && 'Something Went Wrong'}
            </CardTitle>
            <CardDescription>
              {status === 'loading' && 'Please wait while we verify your request.'}
              {status === 'valid' && 'Click the button below to stop receiving email notifications from NewsFriend.'}
              {status === 'success' && 'You will no longer receive email notifications from us.'}
              {status === 'already' && 'You have already been unsubscribed from our emails.'}
              {status === 'invalid' && 'This unsubscribe link is invalid or has expired.'}
              {status === 'error' && 'We could not process your request. Please try again later.'}
            </CardDescription>
          </CardHeader>
          {status === 'valid' && (
            <CardContent>
              <Button onClick={handleUnsubscribe} disabled={isProcessing} variant="destructive" className="w-full">
                {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : 'Confirm Unsubscribe'}
              </Button>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Unsubscribe;
