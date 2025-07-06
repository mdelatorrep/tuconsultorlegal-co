import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Declare Bold Checkout types
declare global {
  interface Window {
    BoldCheckout: any;
  }
}

export const useBoldCheckout = (documentData: any) => {
  const [boldCheckoutInstance, setBoldCheckoutInstance] = useState<any>(null);
  const { toast } = useToast();

  // Initialize Bold Checkout script
  const initBoldCheckout = () => {
    if (document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]')) {
      console.warn('Bold Checkout script is already loaded.');
      return;
    }

    const script = document.createElement('script');
    script.onload = () => {
      window.dispatchEvent(new Event('boldCheckoutLoaded'));
    };
    script.onerror = () => {
      window.dispatchEvent(new Event('boldCheckoutLoadFailed'));
    };
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    document.head.appendChild(script);
  };

  // Create Bold Checkout instance when document is loaded
  useEffect(() => {
    if (documentData && !boldCheckoutInstance) {
      initBoldCheckout();

      const handleBoldLoaded = async () => {
        if (window.BoldCheckout) {
          const orderId = `DOC-${documentData.id}-${Date.now()}`;
          
          // Generate proper integrity signature (SHA256 hash)
          // Format: {orderId}{amount}{currency}{secretKey}
          const signatureString = `${orderId}${documentData.price}COPvR1YCM5cT4H0GKebSgmDOg`;
          const integritySignature = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signatureString))
            .then(buffer => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(''));

          const checkout = new window.BoldCheckout({
            orderId: orderId,
            currency: 'COP',
            amount: documentData.price.toString(),
            apiKey: 'OUmoGBT-j4MEwEkhbt_hqJA22_0NdK8RVAkuCdkdMiQ',
            integritySignature: integritySignature,
            merchantId: 'XMS1CF62IB',
            description: `Pago documento: ${documentData.document_type}`,
            redirectionUrl: `${window.location.origin}/?code=${documentData.token}&payment=success`,
            renderMode: 'embedded', // Embedded Checkout - abre en modal sin salir de la página
          });
          setBoldCheckoutInstance(checkout);
        }
      };

      const handleBoldFailed = () => {
        toast({
          title: "Error cargando pasarela de pago",
          description: "No se pudo cargar el sistema de pagos. Intenta nuevamente.",
          variant: "destructive",
        });
      };

      window.addEventListener('boldCheckoutLoaded', handleBoldLoaded);
      window.addEventListener('boldCheckoutLoadFailed', handleBoldFailed);

      return () => {
        window.removeEventListener('boldCheckoutLoaded', handleBoldLoaded);
        window.removeEventListener('boldCheckoutLoadFailed', handleBoldFailed);
      };
    }
  }, [documentData, boldCheckoutInstance, toast]);

  const openCheckout = () => {
    if (!boldCheckoutInstance) {
      toast({
        title: "Error",
        description: "El sistema de pagos no está listo. Intenta nuevamente.",
        variant: "destructive",
      });
      return false;
    }

    try {
      boldCheckoutInstance.open();
      toast({
        title: "Abriendo pasarela de pago",
        description: "La pasarela de pagos se abrirá en una ventana modal.",
      });
      return true;
    } catch (error) {
      console.error('Error abriendo pasarela de pago:', error);
      toast({
        title: "Error en el pago",
        description: "Ocurrió un error al abrir la pasarela de pago. Intenta nuevamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    boldCheckoutInstance,
    openCheckout
  };
};