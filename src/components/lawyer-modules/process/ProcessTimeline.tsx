import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Actuacion {
  fechaActuacion?: string;
  actuacion?: string;
  anotacion?: string;
  fechaInicia?: string;
  fechaFinaliza?: string;
  fechaRegistro?: string;
}

interface ProcessTimelineProps {
  actuaciones: Actuacion[];
  maxVisible?: number;
}

export function ProcessTimeline({ actuaciones, maxVisible = 5 }: ProcessTimelineProps) {
  const [showAll, setShowAll] = useState(false);

  if (!actuaciones || actuaciones.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No hay actuaciones registradas</p>
      </div>
    );
  }

  const sortedActuaciones = [...actuaciones].sort((a, b) => {
    const dateA = new Date(a.fechaActuacion || a.fechaRegistro || 0);
    const dateB = new Date(b.fechaActuacion || b.fechaRegistro || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const visibleActuaciones = showAll 
    ? sortedActuaciones 
    : sortedActuaciones.slice(0, maxVisible);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Actuaciones ({actuaciones.length})
        </h4>
        {actuaciones.length > maxVisible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver todas ({actuaciones.length})
              </>
            )}
          </Button>
        )}
      </div>

      <ScrollArea className={showAll ? "h-[400px]" : ""}>
        <div className="relative pl-6 border-l-2 border-muted space-y-4">
          {visibleActuaciones.map((actuacion, index) => (
            <div key={index} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
              
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="text-xs">
                    {formatDate(actuacion.fechaActuacion || actuacion.fechaRegistro)}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs">
                      Más reciente
                    </Badge>
                  )}
                </div>
                
                <p className="font-medium text-sm">
                  {actuacion.actuacion || 'Sin descripción'}
                </p>
                
                {actuacion.anotacion && (
                  <p className="text-sm text-muted-foreground">
                    {actuacion.anotacion}
                  </p>
                )}

                {(actuacion.fechaInicia || actuacion.fechaFinaliza) && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {actuacion.fechaInicia && (
                      <span>Inicia: {formatDate(actuacion.fechaInicia)}</span>
                    )}
                    {actuacion.fechaFinaliza && (
                      <span>Finaliza: {formatDate(actuacion.fechaFinaliza)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}