import jsPDF from 'jspdf';

const addHeader = (doc: jsPDF, pageNumber: number) => {
  // Header background - Navy blue stripe
  doc.setFillColor(23, 37, 84); // Navy blue from design system
  doc.rect(0, 0, 210, 25, 'F');
  
  // Company name in white
  doc.setTextColor(255, 255, 255);
  doc.setFont('Arial', 'bold');
  doc.setFontSize(16);
  doc.text('Tu Consultor Legal', 20, 16);
  
  // Tagline in light blue
  doc.setTextColor(59, 130, 246); // Light blue
  doc.setFont('Arial', 'normal');
  doc.setFontSize(10);
  doc.text('Democratizando el acceso a asesoría legal profesional', 110, 16);
  
  // Page number
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text(`Página ${pageNumber}`, 180, 20);
  
  // Separator line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(20, 30, 190, 30);
};

const addFooter = (doc: jsPDF) => {
  // Footer separator line
  doc.setDrawColor(23, 37, 84);
  doc.setLineWidth(0.3);
  doc.line(20, 275, 190, 275);
  
  // Footer text
  doc.setTextColor(100, 100, 100);
  doc.setFont('Arial', 'normal');
  doc.setFontSize(9);
  doc.text('Tu Consultor Legal', 20, 285);
  doc.text('Democratizamos el acceso a asesoría legal profesional con tecnología inteligente', 20, 292);
  
  // Website
  doc.setTextColor(59, 130, 246);
  doc.text('tuconsultorlegal.co', 160, 285);
  
  // Generated date
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(8);
  const now = new Date();
  doc.text(`Generado: ${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES')}`, 20, 298);
};

export const generatePDFDownload = (documentData: any, toast?: (options: any) => void) => {
  
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    let pageNumber = 1;
    
    // Add header to first page
    addHeader(doc, pageNumber);
    
    // Document title
    doc.setTextColor(23, 37, 84); // Navy blue
    doc.setFont('Arial', 'bold');
    doc.setFontSize(14);
    doc.text(documentData.document_type || 'Documento Legal', 20, 45);
    
    // Document info
    doc.setTextColor(100, 100, 100);
    doc.setFont('Arial', 'normal');
    doc.setFontSize(10);
    doc.text(`Token: ${documentData.token}`, 20, 55);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 62);
    
    // Content area starts
    doc.setTextColor(0, 0, 0); // Black text
    doc.setFont('Arial', 'normal');
    doc.setFontSize(12);
    
    // Get document content
    const content = documentData.document_content || 'Contenido del documento no disponible';
    
    // Split content into lines that fit the page width (with proper margins)
    const splitContent = doc.splitTextToSize(content, 150);
    let yPosition = 75; // Start after header and title
    
    splitContent.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > 265) { // Leave space for footer
        // Add footer to current page
        addFooter(doc);
        
        // Create new page
        doc.addPage();
        pageNumber++;
        addHeader(doc, pageNumber);
        yPosition = 45; // Start after header on new page
      }
      doc.text(line, 20, yPosition);
      yPosition += 7; // Line spacing for 12pt font
    });
    
    // Add footer to last page
    addFooter(doc);
    
    // Generate filename with better formatting
    const sanitizedDocType = documentData.document_type?.replace(/[^a-zA-Z0-9]/g, '_') || 'Documento';
    const fileName = `${sanitizedDocType}_${documentData.token}_${Date.now()}.pdf`;
    
    // Save the PDF
    doc.save(fileName);

    if (toast) {
      toast({
        title: "¡Descarga exitosa!",
        description: `El documento "${documentData.document_type}" se ha descargado correctamente.`,
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