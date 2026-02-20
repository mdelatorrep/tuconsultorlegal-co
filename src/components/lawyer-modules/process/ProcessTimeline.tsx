import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Calendar, ChevronDown, ChevronUp, Clock } from "lucide-react";
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
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay actuaciones registradas</p>
          </div>
        </CardContent>
      </Card>
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

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return `${d.getDate()} ${d.toLocaleDateString('es-CO', { month: 'short' })}`;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-3">
      {/* Actuaciones list */}
      <div className="space-y-2">
        {visibleActuaciones.map((actuacion, index) => {
          const isFirst = index === 0;
          return (
            <Card 
              key={index} 
              className={`transition-colors ${isFirst ? 'border-primary/40 bg-primary/[0.03]' : 'hover:bg-muted/30'}`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex gap-3">
                  {/* Date column */}
                  <div className="shrink-0 w-16 text-center pt-0.5">
                    <div className={`text-xs font-semibold ${isFirst ? 'text-primary' : 'text-muted-foreground'}`}>
                      {formatShortDate(actuacion.fechaActuacion || actuacion.fechaRegistro)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {actuacion.fechaActuacion || actuacion.fechaRegistro
                        ? new Date(actuacion.fechaActuacion || actuacion.fechaRegistro || '').getFullYear()
                        : ''}
                    </div>
                  </div>

                  {/* Vertical line + dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 ${isFirst ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'}`} />
                    {index < visibleActuaciones.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-start gap-2 flex-wrap">
                      <p className={`text-sm leading-snug ${isFirst ? 'font-semibold' : 'font-medium'}`}>
                        {actuacion.actuacion || 'Sin descripción'}
                      </p>
                      {isFirst && (
                        <Badge className="text-[10px] h-4 px-1.5 shrink-0">
                          Reciente
                        </Badge>
                      )}
                    </div>
                    
                    {actuacion.anotacion && (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {actuacion.anotacion}
                      </p>
                    )}

                    {(actuacion.fechaInicia || actuacion.fechaFinaliza) && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {actuacion.fechaInicia && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Inicia: {formatDate(actuacion.fechaInicia)}
                          </span>
                        )}
                        {actuacion.fechaFinaliza && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Finaliza: {formatDate(actuacion.fechaFinaliza)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Show more/less */}
      {actuaciones.length > maxVisible && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Ver todas las actuaciones ({actuaciones.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
