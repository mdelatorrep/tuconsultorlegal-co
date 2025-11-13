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
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TU CONSULTOR LEGAL', MARGIN_LEFT, MARGIN_TOP + 8);
  
  // Número de página (derecha)
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
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
  doc.setFont('helvetica', 'normal');
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
    doc.text(reviewText, MARGIN_LEFT, footerY + 12);
  }
  
  // Línea de autenticidad
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const authText = 'Documento generado digitalmente por Tu Consultor Legal - Válido sin firma física';
  const authTextWidth = doc.getTextWidth(authText);
  doc.text(authText, (PAGE_WIDTH - authTextWidth) / 2, footerY + (reviewedByLawyer ? 18 : 12));
};

// Interfaz para tokens de contenido con formato
interface ContentToken {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isHeading?: number; // 1-6 para h1-h6
  isList?: boolean;
  isOrderedList?: boolean;
  listLevel?: number;
}

// Función mejorada para procesar HTML y extraer tokens con formato
const processHtmlContent = (html: string): ContentToken[] => {
  const tokens: ContentToken[] = [];
  
  // Crear un elemento temporal para parsear HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as HTMLElement;
  
  if (!container) return tokens;
  
  // Función recursiva para procesar nodos
  const processNode = (node: Node, parentFormat: Partial<ContentToken> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        tokens.push({
          text,
          ...parentFormat
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Determinar formato basado en la etiqueta
      const format: Partial<ContentToken> = { ...parentFormat };
      
      if (tagName === 'strong' || tagName === 'b') {
        format.isBold = true;
      } else if (tagName === 'em' || tagName === 'i') {
        format.isItalic = true;
      } else if (tagName === 'u') {
        format.isUnderline = true;
      } else if (tagName.match(/^h[1-6]$/)) {
        format.isHeading = parseInt(tagName[1]);
      } else if (tagName === 'li') {
        format.isList = true;
        // Determinar si es lista ordenada o no
        const parentList = element.parentElement;
        format.isOrderedList = parentList?.tagName.toLowerCase() === 'ol';
      } else if (tagName === 'p' || tagName === 'div') {
        // Agregar salto de línea antes de párrafos (excepto el primero)
        if (tokens.length > 0) {
          tokens.push({ text: '\n' });
        }
      } else if (tagName === 'br') {
        tokens.push({ text: '\n' });
        return;
      }
      
      // Procesar hijos recursivamente
      element.childNodes.forEach(child => processNode(child, format));
      
      // Agregar salto de línea después de ciertos elementos
      if (tagName.match(/^h[1-6]$/) || tagName === 'p' || tagName === 'li') {
        tokens.push({ text: '\n' });
      }
    }
  };
  
  container.childNodes.forEach(node => processNode(node));
  
  return tokens;
};

// Función para renderizar tokens en PDF
const renderTokensInPDF = (
  doc: jsPDF, 
  tokens: ContentToken[], 
  startY: number, 
  documentData: any,
  startPageNumber: number
): { currentY: number; pageNumber: number } => {
  let currentY = startY;
  let pageNumber = startPageNumber;
  let listCounter = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Verificar espacio en la página
    const lineHeight = token.isHeading ? 10 : 7;
    if (currentY + lineHeight > PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      addHeader(doc, pageNumber);
      currentY = MARGIN_TOP + 25;
      listCounter = 0;
    }
    
    // Configurar fuente según formato
    if (token.isHeading) {
      doc.setFont('helvetica', 'bold');
      const headingSizes = [18, 16, 14, 13, 12, 11];
      doc.setFontSize(headingSizes[token.isHeading - 1] || 12);
      doc.setTextColor(23, 37, 84);
    } else {
      // Determinar estilo de fuente
      let fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal';
      if (token.isBold && token.isItalic) fontStyle = 'bolditalic';
      else if (token.isBold) fontStyle = 'bold';
      else if (token.isItalic) fontStyle = 'italic';
      
      doc.setFont('helvetica', fontStyle);
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
    }
    
    // Procesar el texto
    if (token.text === '\n') {
      currentY += token.isHeading ? 5 : 3;
      listCounter = 0;
      continue;
    }
    
    let textToRender = token.text;
    let xPosition = MARGIN_LEFT;
    
    // Manejar listas
    if (token.isList) {
      listCounter++;
      const bullet = token.isOrderedList ? `${listCounter}. ` : '• ';
      textToRender = bullet + textToRender;
      xPosition = MARGIN_LEFT + 5;
    }
    
    // Dividir texto si es muy largo
    const maxWidth = CONTENT_WIDTH - (token.isList ? 5 : 0);
    const lines = doc.splitTextToSize(textToRender, maxWidth);
    
    for (const line of lines) {
      // Verificar espacio nuevamente por si el texto es muy largo
      if (currentY + lineHeight > PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT) {
        addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
        doc.addPage();
        pageNumber++;
        addHeader(doc, pageNumber);
        currentY = MARGIN_TOP + 25;
      }
      
      doc.text(line, xPosition, currentY);
      
      // Agregar subrayado si es necesario
      if (token.isUnderline) {
        const textWidth = doc.getTextWidth(line);
        doc.setLineWidth(0.2);
        doc.line(xPosition, currentY + 1, xPosition + textWidth, currentY + 1);
      }
      
      currentY += lineHeight;
    }
  }
  
  return { currentY, pageNumber };
};

export const generatePDFDownload = (documentData: any, toast?: (options: any) => void) => {
  try {
    // Crear nuevo documento PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    let pageNumber = 1;
    
    // Configurar fuente predeterminada
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    // Añadir encabezado a la primera página
    addHeader(doc, pageNumber);
    
    // Título del documento
    let currentY = MARGIN_TOP + 25;
    doc.setTextColor(23, 37, 84);
    doc.setFont('helvetica', 'bold');
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
    
    // Procesar contenido HTML
    const content = documentData.document_content || 'Contenido del documento no disponible.';
    const tokens = processHtmlContent(content);
    
    // Renderizar tokens en PDF
    const result = renderTokensInPDF(doc, tokens, currentY, documentData, pageNumber);
    pageNumber = result.pageNumber;
    
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
