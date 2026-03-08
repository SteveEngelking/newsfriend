import { Claim } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

const statusConfig = {
  verified: { icon: CheckCircle, label: 'Verified', className: 'bg-verified text-verified-foreground' },
  disputed: { icon: XCircle, label: 'Disputed', className: 'bg-disputed text-disputed-foreground' },
  unverified: { icon: HelpCircle, label: 'Unverified', className: 'bg-unverified text-unverified-foreground' },
};

export function ClaimCard({ claim, index }: { claim: Claim; index: number }) {
  const [open, setOpen] = useState(false);
  const config = statusConfig[claim.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Card className="border-border/60 overflow-hidden">
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${
                  claim.status === 'verified' ? 'text-verified' :
                  claim.status === 'disputed' ? 'text-disputed' : 'text-unverified'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className={config.className}>
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {claim.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{claim.text}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1 ${open ? 'rotate-180' : ''}`} />
              </div>
            </CardContent>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
              <p className="text-sm text-muted-foreground">{claim.explanation}</p>
              {claim.sources.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sources</p>
                  {claim.sources.map((s, i) => (
                    <div key={i} className="rounded-md bg-muted/40 p-2.5">
                      <p className="text-xs font-medium text-primary">{s.sourceName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{s.excerpt}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}
