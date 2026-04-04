import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface DashboardWelcomeProps {
  userName: string;
  onViewCredits: () => void;
}

export function DashboardWelcome({ userName, onViewCredits }: DashboardWelcomeProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-foreground truncate">
            Bienvenido, {userName}
          </h1>
          <p className="text-muted-foreground text-xs flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span><span className="font-medium text-foreground">Lexi</span> te asiste en cada herramienta</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button 
          variant="default" 
          size="sm"
          onClick={onViewCredits}
          className="bg-brand-primary hover:bg-brand-primary/90 text-xs h-8"
        >
          Mis Créditos
        </Button>
      </div>
    </div>
  );
}
