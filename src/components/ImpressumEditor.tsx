import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImpressumData {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  managing_director: string;
  register_court: string;
  register_number: string;
  vat_id: string;
  additional_info: string;
}

export function ImpressumEditor() {
  const [data, setData] = useState<ImpressumData | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from('impressum')
      .select('*')
      .limit(1)
      .single()
      .then(({ data: row }) => {
        if (row) setData(row as unknown as ImpressumData);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from('impressum')
      .update({
        company_name: data.company_name,
        address: data.address,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        managing_director: data.managing_director,
        register_court: data.register_court,
        register_number: data.register_number,
        vat_id: data.vat_id,
        additional_info: data.additional_info,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save Impressum', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Impressum updated successfully.' });
    }
    setSaving(false);
  };

  const update = (field: keyof ImpressumData, value: string) => {
    if (data) setData({ ...data, [field]: value });
  };

  if (loading) return null;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Impressum / Legal Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Company Name</Label>
            <Input value={data?.company_name ?? ''} onChange={e => update('company_name', e.target.value)} placeholder="Company GmbH" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Managing Director</Label>
            <Input value={data?.managing_director ?? ''} onChange={e => update('managing_director', e.target.value)} placeholder="Max Mustermann" className="text-sm" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">Address</Label>
            <Textarea value={data?.address ?? ''} onChange={e => update('address', e.target.value)} placeholder="Musterstraße 1&#10;12345 Berlin&#10;Germany" className="text-sm" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={data?.contact_email ?? ''} onChange={e => update('contact_email', e.target.value)} placeholder="info@example.com" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input value={data?.contact_phone ?? ''} onChange={e => update('contact_phone', e.target.value)} placeholder="+49 30 123456" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Register Court</Label>
            <Input value={data?.register_court ?? ''} onChange={e => update('register_court', e.target.value)} placeholder="Amtsgericht Berlin" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Register Number</Label>
            <Input value={data?.register_number ?? ''} onChange={e => update('register_number', e.target.value)} placeholder="HRB 12345" className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">VAT ID</Label>
            <Input value={data?.vat_id ?? ''} onChange={e => update('vat_id', e.target.value)} placeholder="DE123456789" className="text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Additional Information</Label>
          <Textarea value={data?.additional_info ?? ''} onChange={e => update('additional_info', e.target.value)} placeholder="Responsible for content, disclaimers, etc." className="text-sm" rows={4} />
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Impressum
        </Button>
      </CardContent>
    </Card>
  );
}
