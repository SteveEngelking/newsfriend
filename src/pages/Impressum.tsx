import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ImpressumData {
  company_name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  managing_director: string;
  register_court: string;
  register_number: string;
  vat_id: string;
  additional_info: string;
  updated_at: string;
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm whitespace-pre-line">{value}</p>
    </div>
  );
}

export default function Impressum() {
  const [data, setData] = useState<ImpressumData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isEmpty = data && !data.company_name && !data.address && !data.contact_email;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Impressum</h1>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            The Impressum has not been configured yet. An administrator can set it up in the Admin section.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{data?.company_name || 'Legal Notice'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Address" value={data?.address ?? ''} />
            <Field label="Managing Director" value={data?.managing_director ?? ''} />
            <Field label="Email" value={data?.contact_email ?? ''} />
            <Field label="Phone" value={data?.contact_phone ?? ''} />
            <Field label="Register Court" value={data?.register_court ?? ''} />
            <Field label="Register Number" value={data?.register_number ?? ''} />
            <Field label="VAT ID" value={data?.vat_id ?? ''} />
            {data?.additional_info && (
              <>
                <div className="border-t border-border/50 pt-4">
                  <p className="text-sm whitespace-pre-line">{data.additional_info}</p>
                </div>
              </>
            )}
            {data?.updated_at && (
              <p className="text-xs text-muted-foreground pt-2">
                Last updated: {new Date(data.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
