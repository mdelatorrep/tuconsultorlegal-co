import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Declare Bold Checkout types
declare global {
  interface Window {
    BoldCheckout: any;
  }
}

interface CreditPackageData {
  id: string;
  name: string;
  price_cop: number;
  credits: number;
  bonus_credits: number;
}

export const useCreditPayment = (packageData: CreditPackageData | null, lawyerId: string | null) => {
  const [boldCheckoutInstance, setBoldCheckoutInstance] = useState<any>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();

  // Initialize Bold Checkout script
  const initBoldCheckout = () => {
    const existingScript = document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]');
    if (existingScript) {
      if (window.BoldCheckout) {
        window.dispatchEvent(new Event('boldCreditCheckoutLoaded'));
      } else {
        setTimeout(() => {
          if (window.BoldCheckout) {
            window.dispatchEvent(new Event('boldCreditCheckoutLoaded'));
          }
        }, 1000);
      }
      return;
    }

    const script = document.createElement('script');
    script.onload = () => {
      window.dispatchEvent(new Event('boldCreditCheckoutLoaded'));
    };
    script.onerror = () => {
      window.dispatchEvent(new Event('boldCreditCheckoutLoadFailed'));
    };
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    document.head.appendChild(script);
  };

  // Create Bold Checkout instance when package is selected
  const initializeCheckout = async () => {
    if (!packageData || !lawyerId || packageData.price_cop <= 0) return;

    setIsInitializing(true);
    initBoldCheckout();

    const handleBoldLoaded = async () => {
      if (window.BoldCheckout) {
        try {
          const orderId = `CREDITS-${lawyerId.slice(0, 8)}-${packageData.id.slice(0, 8)}-${Date.now()}`;
          
          // Get secure payment configuration from backend
          const { data: paymentConfig, error: configError } = await supabase.functions.invoke('create-credit-payment-config', {
            body: { 
              orderId,
              amount: packageData.price_cop,
              packageId: packageData.id,
              packageName: packageData.name,
              credits: packageData.credits + packageData.bonus_credits,
              lawyerId
            }
          });
          
          if (configError || !paymentConfig) {
            throw new Error(`Failed to initialize payment system: ${configError?.message || 'No config returned'}`);
          }
          
          const checkout = new window.BoldCheckout(paymentConfig);
          setBoldCheckoutInstance(checkout);
          setCurrentOrderId(orderId);
          setIsInitializing(false);
          
          toast({
            title: "Sistema de pagos listo",
            description: "La pasarela de pagos se ha inicializado correctamente.",
          });
        } catch (error) {
          console.error('Error creating Bold Checkout instance:', error);
          setIsInitializing(false);
          toast({
            title: "Error en sistema de pagos",
            description: `No se pudo inicializar la pasarela de pagos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            variant: "destructive",
          });
        }
      }
    };

    const handleBoldFailed = () => {
      setIsInitializing(false);
      toast({
        title: "Error cargando pasarela de pago",
        description: "No se pudo cargar el sistema de pagos. Intenta nuevamente.",
        variant: "destructive",
      });
    };

    window.addEventListener('boldCreditCheckoutLoaded', handleBoldLoaded, { once: true });
    window.addEventListener('boldCreditCheckoutLoadFailed', handleBoldFailed, { once: true });
  };

  // Reset checkout when package changes
  useEffect(() => {
    setBoldCheckoutInstance(null);
    setCurrentOrderId('');
  }, [packageData?.id]);

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
    currentOrderId,
    initializeCheckout,
    isInitializing,
    isReady: !!boldCheckoutInstance
  };
};
