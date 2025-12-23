import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { toast } = useToast();

  const initiateCreditPurchase = async (params: PurchaseParams): Promise<{ success: boolean; error?: string }> => {
    const { packageId, packageName, credits, priceCop, lawyerId } = params;
    
    if (priceCop <= 0) {
      return { success: false, error: 'Invalid price' };
    }

    setLoading(true);

    try {
      // Load Bold script if not loaded
      if (!window.BoldCheckout) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
          script.onload = () => {
            const check = setInterval(() => {
              if (window.BoldCheckout) { clearInterval(check); resolve(); }
            }, 100);
            setTimeout(() => { clearInterval(check); reject(new Error('Timeout')); }, 10000);
          };
          script.onerror = () => reject(new Error('Failed to load'));
          document.head.appendChild(script);
        });
      }

      const orderId = `CREDITS-${lawyerId.slice(0, 8)}-${packageId.slice(0, 8)}-${Date.now()}`;
      
      const { data: paymentConfig, error: configError } = await supabase.functions.invoke('create-credit-payment-config', {
        body: { orderId, amount: priceCop, packageId, packageName, credits, lawyerId }
      });
      
      if (configError || !paymentConfig) throw new Error(configError?.message || 'No config');
      
      const checkout = new window.BoldCheckout(paymentConfig);
      checkout.open();
      
      setLoading(false);
      return { success: true };
    } catch (error) {
      setLoading(false);
      const msg = error instanceof Error ? error.message : 'Error';
      toast({ title: "Error", description: msg, variant: "destructive" });
      return { success: false, error: msg };
    }
  };

  return { initiateCreditPurchase, loading };
};