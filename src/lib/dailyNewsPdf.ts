import type { DailyNewsReport } from './types';

export async function generateDailyNewsPDF(report: DailyNewsReport, element: HTMLElement) {
  const html2pdf = (await import('html2pdf.js')).default;
  
  const filename = `news-of-the-day-${new Date().toISOString().slice(0, 10)}.pdf`;
  
  const opt = {
    margin: [15, 15, 15, 15],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
  };

  // Generate PDF and open in new window
  const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
