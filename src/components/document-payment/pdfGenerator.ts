import jsPDF from "jspdf";

// Configuración de márgenes y dimensiones - Layout elegante
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297; // mm (A4)
const MARGIN_LEFT = 20; // mm - Margen izquierdo elegante
const MARGIN_RIGHT = 20; // mm - Margen derecho simétrico
const MARGIN_TOP = 15; // mm - Margen superior moderno
const MARGIN_BOTTOM = 25; // mm - Margen inferior
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Ancho disponible para contenido
const FOOTER_HEIGHT = 20; // mm

// Paleta de colores corporativa - Consistente con documentPreviewStyles.ts
const COLORS = {
  primary: [3, 114, 232] as [number, number, number], // #0372E8 - Azul corporativo
  primaryDark: [3, 114, 232] as [number, number, number], // #0372E8 - Mismo azul para headings
  text: [40, 40, 40] as [number, number, number], // #282828 - Gris oscuro para texto principal
  textLight: [100, 100, 100] as [number, number, number], // Gris medio para texto secundario
  divider: [204, 204, 204] as [number, number, number], // #cccccc - Consistente con lightGray del preview
};

// Altura segura del footer
const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;

const addFooter = (doc: jsPDF, token: string, reviewedByLawyer?: string) => {
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 3;

  // Línea decorativa superior elegante
  doc.setDrawColor(COLORS.divider[0], COLORS.divider[1], COLORS.divider[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);

  // Primera línea: Token (izquierda) y Revisado por (derecha)
  doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Token: ${token}`, MARGIN_LEFT, footerY + 5);

  if (reviewedByLawyer) {
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const reviewText = `Revisado por: ${reviewedByLawyer}`;
    const reviewTextWidth = doc.getTextWidth(reviewText);
    doc.text(reviewText, PAGE_WIDTH - MARGIN_RIGHT - reviewTextWidth, footerY + 5);
  }

  // Segunda línea: Sitio web centrado
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const webText = "www.tuconsultorlegal.co";
  const webTextWidth = doc.getTextWidth(webText);
  doc.text(webText, (PAGE_WIDTH - webTextWidth) / 2, footerY + 11);
};

// Interfaz para tokens de contenido con estilos inline
interface ContentToken {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isHeading?: number;
  isList?: boolean;
  isOrderedList?: boolean;
  listLevel?: number;
  color?: string;
  fontSize?: number;
  textAlign?: "left" | "center" | "right" | "justify";
  backgroundColor?: string;
  paragraphId?: number; // Para agrupar tokens del mismo párrafo
}

// Interfaz para segmentos de texto con estilo
interface StyledSegment {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  color?: [number, number, number];
}

// Función para parsear color RGB a array [r, g, b]
const parseColor = (color: string): [number, number, number] | null => {
  if (!color) return null;

  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  const hexMatch = color.match(/#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (hexMatch) {
    return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
  }

  const hexShortMatch = color.match(/#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/);
  if (hexShortMatch) {
    return [
      parseInt(hexShortMatch[1] + hexShortMatch[1], 16),
      parseInt(hexShortMatch[2] + hexShortMatch[2], 16),
      parseInt(hexShortMatch[3] + hexShortMatch[3], 16),
    ];
  }

  return null;
};

// Función para parsear font-size a puntos
const parseFontSize = (fontSize: string): number | null => {
  if (!fontSize) return null;

  const pxMatch = fontSize.match(/(\d+)px/);
  if (pxMatch) {
    return parseInt(pxMatch[1]) * 0.75;
  }

  const ptMatch = fontSize.match(/(\d+)pt/);
  if (ptMatch) {
    return parseInt(ptMatch[1]);
  }

  return null;
};

// Procesar HTML y extraer tokens con formato y paragraphId
const processHtmlContent = (html: string): ContentToken[] => {
  const tokens: ContentToken[] = [];
  let currentParagraphId = 0;

  // Limpieza previa del HTML - preservar espaciados vacíos
  // Convertir <p><br></p> a un marcador especial que indica párrafo vacío
  const cleanHtml = html.replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, "<p class=\"empty-paragraph\">&nbsp;</p>");

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${cleanHtml}</div>`, "text/html");
  const container = doc.body.firstChild as HTMLElement;

  if (!container) return tokens;

  const processNode = (node: Node, parentFormat: Partial<ContentToken> = {}) => {
    if (node.nodeName.toLowerCase() === "br") {
      // Siempre agregar salto de línea para preservar espaciado
      tokens.push({ text: "\n", paragraphId: currentParagraphId });
      currentParagraphId++;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text !== "\n") {
        tokens.push({
          text: text,
          ...parentFormat,
          paragraphId: currentParagraphId,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const format: Partial<ContentToken> = { ...parentFormat };

      // Detectar alineación por clases de ReactQuill
      const className = element.className || "";
      if (className.includes("ql-align-center")) format.textAlign = "center";
      else if (className.includes("ql-align-right")) format.textAlign = "right";
      else if (className.includes("ql-align-justify")) format.textAlign = "justify";

      // Parsear estilos inline
      const style = element.getAttribute("style");
      if (style) {
        const styles = style.split(";").reduce(
          (acc, s) => {
            const [key, value] = s.split(":").map((v) => v.trim());
            if (key && value) acc[key] = value;
            return acc;
          },
          {} as Record<string, string>,
        );
        if (styles.color) format.color = styles.color;
        if (styles["font-size"]) {
          const size = parseFontSize(styles["font-size"]);
          if (size) format.fontSize = size;
        }
        if (styles["text-align"]) format.textAlign = styles["text-align"] as "left" | "center" | "right" | "justify";
      }

      if (tagName === "strong" || tagName === "b") format.isBold = true;
      if (tagName === "em" || tagName === "i") format.isItalic = true;
      if (tagName === "u") format.isUnderline = true;
      if (tagName.match(/^h[1-6]$/)) format.isHeading = parseInt(tagName[1]);

      // Manejo de listas
      if (tagName === "li") {
        format.isList = true;
        const parentList = element.parentElement;
        format.isOrderedList = parentList?.tagName.toLowerCase() === "ol";
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n", paragraphId: currentParagraphId });
        }
      }

      // Incrementar paragraphId para bloques
      const blockTags = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li"];
      if (blockTags.includes(tagName)) {
        currentParagraphId++;
      }

      // Procesar hijos
      element.childNodes.forEach((child) => processNode(child, format));

      // Salto de línea después de bloques
      if (blockTags.includes(tagName)) {
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n", paragraphId: currentParagraphId });
        }
        currentParagraphId++;
      }
    }
  };

  container.childNodes.forEach((node) => processNode(node));
  return tokens;
};

