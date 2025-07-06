import { useToast } from "@/hooks/use-toast";

export const generatePDFDownload = (documentData: any) => {
  const { toast } = useToast();
  
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${documentData.document_type}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
395
%%EOF`;

  try {
    const element = document.createElement('a');
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    element.setAttribute('href', URL.createObjectURL(blob));
    element.setAttribute('download', `${documentData.document_type.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: "Descarga iniciada",
      description: "Tu documento se está descargando.",
    });

    return true;
  } catch (error) {
    console.error('Error descargando documento:', error);
    toast({
      title: "Error en la descarga",
      description: "Ocurrió un error al descargar el documento.",
      variant: "destructive",
    });
    return false;
  }
};