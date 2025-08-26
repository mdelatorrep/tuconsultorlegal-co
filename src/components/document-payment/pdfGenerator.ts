import jsPDF from 'jspdf';

// Configuración de márgenes y dimensiones
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297; // mm (A4)
const MARGIN_LEFT = 25; // mm - Margen izquierdo
const MARGIN_RIGHT = 20; // mm - Margen derecho
const MARGIN_TOP = 20; // mm - Margen superior
const MARGIN_BOTTOM = 30; // mm - Margen inferior
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Ancho disponible para contenido
const HEADER_HEIGHT = 15; // mm
const FOOTER_HEIGHT = 20; // mm

const addHeader = (doc: jsPDF, pageNumber: number) => {
  // Línea superior elegante
  doc.setDrawColor(23, 37, 84); // Navy blue
  doc.setLineWidth(2);
  doc.line(MARGIN_LEFT, MARGIN_TOP, PAGE_WIDTH - MARGIN_RIGHT, MARGIN_TOP);
  
  // Título de la empresa
  doc.setTextColor(23, 37, 84);
  doc.setFont('Arial', 'bold');
  doc.setFontSize(14);
  doc.text('TU CONSULTOR LEGAL', MARGIN_LEFT, MARGIN_TOP + 8);
  
  // Número de página (derecha)
  doc.setTextColor(100, 100, 100);
  doc.setFont('Arial', 'normal');
  doc.setFontSize(10);
  const pageText = `Página ${pageNumber}`;
  const pageTextWidth = doc.getTextWidth(pageText);
  doc.text(pageText, PAGE_WIDTH - MARGIN_RIGHT - pageTextWidth, MARGIN_TOP + 8);
  
  // Línea separadora inferior
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, MARGIN_TOP + 12, PAGE_WIDTH - MARGIN_RIGHT, MARGIN_TOP + 12);
};

