import jsPDF from "jspdf";

// Configuración de márgenes y dimensiones - Layout elegante
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297; // mm (A4)
const MARGIN_LEFT = 20; // mm - Margen izquierdo elegante
const MARGIN_RIGHT = 20; // mm - Margen derecho simétrico
const MARGIN_TOP = 15; // mm - Margen superior moderno
const MARGIN_BOTTOM = 25; // mm - Margen inferior
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // Ancho disponible para contenido
const HEADER_HEIGHT = 15; // mm - Header más amplio
const FOOTER_HEIGHT = 20; // mm

// Paleta de colores corporativa - Consistente con documentPreviewStyles.ts
const COLORS = {
  primary: [3, 114, 232], // #0372E8 - Azul corporativo
  primaryDark: [3, 114, 232], // #0372E8 - Mismo azul para headings (consistente con preview)
  accent: [3, 114, 232], // Azul corporativo para líneas de énfasis
  text: [40, 40, 40], // #282828 - Gris oscuro para texto principal
  textLight: [100, 100, 100], // Gris medio para texto secundario
  divider: [204, 204, 204], // #cccccc - Consistente con lightGray del preview
  white: [255, 255, 255],
};

// Header eliminado para máxima limpieza - diseño minimalista sin elementos superiores

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
  textAlign?: "left" | "center" | "right" | "justify";
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
    return [parseInt(hexMatch[1], 16), parseInt(hexMatch[2], 16), parseInt(hexMatch[3], 16)];
  }

  // Formato #hex corto
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
/*
const processHtmlContent = (html: string): ContentToken[] => {
  const tokens: ContentToken[] = [];

  // Crear un elemento temporal para parsear HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstChild as HTMLElement;

  if (!container) return tokens;

  // Función recursiva para procesar nodos
  const processNode = (node: Node, parentFormat: Partial<ContentToken> = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text.trim()) {
        // Preservar saltos de línea y espacios
        const lines = text.split("\n");
        lines.forEach((line, index) => {
          if (line || index < lines.length - 1) {
            tokens.push({
              text: line,
              ...parentFormat,
            });
            if (index < lines.length - 1) {
              tokens.push({ text: "\n" });
            }
          }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Determinar formato basado en la etiqueta
      const format: Partial<ContentToken> = { ...parentFormat };

      // Detectar alineación por clases de ReactQuill
      const className = element.className || '';
      if (className.includes('ql-align-center')) format.textAlign = 'center';
      else if (className.includes('ql-align-right')) format.textAlign = 'right';
      else if (className.includes('ql-align-justify')) format.textAlign = 'justify';

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

        // Extraer color
        if (styles.color) {
          format.color = styles.color;
        }

        // Extraer font-size
        if (styles["font-size"]) {
          const size = parseFontSize(styles["font-size"]);
          if (size) format.fontSize = size;
        }

        // Extraer text-align (sobrescribe clases si hay estilo inline)
        if (styles["text-align"]) {
          format.textAlign = styles["text-align"] as any;
        }

        // Extraer background-color
        if (styles["background-color"]) {
          format.backgroundColor = styles["background-color"];
        }
      }

      // Formato por etiqueta
      if (tagName === "strong" || tagName === "b") {
        format.isBold = true;
      } else if (tagName === "em" || tagName === "i") {
        format.isItalic = true;
      } else if (tagName === "u") {
        format.isUnderline = true;
      } else if (tagName.match(/^h[1-6]$/)) {
        format.isHeading = parseInt(tagName[1]);
      } else if (tagName === "li") {
        format.isList = true;
        const parentList = element.parentElement;
        format.isOrderedList = parentList?.tagName.toLowerCase() === "ol";
      } else if (tagName === "p" || tagName === "div") {
        // Agregar salto de línea antes de párrafos (excepto el primero)
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n" });
        }
      } else if (tagName === "br") {
        tokens.push({ text: "\n" });
        return;
      }

      // Procesar hijos recursivamente
      element.childNodes.forEach((child) => processNode(child, format));

      // Agregar salto de línea después de ciertos elementos
      if (tagName.match(/^h[1-6]$/) || tagName === "p" || tagName === "li") {
        if (tokens.length === 0 || tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n" });
        }
      }
    }
  };

  container.childNodes.forEach((node) => processNode(node));

  return tokens;
};
*/

