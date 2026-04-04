import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Briefcase, CheckCircle, Globe, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStepStatus {
  profile: boolean;
  clients: boolean;
  cases: boolean;
  tasks: boolean;
}

interface CRMOnboardingProps {
  onNavigateToProfile: () => void;
  onOpenClients: () => void;
  onOpenCases: () => void;
  completedSteps: OnboardingStepStatus;
}

const STEPS = [
  {
    icon: Globe,
    title: "Activa tu Perfil Público",
    description: "Los clientes potenciales podrán encontrarte y contactarte directamente desde la plataforma.",
    actionLabel: "Configurar Perfil",
    key: "profile" as const,
  },
  {
    icon: UserPlus,
    title: "Agrega tu primer cliente",
    description: "Registra los datos de un cliente para empezar a gestionar su información y casos.",
    actionLabel: "Agregar Cliente",
    key: "clients" as const,
  },
  {
    icon: Briefcase,
    title: "Crea tu primer caso",
    description: "Asocia un caso al cliente para hacer seguimiento de actividades, documentos y plazos.",
    actionLabel: "Crear Caso",
    key: "cases" as const,
  },
  {
    icon: CheckCircle,
    title: "Gestiona tareas y seguimiento",
    description: "Organiza tu trabajo con tareas, fechas límite y recordatorios automáticos.",
    actionLabel: "Ver Tareas",
    key: "tasks" as const,
  },
];

export default function CRMOnboarding({ onNavigateToProfile, onOpenClients, onOpenCases, completedSteps }: CRMOnboardingProps) {
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = (completedCount / STEPS.length) * 100;

  const handleAction = (key: string) => {
    switch (key) {
      case "profile": onNavigateToProfile(); break;
      case "clients": onOpenClients(); break;
      case "cases": onOpenCases(); break;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold">¡Bienvenido a tu Gestión de Clientes y Procesos!</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Sigue estos pasos para empezar a gestionar tus clientes, casos y tareas de forma organizada.
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {completedCount}/{STEPS.length}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps[step.key];
            return (
              <div
                key={step.key}
                className={cn(
                  "flex gap-4 p-4 rounded-lg border transition-all",
                  isCompleted
                    ? "bg-primary/5 border-primary/30"
                    : "bg-card hover:shadow-sm"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isCompleted ? "bg-primary text-primary-foreground" : "bg-primary/10"
                )}>
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Paso {index + 1}</span>
                    {isCompleted && (
                      <span className="text-xs font-medium text-primary">✓ Completado</span>
                    )}
                  </div>
                  <h3 className={cn(
                    "font-semibold text-sm",
                    isCompleted && "line-through text-muted-foreground"
                  )}>{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {step.actionLabel && !isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 gap-1"
                      onClick={() => handleAction(step.key)}
                    >
                      {step.actionLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
