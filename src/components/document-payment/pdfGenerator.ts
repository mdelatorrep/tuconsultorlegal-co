import jsPDF from 'jspdf';
import { useToast } from "@/hooks/use-toast";

export const generatePDFDownload = (documentData: any) => {
  const { toast } = useToast();
  
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    
    // Set document properties
    doc.setProperties({
      title: documentData.document_type,
      subject: `Documento Legal - ${documentData.document_type}`,
      author: 'Tu Consultor Legal',
      creator: 'Tu Consultor Legal'
    });

    // Add header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text(documentData.document_type, 20, 30);
    
    // Add document info
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Código: ${documentData.token}`, 20, 45);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 20, 55);
    
    if (documentData.user_name) {
      doc.text(`Cliente: ${documentData.user_name}`, 20, 65);
    }
    
    // Add separator line
    doc.line(20, 75, 190, 75);
    
    // Add document content
    doc.setFontSize(11);
    const content = documentData.document_content || 'Contenido del documento no disponible';
    
    // Split content into lines that fit the page width
    const splitContent = doc.splitTextToSize(content, 170);
    let yPosition = 90;
    
    splitContent.forEach((line: string) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(line, 20, yPosition);
      yPosition += 6;
    });
    
    // Add footer on last page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Documento generado por Tu Consultor Legal - Página ${i} de ${pageCount}`,
        20,
        285
      );
      doc.text(
        `${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`,
        20,
        290
      );
    }
    
    // Generate filename
    const fileName = `${documentData.document_type.replace(/\s+/g, '_')}_${documentData.token}_${Date.now()}.pdf`;
    
    // Save the PDF
    doc.save(fileName);

    toast({
      title: "¡Descarga exitosa!",
      description: `El documento "${documentData.document_type}" se ha descargado correctamente.`,
    });

    return true;
  } catch (error) {
    console.error('Error generando PDF:', error);
    toast({
      title: "Error en la descarga",
      description: "Ocurrió un error al generar el documento PDF. Intenta nuevamente.",
      variant: "destructive",
    });
    return false;
  }
};