// Agrupar tokens por párrafo
interface Paragraph {
  tokens: ContentToken[];
  textAlign: "left" | "center" | "right" | "justify";
  isHeading?: number;
  isList?: boolean;
  isOrderedList?: boolean;
}

const groupTokensByParagraph = (tokens: ContentToken[]): Paragraph[] => {
  const paragraphs: Paragraph[] = [];
  let currentParagraph: ContentToken[] = [];
  let lastParagraphId: number | undefined;

  for (const token of tokens) {
    if (token.text === "\n") {
      if (currentParagraph.length > 0) {
        // Default: justify si no hay alineación explícita (el abogado puede sobrescribir)
        const textAlign = currentParagraph.find((t) => t.textAlign)?.textAlign || "justify";
        const isHeading = currentParagraph.find((t) => t.isHeading)?.isHeading;
        const isList = currentParagraph.some((t) => t.isList);
        const isOrderedList = currentParagraph.some((t) => t.isOrderedList);
        paragraphs.push({ tokens: currentParagraph, textAlign, isHeading, isList, isOrderedList });
        currentParagraph = [];
      }
      // Añadir párrafo vacío para preservar espaciado
      paragraphs.push({ tokens: [], textAlign: "left" });
      lastParagraphId = undefined;
      continue;
    }

    // Si cambia el paragraphId, empezar nuevo párrafo
    if (lastParagraphId !== undefined && token.paragraphId !== lastParagraphId && currentParagraph.length > 0) {
      // Default: justify si no hay alineación explícita
      const textAlign = currentParagraph.find((t) => t.textAlign)?.textAlign || "justify";
      const isHeading = currentParagraph.find((t) => t.isHeading)?.isHeading;
      const isList = currentParagraph.some((t) => t.isList);
      const isOrderedList = currentParagraph.some((t) => t.isOrderedList);
      paragraphs.push({ tokens: currentParagraph, textAlign, isHeading, isList, isOrderedList });
      currentParagraph = [];
    }

    currentParagraph.push(token);
    lastParagraphId = token.paragraphId;
  }

  // Añadir último párrafo
  if (currentParagraph.length > 0) {
    // Default: justify si no hay alineación explícita
    const textAlign = currentParagraph.find((t) => t.textAlign)?.textAlign || "justify";
    const isHeading = currentParagraph.find((t) => t.isHeading)?.isHeading;
    const isList = currentParagraph.some((t) => t.isList);
    const isOrderedList = currentParagraph.some((t) => t.isOrderedList);
    paragraphs.push({ tokens: currentParagraph, textAlign, isHeading, isList, isOrderedList });
  }

  return paragraphs;
};

