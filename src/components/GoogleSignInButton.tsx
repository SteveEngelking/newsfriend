import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { useToast } from '@/hooks/use-toast';

interface Props {
  label: string;
  disabled?: boolean;
}

export function GoogleSignInButton({ label, disabled }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin + '/account',
      });
      if (result.error) {
        toast({
          title: 'Sign-in failed',
          description: result.error.message,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
      // On redirect, browser navigates away — no further action needed.
    } catch (err: any) {
      toast({ title: 'Sign-in failed', description: err?.message ?? String(err), variant: 'destructive' });
      setIsLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.5 6.6 2.5 12s4.2 9.6 9.5 9.6c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.7H12z" />
        </svg>
      )}
      {label}
    </Button>
  );
}
