import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProcessTimeline } from "./ProcessTimeline";
import { 
  Scale, 
  Users, 
  FileText, 
  ExternalLink,
  MapPin,
  Calendar,
  ArrowLeft,
  User,
  Building,
  Gavel
} from "lucide-react";

interface ProcessDetailsProps {
  process: {
    llaveProceso?: string;
    idProceso?: string;
    despacho?: string;
    departamento?: string;
    tipoProceso?: string;
    claseProceso?: string;
    subclaseProceso?: string;
    recurso?: string;
    ubicacion?: string;
    ponente?: string;
    fechaRadicacion?: string;
    fechaUltimaActuacion?: string;
    esPrivado?: boolean;
    cantFilas?: number;
    sujetos?: Array<{
      nombre?: string;
      tipoSujeto?: string;
      representante?: string;
    }>;
    actuaciones?: Array<{
      fechaActuacion?: string;
      actuacion?: string;
      anotacion?: string;
      fechaInicia?: string;
      fechaFinaliza?: string;
      fechaRegistro?: string;
    }>;
  };
  aiAnalysis?: string;
  onBack: () => void;
}

export function ProcessDetails({ process, aiAnalysis, onBack }: ProcessDetailsProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const demandantes = process.sujetos?.filter(s => 
    s.tipoSujeto?.toLowerCase().includes('demandante') || 
    s.tipoSujeto?.toLowerCase().includes('actor') ||
    s.tipoSujeto?.toLowerCase().includes('accionante')
  ) || [];
  
  const demandados = process.sujetos?.filter(s => 
    s.tipoSujeto?.toLowerCase().includes('demandado') ||
    s.tipoSujeto?.toLowerCase().includes('accionado')
  ) || [];

  const otrosSujetos = process.sujetos?.filter(s => 
    !demandantes.includes(s) && !demandados.includes(s)
  ) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {process.llaveProceso || 'Proceso sin radicado'}
          </h2>
          <p className="text-muted-foreground">{process.despacho}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            const url = `https://consultaprocesos.ramajudicial.gov.co/procesos/Procesos/NumeroRadicacion?radicado=${process.llaveProceso}`;
            window.open(url, '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Ver en Rama Judicial
        </Button>
      </div>

      {/* Process Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Información del Proceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block mb-1">Tipo de Proceso</span>
              <Badge variant="default">{process.tipoProceso || 'N/A'}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Clase</span>
              <span className="font-medium">{process.claseProceso || 'N/A'}</span>
            </div>
            {process.subclaseProceso && (
              <div>
                <span className="text-muted-foreground block mb-1">Subclase</span>
                <span className="font-medium">{process.subclaseProceso}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-xs">Ubicación</span>
                <span className="font-medium">{process.departamento || process.ubicacion || 'N/A'}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-xs">Fecha Radicación</span>
                <span className="font-medium">{formatDate(process.fechaRadicacion)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground block text-xs">Última Actuación</span>
                <span className="font-medium">{formatDate(process.fechaUltimaActuacion)}</span>
              </div>
            </div>
            {process.ponente && (
              <div className="flex items-start gap-2">
                <Gavel className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="text-muted-foreground block text-xs">Ponente</span>
                  <span className="font-medium">{process.ponente}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="actuaciones" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="actuaciones">
            Actuaciones ({process.actuaciones?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="sujetos">
            Partes ({process.sujetos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="analisis">
            Análisis IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actuaciones" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ProcessTimeline 
                actuaciones={process.actuaciones || []} 
                maxVisible={10}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sujetos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Demandantes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  Demandantes / Actores ({demandantes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {demandantes.length > 0 ? (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {demandantes.map((sujeto, index) => (
                        <div 
                          key={index} 
                          className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg"
                        >
                          <p className="font-medium text-sm">{sujeto.nombre}</p>
                          <p className="text-xs text-muted-foreground">{sujeto.tipoSujeto}</p>
                          {sujeto.representante && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Rep: {sujeto.representante}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin demandantes registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Demandados */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4 text-red-500" />
                  Demandados ({demandados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {demandados.length > 0 ? (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {demandados.map((sujeto, index) => (
                        <div 
                          key={index} 
                          className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg"
                        >
                          <p className="font-medium text-sm">{sujeto.nombre}</p>
                          <p className="text-xs text-muted-foreground">{sujeto.tipoSujeto}</p>
                          {sujeto.representante && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Rep: {sujeto.representante}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-sm">Sin demandados registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Otros Sujetos */}
            {otrosSujetos.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Otros Intervinientes ({otrosSujetos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {otrosSujetos.map((sujeto, index) => (
                      <div 
                        key={index} 
                        className="p-2 bg-muted/50 rounded-lg"
                      >
                        <p className="font-medium text-sm">{sujeto.nombre}</p>
                        <p className="text-xs text-muted-foreground">{sujeto.tipoSujeto}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analisis" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Análisis con Inteligencia Artificial</CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">
                    {aiAnalysis}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  El análisis de IA se generará automáticamente cuando consulte un proceso.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}