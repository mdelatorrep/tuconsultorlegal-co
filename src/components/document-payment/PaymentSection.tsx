import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Download, Shield } from "lucide-react";

interface PaymentSectionProps {
  documentData: any;
  paymentCompleted: boolean;
  isProcessingPayment: boolean;
  onPayment: () => void;
  onDownloadDocument: () => void;
  onOpenChat: (message: string) => void;
}

export default function PaymentSection({
  documentData,
  paymentCompleted,
  isProcessingPayment,
  onPayment,
  onDownloadDocument,
  onOpenChat
}: PaymentSectionProps) {
  return (
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
              onClick={onPayment}
              disabled={isProcessingPayment || documentData.status !== 'revision_usuario'}
              className="w-full"
              size="lg"
              variant="success"
            >
              {isProcessingPayment ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Procesando Pago...
                </>
              ) : documentData.status !== 'revision_usuario' ? (
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
              onClick={onDownloadDocument}
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
  );
}