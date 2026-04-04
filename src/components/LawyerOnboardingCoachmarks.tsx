import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, CheckCircle, Search, Users, Trophy, LayoutDashboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LawyerOnboardingCoachmarksProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const COACHMARK_STEPS = [
  {
    id: 'ai-tools',
    title: '🔍 Herramientas de IA Legal',
    description: 'Investiga jurisprudencia, redacta documentos y analiza contratos con inteligencia artificial. Todo desde las Herramientas Rápidas en tu dashboard.',
    icon: Search,
  },
  {
    id: 'crm',
    title: '👥 Gestión de Clientes y Casos',
    description: 'Organiza tus clientes, lleva el seguimiento de cada caso y nunca pierdas un plazo importante con el CRM integrado.',
    icon: Users,
  },
  {
    id: 'missions',
    title: '🎯 Misiones Diarias = Créditos Gratis',
    description: 'Completa misiones diarias para ganar créditos que puedes usar en todas las herramientas de IA. Revisa tu progreso en "Mis Créditos".',
    icon: Trophy,
  },
  {
    id: 'sidebar',
    title: '📋 Explora Todo desde el Menú',
    description: 'En el menú lateral encontrarás todas las funcionalidades: calendario, monitor de procesos, asistente de voz, verificación y más.',
    icon: LayoutDashboard,
  },
];

export default function LawyerOnboardingCoachmarks({ 
  isVisible, 
  onComplete, 
  onSkip 
}: LawyerOnboardingCoachmarksProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = COACHMARK_STEPS[currentStep];
  const isLastStep = currentStep === COACHMARK_STEPS.length - 1;

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

  if (!isVisible || !currentStepData) {
    return null;
  }

  const Icon = currentStepData.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onSkip} />
      
      {/* Centered Coachmark Card */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
        <Card className="border-primary shadow-2xl max-w-md w-full animate-in fade-in-0 zoom-in-95 duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {currentStep + 1} de {COACHMARK_STEPS.length}
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSkip}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <CardDescription className="text-base mb-6 leading-relaxed">
              {currentStepData.description}
            </CardDescription>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 mb-4">
              {COACHMARK_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            
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
                    ¡Empezar!
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
                  onClick={onSkip}
                  className="w-full text-muted-foreground"
                >
                  Ya conozco la plataforma, saltar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
