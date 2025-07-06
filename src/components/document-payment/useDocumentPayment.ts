import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDocumentPayment = () => {
  const [trackingCode, setTrackingCode] = useState("");
  const [documentData, setDocumentData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [trackingCodeError, setTrackingCodeError] = useState("");
  const { toast } = useToast();

  // Check for payment completion on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTrackingCode = urlParams.get('code');
    const paymentStatus = urlParams.get('payment');
    const boldOrderId = urlParams.get('bold-order-id');
    const boldTxStatus = urlParams.get('bold-tx-status');
    
    if (urlTrackingCode) {
      setTrackingCode(urlTrackingCode);
      
      // If Bold confirms payment is approved, directly update the document status
      if (boldTxStatus === 'approved' && boldOrderId) {
        handleDirectPaymentApproval(urlTrackingCode);
      } else {
        handleVerifyTrackingCode(urlTrackingCode);
        
        // Check if coming back from successful payment (fallback)
        if (paymentStatus === 'success') {
          setTimeout(() => {
            handleVerifyTrackingCode(urlTrackingCode);
          }, 2000);
        }
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

  const handleDirectPaymentApproval = async (codeToVerify: string) => {
    setIsVerifying(true);
    
    try {
      // First get document data
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', codeToVerify.trim())
        .single();

      if (error || !data) {
        setTrackingCodeError("Código no encontrado. Verifica que sea correcto.");
        setDocumentData(null);
        return;
      }

      // Update document status to paid
      const { error: updateError } = await supabase
        .from('document_tokens')
        .update({ 
          status: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        // Fallback to normal verification if update fails
        await handleVerifyTrackingCode(codeToVerify);
        return;
      }

      // Set payment as completed
      setPaymentCompleted(true);
      setDocumentData({ ...data, status: 'pagado' });
      
      toast({
        title: "¡Pago confirmado!",
        description: "Tu pago ha sido procesado exitosamente. Puedes descargar el documento.",
      });

    } catch (error) {
      console.error('Error processing direct payment approval:', error);
      // Fallback to normal verification
      await handleVerifyTrackingCode(codeToVerify);
    } finally {
      setIsVerifying(false);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    if (!orderId) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { orderId }
      });

      if (error) {
        console.error('Error checking payment status:', error);
        return false;
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

  const startPaymentStatusChecking = (orderId: string) => {
    // Check payment status every 3 seconds for up to 2 minutes
    let attempts = 0;
    const maxAttempts = 40; // 40 * 3 seconds = 2 minutes
    
    const intervalId = setInterval(async () => {
      attempts++;
      const paymentComplete = await checkPaymentStatus(orderId);
      
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

  const updateDocumentStatus = async (status: 'solicitado' | 'en_revision_abogado' | 'revision_usuario' | 'pagado' | 'descargado') => {
    if (!documentData) return;

    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ status })
        .eq('id', documentData.id);

      if (error) {
        console.error('Error updating status:', error);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  };

  return {
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
  };
};