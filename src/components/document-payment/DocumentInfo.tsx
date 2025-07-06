import { Card, CardContent } from "@/components/ui/card";

export default function DocumentInfo() {
  return (
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
  );
}