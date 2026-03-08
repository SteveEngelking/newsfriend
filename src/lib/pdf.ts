import type { FactCheckReport } from './types';

export async function generatePDF(report: FactCheckReport, element: HTMLElement) {
  const html2pdf = (await import('html2pdf.js')).default;
  
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `factcheck-${report.topic.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  };

  await html2pdf().set(opt).from(element).save();
}
