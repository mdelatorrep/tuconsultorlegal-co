import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Download, Eye, FileText, Shield, Search, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Declare Bold Checkout types
declare global {
  interface Window {
    BoldCheckout: any;
  }
}

interface DocumentPaymentPageProps {
  onOpenChat: (message: string) => void;
}

export default function DocumentPaymentPage({ onOpenChat }: DocumentPaymentPageProps) {
  const [trackingCode, setTrackingCode] = useState("");
  const [documentData, setDocumentData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [trackingCodeError, setTrackingCodeError] = useState("");
  const [boldCheckoutInstance, setBoldCheckoutInstance] = useState<any>(null);
  const { toast } = useToast();

  // Initialize Bold Checkout script
  const initBoldCheckout = () => {
    if (document.querySelector('script[src="https://checkout.bold.co/library/boldPaymentButton.js"]')) {
      console.warn('Bold Checkout script is already loaded.');
      return;
    }

    const script = document.createElement('script');
    script.onload = () => {
      window.dispatchEvent(new Event('boldCheckoutLoaded'));
    };
    script.onerror = () => {
      window.dispatchEvent(new Event('boldCheckoutLoadFailed'));
    };
    script.src = 'https://checkout.bold.co/library/boldPaymentButton.js';
    document.head.appendChild(script);
  };

  // Create Bold Checkout instance when document is loaded
  useEffect(() => {
    if (documentData && !boldCheckoutInstance) {
      initBoldCheckout();

      const handleBoldLoaded = () => {
        if (window.BoldCheckout) {
          const orderId = `DOC-${documentData.id}-${Date.now()}`;
          const checkout = new window.BoldCheckout({
            orderId: orderId,
            currency: 'COP',
            amount: documentData.price.toString(),
            apiKey: 'LLAVE_DE_IDENTIDAD', // This should be configured with actual Bold API key
            integritySignature: 'HASH_DE_INTEGRIDAD', // This should be generated on backend
            description: `Pago documento: ${documentData.document_type}`,
            redirectionUrl: `${window.location.origin}/?code=${documentData.token}&payment=success`,
          });
          setBoldCheckoutInstance(checkout);
        }
      };

      const handleBoldFailed = () => {
        toast({
          title: "Error cargando pasarela de pago",
          description: "No se pudo cargar el sistema de pagos. Intenta nuevamente.",
          variant: "destructive",
        });
      };

      window.addEventListener('boldCheckoutLoaded', handleBoldLoaded);
      window.addEventListener('boldCheckoutLoadFailed', handleBoldFailed);

      return () => {
        window.removeEventListener('boldCheckoutLoaded', handleBoldLoaded);
        window.removeEventListener('boldCheckoutLoadFailed', handleBoldFailed);
      };
    }
  }, [documentData, boldCheckoutInstance, toast]);

  // Check for tracking code in URL params on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTrackingCode = urlParams.get('code');
    
    if (urlTrackingCode) {
      setTrackingCode(urlTrackingCode);
      handleVerifyTrackingCode(urlTrackingCode);
    }
  }, []);

  const handleVerifyTrackingCode = async (codeToVerify?: string) => {
    const codeValue = codeToVerify || trackingCode;
    
    if (!codeValue.trim()) {
      setTrackingCodeError("Por favor ingresa un código de seguimiento válido");
      return;
    }

    setIsVerifying(true);
    setTrackingCodeError("");

    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .eq('token', codeValue.trim())
        .single();

      if (error || !data) {
        setTrackingCodeError("Código no encontrado. Verifica que sea correcto.");
        setDocumentData(null);
        toast({
          title: "Código inválido",
          description: "El código de seguimiento ingresado no existe o ha expirado.",
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
        title: "Código verificado",
        description: `Documento "${data.document_type}" encontrado correctamente.`,
      });

    } catch (error) {
      console.error('Error verificando código:', error);
      setTrackingCodeError("Error al verificar el código. Intenta nuevamente.");
      toast({
        title: "Error de verificación",
        description: "Ocurrió un error al verificar el código de seguimiento.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePreviewDocument = () => {
    if (!documentData) return;
    
    // Create a simple preview window with watermarked content
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    if (previewWindow) {
      previewWindow.document.write(`
        <html>
          <head>
            <title>Vista Previa - ${documentData.document_type}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; position: relative; }
              .watermark { 
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 72px; 
                color: rgba(200, 200, 200, 0.3); 
                z-index: -1;
                pointer-events: none;
              }
              .content { white-space: pre-line; }
            </style>
          </head>
          <body>
            <div class="watermark">VISTA PREVIA</div>
            <h1>${documentData.document_type}</h1>
            <div class="content">${documentData.document_content}</div>
          </body>
        </html>
      `);
    }
  };

  const handlePayment = async () => {
    if (!documentData || !boldCheckoutInstance) {
      toast({
        title: "Error",
        description: "El sistema de pagos no está listo. Intenta nuevamente.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      // Open Bold checkout
      boldCheckoutInstance.open();
      
      toast({
        title: "Redirigiendo a la pasarela de pago",
        description: "Serás redirigido a la plataforma de pagos de Bold.",
      });

    } catch (error) {
      console.error('Error abriendo pasarela de pago:', error);
      toast({
        title: "Error en el pago",
        description: "Ocurrió un error al abrir la pasarela de pago. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!documentData) return;

    try {
      // Update status to 'descargado'
      const { error } = await supabase
        .from('document_tokens')
        .update({ status: 'descargado' })
        .eq('id', documentData.id);

      if (error) {
        console.error('Error updating status:', error);
      }

      // Generate PDF download
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Count 1
/Kids [3 0 R]
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(${documentData.document_type}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
395
%%EOF`;

      const element = document.createElement('a');
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      element.setAttribute('href', URL.createObjectURL(blob));
      element.setAttribute('download', `${documentData.document_type.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: "Descarga iniciada",
        description: "Tu documento se está descargando.",
      });

    } catch (error) {
      console.error('Error descargando documento:', error);
      toast({
        title: "Error en la descarga",
        description: "Ocurrió un error al descargar el documento.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary mb-4">
            Verifica y Adquiere tu Documento
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ingresa tu código de seguimiento para acceder a tu documento personalizado.
          </p>
        </div>

        {/* Tracking Code Verification Section */}
        {!documentData && (
          <Card className="shadow-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Verificación de Código de Seguimiento
              </CardTitle>
              <CardDescription>
                Ingresa el código de seguimiento que recibiste por correo electrónico para acceder a tu documento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trackingCode">Código de Seguimiento</Label>
                <Input
                  id="trackingCode"
                  type="text"
                  placeholder="Ej: ABC123DEF456"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className={trackingCodeError ? "border-destructive" : ""}
                />
                {trackingCodeError && (
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {trackingCodeError}
                  </p>
                )}
              </div>
              <Button
                onClick={() => handleVerifyTrackingCode()}
                disabled={isVerifying || !trackingCode.trim()}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    Verificando Código...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Verificar Código
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Document Content - Only show if tracking code is verified */}
        {documentData && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Document Preview Card */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Vista Previa del Documento
                  </CardTitle>
                  <Badge variant="secondary">
                    {paymentCompleted ? "Sin Marca de Agua" : "Con Marca de Agua"}
                  </Badge>
                </div>
                <CardDescription>
                  {documentData.document_type}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-6 rounded-lg text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Eye className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Documento Generado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Tu {documentData.document_type.toLowerCase()} ha sido creado y está listo para revisar.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handlePreviewDocument}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Vista Previa
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Personalizado según tu información</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Validado por expertos legales</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Cumple con la normatividad colombiana</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-success" />
                  {paymentCompleted ? "Pago Completado" : "Proceder al Pago"}
                </CardTitle>
                <CardDescription>
                  {paymentCompleted 
                    ? "Tu documento está listo para descargar"
                    : "Realiza el pago para obtener tu documento sin marca de agua"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!paymentCompleted ? (
                  <>
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

                    {/* Payment Button */}
                    <Button
                      onClick={handlePayment}
                      disabled={isProcessingPayment || documentData.status !== 'revisado'}
                      className="w-full"
                      size="lg"
                      variant="success"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                          Procesando Pago...
                        </>
                      ) : documentData.status !== 'revisado' ? (
                        `Documento en estado: ${documentData.status}`
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
                ) : (
                  <>
                    {/* Payment Success */}
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="text-xl font-semibold text-success">¡Pago Exitoso!</h3>
                      <p className="text-muted-foreground">
                        Tu documento está listo para descargar sin marca de agua
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

                {/* Support */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground text-center mb-2">
                    ¿Necesitas ayuda o tienes dudas?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChat("Necesito ayuda con mi documento y el proceso de pago.")}
                    className="w-full"
                  >
                    Contactar Soporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Information */}
        {documentData && (
          <Card className="mt-8 shadow-soft">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <h4 className="font-semibold mb-2">Validación Legal</h4>
                  <p className="text-sm text-muted-foreground">
                    Todos nuestros documentos son revisados por abogados especializados
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Formato Profesional</h4>
                  <p className="text-sm text-muted-foreground">
                    Documentos en formato PDF listos para imprimir y usar
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Soporte Continuo</h4>
                  <p className="text-sm text-muted-foreground">
                    Te acompañamos en caso de dudas sobre el uso del documento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}