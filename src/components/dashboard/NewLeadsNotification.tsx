import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Users } from "lucide-react";

interface NewLeadsNotificationProps {
  count: number;
  onViewCRM: () => void;
}

export function NewLeadsNotification({ count, onViewCRM }: NewLeadsNotificationProps) {
  if (count === 0) return null;

  return (
    <Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10 shadow-lg animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center animate-pulse">
              <Mail className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-1">
              ¡Tienes {count} {count === 1 ? "nueva consulta" : "nuevas consultas"}!
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {count === 1
                ? "Un cliente potencial ha solicitado tu asesoría."
                : `${count} clientes potenciales han solicitado tu asesoría.`}
            </p>
            <Button
              onClick={onViewCRM}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Users className="h-4 w-4 mr-2" />
              Ver consultas en CRM
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
