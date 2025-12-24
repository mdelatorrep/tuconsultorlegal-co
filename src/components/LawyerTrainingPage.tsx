import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Award,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import AILegalTrainingSystem from "./AILegalTrainingSystem";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "./UnifiedSidebar";

interface LawyerTrainingPageProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  lawyerData: any;
}

export default function LawyerTrainingPage({ user, currentView, onViewChange, onLogout, lawyerData }: LawyerTrainingPageProps) {
  const [trainingView, setTrainingView] = useState<'overview' | 'training'>('overview');

  const startCertification = () => {
    setTrainingView('training');
  };

  if (trainingView === 'training') {
    return (
      <AILegalTrainingSystem
        lawyerId={lawyerData?.id || ''}
        lawyerData={lawyerData}
        onBack={() => setTrainingView('overview')}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        <main className="flex-1">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-lg font-semibold">Centro de Formación IA Legal</h1>
            </div>
          </header>

          <div className="container mx-auto px-6 py-12">
            <div className="max-w-2xl mx-auto">
              <Card className="border-2 border-primary/20 overflow-hidden">
                {/* Hero gradient header */}
                <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 text-primary-foreground text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-4">
                    <Brain className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Certificación IA Lawyer</h2>
                  <p className="text-primary-foreground/80">
                    Domina la IA aplicada al derecho en 5 módulos
                  </p>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Quick stats */}
                  <div className="flex justify-center gap-6 py-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Duración</span>
                      </div>
                      <p className="font-semibold">5-7 horas</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm">Módulos</span>
                      </div>
                      <p className="font-semibold">5 especializados</p>
                    </div>
                    <div className="h-10 w-px bg-border" />
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                        <Award className="w-4 h-4" />
                        <span className="text-sm">Certificado</span>
                      </div>
                      <p className="font-semibold">Digital verificable</p>
                    </div>
                  </div>

                  {/* Benefits list */}
                  <div className="space-y-3">
                    {[
                      "Fundamentos de IA y prompt engineering legal",
                      "Automatización de documentos con validación IA",
                      "Ética, responsabilidad e implementación práctica"
                    ].map((benefit, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <ChevronRight className="w-3 h-3 text-primary" />
                        </div>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Gamification hint */}
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <Badge variant="secondary" className="mb-2">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Gana hasta 150 créditos
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Completa módulos y obtén recompensas para usar en herramientas IA
                    </p>
                  </div>

                  {/* Single CTA */}
                  <Button 
                    onClick={startCertification} 
                    size="lg" 
                    className="w-full"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Comenzar Certificación
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}