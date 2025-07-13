import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";

export default function ServiceStatusAlert() {
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadServiceStatus();
    
    // Set up real-time subscription for service status updates
    const subscription = supabase
      .channel('service-status-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'service_status',
        filter: 'service_name=eq.openai'
      }, (payload) => {
        setServiceStatus(payload.new);
        setShowAlert(payload.new.status !== 'operational');
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadServiceStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('service_status')
        .select('*')
        .eq('service_name', 'openai')
        .single();

      if (error) {
        console.error('Error loading service status:', error);
        return;
      }

      setServiceStatus(data);
      setShowAlert(data?.status !== 'operational');
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const getAlertMessage = (status: string) => {
    switch (status) {
      case 'degraded':
        return {
          title: 'Servicios de IA con intermitencias',
          description: 'Estamos experimentando algunas intermitencias en nuestros servicios de inteligencia artificial. Los tiempos de respuesta pueden ser más lentos de lo habitual. Estamos trabajando para resolver esta situación.'
        };
      case 'outage':
        return {
          title: 'Servicios de IA temporalmente no disponibles',
          description: 'Nuestros servicios de inteligencia artificial están temporalmente no disponibles. Estamos trabajando activamente para restaurar el servicio lo antes posible. Le recomendamos intentar nuevamente en unos minutos.'
        };
      default:
        return {
          title: 'Problema con servicios de IA',
          description: 'Estamos experimentando dificultades técnicas con nuestros servicios de inteligencia artificial. Nuestro equipo técnico está trabajando para resolver la situación.'
        };
    }
  };

  if (!showAlert || !serviceStatus || serviceStatus.status === 'operational') {
    return null;
  }

  const alertContent = getAlertMessage(serviceStatus.status);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="border-orange-200 bg-orange-50 text-orange-800 max-w-4xl mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="font-medium mb-1">{alertContent.title}</div>
            <div className="text-sm">{alertContent.description}</div>
            {serviceStatus.last_checked && (
              <div className="text-xs mt-2 opacity-75">
                Última verificación: {new Date(serviceStatus.last_checked).toLocaleString()}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="text-orange-600 hover:text-orange-800 ml-4"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}