// Crear segmentos con estilo para una línea de texto a partir del texto de la línea
const createStyledSegmentsFromLineText = (tokens: ContentToken[], lineText: string): StyledSegment[] => {
  const segments: StyledSegment[] = [];
  
  // Concatenamos todo el texto de los tokens para buscar dónde está lineText
  const fullText = tokens.map(t => t.text).join('');
  
  // Encontrar dónde empieza lineText en fullText (puede haber variaciones menores de espacios)
  // Usamos una búsqueda más flexible
  let lineStartInFull = fullText.indexOf(lineText);
  
  // Si no encontramos exacto, buscar sin espacios extra
  if (lineStartInFull === -1) {
    // Intentar encontrar la posición aproximada basándonos en palabras
    const lineWords = lineText.trim().split(/\s+/);
    if (lineWords.length > 0) {
      const firstWord = lineWords[0];
      const lastWord = lineWords[lineWords.length - 1];
      const firstIdx = fullText.indexOf(firstWord);
      if (firstIdx !== -1) {
        lineStartInFull = firstIdx;
      }
    }
  }
  
  if (lineStartInFull === -1) {
    // Fallback: renderizar todo como texto normal
    return [{ text: lineText, isBold: false, isItalic: false, isUnderline: false }];
  }
  
  const lineEndInFull = lineStartInFull + lineText.length;
  
  // Ahora recorrer los tokens y extraer los segmentos correspondientes
  let charCount = 0;
  let lineCharIdx = 0;
  
  for (const token of tokens) {
    const tokenStart = charCount;
    const tokenEnd = charCount + token.text.length;
    
    // Si el token está dentro del rango de la línea
    if (tokenEnd > lineStartInFull && tokenStart < lineEndInFull) {
      const segmentStartInToken = Math.max(0, lineStartInFull - tokenStart);
      const segmentEndInToken = Math.min(token.text.length, lineEndInFull - tokenStart);
      const text = token.text.substring(segmentStartInToken, segmentEndInToken);
      
      if (text) {
        segments.push({
          text,
          isBold: token.isBold,
          isItalic: token.isItalic,
          isUnderline: token.isUnderline,
          color: token.color ? parseColor(token.color) || undefined : undefined,
        });
        lineCharIdx += text.length;
      }
    }
    
    charCount += token.text.length;
  }
  
  // Verificar que cubrimos toda la línea
  const segmentText = segments.map(s => s.text).join('');
  if (segmentText.length < lineText.length && segments.length > 0) {
    // Hay caracteres faltantes, ajustar el último segmento o agregar uno nuevo
    const missing = lineText.substring(segmentText.length);
    if (missing.trim()) {
      const lastStyle = segments[segments.length - 1];
      segments.push({
        text: missing,
        isBold: lastStyle?.isBold || false,
        isItalic: lastStyle?.isItalic || false,
        isUnderline: lastStyle?.isUnderline || false,
        color: lastStyle?.color,
      });
    }
  }
  
  return segments;
};

