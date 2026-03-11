import type { DailyNewsReport } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateDailyNewsPDF(_report: DailyNewsReport, element: HTMLElement) {
  const scale = 2;
  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm

  // Max canvas chunk height to stay under browser limits (~16384px)
  const maxCanvasHeight = 8000;
  const totalHeight = element.scrollHeight;
  const elementWidth = element.offsetWidth;

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pxPerMm = (elementWidth * scale) / pageWidth;
  const pageHeightPx = pageHeight * pxPerMm / scale; // page height in CSS pixels

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

    // Split this chunk into A4 pages
    let offsetMm = 0;
    while (offsetMm < imgHeightMm) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const remainingMm = imgHeightMm - offsetMm;
      const sliceHeightMm = Math.min(pageHeight, remainingMm);

      // Draw the chunk image offset so the current slice aligns to the top
      pdf.addImage(imgData, 'PNG', 0, -offsetMm, imgWidthMm, imgHeightMm);

      offsetMm += pageHeight;
      pageIndex++;
    }

    currentY += chunkHeight;
  }

  pdf.save('news-of-the-day.pdf');
}
