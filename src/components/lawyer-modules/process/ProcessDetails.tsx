import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Gavel,
  Loader2,
  Brain,
  ClipboardList,
  Info
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
  isLoadingDetails?: boolean;
}

export function ProcessDetails({ process, aiAnalysis, onBack, isLoadingDetails }: ProcessDetailsProps) {
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

  const daysSinceLastAction = process.fechaUltimaActuacion
    ? Math.floor((Date.now() - new Date(process.fechaUltimaActuacion).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const getActivityStatus = () => {
    if (daysSinceLastAction === null) return { label: 'Sin datos', variant: 'outline' as const, color: 'text-muted-foreground' };
    if (daysSinceLastAction < 30) return { label: 'Activo', variant: 'default' as const, color: 'text-green-600 dark:text-green-400' };
    if (daysSinceLastAction < 90) return { label: 'Moderado', variant: 'secondary' as const, color: 'text-yellow-600 dark:text-yellow-400' };
    return { label: 'Inactivo', variant: 'outline' as const, color: 'text-red-600 dark:text-red-400' };
  };

  const activityStatus = getActivityStatus();

  return (
    <div className="space-y-5">
      {/* Header - Compact and clear */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Scale className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-lg font-bold font-mono tracking-tight">
              {process.llaveProceso || 'Proceso sin radicado'}
            </h2>
            <Badge variant={activityStatus.variant} className="text-xs">
              {activityStatus.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{process.despacho}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            const url = `https://consultaprocesos.ramajudicial.gov.co/procesos/Procesos/NumeroRadicacion?radicado=${process.llaveProceso}`;
            window.open(url, '_blank');
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Portal Oficial
        </Button>
      </div>

      {/* Key Facts - Horizontal summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoPill icon={<FileText className="h-4 w-4" />} label="Tipo" value={process.tipoProceso || 'N/A'} />
        <InfoPill icon={<Gavel className="h-4 w-4" />} label="Clase" value={process.claseProceso || 'N/A'} />
        <InfoPill icon={<MapPin className="h-4 w-4" />} label="Ubicación" value={process.departamento || process.ubicacion || 'N/A'} />
        <InfoPill icon={<Calendar className="h-4 w-4" />} label="Radicación" value={formatDate(process.fechaRadicacion)} />
      </div>

      {/* Extra details row */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm px-1">
        {process.ponente && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Gavel className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{process.ponente}</span>
          </span>
        )}
        {process.subclaseProceso && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            {process.subclaseProceso}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          Última actuación: <span className={`font-medium ${activityStatus.color}`}>{formatDate(process.fechaUltimaActuacion)}</span>
          {daysSinceLastAction !== null && (
            <span className="text-xs">({daysSinceLastAction}d)</span>
          )}
        </span>
      </div>

      {/* Tabs - Redesigned with icons and better visual separation */}
      <Tabs defaultValue="actuaciones" className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/60 rounded-xl grid grid-cols-3 gap-1">
          <TabsTrigger 
            value="actuaciones" 
            className="flex items-center gap-2 py-2.5 px-3 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <ClipboardList className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {isLoadingDetails ? 'Cargando...' : `Actuaciones`}
            </span>
            {!isLoadingDetails && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-full ml-auto">
                {process.actuaciones?.length || 0}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="sujetos"
            className="flex items-center gap-2 py-2.5 px-3 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="truncate">Partes</span>
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-full ml-auto">
              {process.sujetos?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger 
            value="analisis"
            className="flex items-center gap-2 py-2.5 px-3 text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Brain className="h-4 w-4 shrink-0" />
            <span className="truncate">Análisis IA</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actuaciones" className="mt-4">
          {isLoadingDetails ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Cargando actuaciones desde la Rama Judicial...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ProcessTimeline 
              actuaciones={process.actuaciones || []} 
              maxVisible={10}
            />
          )}
        </TabsContent>

        <TabsContent value="sujetos" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Demandantes */}
            <Card className="border-l-4 border-l-primary/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Demandantes / Actores
                  <Badge variant="secondary" className="text-[10px] ml-auto">{demandantes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {demandantes.length > 0 ? (
                  <div className="space-y-2">
                    {demandantes.map((sujeto, index) => (
                      <SubjectRow key={index} sujeto={sujeto} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">Sin demandantes registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Demandados */}
            <Card className="border-l-4 border-l-destructive/60">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building className="h-4 w-4 text-destructive" />
                  Demandados
                  <Badge variant="secondary" className="text-[10px] ml-auto">{demandados.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {demandados.length > 0 ? (
                  <div className="space-y-2">
                    {demandados.map((sujeto, index) => (
                      <SubjectRow key={index} sujeto={sujeto} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">Sin demandados registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Otros Sujetos */}
            {otrosSujetos.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Otros Intervinientes
                    <Badge variant="secondary" className="text-[10px] ml-auto">{otrosSujetos.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otrosSujetos.map((sujeto, index) => (
                      <SubjectRow key={index} sujeto={sujeto} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analisis" className="mt-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Análisis con Inteligencia Artificial
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {aiAnalysis ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <MarkdownRenderer content={aiAnalysis} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">
                    El análisis de IA se generará automáticamente cuando consulte un proceso.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- Sub-components ---- */

function InfoPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-muted/50 rounded-lg px-3 py-2.5 min-w-0">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground leading-none mb-1">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function SubjectRow({ sujeto }: { sujeto: { nombre?: string; tipoSujeto?: string; representante?: string } }) {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-muted/30 rounded-lg">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm leading-tight">{sujeto.nombre || 'Sin nombre'}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sujeto.tipoSujeto}</p>
        {sujeto.representante && (
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Rep:</span> {sujeto.representante}
          </p>
        )}
      </div>
    </div>
  );
}
