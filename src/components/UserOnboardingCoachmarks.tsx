import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Sparkles, FileText, MessageCircle, BarChart3, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  position: 'center' | 'bottom-right' | 'top-left' | 'top-right';
}

interface UserOnboardingCoachmarksProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Tu Consultor Legal!',
    description: 'Te guiaremos por las principales funcionalidades de tu portal legal personalizado. Este recorrido tomará solo 2 minutos.',
    icon: <Sparkles className="w-8 h-8 text-primary" />,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Tu Panel de Control',
    description: 'Aquí puedes ver todos tus documentos solicitados, consultas en progreso y estadísticas importantes. Todo organizado en un solo lugar.',
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
    position: 'center'
  },
  {
    id: 'create-document',
    title: 'Crear Documentos Legales',
    description: 'Con solo unos clics puedes solicitar documentos legales profesionales. Nuestros abogados revisarán y personalizarán cada documento según tus necesidades.',
    icon: <FileText className="w-8 h-8 text-primary" />,
    position: 'center'
  },
  {
    id: 'chat-widget',
    title: 'Conoce a Lexi - Tu Asesor Legal',
    description: '¡Esto es importante! Lexi es tu asistente legal personal disponible 24/7. Puedes hacerle preguntas legales, pedir orientación sobre documentos o iniciar consultas especializadas.',
    icon: <MessageCircle className="w-8 h-8 text-accent" />,
    targetSelector: '[data-chat-widget]',
    position: 'bottom-right'
  },
  {
    id: 'track-documents',
    title: 'Seguimiento de Documentos',
    description: 'Mantén el control del estado de todos tus documentos en tiempo real. Recibe notificaciones cuando estén listos para revisión o descarga.',
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
    position: 'center'
  },
  {
    id: 'complete',
    title: '¡Todo Listo!',
    description: 'Ya conoces las funcionalidades principales. ¡Comienza ahora hablando con Lexi o crea tu primer documento legal!',
    icon: <CheckCircle2 className="w-8 h-8 text-success" />,
    position: 'center'
  }
];

export const UserOnboardingCoachmarks: React.FC<UserOnboardingCoachmarksProps> = ({
  isOpen,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    if (currentStepData.targetSelector) {
      const element = document.querySelector(currentStepData.targetSelector) as HTMLElement;
      setTargetElement(element);
      
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetElement(null);
    }
  }, [currentStep, currentStepData.targetSelector]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  const getCardPosition = (): React.CSSProperties => {
    if (!targetElement || currentStepData.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001
      };
    }

    const rect = targetElement.getBoundingClientRect();
    
    switch (currentStepData.position) {
      case 'bottom-right':
        return {
          position: 'fixed',
          top: `${rect.top - 20}px`,
          right: `${window.innerWidth - rect.right + 20}px`,
          zIndex: 10001
        };
      case 'top-left':
        return {
          position: 'fixed',
          top: `${rect.bottom + 20}px`,
          left: `${rect.left}px`,
          zIndex: 10001
        };
      case 'top-right':
        return {
          position: 'fixed',
          top: `${rect.bottom + 20}px`,
          right: `${window.innerWidth - rect.right}px`,
          zIndex: 10001
        };
      default:
        return {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10001
        };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000]"
      >
        {/* Overlay oscuro */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleSkip} />
        
        {/* Spotlight en el elemento objetivo */}
        {targetElement && (
          <div
            className="absolute rounded-lg ring-4 ring-primary/50 ring-offset-4 ring-offset-black/50 pointer-events-none transition-all duration-300"
            style={{
              top: `${targetElement.getBoundingClientRect().top - 8}px`,
              left: `${targetElement.getBoundingClientRect().left - 8}px`,
              width: `${targetElement.getBoundingClientRect().width + 16}px`,
              height: `${targetElement.getBoundingClientRect().height + 16}px`,
              zIndex: 10000
            }}
          />
        )}

        {/* Tarjeta de onboarding */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={getCardPosition()}
        >
          <Card className="max-w-md w-[90vw] sm:w-[450px] p-6 shadow-2xl">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {currentStepData.icon}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {currentStepData.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Paso {currentStep + 1} de {onboardingSteps.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Descripción */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>

              {/* Indicador de progreso */}
              <div className="flex gap-1">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      index === currentStep
                        ? 'bg-primary'
                        : index < currentStep
                        ? 'bg-primary/40'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Botones de navegación */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Saltar tutorial
                </Button>

                <Button
                  onClick={handleNext}
                  size="sm"
                  className="gap-2"
                >
                  {isLastStep ? (
                    <>
                      Completar
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
