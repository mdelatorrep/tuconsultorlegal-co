import TrackingCodeVerification from "./document-payment/TrackingCodeVerification";
import DocumentPreview from "./document-payment/DocumentPreview";
import PaymentSection from "./document-payment/PaymentSection";
import DocumentInfo from "./document-payment/DocumentInfo";
import { useBoldCheckout } from "./document-payment/useBoldCheckout";
import { useDocumentPayment } from "./document-payment/useDocumentPayment";
import { generatePDFDownload } from "./document-payment/pdfGenerator";
import { handlePreviewDocument } from "./document-payment/documentPreviewUtils";

interface DocumentPaymentPageProps {
  onOpenChat: (message: string) => void;
}

export default function DocumentPaymentPage({ onOpenChat }: DocumentPaymentPageProps) {
  const {
    trackingCode,
    setTrackingCode,
    documentData,
    isVerifying,
    isProcessingPayment,
    setIsProcessingPayment,
    paymentCompleted,
    trackingCodeError,
    handleVerifyTrackingCode,
    startPaymentStatusChecking,
    updateDocumentStatus
  } = useDocumentPayment();
  
  const { openCheckout, currentOrderId } = useBoldCheckout(documentData);


  const handlePayment = async () => {
    if (!documentData) return;

    setIsProcessingPayment(true);
    
    const success = openCheckout();
    
    if (!success) {
      setIsProcessingPayment(false);
      return;
    }

    // Start checking payment status periodically
    if (currentOrderId) {
      startPaymentStatusChecking(currentOrderId);
    }
  };

  const handleDownloadDocument = async () => {
    if (!documentData) return;

    // Update status to 'descargado'
    await updateDocumentStatus('descargado');
    
    // Generate PDF download
    generatePDFDownload(documentData);
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
              onPreviewDocument={() => handlePreviewDocument(documentData)}
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