// Renderizar una línea con múltiples estilos
const renderMixedLine = (
  doc: jsPDF,
  segments: StyledSegment[],
  x: number,
  y: number,
  fontSize: number,
  isHeading: boolean,
): number => {
  let currentX = x;

  for (const segment of segments) {
    // Configurar estilo
    if (isHeading) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    } else {
      let fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal";
      if (segment.isBold && segment.isItalic) fontStyle = "bolditalic";
      else if (segment.isBold) fontStyle = "bold";
      else if (segment.isItalic) fontStyle = "italic";

      doc.setFont("times", fontStyle);

      if (segment.color) {
        doc.setTextColor(segment.color[0], segment.color[1], segment.color[2]);
      } else {
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      }
    }

    doc.setFontSize(fontSize);
    doc.text(segment.text, currentX, y);

    const segmentWidth = doc.getTextWidth(segment.text);

    // Subrayado
    if (segment.isUnderline) {
      doc.setLineWidth(0.2);
      doc.setDrawColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.line(currentX, y + 1, currentX + segmentWidth, y + 1);
    }

    currentX += segmentWidth;
  }

  return currentX - x; // Retorna el ancho total renderizado
};

// Renderizar párrafos en PDF con texto continuo
const renderParagraphsInPDF = (
  doc: jsPDF,
  paragraphs: Paragraph[],
  startY: number,
  documentData: any,
  startPageNumber: number,
): { currentY: number; pageNumber: number } => {
  let currentY = startY;
  let pageNumber = startPageNumber;
  let listCounter = 0;

  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx];

    // Párrafo vacío = espaciado (una línea de altura reducida)
    if (paragraph.tokens.length === 0) {
      currentY += 4; // Espacio entre párrafos más compacto
      continue;
    }

    const fontSize = paragraph.isHeading ? [16, 14, 13, 12, 11, 10][paragraph.isHeading - 1] || 12 : 12;
    const lineHeight = fontSize * 0.38; // Reducido de 0.45 para espaciado más compacto

    // Concatenar todo el texto del párrafo
    const fullText = paragraph.tokens.map((t) => t.text).join("");
    
    // Si el párrafo solo contiene espacios o &nbsp;, tratarlo como espaciado
    const trimmedText = fullText.replace(/\u00A0/g, '').trim(); // \u00A0 es &nbsp;
    if (!trimmedText) {
      currentY += lineHeight; // Espacio de una línea
      continue;
    }

    // Calcular ancho disponible
    let bulletPrefix = "";
    let xOffset = 0;
    if (paragraph.isList) {
      listCounter++;
      bulletPrefix = paragraph.isOrderedList ? `${listCounter}. ` : "• ";
      xOffset = 5;
    } else {
      listCounter = 0;
    }

    const maxWidth = CONTENT_WIDTH - xOffset;

    // Configurar fuente para calcular splitTextToSize
    if (paragraph.isHeading) {
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("times", "normal");
    }
    doc.setFontSize(fontSize);

    // Dividir texto en líneas
    const textWithBullet = bulletPrefix + fullText;
    const lines: string[] = doc.splitTextToSize(textWithBullet, maxWidth);
    const totalLinesHeight = lines.length * lineHeight;

    // --- LÓGICA INTELIGENTE DE PAGINACIÓN ---
    const remainingSpace = SAFE_BOTTOM - currentY;

    // Detectar si es un bloque de firma (últimos párrafos, líneas cortas)
    const isNearEnd = pIdx > paragraphs.length - 8;
    const isShortParagraph = fullText.length < 50;
    const looksLikeSignature =
      isNearEnd && isShortParagraph && (paragraph.tokens.some((t) => t.isBold) || /^[A-ZÁÉÍÓÚ\s]+$/.test(fullText.trim()));

    // Si es un heading y queda poco espacio, saltar página
    if (paragraph.isHeading && remainingSpace < 40) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      currentY = MARGIN_TOP;
    }
    // Si parece firma y no cabe completo, saltar página
    else if (looksLikeSignature && totalLinesHeight > remainingSpace) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      currentY = MARGIN_TOP;
    }
    // Evitar huérfanas: si solo cabe 1 línea de 3+, mover todo
    else if (lines.length >= 3 && remainingSpace > lineHeight && remainingSpace < lineHeight * 2) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      currentY = MARGIN_TOP;
    }

    // Renderizar cada línea
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // Verificar espacio
      if (currentY + lineHeight > SAFE_BOTTOM) {
        addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
        doc.addPage();
        pageNumber++;
        currentY = MARGIN_TOP;
      }

      // Calcular posición X y segmentos de la línea
      let lineX = MARGIN_LEFT + xOffset;
      const lineWidth = doc.getTextWidth(line);

      // Alineación
      if (paragraph.textAlign === "center") {
        lineX = MARGIN_LEFT + (CONTENT_WIDTH - lineWidth) / 2;
      } else if (paragraph.textAlign === "right") {
        lineX = PAGE_WIDTH - MARGIN_RIGHT - lineWidth;
      } else if (paragraph.textAlign === "justify" && lineIdx < lines.length - 1) {
        // Justificar (solo si no es la última línea)
        const words = line.split(" ");
        if (words.length > 1) {
          const wordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
          const totalSpaceWidth = maxWidth - wordsWidth;
          const spaceWidth = totalSpaceWidth / (words.length - 1);

          let currentX = MARGIN_LEFT + xOffset;

          for (let wIdx = 0; wIdx < words.length; wIdx++) {
            const word = words[wIdx];

            // Obtener segmentos para esta palabra usando el nuevo método
            const segments = createStyledSegmentsFromLineText(paragraph.tokens, word);

            if (segments.length > 0) {
              renderMixedLine(doc, segments, currentX, currentY, fontSize, !!paragraph.isHeading);
            } else {
              // Fallback: renderizar palabra normal
              if (paragraph.isHeading) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
              } else {
                doc.setFont("times", "normal");
                doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
              }
              doc.setFontSize(fontSize);
              doc.text(word, currentX, currentY);
            }

            if (wIdx < words.length - 1) {
              currentX += doc.getTextWidth(word) + spaceWidth;
            }
          }

          currentY += lineHeight;
          continue;
        }
      }

      // Renderizado normal (no justificado) con estilos mixtos
      // Si es la primera línea, renderizar bullet primero
      if (lineIdx === 0 && bulletPrefix) {
        if (paragraph.isHeading) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
        } else {
          doc.setFont("times", "normal");
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        }
        doc.setFontSize(fontSize);
        doc.text(bulletPrefix, lineX, currentY);
        lineX += doc.getTextWidth(bulletPrefix);
      }

      // Obtener segmentos con estilo para la línea actual usando el texto de la línea
      const actualLineText = lineIdx === 0 ? line.substring(bulletPrefix.length) : line;
      const segments = createStyledSegmentsFromLineText(paragraph.tokens, actualLineText);

      if (segments.length > 0) {
        renderMixedLine(doc, segments, lineX, currentY, fontSize, !!paragraph.isHeading);
      } else {
        // Fallback si no hay segmentos
        if (paragraph.isHeading) {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
        } else {
          doc.setFont("times", "normal");
          doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
        }
        doc.setFontSize(fontSize);
        doc.text(actualLineText, lineX, currentY);
      }

      currentY += lineHeight;
    }
  }

  return { currentY, pageNumber };
};

export const generatePDFDownload = (documentData: any, toast?: (options: any) => void) => {
  try {
    const doc = new jsPDF("p", "mm", "a4");
    let pageNumber = 1;

    doc.setFont("times", "normal");
    doc.setFontSize(12);

    let currentY = MARGIN_TOP;

    const content = documentData.document_content || "Contenido del documento no disponible.";
    
    const tokens = processHtmlContent(content);
    const paragraphs = groupTokensByParagraph(tokens);

    const result = renderParagraphsInPDF(doc, paragraphs, currentY, documentData, pageNumber);
    pageNumber = result.pageNumber;

    addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);

    const sanitizedDocType =
      documentData.document_type?.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "Documento";
    const fileName = `${sanitizedDocType}_${documentData.token}.pdf`;

    doc.save(fileName);

    if (toast) {
      toast({
        title: "¡Descarga exitosa!",
        description: `El documento "${documentData.document_type}" se ha descargado correctamente con formato profesional.`,
      });
    }

    return true;
  } catch (error) {
    console.error("Error generando PDF:", error);
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
