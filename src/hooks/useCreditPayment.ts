import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Declare Bold Checkout types (same as document payments)
declare global {
  interface Window {
    BoldCheckout: any;
  }
}

interface PurchaseParams {
  packageId: string;
  packageName: string;
  credits: number;
  priceCop: number;
  lawyerId: string;
}

export const useCreditPayment = () => {
  const [loading, setLoading] = useState(false);
  const [boldReady, setBoldReady] = useState(false);
  const { toast } = useToast();

  // Initialize Bold Checkout script (same pattern as document payments)
  const initBoldCheckout = useCallback(() => {
    console.log('initBoldCheckout called for credits');
    
    const existingScript = document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]');
    if (existingScript) {
      console.log('Bold Checkout script already exists, BoldCheckout available:', !!window.BoldCheckout);
      if (window.BoldCheckout) {
        setBoldReady(true);
      } else {
        // Wait a bit and check again
        setTimeout(() => {
          if (window.BoldCheckout) {
            console.log('BoldCheckout became available');
            setBoldReady(true);
          }
        }, 1000);
      }
      return;
    }

    console.log('Creating new Bold Checkout script');
    const script = document.createElement('script');
    script.onload = () => {
      console.log('Bold Checkout script loaded successfully');
      // Wait for BoldCheckout to be available
      const checkReady = setInterval(() => {
        if (window.BoldCheckout) {
          clearInterval(checkReady);
          setBoldReady(true);
        }
      }, 100);
      // Timeout after 10 seconds
      setTimeout(() => clearInterval(checkReady), 10000);
    };
    script.onerror = (error) => {
      console.error('Failed to load Bold Checkout script:', error);
      toast({
        title: "Error cargando pasarela de pago",
        description: "No se pudo cargar el sistema de pagos. Intenta nuevamente.",
        variant: "destructive",
      });
    };
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    document.head.appendChild(script);
  }, [toast]);

  // Load script on mount
  useEffect(() => {
    initBoldCheckout();
  }, [initBoldCheckout]);

  const initiateCreditPurchase = async (params: PurchaseParams): Promise<{ success: boolean; error?: string }> => {
    const { packageId, packageName, credits, priceCop, lawyerId } = params;
    
    if (priceCop <= 0) {
      return { success: false, error: 'Precio inválido' };
    }

    // Check if Bold is ready
    if (!window.BoldCheckout) {
      console.log('BoldCheckout not ready, initializing...');
      initBoldCheckout();
      
      // Wait for it to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout loading payment system')), 10000);
        const check = setInterval(() => {
          if (window.BoldCheckout) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      }).catch(() => {
        toast({
          title: "Error",
          description: "No se pudo cargar la pasarela de pagos. Intenta nuevamente.",
          variant: "destructive",
        });
        return { success: false, error: 'Payment system not ready' };
      });
    }

    setLoading(true);

    try {
      const orderId = `CREDITS-${lawyerId.slice(0, 8)}-${packageId.slice(0, 8)}-${Date.now()}`;
      
      console.log('Creating credit payment config with:', { orderId, amount: priceCop, packageId, packageName, credits, lawyerId });
      
      // Get secure payment configuration from unified backend function
      const { data: paymentConfig, error: configError } = await supabase.functions.invoke('create-payment-config', {
        body: { 
          orderId, 
          amount: priceCop, 
          type: 'credits',
          packageId, 
          packageName, 
          credits, 
          lawyerId 
        }
      });
      
      console.log('Payment config response:', { data: paymentConfig, error: configError });
      
      if (configError || !paymentConfig) {
        console.error('Error getting payment configuration:', configError);
        throw new Error(`Failed to initialize payment system: ${configError?.message || 'No config returned'}`);
      }

      // Check for error in response
      if (paymentConfig.error) {
        throw new Error(paymentConfig.error);
      }
      
      console.log('Creating BoldCheckout instance with config:', paymentConfig);
      const checkout = new window.BoldCheckout(paymentConfig);
      
      console.log('Bold Checkout instance created successfully, opening...');
      checkout.open();
      
      toast({
        title: "Abriendo pasarela de pago",
        description: "La pasarela de pagos se abrirá en una ventana modal.",
      });
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error in credit purchase:', error);
      toast({ 
        title: "Error en el pago", 
        description: msg, 
        variant: "destructive" 
      });
      return { success: false, error: msg };
    }
  };

  return { initiateCreditPurchase, loading, boldReady };
};
