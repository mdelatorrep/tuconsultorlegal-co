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

      const handleBoldLoaded = () => {
        if (window.BoldCheckout) {
          const orderId = `DOC-${documentData.id}-${Date.now()}`;
          const checkout = new window.BoldCheckout({
            orderId: orderId,
            currency: 'COP',
            amount: documentData.price.toString(),
            apiKey: 'LLAVE_DE_IDENTIDAD', // This should be configured with actual Bold API key
            integritySignature: 'HASH_DE_INTEGRIDAD', // This should be generated on backend
            description: `Pago documento: ${documentData.document_type}`,
            redirectionUrl: `${window.location.origin}/?code=${documentData.token}&payment=success`,
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
        title: "Redirigiendo a la pasarela de pago",
        description: "Serás redirigido a la plataforma de pagos de Bold.",
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