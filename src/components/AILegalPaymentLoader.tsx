import React from 'react';
import { Loader2, Brain, CheckCircle, Clock, Zap } from 'lucide-react';

interface AILegalPaymentLoaderProps {
  stage?: 'processing' | 'validating' | 'success' | 'syncing';
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

const AILegalPaymentLoader: React.FC<AILegalPaymentLoaderProps> = ({
  stage = 'processing',
  message,
  showProgress = true,
  progress = 0
}) => {
  const getStageInfo = () => {
    switch (stage) {
      case 'processing':
        return {
          icon: <Loader2 className="w-8 h-8 animate-spin text-primary" />,
          title: 'Procesando tu pago...',
          description: 'Estamos validando tu transacción con dLocal',
          color: 'text-primary'
        };
      case 'validating':
        return {
          icon: <Brain className="w-8 h-8 animate-pulse text-accent" />,
          title: 'IA Legal validando...',
          description: 'Nuestro sistema está confirmando tu suscripción',
          color: 'text-accent'
        };
      case 'syncing':
        return {
          icon: <Zap className="w-8 h-8 animate-bounce text-warning" />,
          title: 'Sincronizando datos...',
          description: 'Actualizando tu perfil y permisos',
          color: 'text-warning'
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-success" />,
          title: '¡Pago confirmado!',
          description: 'Tu suscripción está activa',
          color: 'text-success'
        };
      default:
        return {
          icon: <Clock className="w-8 h-8 text-muted-foreground" />,
          title: 'Procesando...',
          description: 'Por favor espera',
          color: 'text-muted-foreground'
        };
    }
  };

  const stageInfo = getStageInfo();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md w-full text-center shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-background rounded-full border border-border">
            {stageInfo.icon}
          </div>
        </div>
        
        <h2 className={`text-2xl font-semibold mb-3 ${stageInfo.color}`}>
          {stageInfo.title}
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {message || stageInfo.description}
        </p>

        {showProgress && stage !== 'success' && (
          <div className="mb-6">
            <div className="w-full bg-muted rounded-full h-2 mb-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {progress}% completado
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4" />
          <span>Powered by IA Legal</span>
        </div>

        {stage === 'processing' && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Este proceso puede tomar hasta 2 minutos. No cierres esta ventana.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AILegalPaymentLoader;