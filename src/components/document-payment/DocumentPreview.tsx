import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, FileText } from "lucide-react";

interface DocumentPreviewProps {
  documentData: any;
  paymentCompleted: boolean;
  onPreviewDocument: () => void;
}

export default function DocumentPreview({ 
  documentData, 
  paymentCompleted, 
  onPreviewDocument 
}: DocumentPreviewProps) {
  return (
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
            onClick={onPreviewDocument}
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
  );
}