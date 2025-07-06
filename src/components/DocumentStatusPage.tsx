import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, FileText, Search, User, Download, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentStatusPageProps {
  onOpenChat: (message: string) => void;
}

export default function DocumentStatusPage({ onOpenChat }: DocumentStatusPageProps) {
  const [searchCode, setSearchCode] = useState("");
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const statusConfig = {
    solicitado: {
      label: "Solicitado",
      description: "Documento solicitado y en cola de procesamiento",
      icon: <FileText className="h-5 w-5" />,
      color: "bg-muted text-muted-foreground",
      step: 1
    },
    en_revision_abogado: {
      label: "En Revisión por Abogado", 
      description: "Un abogado especializado está revisando tu documento",
      icon: <User className="h-5 w-5" />,
      color: "bg-brand-orange/10 text-brand-orange border-brand-orange",
      step: 2
    },
    revisado: {
      label: "Revisado",
      description: "Documento completado y listo para pago",
      icon: <CheckCircle className="h-5 w-5" />,
      color: "bg-primary/10 text-primary border-primary",
      step: 3
    },
    pagado: {
      label: "Pagado",
      description: "Pago procesado, documento disponible para descarga",
      icon: <CheckCircle className="h-5 w-5" />,
      color: "bg-success/10 text-success border-success",
      step: 4
    },
    descargado: {
      label: "Descargado",
      description: "Documento descargado exitosamente",
      icon: <Download className="h-5 w-5" />,
      color: "bg-success text-success-foreground",
      step: 5
    }
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    
    setIsLoading(true);
    setDocumentData(null);
    
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', searchCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        setDocumentData(null);
        toast({
          title: "Documento no encontrado",
          description: "No se encontró ningún documento con ese código de seguimiento.",
          variant: "destructive",
        });
        return;
      }

      // Transform data to match expected format
      const transformedData = {
        code: data.token,
        type: data.document_type,
        status: data.status,
        requestDate: new Date(data.created_at).toLocaleDateString('es-CO'),
        lastUpdate: new Date(data.updated_at).toLocaleDateString('es-CO'),
        price: data.price,
        description: `${data.document_type} personalizado`,
        user_email: data.user_email,
        user_name: data.user_name
      };

      setDocumentData(transformedData);
      toast({
        title: "Documento encontrado",
        description: `${data.document_type} - Estado: ${statusConfig[data.status as keyof typeof statusConfig]?.label}`,
      });

    } catch (error) {
      console.error('Error buscando documento:', error);
      setDocumentData(null);
      toast({
        title: "Error de búsqueda",
        description: "Ocurrió un error al buscar el documento. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (currentStep: number) => {
    return (currentStep / 5) * 100;
  };

  const renderStatusTimeline = (currentStatus: string) => {
    const currentStep = statusConfig[currentStatus as keyof typeof statusConfig]?.step || 1;
    
    return (
      <div className="space-y-4">
        {Object.entries(statusConfig).map(([key, config]) => {
          const isCompleted = config.step <= currentStep;
          const isCurrent = config.step === currentStep;
          
          return (
            <div key={key} className="flex items-start gap-4">
              <div className={`rounded-full p-2 ${isCompleted ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                {isCompleted ? <CheckCircle className="h-4 w-4" /> : config.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${isCurrent ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {config.label}
                  </h4>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Actual
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
            Seguimiento de Documento
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Consulta el estado de tu documento legal ingresando el código de seguimiento que recibiste por email.
          </p>
        </div>

        {/* Search Section */}
        <Card className="shadow-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Buscar Documento
            </CardTitle>
            <CardDescription>
              Ingresa tu código de seguimiento para ver el estado actual de tu documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search-code">Código de Seguimiento</Label>
                <Input
                  id="search-code"
                  placeholder="Ej: TEST123ABC, DEF456GHI..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !searchCode.trim()}
                  className="px-8"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Para probar, usa los códigos: TEST123ABC o DEF456GHI</p>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {documentData && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Document Info */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Información del Documento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Código</Label>
                  <p className="font-mono text-lg font-bold">{documentData.code}</p>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Documento</Label>
                  <p className="font-semibold">{documentData.type}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Descripción</Label>
                  <p className="text-sm">{documentData.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fecha Solicitud</Label>
                    <p className="text-sm">{documentData.requestDate}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Última Actualización</Label>
                    <p className="text-sm">{documentData.lastUpdate}</p>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Precio</Label>
                  <p className="text-lg font-bold text-success">${documentData.price.toLocaleString()} COP</p>
                </div>

                {/* Current Status Badge */}
                <div className="pt-4">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Estado Actual</Label>
                  <Badge className={statusConfig[documentData.status as keyof typeof statusConfig]?.color}>
                    {statusConfig[documentData.status as keyof typeof statusConfig]?.icon}
                    <span className="ml-2">{statusConfig[documentData.status as keyof typeof statusConfig]?.label}</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Progreso del Documento
                </CardTitle>
                <CardDescription>
                  Seguimiento detallado del estado de tu documento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progreso</span>
                    <span>{getProgressPercentage(statusConfig[documentData.status as keyof typeof statusConfig]?.step || 1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-success h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(statusConfig[documentData.status as keyof typeof statusConfig]?.step || 1)}%` }}
                    />
                  </div>
                </div>

                {/* Timeline */}
                {renderStatusTimeline(documentData.status)}

                {/* Action Buttons */}
                <div className="pt-6 space-y-3">
                  {documentData.status === 'revisado' && (
                    <Button variant="success" className="w-full" size="lg">
                      Proceder al Pago
                    </Button>
                  )}
                  
                  {documentData.status === 'pagado' && (
                    <Button variant="success" className="w-full" size="lg">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Documento
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onOpenChat(`Tengo una consulta sobre mi documento ${documentData.code} - ${documentData.type}`)}
                  >
                    Contactar Soporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No Results */}
        {searchCode && !documentData && !isLoading && (
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Documento No Encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  No se encontró ningún documento con el código <strong>{searchCode}</strong>
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Verifica que el código esté correctamente escrito</p>
                  <p>• El código fue enviado a tu email después de solicitar el documento</p>
                  <p>• Si sigues teniendo problemas, contacta nuestro soporte</p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => onOpenChat("No puedo encontrar mi documento con el código de seguimiento")}
                >
                  Contactar Soporte
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}