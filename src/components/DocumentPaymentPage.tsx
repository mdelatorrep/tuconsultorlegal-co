import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Download, Eye, FileText, Shield } from "lucide-react";

interface DocumentPaymentPageProps {
  onOpenChat: (message: string) => void;
}

export default function DocumentPaymentPage({ onOpenChat }: DocumentPaymentPageProps) {
  const [documentData, setDocumentData] = useState({
    type: "Contrato de Arrendamiento",
    price: 50000,
    description: "Contrato de arrendamiento para vivienda urbana según Ley 820 de 2003",
    status: "pending_payment"
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Simulate document data from URL params or API
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const docType = urlParams.get('document');
    const docPrice = urlParams.get('price');
    
    if (docType) {
      setDocumentData(prev => ({
        ...prev,
        type: docType,
        price: docPrice ? parseInt(docPrice) : prev.price
      }));
    }
  }, []);

  const handlePreviewDocument = () => {
    // Simulate opening document preview with watermark
    alert("Vista previa del documento con marca de agua se abriría aquí");
  };

  const handlePayment = async () => {
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentCompleted(true);
    }, 3000);
  };

  const handleDownloadDocument = () => {
    // Simulate PDF download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVGl0bGUgKEVqZW1wbG8gZGUgRG9jdW1lbnRvKQovQ3JlYXRvciAoVHUgQ29uc3VsdG9yIExlZ2FsKQovUHJvZHVjZXIgKFR1IENvbnN1bHRvciBMZWdhbCkKL0NyZWF0aW9uRGF0ZSAoRDoyMDI1MDEwNzAwMDAwMFopCj4+CmVuZG9iago...');
    element.setAttribute('download', `${documentData.type.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
            Revisa tu documento personalizado y procede con el pago para obtener la versión final sin marca de agua.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Document Preview Card */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Vista Previa del Documento
                </CardTitle>
                <Badge variant="secondary">Con Marca de Agua</Badge>
              </div>
              <CardDescription>
                {documentData.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-6 rounded-lg text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Eye className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Documento Generado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Tu {documentData.type.toLowerCase()} ha sido creado con base en la información proporcionada.
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
                      <span className="font-medium">{documentData.type}</span>
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

        {/* Additional Information */}
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
      </div>
    </div>
  );
}