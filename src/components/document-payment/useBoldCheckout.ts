import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Declare Bold Checkout types
declare global {
  interface Window {
    BoldCheckout: any;
  }
}

export const useBoldCheckout = (documentData: any) => {
  const [boldCheckoutInstance, setBoldCheckoutInstance] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const { toast } = useToast();

  // Initialize Bold Checkout script
  const initBoldCheckout = () => {
    console.log('initBoldCheckout called');
    
    const existingScript = document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]');
    if (existingScript) {
      console.log('Bold Checkout script already exists, BoldCheckout available:', !!window.BoldCheckout);
      // If script exists but BoldCheckout is not available, wait for it
      if (window.BoldCheckout) {
        console.log('BoldCheckout is available, dispatching loaded event');
        window.dispatchEvent(new Event('boldCheckoutLoaded'));
      } else {
        console.log('BoldCheckout not available yet, waiting...');
        // Wait a bit and check again
        setTimeout(() => {
          if (window.BoldCheckout) {
            console.log('BoldCheckout became available, dispatching loaded event');
            window.dispatchEvent(new Event('boldCheckoutLoaded'));
          } else {
            console.error('BoldCheckout still not available after wait');
          }
        }, 1000);
      }
      return;
    }

    console.log('Creating new Bold Checkout script');
    const script = document.createElement('script');
    script.onload = () => {
      console.log('Bold Checkout script loaded successfully');
      window.dispatchEvent(new Event('boldCheckoutLoaded'));
    };
    script.onerror = (error) => {
      console.error('Failed to load Bold Checkout script:', error);
      window.dispatchEvent(new Event('boldCheckoutLoadFailed'));
    };
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    document.head.appendChild(script);
    console.log('Bold Checkout script added to document head');
  };

  // Create Bold Checkout instance when document is loaded
  useEffect(() => {
    if (documentData && !boldCheckoutInstance) {
      console.log('Initializing Bold Checkout for document:', documentData.id);
      initBoldCheckout();

      const handleBoldLoaded = async () => {
        console.log('Bold Checkout script loaded, window.BoldCheckout:', !!window.BoldCheckout);
        if (window.BoldCheckout) {
          try {
            const orderId = `DOC-${documentData.id}-${Date.now()}`;
            
            // Generate payment configuration securely through backend
            console.log('Creating Bold Checkout instance with orderId:', orderId);
            
            // Get secure payment configuration from backend
            const { data: paymentConfig, error: configError } = await supabase.functions.invoke('create-payment-config', {
              body: { 
                orderId,
                amount: documentData.price,
                documentType: documentData.document_type,
                token: documentData.token
              }
            });
            
            if (configError || !paymentConfig) {
              console.error('Error getting payment configuration:', configError);
              throw new Error('Failed to initialize payment system');
            }
            
            const checkout = new window.BoldCheckout(paymentConfig);
            
            console.log('Bold Checkout instance created successfully:', !!checkout);
            setBoldCheckoutInstance(checkout);
            setCurrentOrderId(orderId);
            
            toast({
              title: "Sistema de pagos listo",
              description: "La pasarela de pagos se ha inicializado correctamente.",
            });
          } catch (error) {
            console.error('Error creating Bold Checkout instance:', error);
            toast({
              title: "Error en sistema de pagos",
              description: "No se pudo inicializar la pasarela de pagos. Intenta recargar la página.",
              variant: "destructive",
            });
          }
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
    openCheckout,
    currentOrderId
  };
};