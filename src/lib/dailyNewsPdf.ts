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
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageHeight = 297;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  let remainingHeight = imgHeight - pageHeight;

  while (remainingHeight > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    remainingHeight -= pageHeight;
  }

  pdf.save('news-of-the-day.pdf');
}
