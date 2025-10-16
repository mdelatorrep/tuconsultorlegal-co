import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Clock, FileText, Search, User, Download, AlertCircle, Shield, Eye, Maximize2, Minimize2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBoldCheckout } from "./document-payment/useBoldCheckout";
import { generatePDFDownload } from "./document-payment/pdfGenerator";
import DOMPurify from 'dompurify';

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
  const [userObservations, setUserObservations] = useState("");
  const [isSendingObservations, setIsSendingObservations] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
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
    const boldOrderId = urlParams.get('bold-order-id');
    const boldTxStatus = urlParams.get('bold-tx-status');
    
    if (urlTrackingCode) {
      setSearchCode(urlTrackingCode);
      
      // If Bold confirms payment is approved, directly update the document status
      if (boldTxStatus === 'approved' && boldOrderId) {
        handleDirectPaymentApproval(urlTrackingCode);
      } else {
        handleSearch(urlTrackingCode);
        
        // Check if coming back from successful payment (fallback)
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

  const handleDirectPaymentApproval = async (codeToVerify: string) => {
    setIsLoading(true);
    
    try {
      // First get document data
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', codeToVerify.trim().toUpperCase())
        .maybeSingle();

      if (error || !data) {
        setSearchCodeError("Código no encontrado. Verifica que sea correcto.");
        setDocumentData(null);
        return;
      }

      // Update document status to paid
      const { error: updateError } = await supabase
        .from('document_tokens')
        .update({ 
          status: 'pagado',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updateError) {
        console.error('Error updating document status:', updateError);
        // Fallback to normal verification if update fails
        await handleSearch(codeToVerify);
        return;
      }

      // Set payment as completed
      setPaymentCompleted(true);
      setDocumentData({ ...data, status: 'pagado' });
      
      toast({
        title: "¡Pago confirmado!",
        description: "Tu pago ha sido procesado exitosamente. Puedes descargar el documento.",
      });

    } catch (error) {
      console.error('Error processing direct payment approval:', error);
      // Fallback to normal verification
      await handleSearch(codeToVerify);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!documentData) return;

    // Handle free documents (price = 0)
    if (documentData.price === 0) {
      setIsProcessingPayment(true);
      
      try {
        // Directly mark free documents as paid
        const { error } = await supabase
          .from('document_tokens')
          .update({ 
            status: 'pagado',
            updated_at: new Date().toISOString()
          })
          .eq('id', documentData.id);

        if (error) {
          console.error('Error updating free document status:', error);
          toast({
            title: "Error",
            description: "No se pudo procesar el documento gratuito. Intenta nuevamente.",
            variant: "destructive",
          });
        } else {
          setPaymentCompleted(true);
          setDocumentData({ ...documentData, status: 'pagado' });
          toast({
            title: "¡Documento listo!",
            description: "El documento gratuito está disponible para descarga.",
          });
        }
      } catch (error) {
        console.error('Error processing free document:', error);
        toast({
          title: "Error",
          description: "Ocurrió un error al procesar el documento gratuito.",
          variant: "destructive",
        });
      } finally {
        setIsProcessingPayment(false);
      }
      return;
    }

    // Regular payment flow for paid documents
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

    try {
      // First, generate the PDF download
      const downloadSuccess = generatePDFDownload(documentData, toast);
      
      if (downloadSuccess) {
        // Update status to 'descargado' only if download was successful
        const { error } = await supabase
          .from('document_tokens')
          .update({ 
            status: 'descargado',
            updated_at: new Date().toISOString()
          })
          .eq('id', documentData.id);

        if (error) {
          console.error('Error updating document status to descargado:', error);
          toast({
            title: "Advertencia",
            description: "El documento se descargó, pero no se pudo actualizar el estado. Contacta soporte si es necesario.",
            variant: "destructive",
          });
        } else {
          // Update local state to reflect the change
          setDocumentData({ ...documentData, status: 'descargado' });
          
          toast({
            title: "Documento descargado",
            description: "El documento ha sido descargado y marcado como completado.",
          });
        }
      }
    } catch (error) {
      console.error('Error during download process:', error);
      toast({
        title: "Error en la descarga",
        description: "Ocurrió un error durante el proceso de descarga. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const handleSendObservations = async () => {
    if (!documentData || !userObservations.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa tus observaciones antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingObservations(true);
    
    try {
      const { error } = await supabase
        .from('document_tokens')
        .update({ 
          status: 'en_revision_abogado',
          user_observations: userObservations.trim(),
          user_observation_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', documentData.id);

      if (error) {
        console.error('Error sending observations:', error);
        toast({
          title: "Error al enviar observaciones",
          description: "No se pudieron enviar las observaciones. Intenta nuevamente.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Observaciones enviadas",
        description: "Tus observaciones han sido enviadas al abogado para revisión.",
      });

      // Refresh document data
      await handleSearch();
      setUserObservations(""); // Clear the observations field
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar las observaciones.",
        variant: "destructive",
      });
    } finally {
      setIsSendingObservations(false);
    }
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
    setShowPreview(true);
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
                    {/* User Observations Section */}
                    <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold">Revisión del Documento</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Revisa cuidadosamente el documento. Si está correcto, procede al pago. 
                        Si necesitas cambios, envía tus observaciones al abogado.
                      </p>
                      
                      {/* Show existing observations if any */}
                      {documentData.user_observations && (
                        <div className="p-3 bg-background rounded border">
                          <Label className="text-sm font-medium text-muted-foreground">Observaciones Anteriores:</Label>
                          <p className="text-sm mt-1">{documentData.user_observations}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Enviadas el: {new Date(documentData.user_observation_date).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="observations">Observaciones o Cambios Requeridos (Opcional)</Label>
                        <Textarea
                          id="observations"
                          placeholder="Escribe aquí cualquier cambio o corrección que necesites en el documento..."
                          value={userObservations}
                          onChange={(e) => setUserObservations(e.target.value)}
                          rows={4}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    {/* Pricing Details */}
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

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      {/* Send Observations Button */}
                      <Button
                        onClick={handleSendObservations}
                        disabled={isSendingObservations || !userObservations.trim()}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        {isSendingObservations ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                            Enviando Observaciones...
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4 mr-2" />
                            Enviar Observaciones al Abogado
                          </>
                        )}
                      </Button>

                      {/* Payment Button */}
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
                            Aprobar y Pagar ${documentData.price.toLocaleString()} COP
                          </>
                        )}
                      </Button>
                    </div>

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

      {/* PDF Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent 
          className={`bg-background border-border ${isPreviewMaximized ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[85vh]'} p-0 transition-all duration-300`}
        >
          <DialogHeader className="px-6 py-4 border-b border-border bg-background z-50 sticky top-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Vista Previa - {documentData?.document_type}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPreviewMaximized(!isPreviewMaximized)}
                  className="h-8 w-8"
                >
                  {isPreviewMaximized ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPreview(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="destructive" className="text-xs">
                VISTA PREVIA - NO VÁLIDO PARA USO LEGAL
              </Badge>
              <span className="text-xs text-muted-foreground">
                Código: {documentData?.token}
              </span>
            </div>
          </DialogHeader>
          
          <div className="relative overflow-y-auto overflow-x-hidden h-full bg-muted/30">
            {/* Watermark overlay */}
            <div className="fixed inset-0 pointer-events-none z-10 select-none">
              <div 
                className="absolute inset-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.08) 0px, rgba(239, 68, 68, 0.08) 200px, transparent 200px, transparent 400px)',
                }}
              />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -rotate-45 text-6xl font-bold text-destructive/20 whitespace-nowrap select-none pointer-events-none">
                VISTA PREVIA - NO VÁLIDO PARA USO LEGAL
              </div>
            </div>
            
            {/* Document content */}
            <div className="relative z-0 p-8">
              <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg p-8 select-none">
                <div className="border-b-2 border-foreground pb-4 mb-6">
                  <h1 className="text-2xl font-bold mb-2">{documentData?.document_type}</h1>
                  <p className="text-sm text-muted-foreground">Código: {documentData?.token}</p>
                  <p className="text-sm text-destructive font-semibold mt-2">
                    ⚠️ DOCUMENTO DE VISTA PREVIA - NO VÁLIDO PARA USO LEGAL
                  </p>
                </div>
                <div 
                  className="whitespace-pre-wrap text-sm leading-relaxed"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(documentData?.document_content || '', {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th'],
                      ALLOWED_ATTR: ['align', 'style', 'class']
                    })
                  }}
                />
              </div>
              
              {/* Security notice */}
              <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg shadow-lg text-sm font-semibold z-50 select-none">
                📵 Vista Previa Protegida - Solo para Revisión
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}