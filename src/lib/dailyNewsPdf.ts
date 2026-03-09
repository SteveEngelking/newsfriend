import type { DailyNewsReport } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateDailyNewsPDF(_report: DailyNewsReport, element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');

  // Single long page to avoid cutting text across page breaks
  const pageWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', [pageWidth, imgHeight]);
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
  pdf.save('news-of-the-day.pdf');
}

