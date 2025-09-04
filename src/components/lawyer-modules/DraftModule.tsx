import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PenTool, FileText, Download, Copy, Loader2, Sparkles, Target, TrendingUp, Clock, Zap, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface DraftModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

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

export default function DraftModule({ user, currentView, onViewChange, onLogout }: DraftModuleProps) {
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
      // Call the legal document drafting function
      const { data, error } = await supabase.functions.invoke('legal-document-drafting', {
        body: { 
          prompt, 
          documentType: DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Error en la generación');
      }

      const draftResult: DraftResult = {
        prompt: data.prompt,
        documentType: data.documentType,
        content: data.content,
        sections: data.sections,
        timestamp: data.timestamp
      };

      // Save to database
      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'draft',
          input_data: { 
            prompt: data.prompt,
            documentType: data.documentType
          },
          output_data: {
            content: data.content,
            sections: data.sections
          },
          metadata: { timestamp: data.timestamp }
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
      }

      setDrafts(prev => [draftResult, ...prev]);
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
        description: "Hubo un problema al generar el borrador. Verifica tu conexión.",
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-blue-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Enhanced Header */}
          <header className="h-16 border-b bg-gradient-to-r from-background/95 to-blue-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-16 items-center px-6">
              <SidebarTrigger className="mr-4 hover:bg-blue-500/10 rounded-lg p-2 transition-all duration-200" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                    Redacción Inteligente IA
                  </h1>
                  <p className="text-sm text-muted-foreground">Generación automática de documentos legales</p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-8">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-8">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="relative">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
                        <PenTool className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                          Estudio de Redacción Legal
                        </h2>
                        <p className="text-lg text-muted-foreground mt-2">
                          Generación inteligente de contratos y documentos legales personalizados
                        </p>
                      </div>
                    </div>
                    
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Target className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="text-2xl font-bold text-blue-600">{drafts.length}</p>
                            <p className="text-sm text-muted-foreground">Borradores generados</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-8 w-8 text-emerald-600" />
                          <div>
                            <p className="text-2xl font-bold text-emerald-600">95%</p>
                            <p className="text-sm text-muted-foreground">Precisión legal</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                        <div className="flex items-center gap-3">
                          <Clock className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="text-2xl font-bold text-purple-600">30 seg</p>
                            <p className="text-sm text-muted-foreground">Tiempo promedio</p>
                          </div>
                        </div>
                      </div>
                    </div>
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
                
                <div className="bg-gradient-to-br from-white via-white to-blue-50 border border-blue-200/60 p-6 rounded-xl shadow-inner">
                  <h4 className="font-bold mb-4 flex items-center gap-3 text-lg text-gray-900">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    Contenido del Borrador
                  </h4>
                  <div className="bg-white border border-gray-200 p-6 rounded-lg max-h-[500px] overflow-y-auto shadow-sm">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-serif">
                      {draft.content}
                    </div>
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
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}