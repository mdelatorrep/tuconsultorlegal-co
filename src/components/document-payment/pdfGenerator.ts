import jsPDF from 'jspdf';

export const generatePDFDownload = (documentData: any, toast?: (options: any) => void) => {
  
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set font to Arial and font size to 12
    doc.setFont('Arial', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Black text
    
    // Get document content
    const content = documentData.document_content || 'Contenido del documento no disponible';
    
    // Split content into lines that fit the page width (with proper margins)
    const splitContent = doc.splitTextToSize(content, 170);
    let yPosition = 25; // Start near top of page
    
    splitContent.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 25;
      }
      doc.text(line, 20, yPosition);
      yPosition += 7; // Line spacing for 12pt font
    });
    
    // Generate filename
    const fileName = `${documentData.document_type.replace(/\s+/g, '_')}_${documentData.token}_${Date.now()}.pdf`;
    
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