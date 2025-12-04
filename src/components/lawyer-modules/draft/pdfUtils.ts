import jsPDF from "jspdf";

// Interfaz para tokens de contenido con formato
interface ContentToken {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isHeading?: number;
  isList?: boolean;
  isOrderedList?: boolean;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

// Función mejorada para procesar HTML y extraer tokens con formato
// Compatible con salida de ReactQuill
const processHtmlToTokens = (html: string): ContentToken[] => {
  const tokens: ContentToken[] = [];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstChild as HTMLElement;
  
  if (!container) return tokens;
  
  const processNode = (node: Node, parentFormat: Partial<ContentToken> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        tokens.push({ text, ...parentFormat });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      const format: Partial<ContentToken> = { ...parentFormat };
      
      // Detectar alineación por clases de ReactQuill
      const className = element.className || '';
      if (className.includes('ql-align-center')) format.textAlign = 'center';
      else if (className.includes('ql-align-right')) format.textAlign = 'right';
      else if (className.includes('ql-align-justify')) format.textAlign = 'justify';
      
      // Detectar alineación por atributo style
      const styleAttr = element.getAttribute('style') || '';
      if (styleAttr.includes('text-align: center')) format.textAlign = 'center';
      else if (styleAttr.includes('text-align: right')) format.textAlign = 'right';
      else if (styleAttr.includes('text-align: justify')) format.textAlign = 'justify';
      
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
        if (tokens.length > 0) tokens.push({ text: '\n' });
      } else if (tagName === 'br') {
        tokens.push({ text: '\n' });
        return;
      }
      
      element.childNodes.forEach(child => processNode(child, format));
      
      if (tagName.match(/^h[1-6]$/) || tagName === 'p' || tagName === 'li') {
        tokens.push({ text: '\n' });
      }
    }
  };
  
  container.childNodes.forEach(node => processNode(node));
  return tokens;
};

// Función para limpiar y preservar formato de texto HTML (legacy - mantener para compatibilidad)
export const cleanTextForPDF = (html: string): string => {
  const tokens = processHtmlToTokens(html);
  return tokens.map(t => t.text).join(' ');
};

// Colores corporativos consistentes con pdfGenerator.ts y documentPreviewStyles.ts
const COLORS = {
  primaryDark: [3, 114, 232], // #0372E8 - Azul corporativo para headings
  text: [40, 40, 40], // #282828 - Gris oscuro para texto
};

// Función para generar PDF con formato - Consistente con pdfGenerator.ts
export const generatePDF = async (content: string, title: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  // Configuración de márgenes
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 2 * margin;
  const maxHeight = pageHeight - 2 * margin;

  let yPosition = margin;

  // Título con fuente Helvetica y color azul corporativo
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
  const cleanTitle = cleanTextForPDF(title);
  doc.text(cleanTitle, margin, yPosition);
  yPosition += 10;

  // Línea separadora
  doc.setDrawColor(204, 204, 204); // #cccccc consistente
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Contenido con formato HTML procesado
  const tokens = processHtmlToTokens(content);
  let listCounter = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    const lineHeight = token.isHeading ? 10 : 7;
    if (yPosition + lineHeight > maxHeight + margin) {
      doc.addPage();
      yPosition = margin;
      listCounter = 0;
    }
    
    if (token.isHeading) {
      // Headings: Helvetica bold con color azul corporativo
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
      const headingSizes = [16, 15, 14, 13, 12, 11];
      doc.setFontSize(headingSizes[token.isHeading - 1] || 11);
    } else {
      // Cuerpo: Times New Roman con color gris oscuro (consistente con documentPreviewStyles)
      let fontStyle: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal';
      if (token.isBold && token.isItalic) fontStyle = 'bolditalic';
      else if (token.isBold) fontStyle = 'bold';
      else if (token.isItalic) fontStyle = 'italic';
      
      doc.setFont("times", fontStyle);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.setFontSize(12); // 12pt consistente con preview
    }
    
    if (token.text === '\n') {
      yPosition += token.isHeading ? 5 : 3;
      listCounter = 0;
      continue;
    }
    
    let textToRender = token.text;
    let xPosition = margin;
    
    if (token.isList) {
      listCounter++;
      const bullet = token.isOrderedList ? `${listCounter}. ` : '• ';
      textToRender = bullet + textToRender;
      xPosition = margin + 5;
    }
    
    const lineMaxWidth = maxWidth - (token.isList ? 5 : 0);
    const lines = doc.splitTextToSize(textToRender, lineMaxWidth);
    
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      if (yPosition + lineHeight > maxHeight + margin) {
        doc.addPage();
        yPosition = margin;
      }
      
      // Aplicar alineación
      let finalX = xPosition;
      const lineWidth = doc.getTextWidth(line);
      
      if (token.textAlign === 'center') {
        finalX = margin + (lineMaxWidth - lineWidth) / 2;
      } else if (token.textAlign === 'right') {
        finalX = pageWidth - margin - lineWidth;
      } else if (token.textAlign === 'justify' && lineIdx < lines.length - 1) {
        // Justificación solo para líneas intermedias
        const words = line.split(' ');
        if (words.length > 1) {
          const totalWordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
          const spaceWidth = (lineMaxWidth - totalWordsWidth) / (words.length - 1);
          let currentX = xPosition;
          words.forEach((word, idx) => {
            doc.text(word, currentX, yPosition);
            currentX += doc.getTextWidth(word) + (idx < words.length - 1 ? spaceWidth : 0);
          });
          yPosition += lineHeight;
          continue;
        }
      }
      
      doc.text(line, finalX, yPosition);
      
      if (token.isUnderline) {
        const textWidth = doc.getTextWidth(line);
        doc.setLineWidth(0.2);
        doc.line(finalX, yPosition + 1, finalX + textWidth, yPosition + 1);
      }
      
      yPosition += lineHeight;
    }
  }

  // Generar nombre de archivo limpio
  const fileName = cleanTitle
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);

  // Descargar el PDF
  doc.save(`${fileName}.pdf`);
};
