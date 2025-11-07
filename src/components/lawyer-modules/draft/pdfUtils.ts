import jsPDF from "jspdf";

// Función para limpiar y preservar formato de texto HTML
export const cleanTextForPDF = (html: string): string => {
  // Crear un elemento temporal para procesar HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Procesar el HTML manteniendo la estructura básica
  let text = html
    // Primero convertir listas a formato legible
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    // Convertir encabezados
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n')
    // Convertir párrafos
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // Convertir saltos de línea
    .replace(/<br\s*\/?>/gi, '\n')
    // Preservar negritas y cursivas con marcadores temporales
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    // Eliminar el resto de etiquetas HTML
    .replace(/<[^>]+>/g, '')
    // Limpiar entidades HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Limpiar caracteres especiales problemáticos
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0]/g, " ")
    // Limpiar múltiples espacios y saltos de línea
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  return text;
};

// Función para generar PDF con formato
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

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const cleanTitle = cleanTextForPDF(title);
  doc.text(cleanTitle, margin, yPosition);
  yPosition += 10;

  // Línea separadora
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Contenido
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  // Limpiar y procesar el contenido
  const cleanContent = cleanTextForPDF(content);
  
  // Dividir por párrafos
  const paragraphs = cleanContent.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    // Detectar negritas marcadas con **
    const hasBold = paragraph.includes('**');
    
    // Verificar si es un título (líneas cortas o que empiezan con números)
    const isTitle = paragraph.length < 100 && 
                    (paragraph.match(/^\d+\./) || paragraph.match(/^[A-Z\s]+$/) || paragraph.match(/^\*\*/));

    if (isTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      const cleanTitle = paragraph.replace(/\*\*/g, '');
      const lines = doc.splitTextToSize(cleanTitle, maxWidth);
      
      for (const line of lines) {
        if (yPosition + 8 > maxHeight + margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 8;
      }
      yPosition += 4;
    } else if (hasBold) {
      // Manejar texto mixto con negritas
      const parts = paragraph.split(/(\*\*.*?\*\*)/g);
      doc.setFontSize(11);
      
      for (const part of parts) {
        if (!part) continue;
        
        if (part.startsWith('**') && part.endsWith('**')) {
          // Texto en negrita
          doc.setFont("helvetica", "bold");
          const boldText = part.replace(/\*\*/g, '');
          const lines = doc.splitTextToSize(boldText, maxWidth);
          
          for (const line of lines) {
            if (yPosition + 7 > maxHeight + margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 7;
          }
        } else {
          // Texto normal
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(part, maxWidth);
          
          for (const line of lines) {
            if (yPosition + 7 > maxHeight + margin) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(line, margin, yPosition);
            yPosition += 7;
          }
        }
      }
      yPosition += 3;
    } else {
      // Texto normal sin formato especial
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(paragraph, maxWidth);

      for (const line of lines) {
        if (yPosition + 7 > maxHeight + margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition, { align: 'justify', maxWidth: maxWidth });
        yPosition += 7;
      }
      yPosition += 3;
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
