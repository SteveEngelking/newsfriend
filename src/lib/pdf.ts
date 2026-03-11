import type { FactCheckReport } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDF(_report: FactCheckReport, element: HTMLElement) {
  const scale = 2;
  const pageWidth = 210;
  const pageHeight = 297;

  const maxCanvasHeight = 8000;
  const totalHeight = element.scrollHeight;
  const elementWidth = element.offsetWidth;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pxPerMm = (elementWidth * scale) / pageWidth;
  const pageHeightPx = pageHeight * pxPerMm / scale;

  let currentY = 0;
  let pageIndex = 0;

  while (currentY < totalHeight) {
    const chunkHeight = Math.min(maxCanvasHeight, totalHeight - currentY);

    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      y: currentY,
      height: chunkHeight,
      windowHeight: chunkHeight,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidthMm = pageWidth;
    const imgHeightMm = (canvas.height * pageWidth) / canvas.width;

    let offsetMm = 0;
    while (offsetMm < imgHeightMm) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'PNG', 0, -offsetMm, imgWidthMm, imgHeightMm);

      offsetMm += pageHeight;
      pageIndex++;
    }

    currentY += chunkHeight;
  }

  pdf.save('fact-check-report.pdf');
}
