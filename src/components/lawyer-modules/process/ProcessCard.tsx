import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Scale, 
  MapPin, 
  Calendar, 
  Users, 
  FileText,
  ExternalLink,
  Eye,
  Star,
  StarOff
} from "lucide-react";

interface ProcessCardProps {
  process: {
    llaveProceso?: string;
    idProceso?: string;
    despacho?: string;
    departamento?: string;
    tipoProceso?: string;
    claseProceso?: string;
    recurso?: string;
    ubicacion?: string;
    ponente?: string;
    fechaRadicacion?: string;
    fechaUltimaActuacion?: string;
    sujetos?: Array<{
      nombre?: string;
      tipoSujeto?: string;
    }>;
    actuaciones?: Array<{
      fechaActuacion?: string;
      actuacion?: string;
      anotacion?: string;
    }>;
  };
  onViewDetails?: () => void;
  onTrack?: () => void;
  isTracked?: boolean;
}

export function ProcessCard({ process, onViewDetails, onTrack, isTracked }: ProcessCardProps) {
  const getStatusColor = () => {
    // Simple status inference based on last action date
    if (!process.fechaUltimaActuacion) return 'secondary';
    
    const lastAction = new Date(process.fechaUltimaActuacion);
    const daysSinceAction = Math.floor((Date.now() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceAction < 30) return 'default';
    if (daysSinceAction < 90) return 'secondary';
    return 'outline';
  };

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

  const demandantes = process.sujetos?.filter(s => 
    s.tipoSujeto?.toLowerCase().includes('demandante') || 
    s.tipoSujeto?.toLowerCase().includes('actor')
  ) || [];
  
  const demandados = process.sujetos?.filter(s => 
    s.tipoSujeto?.toLowerCase().includes('demandado')
  ) || [];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{process.llaveProceso || 'Sin radicado'}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {process.despacho || 'Despacho no especificado'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={getStatusColor()}>
              {process.tipoProceso || 'Proceso'}
            </Badge>
            {onTrack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onTrack}
                className="h-8 w-8"
              >
                {isTracked ? (
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                ) : (
                  <StarOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Process Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {process.departamento || process.ubicacion || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {process.claseProceso || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Rad: {formatDate(process.fechaRadicacion)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              Últ: {formatDate(process.fechaUltimaActuacion)}
            </span>
          </div>
        </div>

        {/* Parties */}
        {(demandantes.length > 0 || demandados.length > 0) && (
          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Partes
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {demandantes.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Demandante(s):</span>
                  <div className="font-medium truncate">
                    {demandantes.slice(0, 2).map(s => s.nombre).join(', ')}
                    {demandantes.length > 2 && ` +${demandantes.length - 2}`}
                  </div>
                </div>
              )}
              {demandados.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Demandado(s):</span>
                  <div className="font-medium truncate">
                    {demandados.slice(0, 2).map(s => s.nombre).join(', ')}
                    {demandados.length > 2 && ` +${demandados.length - 2}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={onViewDetails}
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalles
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              const url = `https://consultaprocesos.ramajudicial.gov.co/procesos/Procesos/NumeroRadicacion?radicado=${process.llaveProceso}`;
              window.open(url, '_blank');
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}