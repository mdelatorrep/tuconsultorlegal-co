import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PenTool, FileText, Download, Copy, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DraftResult {
  prompt: string;
  documentType: string;
  content: string;
  sections: string[];
  timestamp: string;
}

const DOCUMENT_TYPES = [
  { value: "contrato_colaboracion", label: "Contrato de Colaboración Empresarial" },
  { value: "contrato_prestacion", label: "Contrato de Prestación de Servicios" },
  { value: "contrato_arrendamiento", label: "Contrato de Arrendamiento" },
  { value: "carta_desistimiento", label: "Carta de Desistimiento" },
  { value: "clausula_confidencialidad", label: "Cláusula de Confidencialidad" },
  { value: "poder_especial", label: "Poder Especial" },
  { value: "documento_personalizado", label: "Documento Personalizado" }
];

export default function DraftModule() {
  const [prompt, setPrompt] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [drafts, setDrafts] = useState<DraftResult[]>([]);
  const { toast } = useToast();

  const handleGenerateDraft = async () => {
    if (!prompt.trim() || !documentType) {
      toast({
        title: "Información requerida",
        description: "Por favor completa el tipo de documento y la descripción.",
        variant: "destructive",
      });
      return;
    }

    setIsDrafting(true);
    try {
      // Simulated drafting - In production, this would call an AI service
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const mockDraft: DraftResult = {
        prompt,
        documentType: DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType,
        content: `# ${DOCUMENT_TYPES.find(t => t.value === documentType)?.label}

## PRIMERA: OBJETO DEL CONTRATO
Por medio del presente contrato, las partes acuerdan establecer una colaboración empresarial bajo los siguientes términos y condiciones específicos derivados de: ${prompt}

## SEGUNDA: OBLIGACIONES DE LAS PARTES
**PRIMERA PARTE:**
- Cumplir con los estándares de calidad establecidos
- Proporcionar la información necesaria para el desarrollo del objeto contractual
- Realizar los pagos en los términos pactados

**SEGUNDA PARTE:**
- Ejecutar las actividades conforme a las especificaciones técnicas
- Mantener la confidencialidad de la información proporcionada
- Entregar los resultados en los plazos establecidos

## TERCERA: DURACIÓN Y VIGENCIA
El presente contrato tendrá una duración de [ESPECIFICAR PLAZO] contados a partir de la fecha de suscripción, prorrogable por períodos iguales mediante acuerdo mutuo por escrito.

## CUARTA: CONTRAPRESTACIÓN
Como contraprestación por los servicios prestados, se establece un valor de [ESPECIFICAR MONTO] pagadero [ESPECIFICAR FORMA DE PAGO].

## QUINTA: PROPIEDAD INTELECTUAL
Todos los desarrollos, creaciones y mejoras que surjan durante la ejecución del contrato serán de propiedad [ESPECIFICAR TITULARIDAD] respetando los derechos morales de autor.

## SEXTA: CONFIDENCIALIDAD
Las partes se comprometen a mantener absoluta reserva y confidencialidad sobre toda la información comercial, técnica y estratégica a la que tengan acceso durante la ejecución del contrato.

## SÉPTIMA: TERMINACIÓN
El contrato podrá terminarse:
a) Por mutuo acuerdo de las partes
b) Por incumplimiento grave de cualquiera de las partes
c) Por imposibilidad sobreviniente de cumplir el objeto contractual

## OCTAVA: CLÁUSULA PENAL
En caso de incumplimiento injustificado, la parte incumplida deberá pagar a la otra una suma equivalente al 10% del valor total del contrato.

## NOVENA: RESOLUCIÓN DE CONFLICTOS
Cualquier controversia será resuelta mediante mecanismos alternativos de solución de conflictos, preferiblemente conciliación ante centro autorizado.

## DÉCIMA: LEY APLICABLE
El presente contrato se regirá por las leyes de la República de Colombia.

---
*Documento generado por IA Legal Pro - Requiere revisión y personalización por parte del abogado*`,
        sections: [
          "Objeto del Contrato",
          "Obligaciones de las Partes", 
          "Duración y Vigencia",
          "Contraprestación",
          "Propiedad Intelectual",
          "Confidencialidad",
          "Terminación",
          "Cláusula Penal",
          "Resolución de Conflictos",
          "Ley Aplicable"
        ],
        timestamp: new Date().toISOString()
      };

      setDrafts(prev => [mockDraft, ...prev]);
      setPrompt("");
      setDocumentType("");
      
      toast({
        title: "Borrador generado",
        description: "El documento base ha sido creado exitosamente.",
      });
    } catch (error) {
      console.error("Error generando borrador:", error);
      toast({
        title: "Error en la generación",
        description: "Hubo un problema al generar el borrador.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copiado al portapapeles",
      description: "El contenido ha sido copiado exitosamente.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <PenTool className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-primary">Redacción Asistida</h2>
          <p className="text-muted-foreground">
            Genera borradores profesionales de documentos legales con IA
          </p>
        </div>
      </div>

      {/* Draft Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nuevo Borrador
          </CardTitle>
          <CardDescription>
            Describe el documento que necesitas y la IA generará un borrador estructurado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Documento</label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Descripción del Documento</label>
            <Textarea
              placeholder="Ej: Contrato de colaboración empresarial entre una empresa de software y un influencer, incluyendo cláusulas de exclusividad, propiedad intelectual y pago por rendimiento"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          
          <Button
            onClick={handleGenerateDraft}
            disabled={isDrafting}
            className="w-full"
          >
            {isDrafting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando borrador...
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-2" />
                Generar Borrador
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Drafts List */}
      {drafts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Borradores Generados</h3>
          {drafts.map((draft, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{draft.documentType}</CardTitle>
                    <CardDescription className="mt-1">
                      {draft.prompt.length > 100 
                        ? `${draft.prompt.substring(0, 100)}...` 
                        : draft.prompt
                      }
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {new Date(draft.timestamp).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Secciones Incluidas</h4>
                  <div className="flex flex-wrap gap-2">
                    {draft.sections.map((section, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {section}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Contenido del Borrador</h4>
                  <div className="bg-white p-4 rounded border max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {draft.content}
                    </pre>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(draft.content)}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {drafts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <PenTool className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Genera tu primer borrador de documento legal
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}