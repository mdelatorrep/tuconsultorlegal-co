import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CoachmarkStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  highlight?: boolean;
}

interface LawyerOnboardingCoachmarksProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const COACHMARK_STEPS: CoachmarkStep[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido al Portal de Abogados!',
    description: 'Te guiaremos por las principales funcionalidades disponibles en tu dashboard profesional.',
    target: 'dashboard-welcome',
    position: 'bottom'
  },
  {
    id: 'sidebar-navigation',
    title: 'Navegación del Portal',
    description: 'Desde este menú lateral puedes acceder a todas las herramientas legales y funcionalidades del portal.',
    target: 'lawyer-sidebar',
    position: 'right',
    highlight: true
  },
  {
    id: 'ai-tools',
    title: 'Herramientas de IA Legal',
    description: 'Accede a investigación, análisis, redacción y estrategia legal con inteligencia artificial avanzada.',
    target: 'ai-tools-section',
    position: 'right',
    highlight: true
  },
  {
    id: 'agent-management',
    title: 'Gestión de Agentes IA',
    description: 'Crea y administra agentes especializados de IA para automatizar tareas legales específicas.',
    target: 'agent-management-section',
    position: 'right'
  },
  {
    id: 'documents-panel',
    title: 'Panel de Documentos',
    description: 'Aquí puedes revisar, editar y aprobar documentos solicitados por clientes.',
    target: 'documents-panel',
    position: 'top',
    highlight: true
  },
  {
    id: 'stats-access',
    title: 'Métricas y Estadísticas',
    description: 'Consulta estadísticas detalladas de tu desempeño y productividad legal.',
    target: 'stats-section',
    position: 'right'
  }
];

export default function LawyerOnboardingCoachmarks({ 
  isVisible, 
  onComplete, 
  onSkip 
}: LawyerOnboardingCoachmarksProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<string | null>(null);

  const currentStepData = COACHMARK_STEPS[currentStep];
  const isLastStep = currentStep === COACHMARK_STEPS.length - 1;

  useEffect(() => {
    if (isVisible && currentStepData?.highlight) {
      setHighlightedElement(currentStepData.target);
      
      // Add highlight class to target element
      const element = document.querySelector(`[data-tour="${currentStepData.target}"]`);
      if (element) {
        element.classList.add('tour-highlight');
      }
      
      return () => {
        // Cleanup highlight
        const element = document.querySelector(`[data-tour="${currentStepData.target}"]`);
        if (element) {
          element.classList.remove('tour-highlight');
        }
      };
    }
  }, [currentStep, isVisible, currentStepData]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isVisible || !currentStepData) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Coachmark Card */}
      <div className="fixed z-50 max-w-sm">
        <Card className="border-primary shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {currentStep + 1} de {COACHMARK_STEPS.length}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
          </CardHeader>
          
          <CardContent className="pt-0">
            <CardDescription className="text-base mb-4">
              {currentStepData.description}
            </CardDescription>
            
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <Button 
                onClick={handleNext}
                size="sm"
                className="flex items-center gap-2"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Finalizar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            
            {currentStep === 0 && (
              <div className="mt-3 pt-3 border-t">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSkip}
                  className="w-full text-muted-foreground"
                >
                  Saltar tutorial
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .tour-highlight {
            position: relative;
            z-index: 45;
            border: 2px solid hsl(var(--primary)) !important;
            border-radius: 8px;
            box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0%, 100% {
              box-shadow: 0 0 0 4px hsl(var(--primary) / 0.2);
            }
            50% {
              box-shadow: 0 0 0 8px hsl(var(--primary) / 0.1);
            }
          }
        `
      }} />
    </>
  );
}