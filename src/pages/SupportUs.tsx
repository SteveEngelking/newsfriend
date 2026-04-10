import { useState } from 'react';
import { Heart, ArrowRight, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

const SupportUs = () => {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('10');
  const [recurring, setRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [manageEmail, setManageEmail] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [currency] = useState('eur');

  const params = new URLSearchParams(window.location.search);
  const success = params.get('success') === 'true';
  const cancelled = params.get('cancelled') === 'true';

  const handleDonate = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      toast.error(t('supportMinAmount'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-donation-session', {
        body: {
          amount: numAmount,
          currency,
          recurring,
          successUrl: `${window.location.origin}/donation-thank-you`,
          cancelUrl: `${window.location.origin}/support?cancelled=true`,
        },
      });

      if (error) throw new Error(error.message || t('supportError'));

      const checkoutUrl = data?.data?.url ?? data?.url;
      if (data?.ok === false) {
        throw new Error(data.error || t('supportError'));
      }

      if (!checkoutUrl) throw new Error('No checkout URL returned');

      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error('Donation error:', err);
      toast.error(err.message || t('supportError'));
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!manageEmail.trim()) {
      toast.error(t('supportManageNoEmail'));
      return;
    }

    setManageLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { email: manageEmail.trim() },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error('No portal URL returned');

      window.open(data.url, '_blank');
    } catch (err: any) {
      console.error('Manage subscription error:', err);
      toast.error(t('supportManageError'));
    } finally {
      setManageLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Heart className="h-8 w-8 text-primary" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('supportThankYou')}</h1>
        <p className="text-muted-foreground text-lg">{t('supportThankYouDesc')}</p>
        <Button variant="outline" onClick={() => window.location.href = '/support'}>
          {t('supportBackBtn')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{t('supportTitle')}</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">{t('supportDesc')}</p>
      </header>

      {cancelled && (
        <div className="text-center p-3 rounded-md bg-muted text-muted-foreground text-sm">
          {t('supportCancelled')}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t('supportChooseAmount')}</CardTitle>
          <CardDescription>{t('supportChooseAmountDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {PRESET_AMOUNTS.map((preset) => (
              <Button
                key={preset}
                variant={amount === String(preset) ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAmount(String(preset))}
                className="min-w-[4rem]"
              >
                €{preset}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>{t('supportCustomAmount')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                placeholder="10.00"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-base font-medium">{t('supportMonthly')}</Label>
              <p className="text-sm text-muted-foreground">{t('supportMonthlyDesc')}</p>
            </div>
            <Switch checked={recurring} onCheckedChange={setRecurring} />
          </div>

          <Button
            size="lg"
            className="w-full text-lg gap-2"
            onClick={handleDonate}
            disabled={loading || !amount || parseFloat(amount) < 1}
          >
            {loading ? (
              t('supportProcessing')
            ) : (
              <>
                {recurring ? t('supportDonateMonthly') : t('supportDonateOnce')} — €{parseFloat(amount || '0').toFixed(2)}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('supportSecure')}
          </p>
        </CardContent>
      </Card>

      {/* Manage existing subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('supportManageTitle')}
          </CardTitle>
          <CardDescription>{t('supportManageDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={manageEmail}
              onChange={(e) => setManageEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          <Button
            variant="outline"
            onClick={handleManageSubscription}
            disabled={manageLoading || !manageEmail.trim()}
            className="w-full gap-2"
          >
            {manageLoading ? t('supportProcessing') : (
              <>
                <Settings className="h-4 w-4" />
                {t('supportManageBtn')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportUs;
