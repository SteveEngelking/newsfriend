import type { FactCheckReport } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generatePDF(_report: FactCheckReport, element: HTMLElement) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  const totalPages = Math.ceil(imgHeight / pageHeight);
  const pixelsPerPage = canvas.height / totalPages;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    // Create a canvas slice for this page
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pixelsPerPage;
    
    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, page * pixelsPerPage,
        canvas.width, pixelsPerPage,
        0, 0,
        canvas.width, pixelsPerPage
      );
    }

    const pageImgData = pageCanvas.toDataURL('image/png');
    pdf.addImage(pageImgData, 'PNG', 0, 0, pageWidth, pageHeight);
  }

  pdf.save('fact-check-report.pdf');
}
