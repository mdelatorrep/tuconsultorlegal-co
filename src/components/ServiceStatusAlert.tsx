import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";

interface AlertContent {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

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

  const getAlertMessage = (status: string, errorMessage: string | null): AlertContent => {
    switch (status) {
      case 'degraded':
        // Check if this is a minor issue that's actually working fine
        if (errorMessage?.includes('Minor issues') || errorMessage?.includes('minor')) {
          return {
            title: 'Servicios de IA funcionando normalmente',
            description: 'OpenAI reporta problemas menores, pero nuestros servicios están funcionando con normalidad. Los tiempos de respuesta se mantienen estables.',
            severity: 'low'
          };
        }
        return {
          title: 'Servicios de IA con intermitencias',
          description: errorMessage?.includes('major') 
            ? 'OpenAI está reportando problemas significativos en sus servicios. Los tiempos de respuesta pueden ser más lentos de lo habitual.'
            : 'Estamos experimentando algunas intermitencias en nuestros servicios de inteligencia artificial. Los tiempos de respuesta pueden ser más lentos de lo habitual.',
          severity: 'medium'
        };
      case 'outage':
        return {
          title: 'Servicios de IA temporalmente no disponibles',
          description: errorMessage?.includes('critical')
            ? 'OpenAI está reportando una interrupción crítica del servicio. Nuestros servicios de inteligencia artificial están temporalmente no disponibles.'
            : 'Nuestros servicios de inteligencia artificial están temporalmente no disponibles. Estamos trabajando activamente para restaurar el servicio lo antes posible.',
          severity: 'high'
        };
      default:
        return {
          title: 'Problema con servicios de IA',
          description: errorMessage 
            ? `Estado del servicio: ${errorMessage}. Nuestro equipo técnico está monitoreando la situación.`
            : 'Estamos experimentando dificultades técnicas con nuestros servicios de inteligencia artificial. Nuestro equipo técnico está trabajando para resolver la situación.',
          severity: 'medium'
        };
    }
  };

  if (!showAlert || !serviceStatus || serviceStatus.status === 'operational') {
    return null;
  }

  const alertContent = getAlertMessage(serviceStatus.status, serviceStatus.error_message);
  
  // Don't show alert for low severity issues or if API is working normally
  if (alertContent.severity === 'low' || serviceStatus.error_message?.includes('API working normally')) {
    return null;
  }

  const alertVariant = alertContent.severity === 'high' ? 'destructive' : 'default';
  const bgClass = alertContent.severity === 'high' 
    ? 'border-red-200 bg-red-50 text-red-800' 
    : 'border-orange-200 bg-orange-50 text-orange-800';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className={`${bgClass} max-w-4xl mx-auto`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1 pr-4">
            <div className="font-medium mb-1">{alertContent.title}</div>
            <div className="text-sm">{alertContent.description}</div>
            {serviceStatus.last_checked && (
              <div className="text-xs mt-2 opacity-75">
                Última verificación: {new Date(serviceStatus.last_checked).toLocaleString()}
                {serviceStatus.response_time_ms && ` (${serviceStatus.response_time_ms}ms)`}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className={`ml-4 ${alertContent.severity === 'high' ? 'text-red-600 hover:text-red-800' : 'text-orange-600 hover:text-orange-800'}`}
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
}