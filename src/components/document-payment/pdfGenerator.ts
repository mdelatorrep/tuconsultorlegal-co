import jsPDF from 'jspdf';

// Configuración de márgenes y dimensiones - Layout elegante
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297; // mm (A4)
const MARGIN_LEFT = 20; // mm - Margen izquierdo elegante
const MARGIN_RIGHT = 20; // mm - Margen derecho simétrico
const MARGIN_TOP = 15; // mm - Margen superior moderno
const MARGIN_BOTTOM = 25; // mm - Margen inferior
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Ancho disponible para contenido
const HEADER_HEIGHT = 20; // mm - Header más amplio
const FOOTER_HEIGHT = 20; // mm

// Paleta de colores moderna y profesional
const COLORS = {
  primary: [3, 114, 232], // Azul corporativo elegante
  primaryDark: [1, 15, 36], // Azul oscuro sofisticado
  accent: [242, 187, 49], // Dorado elegante para acentos
  text: [40, 40, 40], // Gris oscuro para texto principal
  textLight: [100, 100, 100], // Gris medio para texto secundario
  divider: [220, 220, 220], // Líneas sutiles
  white: [255, 255, 255],
};

const addHeader = (doc: jsPDF, pageNumber: number) => {
  // Fondo sutil del header
  doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');
  
  // Línea decorativa de acento
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.rect(0, HEADER_HEIGHT - 1, PAGE_WIDTH, 1, 'F');
  
  // Logo/Título de la empresa con tipografía elegante
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('TU CONSULTOR LEGAL', MARGIN_LEFT, MARGIN_TOP - 3);
  
  // Subtítulo elegante
  doc.setFont('times', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.text('Excelencia Jurídica', MARGIN_LEFT, MARGIN_TOP + 3);
  
  // Número de página con estilo moderno
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const pageText = `${pageNumber}`;
  const pageTextWidth = doc.getTextWidth(pageText);
  
  // Círculo decorativo para el número de página
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.circle(PAGE_WIDTH - MARGIN_RIGHT - 5, MARGIN_TOP - 6, 4, 'F');
  doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
  doc.text(pageText, PAGE_WIDTH - MARGIN_RIGHT - 5 - pageTextWidth / 2, MARGIN_TOP - 4);
};

const addFooter = (doc: jsPDF, token: string, reviewedByLawyer?: string) => {
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 3;
  
  // Línea decorativa superior elegante
  doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);
  
  // Información del token con diseño moderno
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Token: ${token}`, MARGIN_LEFT, footerY + 5);
  
  // Fecha de generación con formato elegante
  const now = new Date();
  const dateText = `${now.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })}`;
  const dateTextWidth = doc.getTextWidth(dateText);
  doc.text(dateText, (PAGE_WIDTH - dateTextWidth) / 2, footerY + 5);
  
  // Sitio web con estilo de link
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFont('helvetica', 'italic');
  const webText = 'www.tuconsultorlegal.co';
  const webTextWidth = doc.getTextWidth(webText);
  doc.text(webText, PAGE_WIDTH - MARGIN_RIGHT - webTextWidth, footerY + 5);
  
  // Información del abogado revisor con diseño destacado
  if (reviewedByLawyer) {
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.roundedRect(MARGIN_LEFT - 2, footerY + 8, 3, 3, 0.5, 0.5, 'FD');
    
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    const reviewText = `Revisado por: ${reviewedByLawyer}`;
    doc.text(reviewText, MARGIN_LEFT + 3, footerY + 11);
  }
  
  // Línea de autenticidad con diseño moderno
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  const authText = 'Documento digital certificado - Válido sin firma';
  const authTextWidth = doc.getTextWidth(authText);
  doc.text(authText, (PAGE_WIDTH - authTextWidth) / 2, footerY + (reviewedByLawyer ? 16 : 11));
};

// Interfaz extendida para tokens de contenido con estilos inline
interface ContentToken {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isHeading?: number; // 1-6 para h1-h6
  isList?: boolean;
  isOrderedList?: boolean;
  listLevel?: number;
  // Estilos inline de ReactQuill
  color?: string; // rgb(r,g,b) o #hex
  fontSize?: number; // en pt
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  backgroundColor?: string;
}

// Función para parsear color RGB a array [r, g, b]
const parseColor = (color: string): [number, number, number] | null => {
  if (!color) return null;
  
  // Formato rgb(r, g, b)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  
  // Formato #hex
  const hexMatch = color.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (hexMatch) {
    return [
      parseInt(hexMatch[1], 16),
      parseInt(hexMatch[2], 16),
      parseInt(hexMatch[3], 16)
    ];
  }
  
  // Formato #hex corto
  const hexShortMatch = color.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/);
  if (hexShortMatch) {
    return [
      parseInt(hexShortMatch[1] + hexShortMatch[1], 16),
      parseInt(hexShortMatch[2] + hexShortMatch[2], 16),
      parseInt(hexShortMatch[3] + hexShortMatch[3], 16)
    ];
  }
  
  return null;
};

// Función para parsear font-size a puntos
const parseFontSize = (fontSize: string): number | null => {
  if (!fontSize) return null;
  
  const pxMatch = fontSize.match(/(\d+)px/);
  if (pxMatch) {
    // Convertir px a pt (1px ≈ 0.75pt)
    return parseInt(pxMatch[1]) * 0.75;
  }
  
  const ptMatch = fontSize.match(/(\d+)pt/);
  if (ptMatch) {
    return parseInt(ptMatch[1]);
  }
  
  return null;
};

// Función mejorada para procesar HTML y extraer tokens con formato Y estilos inline
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
      const text = node.textContent;
      if (text && text.trim()) {
        // Preservar saltos de línea y espacios
        const lines = text.split('\n');
        lines.forEach((line, index) => {
          if (line || index < lines.length - 1) {
            tokens.push({
              text: line,
              ...parentFormat
            });
            if (index < lines.length - 1) {
              tokens.push({ text: '\n' });
            }
          }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Determinar formato basado en la etiqueta
      const format: Partial<ContentToken> = { ...parentFormat };
      
      // Parsear estilos inline
      const style = element.getAttribute('style');
      if (style) {
        const styles = style.split(';').reduce((acc, s) => {
          const [key, value] = s.split(':').map(v => v.trim());
          if (key && value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>);
        
        // Extraer color
        if (styles.color) {
          format.color = styles.color;
        }
        
        // Extraer font-size
        if (styles['font-size']) {
          const size = parseFontSize(styles['font-size']);
          if (size) format.fontSize = size;
        }
        
        // Extraer text-align
        if (styles['text-align']) {
          format.textAlign = styles['text-align'] as any;
        }
        
        // Extraer background-color
        if (styles['background-color']) {
          format.backgroundColor = styles['background-color'];
        }
      }
      
      // Formato por etiqueta
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
        const parentList = element.parentElement;
        format.isOrderedList = parentList?.tagName.toLowerCase() === 'ol';
      } else if (tagName === 'p' || tagName === 'div') {
        // Agregar salto de línea antes de párrafos (excepto el primero)
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== '\n') {
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
        if (tokens.length === 0 || tokens[tokens.length - 1].text !== '\n') {
          tokens.push({ text: '\n' });
        }
      }
    }
  };
  
  container.childNodes.forEach(node => processNode(node));
  
  return tokens;
};

// Función para renderizar tokens en PDF con soporte de estilos inline
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
  let currentParagraphAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Determinar alineación del párrafo
    if (token.textAlign) {
      currentParagraphAlign = token.textAlign;
    }
    
    // Verificar espacio en la página
    const baseFontSize = token.fontSize || (token.isHeading ? 16 : 11);
    const lineHeight = baseFontSize * 0.5; // mm
    
    if (currentY + lineHeight > PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      addHeader(doc, pageNumber);
      currentY = HEADER_HEIGHT + 10;
      listCounter = 0;
    }
    
    // Configurar fuente según formato con tipografía elegante
    if (token.isHeading) {
      doc.setFont('times', 'bold');
      const headingSizes = [20, 18, 16, 14, 13, 12];
      doc.setFontSize(headingSizes[token.isHeading - 1] || 12);
      doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    } else {
      // Determinar estilo de fuente con Times para un look más profesional
      let fontFamily: 'times' | 'helvetica' = 'times';
      let fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal';
      
      if (token.isBold && token.isItalic) fontStyle = 'bolditalic';
      else if (token.isBold) fontStyle = 'bold';
      else if (token.isItalic) fontStyle = 'italic';
      
      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(token.fontSize || 11.5);
      
      // Aplicar color si está definido
      if (token.color) {
        const rgb = parseColor(token.color);
        if (rgb) {
          doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        } else {
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        }
      } else {
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      }
    }
    
    // Procesar el texto
    if (token.text === '\n') {
      currentY += lineHeight;
      listCounter = 0;
      currentParagraphAlign = 'left'; // Reset alignment
      continue;
    }
    
    // Saltar tokens vacíos
    if (!token.text.trim()) {
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
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      // Verificar espacio nuevamente por si el texto es muy largo
      if (currentY + lineHeight > PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT) {
        addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
        doc.addPage();
        pageNumber++;
        addHeader(doc, pageNumber);
        currentY = HEADER_HEIGHT + 10;
      }
      
      // Calcular posición X según alineación
      let finalXPosition = xPosition;
      const lineWidth = doc.getTextWidth(line);
      
      if (currentParagraphAlign === 'center') {
        finalXPosition = MARGIN_LEFT + (CONTENT_WIDTH - lineWidth) / 2;
      } else if (currentParagraphAlign === 'right') {
        finalXPosition = PAGE_WIDTH - MARGIN_RIGHT - lineWidth;
      } else if (currentParagraphAlign === 'justify' && lineIndex < lines.length - 1) {
        // Justificación solo para líneas que no son la última
        const words = line.split(' ');
        if (words.length > 1) {
          const totalSpaceWidth = maxWidth - words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
          const spaceWidth = totalSpaceWidth / (words.length - 1);
          let currentX = xPosition;
          
          words.forEach((word, idx) => {
            doc.text(word, currentX, currentY);
            if (idx < words.length - 1) {
              currentX += doc.getTextWidth(word) + spaceWidth;
            }
          });
          
          // Aplicar subrayado si es necesario
          if (token.isUnderline) {
            doc.setLineWidth(0.2);
            doc.line(xPosition, currentY + 1, xPosition + maxWidth, currentY + 1);
          }
          
          currentY += lineHeight;
          continue;
        }
      }
      
      // Renderizar texto normal (no justificado)
      doc.text(line, finalXPosition, currentY);
      
      // Agregar subrayado si es necesario
      if (token.isUnderline) {
        doc.setLineWidth(0.2);
        doc.line(finalXPosition, currentY + 1, finalXPosition + lineWidth, currentY + 1);
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
    
    // Título del documento con diseño moderno y elegante
    let currentY = HEADER_HEIGHT + 15;
    
    // Caja decorativa para el título
    doc.setFillColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    doc.roundedRect(MARGIN_LEFT - 3, currentY - 8, CONTENT_WIDTH + 6, 18, 2, 2, 'F');
    
    // Borde decorativo con color de acento
    doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setLineWidth(0.8);
    doc.roundedRect(MARGIN_LEFT - 3, currentY - 8, CONTENT_WIDTH + 6, 18, 2, 2, 'S');
    
    // Título en tipografía elegante
    doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    
    const title = documentData.document_type || 'DOCUMENTO LEGAL';
    const titleLines = doc.splitTextToSize(title.toUpperCase(), CONTENT_WIDTH - 10);
    titleLines.forEach((line: string, index: number) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (PAGE_WIDTH - lineWidth) / 2, currentY + (index * 7)); // Centrado
    });
    
    currentY += 18 + (titleLines.length - 1) * 7;
    
    // Línea decorativa elegante antes del contenido
    currentY += 8;
    doc.setDrawColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_LEFT + 30, currentY, PAGE_WIDTH - MARGIN_RIGHT - 30, currentY);
    
    // Ornamento central
    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.circle(PAGE_WIDTH / 2, currentY, 1.5, 'F');
    
    currentY += 10;
    
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
