import type { DailyNewsReport } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateDailyNewsPDF(_report: DailyNewsReport, element: HTMLElement) {
  const scale = 2;
  const pageWidthMm = 210;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    windowHeight: element.scrollHeight,
    height: element.scrollHeight,
    scrollY: 0,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgHeightMm = (canvas.height * pageWidthMm) / canvas.width;

  const pdf = new jsPDF('p', 'mm', [pageWidthMm, imgHeightMm]);
  pdf.addImage(imgData, 'PNG', 0, 0, pageWidthMm, imgHeightMm);
  pdf.save('news-of-the-day.pdf');
}
