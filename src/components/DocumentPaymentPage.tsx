import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import TrackingCodeVerification from "./document-payment/TrackingCodeVerification";
import DocumentPreview from "./document-payment/DocumentPreview";
import PaymentSection from "./document-payment/PaymentSection";
import DocumentInfo from "./document-payment/DocumentInfo";
import { useBoldCheckout } from "./document-payment/useBoldCheckout";

interface DocumentPaymentPageProps {
  onOpenChat: (message: string) => void;
}

export default function DocumentPaymentPage({ onOpenChat }: DocumentPaymentPageProps) {
  const [trackingCode, setTrackingCode] = useState("");
  const [documentData, setDocumentData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [trackingCodeError, setTrackingCodeError] = useState("");
  const { toast } = useToast();
  const { openCheckout, currentOrderId } = useBoldCheckout(documentData);

  // Check for payment completion on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTrackingCode = urlParams.get('code');
    const paymentStatus = urlParams.get('payment');
    
    if (urlTrackingCode) {
      setTrackingCode(urlTrackingCode);
      handleVerifyTrackingCode(urlTrackingCode);
      
      // Check if coming back from successful payment
      if (paymentStatus === 'success') {
        // Wait a moment for the webhook to process, then check payment status
        setTimeout(() => {
          handleVerifyTrackingCode(urlTrackingCode);
        }, 2000);
      }
    }
  }, []);

  const handleVerifyTrackingCode = async (codeToVerify?: string) => {
    const codeValue = codeToVerify || trackingCode;
    
    if (!codeValue.trim()) {
      setTrackingCodeError("Por favor ingresa un código de seguimiento válido");
      return;
    }

    setIsVerifying(true);
    setTrackingCodeError("");

    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', codeValue.trim())
        .single();

      if (error || !data) {
        setTrackingCodeError("Código no encontrado. Verifica que sea correcto.");
        setDocumentData(null);
        toast({
          title: "Código inválido",
          description: "El código de seguimiento ingresado no existe o ha expirado.",
          variant: "destructive",
        });
        return;
      }

      // Check if already paid/downloaded
      if (data.status === 'pagado' || data.status === 'descargado') {
        setPaymentCompleted(true);
      }

      setDocumentData(data);
      toast({
        title: "Código verificado",
        description: `Documento "${data.document_type}" encontrado correctamente.`,
      });

    } catch (error) {
      console.error('Error verificando código:', error);
      setTrackingCodeError("Error al verificar el código. Intenta nuevamente.");
      toast({
        title: "Error de verificación",
        description: "Ocurrió un error al verificar el código de seguimiento.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePreviewDocument = () => {
    if (!documentData) return;
    
    // Create a simple preview window with watermarked content
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Vista Previa - ${documentData.document_type}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; position: relative; }
              .watermark { 
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 72px; 
                color: rgba(200, 200, 200, 0.3); 
                z-index: -1;
                pointer-events: none;
              }
              .content { white-space: pre-line; }
            </style>
          </head>
          <body>
            <div class="watermark">VISTA PREVIA</div>
            <h1>${documentData.document_type}</h1>
            <div class="content">${documentData.document_content}</div>
          </body>
        </html>
      `);
    }
  };

  const handlePayment = async () => {
    if (!documentData) return;

    setIsProcessingPayment(true);
    
    const success = openCheckout();
    
    if (!success) {
      setIsProcessingPayment(false);
      return;
    }

    // Start checking payment status periodically
    const checkPaymentStatus = async () => {
      if (!currentOrderId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { orderId: currentOrderId }
        });

        if (error) {
          console.error('Error checking payment status:', error);
          return;
        }

        if (data?.paymentApproved) {
          setPaymentCompleted(true);
          setIsProcessingPayment(false);
          toast({
            title: "¡Pago completado!",
            description: "Tu pago ha sido procesado exitosamente.",
          });
          // Refresh document data
          await handleVerifyTrackingCode();
          return true; // Payment completed
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
      }
      return false; // Payment not completed yet
    };

    // Check payment status every 3 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3 seconds = 2 minutes
    
    const intervalId = setInterval(async () => {
      attempts++;
      const paymentComplete = await checkPaymentStatus();
      
      if (attempts >= maxAttempts || paymentComplete) {
        clearInterval(intervalId);
        setIsProcessingPayment(false);
      }
    }, 3000);

    // Clean up interval after payment completes
    setTimeout(() => {
      clearInterval(intervalId);
      setIsProcessingPayment(false);
    }, 120000); // 2 minutes timeout
  };

  const handleDownloadDocument = async () => {
    if (!documentData) return;

    try {
      // Update status to 'descargado'
      const { error } = await supabase
        .from('document_tokens')
        .update({ status: 'descargado' })
        .eq('id', documentData.id);

      if (error) {
        console.error('Error updating status:', error);
      }

      // Generate PDF download
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

    } catch (error) {
      console.error('Error descargando documento:', error);
      toast({
        title: "Error en la descarga",
        description: "Ocurrió un error al descargar el documento.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
            Verifica y Adquiere tu Documento
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ingresa tu código de seguimiento para acceder a tu documento personalizado.
          </p>
        </div>

        {/* Tracking Code Verification Section */}
        {!documentData && (
          <TrackingCodeVerification
            trackingCode={trackingCode}
            setTrackingCode={setTrackingCode}
            trackingCodeError={trackingCodeError}
            isVerifying={isVerifying}
            onVerifyCode={handleVerifyTrackingCode}
          />
        )}

        {/* Document Content - Only show if tracking code is verified */}
        {documentData && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Document Preview Card */}
            <DocumentPreview
              documentData={documentData}
              paymentCompleted={paymentCompleted}
              onPreviewDocument={handlePreviewDocument}
            />

            {/* Payment Card */}
            <PaymentSection
              documentData={documentData}
              paymentCompleted={paymentCompleted}
              isProcessingPayment={isProcessingPayment}
              onPayment={handlePayment}
              onDownloadDocument={handleDownloadDocument}
              onOpenChat={onOpenChat}
            />
          </div>
        )}

        {/* Additional Information */}
        {documentData && <DocumentInfo />}
      </div>
    </div>
  );
}