const addFooter = (doc: jsPDF, token: string, reviewedByLawyer?: string) => {
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM;
  
  // Línea separadora superior
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);
  
  // Información del token (izquierda)
  doc.setTextColor(60, 60, 60);
  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.text(`Token de verificación: ${token}`, MARGIN_LEFT, footerY + 6);
  
  // Fecha de generación (centro)
  const now = new Date();
  const dateText = `Generado el ${now.toLocaleDateString('es-ES')} a las ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  const dateTextWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (PAGE_WIDTH - dateTextWidth) / 2, footerY + 6);
  
  // Sitio web (derecha)
  doc.setTextColor(59, 130, 246);
  const webText = 'www.tuconsultorlegal.co';
  const webTextWidth = doc.getTextWidth(webText);
  doc.text(webText, PAGE_WIDTH - MARGIN_RIGHT - webTextWidth, footerY + 6);
  
  // Información del abogado revisor (si está disponible)
  if (reviewedByLawyer) {
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    const reviewText = `Documento revisado por: ${reviewedByLawyer}`;
    const reviewTextWidth = doc.getTextWidth(reviewText);
    doc.text(reviewText, MARGIN_LEFT, footerY + 12);
  }
  
  // Línea de autenticidad
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const authText = 'Documento generado digitalmente por Tu Consultor Legal - Válido sin firma física';
  const authTextWidth = doc.getTextWidth(authText);
  doc.text(authText, (PAGE_WIDTH - authTextWidth) / 2, footerY + (reviewedByLawyer ? 18 : 12));
};

// Función para añadir texto justificado
const addJustifiedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
  const words = text.split(' ');
  let currentLine = '';
  let currentY = y;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + (currentLine ? ' ' : '') + words[i];
    const testWidth = doc.getTextWidth(testLine);
    
    if (testWidth > maxWidth && currentLine) {
      // Justificar la línea (excepto la última línea del párrafo)
      if (i < words.length - 1) {
        justifyLine(doc, currentLine, x, currentY, maxWidth);
      } else {
        doc.text(currentLine, x, currentY);
      }
      currentLine = words[i];
      currentY += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  
  // Añadir la última línea (sin justificar)
  if (currentLine) {
    doc.text(currentLine, x, currentY);
    currentY += lineHeight;
  }
  
  return currentY;
};

// Función para justificar una línea de texto
const justifyLine = (doc: jsPDF, line: string, x: number, y: number, maxWidth: number) => {
  const words = line.trim().split(' ');
  if (words.length <= 1) {
    doc.text(line, x, y);
    return;
  }
  
  const textWidth = doc.getTextWidth(line);
  const spacesToAdd = maxWidth - textWidth;
  const spacesBetweenWords = words.length - 1;
  const extraSpacePerGap = spacesToAdd / spacesBetweenWords;
  
  let currentX = x;
  for (let i = 0; i < words.length; i++) {
    doc.text(words[i], currentX, y);
    currentX += doc.getTextWidth(words[i]);
    if (i < words.length - 1) {
      currentX += doc.getTextWidth(' ') + extraSpacePerGap;
    }
  }
};

export const generatePDFDownload = (documentData: any, toast?: (options: any) => void) => {
  try {
    // Crear nuevo documento PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    let pageNumber = 1;
    
    // Configurar fuente predeterminada
    doc.setFont('Arial', 'normal');
    doc.setFontSize(12);
    
    // Añadir encabezado a la primera página
    addHeader(doc, pageNumber);
    
    // Título del documento
    let currentY = MARGIN_TOP + 25;
    doc.setTextColor(23, 37, 84);
    doc.setFont('Arial', 'bold');
    doc.setFontSize(16);
    
    const title = documentData.document_type || 'DOCUMENTO LEGAL';
    const titleLines = doc.splitTextToSize(title.toUpperCase(), CONTENT_WIDTH);
    titleLines.forEach((line: string) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (PAGE_WIDTH - lineWidth) / 2, currentY); // Centrado
      currentY += 8;
    });
    
    currentY += 10; // Espacio después del título
    
    // Línea separadora antes del contenido
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_LEFT, currentY, PAGE_WIDTH - MARGIN_RIGHT, currentY);
    currentY += 8;
    
    // Contenido del documento
    doc.setTextColor(0, 0, 0);
    doc.setFont('Arial', 'normal');
    doc.setFontSize(12);
    
    const content = documentData.document_content || 'Contenido del documento no disponible.';
    const paragraphs = content.split('\n\n');
    
    paragraphs.forEach((paragraph: string, index: number) => {
      if (paragraph.trim()) {
        // Verificar si necesitamos una nueva página
        const estimatedLines = Math.ceil(doc.getTextWidth(paragraph) / CONTENT_WIDTH);
        const requiredHeight = estimatedLines * 6 + 10; // 6mm por línea + espaciado
        
        if (currentY + requiredHeight > PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT) {
          // Añadir pie de página a la página actual
          addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
          
          // Nueva página
          doc.addPage();
          pageNumber++;
          addHeader(doc, pageNumber);
          currentY = MARGIN_TOP + 25;
        }
        
        // Añadir párrafo justificado
        currentY = addJustifiedText(doc, paragraph.trim(), MARGIN_LEFT, currentY, CONTENT_WIDTH, 6);
        
        // Espacio entre párrafos
        if (index < paragraphs.length - 1) {
          currentY += 4;
        }
      }
    });
    
    // Añadir pie de página a la última página
    addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
    
    // Generar nombre de archivo
    const sanitizedDocType = documentData.document_type?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'Documento';
    const fileName = `${sanitizedDocType}_${documentData.token}.pdf`;
    
    // Guardar el PDF
    doc.save(fileName);

    if (toast) {
      toast({
        title: "¡Descarga exitosa!",
        description: `El documento "${documentData.document_type}" se ha descargado correctamente con formato profesional.`,
      });
    }

    return true;
  } catch (error) {
    console.error('Error generando PDF:', error);
    if (toast) {
      toast({
        title: "Error en la descarga",
        description: "Ocurrió un error al generar el documento PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    }
    return false;
  }
};