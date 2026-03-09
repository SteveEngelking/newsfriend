import type { DailyNewsReport } from './types';

export async function generateDailyNewsPDF(_report: DailyNewsReport, element: HTMLElement) {
  // Use browser print dialog for PDF generation (secure, no vulnerable dependencies)
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Please allow pop-ups to generate PDF.');
  }

  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>News of the Day</title>
      <style>
        ${styles}
        @media print {
          body { margin: 0; padding: 20px; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head>
    <body>${element.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
