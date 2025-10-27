import jsPDF from "jspdf";

// Función para limpiar texto HTML y markdown
export const cleanTextForPDF = (html: string): string => {
  // Crear un elemento temporal para procesar HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Obtener texto plano
  let text = temp.textContent || temp.innerText || "";

  // Limpiar caracteres especiales problemáticos
  text = text
    .replace(/[\u2018\u2019]/g, "'") // Comillas simples curvas
    .replace(/[\u201C\u201D]/g, '"') // Comillas dobles curvas
    .replace(/[\u2013\u2014]/g, "-") // Guiones largos
    .replace(/[\u2026]/g, "...") // Puntos suspensivos
    .replace(/[\u00A0]/g, " ") // Espacios no separables
    .replace(/[\u2022]/g, "-") // Bullets
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

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

    // Verificar si es un título (líneas cortas o que empiezan con números)
    const isTitle = paragraph.length < 100 && 
                    (paragraph.match(/^\d+\./) || paragraph.match(/^[A-Z\s]+$/));

    if (isTitle) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
    }

    // Dividir el párrafo en líneas que quepan en el ancho de página
    const lines = doc.splitTextToSize(paragraph, maxWidth);

    for (const line of lines) {
      // Verificar si necesitamos una nueva página
      if (yPosition + 7 > maxHeight + margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.text(line, margin, yPosition);
      yPosition += 7;
    }

    // Espacio entre párrafos
    yPosition += 3;
  }

  // Generar nombre de archivo limpio
  const fileName = cleanTitle
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 50);

  // Descargar el PDF
  doc.save(`${fileName}.pdf`);
};
