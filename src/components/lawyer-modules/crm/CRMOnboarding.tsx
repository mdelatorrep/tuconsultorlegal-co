import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Briefcase, CheckCircle, Globe, ArrowRight } from "lucide-react";

interface CRMOnboardingProps {
  onNavigateToProfile: () => void;
  onOpenClients: () => void;
  onOpenCases: () => void;
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
    actionLabel: null,
    key: "tasks" as const,
  },
];

export default function CRMOnboarding({ onNavigateToProfile, onOpenClients, onOpenCases }: CRMOnboardingProps) {
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
          <h2 className="text-xl font-bold">¡Bienvenido a tu CRM Legal!</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Sigue estos pasos para empezar a gestionar tus clientes, casos y tareas de forma organizada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className="flex gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Paso {index + 1}</span>
                  </div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                  {step.actionLabel && (
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
