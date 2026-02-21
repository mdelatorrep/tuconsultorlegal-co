import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Eye, PenTool, Target, Users, Database, Gavel, Radar, Calendar, Wand2, Mic, TrendingUp, ShieldCheck, Coins } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useLawyerAuth } from "@/hooks/useLawyerAuth";

interface Tool {
  title: string;
  icon: LucideIcon;
  view: string;
  gradient: string;
}

interface QuickToolsGridProps {
  onViewChange: (view: string) => void;
  newLeadsCount?: number;
}

const tools: Tool[] = [
  { title: "Investigación", icon: Search, view: "research", gradient: "from-primary to-primary/70" },
  { title: "SUIN-Juriscol", icon: Database, view: "suin-juriscol", gradient: "from-primary/90 to-primary/60" },
  { title: "Consulta Procesos", icon: Gavel, view: "process-query", gradient: "from-foreground/80 to-foreground/60" },
  { title: "Monitor Procesos", icon: Radar, view: "process-monitor", gradient: "from-primary/80 to-primary/50" },
  { title: "Análisis", icon: Eye, view: "analyze", gradient: "from-primary to-primary/70" },
  { title: "Redacción", icon: PenTool, view: "draft", gradient: "from-primary/90 to-primary/60" },
  { title: "Estrategia", icon: Target, view: "strategize", gradient: "from-foreground/70 to-foreground/50" },
  { title: "Predictor", icon: TrendingUp, view: "case-predictor", gradient: "from-primary/80 to-primary/50" },
  { title: "CRM", icon: Users, view: "crm", gradient: "from-primary to-primary/70" },
  { title: "Calendario", icon: Calendar, view: "legal-calendar", gradient: "from-primary/90 to-primary/60" },
  { title: "Copilot", icon: Wand2, view: "legal-copilot", gradient: "from-primary/80 to-primary/50" },
  { title: "Voz", icon: Mic, view: "voice-assistant", gradient: "from-primary to-primary/70" },
  { title: "Verificación", icon: ShieldCheck, view: "lawyer-verification", gradient: "from-primary/90 to-primary/60" },
];

export function QuickToolsGrid({ onViewChange, newLeadsCount = 0 }: QuickToolsGridProps) {
  const { user } = useLawyerAuth();
  const { balance } = useCredits(user?.id || null);
  
  const hasCredits = (balance?.current_balance || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold">Herramientas Rápidas</h2>
      </div>
      
      {/* CTA sutil para comprar créditos cuando no hay */}
      {!hasCredits && (
        <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>Obtén créditos para usar todas las herramientas IA</span>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 shrink-0"
              onClick={() => onViewChange("credits")}
            >
              Obtener créditos
            </Button>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
        {tools.map((tool) => (
          <Card
            key={tool.view}
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0 relative"
            onClick={() => onViewChange(tool.view)}
          >
            {/* CRM notification badge */}
            {tool.view === "crm" && newLeadsCount > 0 && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-destructive text-destructive-foreground px-1.5 py-0.5 text-xs font-bold animate-pulse shadow-lg">
                  {newLeadsCount}
                </Badge>
              </div>
            )}
            <CardContent className="p-3 text-center">
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-r ${tool.gradient} flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform duration-300`}
              >
                <tool.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <h3 className="font-medium text-xs md:text-sm truncate">{tool.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}