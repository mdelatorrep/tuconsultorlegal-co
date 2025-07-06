import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, FileText, Search, User, Download, AlertCircle, Shield, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBoldCheckout } from "./document-payment/useBoldCheckout";
import { generatePDFDownload } from "./document-payment/pdfGenerator";

interface UnifiedDocumentPageProps {
  onOpenChat: (message: string) => void;
}

export default function UnifiedDocumentPage({ onOpenChat }: UnifiedDocumentPageProps) {
  const [searchCode, setSearchCode] = useState("");
  const [documentData, setDocumentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [searchCodeError, setSearchCodeError] = useState("");
  const { toast } = useToast();
  const { openCheckout, currentOrderId } = useBoldCheckout(documentData);

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
    revision_usuario: {
      label: "Listo para Revisión",
      description: "Documento revisado por abogado, listo para tu aprobación y pago",
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

  // Check for URL parameters on load and setup auto-refresh
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTrackingCode = urlParams.get('code');
    const paymentStatus = urlParams.get('payment');
    
    if (urlTrackingCode) {
      setSearchCode(urlTrackingCode);
      handleSearch(urlTrackingCode);
      
      // Check if coming back from successful payment
      if (paymentStatus === 'success') {
        // Set up polling to check payment status
        let attempts = 0;
        const maxAttempts = 20; // 2 minutes total
        
        const pollPaymentStatus = async () => {
          attempts++;
          console.log(`Checking payment status, attempt ${attempts}`);
          
          await handleSearch(urlTrackingCode);
          
          // Check if document status is now 'pagado'
          const { data } = await supabase
            .from('document_tokens')
            .select('status')
            .eq('token', urlTrackingCode.trim().toUpperCase())
            .maybeSingle();
            
          if (data?.status === 'pagado') {
            setPaymentCompleted(true);
            toast({
              title: "¡Pago confirmado!",
              description: "Tu pago ha sido procesado exitosamente. Ya puedes descargar tu documento.",
            });
            return true; // Stop polling
          }
          
          return false; // Continue polling
        };
        
        const intervalId = setInterval(async () => {
          const paymentConfirmed = await pollPaymentStatus();
          
          if (attempts >= maxAttempts || paymentConfirmed) {
            clearInterval(intervalId);
          }
        }, 6000); // Check every 6 seconds
        
        // Clean up interval after 2 minutes
        setTimeout(() => {
          clearInterval(intervalId);
        }, 120000);
      }
    }
  }, []);

  const handleSearch = async (codeToSearch?: string) => {
    const codeValue = codeToSearch || searchCode;
    
    if (!codeValue.trim()) {
      setSearchCodeError("Por favor ingresa un código de seguimiento válido");
      return;
    }
    
    setIsLoading(true);
    setDocumentData(null);
    setSearchCodeError("");
    
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', codeValue.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        setDocumentData(null);
        setSearchCodeError("Código no encontrado. Verifica que sea correcto.");
        toast({
          title: "Documento no encontrado",
          description: "No se encontró ningún documento con ese código de seguimiento.",
          variant: "destructive",
        });
        return;
      }

      // Check if already paid/downloaded
      if (data.status === 'pagado' || data.status === 'descargado') {
        setPaymentCompleted(true);
      }

      setDocumentData(data);
      toast({
        title: "Documento encontrado",
        description: `${data.document_type} - Estado: ${statusConfig[data.status as keyof typeof statusConfig]?.label}`,
      });

    } catch (error) {
      console.error('Error buscando documento:', error);
      setDocumentData(null);
      setSearchCodeError("Error al verificar el código. Intenta nuevamente.");
      toast({
        title: "Error de búsqueda",
        description: "Ocurrió un error al buscar el documento. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!documentData) return;

    setIsProcessingPayment(true);
    
    const success = openCheckout();
    
    if (!success) {
      setIsProcessingPayment(false);
      return;
    }

    // Start checking payment status periodically
    if (currentOrderId) {
      startPaymentStatusChecking(currentOrderId);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    if (!orderId) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { orderId }
      });

      if (error) {
        console.error('Error checking payment status:', error);
        return false;
      }

      if (data?.paymentApproved) {
        setPaymentCompleted(true);
        setIsProcessingPayment(false);
        toast({
          title: "¡Pago completado!",
          description: "Tu pago ha sido procesado exitosamente.",
        });
        // Refresh document data
        await handleSearch();
        return true;
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
    }
    return false;
  };

  const startPaymentStatusChecking = (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 40;
    
    const intervalId = setInterval(async () => {
      attempts++;
      const paymentComplete = await checkPaymentStatus(orderId);
      
      if (attempts >= maxAttempts || paymentComplete) {
        clearInterval(intervalId);
        setIsProcessingPayment(false);
      }
    }, 3000);

    setTimeout(() => {
      clearInterval(intervalId);
      setIsProcessingPayment(false);
    }, 120000);
  };

  const handleDownloadDocument = async () => {
    if (!documentData) return;

    // Update status to 'descargado'
    await updateDocumentStatus('descargado');
    
    // Generate PDF download
    generatePDFDownload(documentData);
  };

  const updateDocumentStatus = async (status: 'solicitado' | 'en_revision_abogado' | 'revision_usuario' | 'pagado' | 'descargado') => {
    if (!documentData) return;

    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ status })
        .eq('id', documentData.id);

      if (error) {
        console.error('Error updating status:', error);
      }
    } catch (error) {
      console.error('Error updating document status:', error);
    }
  };

  const handlePreviewDocument = () => {
    if (!documentData) return;
    
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Vista Previa - ${documentData.document_type}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
                          font-size: 48px; color: rgba(255, 0, 0, 0.2); z-index: -1; pointer-events: none; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .content { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="watermark">VISTA PREVIA</div>
            <div class="header">
              <h1>${documentData.document_type}</h1>
              <p><strong>Código:</strong> ${documentData.token}</p>
            </div>
            <div class="content">${documentData.document_content}</div>
          </body>
        </html>
      `);
      previewWindow.document.close();
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
            Consulta tu Documento Legal
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ingresa tu código de seguimiento para consultar el estado, revisar, pagar y descargar tu documento personalizado.
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
              Ingresa tu código de seguimiento para acceder a tu documento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search-code">Código de Seguimiento</Label>
                <Input
                  id="search-code"
                  placeholder="Ej: DOC001, DOC002..."
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className={searchCodeError ? "border-destructive" : ""}
                />
                {searchCodeError && (
                  <p className="text-sm text-destructive mt-1">{searchCodeError}</p>
                )}
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => handleSearch()}
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
              <p>💡 <strong>Tip:</strong> Para probar, usa los códigos: DOC001, DOC002, DOC003, DOC004, DOC005</p>
            </div>
          </CardContent>
        </Card>

        {/* Document Results */}
        {documentData && (
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Document Preview Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Vista Previa del Documento
                </CardTitle>
                <CardDescription>
                  Código: {documentData.token}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Documento</Label>
                  <p className="font-semibold text-lg">{documentData.document_type}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Estado Actual</Label>
                  <div className="mt-2">
                    <Badge className={statusConfig[documentData.status as keyof typeof statusConfig]?.color}>
                      {statusConfig[documentData.status as keyof typeof statusConfig]?.icon}
                      <span className="ml-2">{statusConfig[documentData.status as keyof typeof statusConfig]?.label}</span>
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Contenido (Vista Previa)</Label>
                  <Textarea
                    value={documentData.document_content?.substring(0, 200) + "..."}
                    readOnly
                    className="mt-2 h-32 resize-none bg-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Fecha Solicitud</Label>
                    <p className="text-sm">{new Date(documentData.created_at).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Última Actualización</Label>
                    <p className="text-sm">{new Date(documentData.updated_at).toLocaleDateString('es-CO')}</p>
                  </div>
                </div>

                {/* Preview Button */}
                <Button
                  onClick={handlePreviewDocument}
                  variant="outline"
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Vista Previa Completa
                </Button>
              </CardContent>
            </Card>

            {/* Payment/Action Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-success" />
                  {paymentCompleted || documentData.status === 'pagado' || documentData.status === 'descargado' 
                    ? "Documento Listo" 
                    : documentData.status === 'revision_usuario' 
                    ? "Proceder al Pago" 
                    : "Estado del Documento"}
                </CardTitle>
                <CardDescription>
                  {paymentCompleted || documentData.status === 'pagado' || documentData.status === 'descargado'
                    ? "Tu documento está listo para descargar"
                    : documentData.status === 'revision_usuario'
                    ? "Documento revisado, procede con el pago"
                    : statusConfig[documentData.status as keyof typeof statusConfig]?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Payment Section for revision_usuario status */}
                {documentData.status === 'revision_usuario' && !paymentCompleted && (
                  <>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{documentData.document_type}</span>
                        <span className="font-bold">${documentData.price.toLocaleString()} COP</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Validación legal incluida</span>
                        <span>Incluido</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>Formato PDF descargable</span>
                        <span>Incluido</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total</span>
                        <span className="text-success">${documentData.price.toLocaleString()} COP</span>
                      </div>
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={isProcessingPayment}
                      className="w-full"
                      size="lg"
                      variant="success"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                          Procesando Pago...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-2" />
                          Pagar ${documentData.price.toLocaleString()} COP
                        </>
                      )}
                    </Button>

                    <div className="text-center text-sm text-muted-foreground">
                      <p className="flex items-center justify-center gap-2">
                        <Shield className="h-4 w-4" />
                        Pago 100% seguro y encriptado
                      </p>
                    </div>
                  </>
                )}

                {/* Download Section for paid documents */}
                {(paymentCompleted || documentData.status === 'pagado' || documentData.status === 'descargado') && (
                  <>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="text-xl font-semibold text-success">¡Documento Listo!</h3>
                      <p className="text-muted-foreground">
                        Tu documento está disponible para descarga sin marca de agua
                      </p>
                    </div>

                    <Button
                      onClick={handleDownloadDocument}
                      className="w-full"
                      size="lg"
                      variant="success"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Documento PDF
                    </Button>
                  </>
                )}

                {/* Status display for other states */}
                {documentData.status !== 'revision_usuario' && documentData.status !== 'pagado' && documentData.status !== 'descargado' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      {statusConfig[documentData.status as keyof typeof statusConfig]?.icon}
                    </div>
                    <h3 className="text-lg font-semibold">
                      {statusConfig[documentData.status as keyof typeof statusConfig]?.label}
                    </h3>
                    <p className="text-muted-foreground">
                      {statusConfig[documentData.status as keyof typeof statusConfig]?.description}
                    </p>
                  </div>
                )}

                {/* Support */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    ¿Necesitas ayuda o tienes dudas?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChat(`Tengo una consulta sobre mi documento ${documentData.token} - ${documentData.document_type}`)}
                    className="w-full"
                  >
                    Contactar Soporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Timeline */}
        {documentData && (
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
            </CardContent>
          </Card>
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