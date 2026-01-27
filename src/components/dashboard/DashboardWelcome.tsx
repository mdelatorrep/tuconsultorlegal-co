import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Scale } from "lucide-react";

interface DashboardWelcomeProps {
  userName: string;
  onViewCredits: () => void;
}

export function DashboardWelcome({ userName, onViewCredits }: DashboardWelcomeProps) {
  return (
    <Card className="h-full bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
              Bienvenido, {userName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Tu entorno profesional integrado en Praxis Hub
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-2 text-xs md:text-sm w-fit">
              <Scale className="h-3 w-3 md:h-4 md:w-4" />
              Praxis Hub
            </Badge>
            <Button 
              variant="default" 
              size="sm"
              onClick={onViewCredits}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Mis Créditos
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