const processHtmlContent = (html: string): ContentToken[] => {
  const tokens: ContentToken[] = [];

  // Limpieza previa del HTML para eliminar parrafos vacios redundantes que generan saltos dobles
  // Reemplaza <p><br></p> por <br> para simplificar el tokenizado
  const cleanHtml = html.replace(/<p[^>]*>\s*<br\s*\/?>\s*<\/p>/gi, "<br>");

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${cleanHtml}</div>`, "text/html");
  const container = doc.body.firstChild as HTMLElement;

  if (!container) return tokens;

  const processNode = (node: Node, parentFormat: Partial<ContentToken> = {}) => {
    // Caso especial: Saltos de línea explícitos
    if (node.nodeName.toLowerCase() === "br") {
      // Solo agregar salto si el último token no es ya un salto (evitar dobles saltos accidentales)
      if (tokens.length === 0 || tokens[tokens.length - 1].text !== "\n") {
        tokens.push({ text: "\n" });
      }
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text !== "\n") {
        // Ignoramos saltos de línea puros del editor de código
        tokens.push({
          text: text, // No hacemos trim() completo para respetar espacios entre palabras
          ...parentFormat,
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      const format: Partial<ContentToken> = { ...parentFormat };

      // ... (Mismo código de extracción de estilos que tenías antes: class, style, color, etc.) ...
      const className = element.className || "";
      if (className.includes("ql-align-center")) format.textAlign = "center";
      else if (className.includes("ql-align-right")) format.textAlign = "right";
      else if (className.includes("ql-align-justify")) format.textAlign = "justify";

      const style = element.getAttribute("style");
      if (style) {
        // ... (Tu lógica existente de parseo de estilos styles.color, font-size, etc.) ...
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
        if (styles["text-align"]) format.textAlign = styles["text-align"] as any;
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
        // Agregar salto antes del item si no es el primero
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n" });
        }
      }

      // Procesar hijos
      element.childNodes.forEach((child) => processNode(child, format));

      // Bloques que fuerzan salto de línea al final
      const blockTags = ["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li"];
      if (blockTags.includes(tagName)) {
        // Solo agregar salto si no existe ya uno al final
        if (tokens.length > 0 && tokens[tokens.length - 1].text !== "\n") {
          tokens.push({ text: "\n" });
        }
      }
    }
  };

  container.childNodes.forEach((node) => processNode(node));
  return tokens;
};

/*
// Función para renderizar tokens en PDF con soporte de estilos inline
const renderTokensInPDF = (
  doc: jsPDF,
  tokens: ContentToken[],
  startY: number,
  documentData: any,
  startPageNumber: number,
): { currentY: number; pageNumber: number } => {
  let currentY = startY;
  let pageNumber = startPageNumber;
  let listCounter = 0;
  let currentParagraphAlign: "left" | "center" | "right" | "justify" = "left";

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
      currentY = MARGIN_TOP;
      listCounter = 0;
    }

    // Configurar fuente según formato - Times New Roman para cuerpo (consistente con preview)
    if (token.isHeading) {
      // Headings usan Helvetica con color azul corporativo
      doc.setFont("helvetica", "bold");
      const headingSizes = [16, 14, 13, 12, 11, 10];
      doc.setFontSize(headingSizes[token.isHeading - 1] || 11);
      doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    } else {
      // Cuerpo usa Times para consistencia con documentPreviewStyles.ts
      let fontFamily: "helvetica" | "times" = "times";
      let fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal";

      if (token.isBold && token.isItalic) fontStyle = "bolditalic";
      else if (token.isBold) fontStyle = "bold";
      else if (token.isItalic) fontStyle = "italic";

      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(token.fontSize || 12); // 12pt consistente con preview

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
    if (token.text === "\n") {
      currentY += lineHeight;
      listCounter = 0;
      currentParagraphAlign = "left"; // Reset alignment
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
      const bullet = token.isOrderedList ? `${listCounter}. ` : "• ";
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
        currentY = MARGIN_TOP;
      }

      // Calcular posición X según alineación
      let finalXPosition = xPosition;
      const lineWidth = doc.getTextWidth(line);

      if (currentParagraphAlign === "center") {
        finalXPosition = MARGIN_LEFT + (CONTENT_WIDTH - lineWidth) / 2;
      } else if (currentParagraphAlign === "right") {
        finalXPosition = PAGE_WIDTH - MARGIN_RIGHT - lineWidth;
      } else if (currentParagraphAlign === "justify" && lineIndex < lines.length - 1) {
        // Justificación solo para líneas que no son la última
        const words = line.split(" ");
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
*/

const renderTokensInPDF = (
  doc: jsPDF,
  tokens: ContentToken[],
  startY: number,
  documentData: any,
  startPageNumber: number,
): { currentY: number; pageNumber: number } => {
  let currentY = startY;
  let pageNumber = startPageNumber;
  let listCounter = 0;
  let currentParagraphAlign: "left" | "center" | "right" | "justify" = "left";

  // Altura segura del footer
  const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.textAlign) currentParagraphAlign = token.textAlign;

    const baseFontSize = token.fontSize || (token.isHeading ? 14 : 12); // Ajustado heading default a 14
    const lineHeight = baseFontSize * 0.45; // Reducido ligeramente el factor de interlineado (más compacto)

    // --- LÓGICA DE PROTECCIÓN DE FIRMA (Lookahead) ---
    // Si estamos cerca del final y detectamos líneas cortas consecutivas (firma),
    // intentamos saltar página antes para que no queden cortadas.
    const remainingSpace = SAFE_BOTTOM - currentY;

    // Si queda poco espacio (menos de 40mm) y este token parece ser el inicio de un bloque de firma
    // (Texto corto, negrita o mayúsculas, cerca del final del documento)
    const isEndBlock = i > tokens.length - 10; // Estamos en los últimos 10 tokens
    if (remainingSpace < 40 && remainingSpace > 0 && isEndBlock && token.text !== "\n") {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      currentY = MARGIN_TOP;
    }
    // ------------------------------------------------

    // Verificación estándar de salto de página
    if (currentY + lineHeight > SAFE_BOTTOM) {
      addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
      doc.addPage();
      pageNumber++;
      currentY = MARGIN_TOP;
      listCounter = 0;
    }

    // Configuración de fuentes (Igual que tu código original)
    if (token.isHeading) {
      doc.setFont("helvetica", "bold");
      const headingSizes = [16, 14, 13, 12, 11, 10];
      doc.setFontSize(headingSizes[token.isHeading - 1] || 12);
      doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
    } else {
      let fontFamily: "helvetica" | "times" = "times";
      let fontStyle: "normal" | "bold" | "italic" | "bolditalic" = "normal";
      if (token.isBold && token.isItalic) fontStyle = "bolditalic";
      else if (token.isBold) fontStyle = "bold";
      else if (token.isItalic) fontStyle = "italic";

      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(token.fontSize || 12);

      if (token.color) {
        const rgb = parseColor(token.color);
        if (rgb) doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        else doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      } else {
        doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      }
    }

    // Procesar salto de línea
    if (token.text === "\n") {
      // Si el salto de línea es muy "alto", podemos reducirlo si es un espacio vacío decorativo
      currentY += lineHeight;
      listCounter = 0;
      currentParagraphAlign = "left";
      continue;
    }

    if (!token.text.trim()) continue;

    let textToRender = token.text;
    let xPosition = MARGIN_LEFT;

    if (token.isList) {
      listCounter++;
      const bullet = token.isOrderedList ? `${listCounter}. ` : "• ";
      textToRender = bullet + textToRender;
      xPosition = MARGIN_LEFT + 5;
    }

    const maxWidth = CONTENT_WIDTH - (token.isList ? 5 : 0);
    const lines = doc.splitTextToSize(textToRender, maxWidth);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      if (currentY + lineHeight > SAFE_BOTTOM) {
        addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);
        doc.addPage();
        pageNumber++;
        currentY = MARGIN_TOP;
      }

      let finalXPosition = xPosition;
      const lineWidth = doc.getTextWidth(line);

      // Lógica de alineación
      if (currentParagraphAlign === "center") {
        finalXPosition = MARGIN_LEFT + (CONTENT_WIDTH - lineWidth) / 2;
      } else if (currentParagraphAlign === "right") {
        finalXPosition = PAGE_WIDTH - MARGIN_RIGHT - lineWidth;
      } else if (currentParagraphAlign === "justify" && lineIndex < lines.length - 1) {
        // (Tu lógica de justificación existente se mantiene igual)
        const words = line.split(" ");
        if (words.length > 1) {
          const totalSpaceWidth = maxWidth - words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
          const spaceWidth = totalSpaceWidth / (words.length - 1);
          let currentX = xPosition;
          words.forEach((word, idx) => {
            doc.text(word, currentX, currentY);
            if (idx < words.length - 1) currentX += doc.getTextWidth(word) + spaceWidth;
          });
          if (token.isUnderline) {
            doc.setLineWidth(0.2);
            doc.line(xPosition, currentY + 1, xPosition + maxWidth, currentY + 1);
          }
          currentY += lineHeight;
          continue;
        }
      }

      doc.text(line, finalXPosition, currentY);
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
    const doc = new jsPDF("p", "mm", "a4");
    let pageNumber = 1;

    // Configurar fuente predeterminada - Times New Roman para documentos legales
    doc.setFont("times", "normal");
    doc.setFontSize(12);

    // Diseño ultra limpio: sin header, sin título - el contenido empieza directamente
    let currentY = MARGIN_TOP;

    // Procesar contenido HTML
    const content = documentData.document_content || "Contenido del documento no disponible.";
    const tokens = processHtmlContent(content);

    // Renderizar tokens en PDF
    const result = renderTokensInPDF(doc, tokens, currentY, documentData, pageNumber);
    pageNumber = result.pageNumber;

    // Añadir pie de página a la última página
    addFooter(doc, documentData.token, documentData.reviewed_by_lawyer_name);

    // Generar nombre de archivo
    const sanitizedDocType =
      documentData.document_type?.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "Documento";
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
