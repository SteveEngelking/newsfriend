import { useRef } from 'react';
import { FactCheckReport } from '@/lib/types';
import { ClaimCard } from './ClaimCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, BarChart3, ExternalLink } from 'lucide-react';
import { downloadAsHtml } from '@/lib/downloadHtml';
import { motion } from 'framer-motion';

interface Props {
  report: FactCheckReport;
}

export function ReportView({ report }: Props) {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (!reportRef.current) return;
    downloadAsHtml(reportRef.current, 'fact-check-report');
  };

  const verified = report.claims.filter(c => c.status === 'verified').length;
  const disputed = report.claims.filter(c => c.status === 'disputed').length;
  const unverified = report.claims.filter(c => c.status === 'unverified').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fact-Check Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            if (!reportRef.current) return;
            const clone = reportRef.current.cloneNode(true) as HTMLElement;
            const styles: string[] = [];
            for (const sheet of Array.from(document.styleSheets)) {
              try { for (const rule of Array.from(sheet.cssRules)) styles.push(rule.cssText); } catch {}
            }
            const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${styles.join('\n')}body{margin:0;padding:2rem;background:white;color:black;}</style></head><body>${clone.outerHTML}</body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            window.open(URL.createObjectURL(blob), '_blank');
          }} variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            New Tab
          </Button>
          <Button onClick={handleDownload} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          <Card className="border-verified/30 bg-verified/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-verified">{verified}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </CardContent>
          </Card>
          <Card className="border-disputed/30 bg-disputed/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-disputed">{disputed}</p>
              <p className="text-xs text-muted-foreground">Disputed</p>
            </CardContent>
          </Card>
          <Card className="border-unverified/30 bg-unverified/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-unverified">{unverified}</p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
          </CardContent>
        </Card>

        {/* Claims */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            Key Claims
            <Badge variant="secondary">{report.claims.length}</Badge>
          </h3>
          {report.claims.map((claim, i) => (
            <ClaimCard key={claim.id} claim={claim} index={i} />
          ))}
        </div>

        {/* Source Comparison */}
        {report.sourceComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Source Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Source</TableHead>
                    <TableHead>Perspective</TableHead>
                    <TableHead>Key Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.sourceComparison.map((sc, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{sc.sourceName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{sc.perspective}</TableCell>
                      <TableCell>
                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                          {sc.keyPoints.map((p, j) => <li key={j}>{p}</li>)}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
