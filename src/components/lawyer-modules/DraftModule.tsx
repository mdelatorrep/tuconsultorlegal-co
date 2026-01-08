import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, FileText, Copy, Loader2, Sparkles, Target, TrendingUp, Clock, FolderOpen, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DocumentEditor from "./draft/DocumentEditor";
import MyDocuments from "./draft/MyDocuments";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<DraftResult | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  const handleGenerateDraft = async () => {
    if (!prompt.trim() || !documentType) {
      toast({
        title: "Información requerida",
        description: "Por favor completa el tipo de documento y la descripción.",
        variant: "destructive",
      });
      return;
    }

    // Check and consume credits before proceeding
    if (!hasEnoughCredits('draft')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('draft')} créditos para generar documentos.`,
        variant: "destructive",
      });
      return;
    }

    const creditResult = await consumeCredits('draft', { documentType });
    if (!creditResult.success) {
      return;
    }

    setIsDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('legal-document-drafting', {
        body: { 
          prompt, 
          documentType: DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error en la generación');

      const draftResult: DraftResult = {
        prompt: prompt,
        documentType: DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType,
        content: data.content || data.generatedText || 'Documento generado con IA',
        sections: data.sections || ['Encabezado', 'Cuerpo del documento', 'Firma'],
        timestamp: data.timestamp || new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('legal_tools_results')
        .insert({
          lawyer_id: user.id,
          tool_type: 'draft',
          input_data: { 
            prompt: draftResult.prompt,
            documentType: draftResult.documentType
          },
          output_data: {
            content: draftResult.content,
            sections: draftResult.sections
          },
          metadata: { timestamp: draftResult.timestamp }
        });

      if (dbError) console.error('Error saving to database:', dbError);

      setDrafts(prev => [draftResult, ...prev]);
      setCurrentDraft(draftResult);
      setEditorOpen(true);
      setPrompt("");
      setDocumentType("");
      
      toast({
        title: "Borrador generado",
        description: "Ahora puedes editar y guardar tu documento.",
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

  const handleEditDraft = (draft: DraftResult) => {
    setCurrentDraft(draft);
    setEditorOpen(true);
  };

  return (
    <>
      <div className="space-y-4 lg:space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generar
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Mis Documentos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generate" className="space-y-4 lg:space-y-8">
                  {/* Hero Section */}
                  <div className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-4 lg:p-8">
                    <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl">
                          <PenTool className="h-10 w-10 text-white" />
                        </div>
                        <div>
                          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent">
                            Estudio de Redacción Legal
                          </h1>
                          <p className="text-lg text-muted-foreground mt-2">
                            Generación inteligente de contratos y documentos legales personalizados
                          </p>
                        </div>
                      </div>
                      
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
                          placeholder="Ej: Contrato de colaboración empresarial entre una empresa de software y un influencer"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                      </div>
                      
                      <Button
                        onClick={handleGenerateDraft}
                        disabled={isDrafting || !hasEnoughCredits('draft')}
                        className="w-full h-12"
                      >
                        {isDrafting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generando borrador...
                          </>
                        ) : (
                          <>
                            <PenTool className="h-4 w-4 mr-2" />
                            <span>Generar Borrador</span>
                            <span className="ml-3 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                              <Coins className="h-4 w-4" />
                              {getToolCost('draft')}
                            </span>
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
                              <div className="bg-white border-2 border-gray-300 p-12 rounded-lg max-h-[700px] overflow-y-auto shadow-lg" style={{
                                fontFamily: 'Georgia, "Times New Roman", serif',
                                lineHeight: '1.8'
                              }}>
                                <div className="max-w-none space-y-6">
                                  {(() => {
                                    // Clean content: remove HTML tags and convert literal \n to real line breaks
                                    const cleanContent = draft.content
                                      // Remove HTML tags like <p>, </p>, <br>, etc.
                                      .replace(/<\/?[^>]+(>|$)/g, '')
                                      // Convert literal \n to real newlines
                                      .replace(/\\n/g, '\n')
                                      // Normalize multiple newlines
                                      .replace(/\n{3,}/g, '\n\n')
                                      .trim();
                                    
                                    return cleanContent.split('\n\n').map((paragraph, idx) => {
                                      const trimmed = paragraph.trim();
                                      
                                      // Skip empty paragraphs
                                      if (!trimmed) return null;
                                      
                                      // Title (bold text or starts with **)
                                      if (trimmed.includes('**') || trimmed.match(/^[A-ZÁÉÍÓÚÑ\s]+$/)) {
                                        return (
                                          <h2 key={idx} className="font-bold text-xl text-center text-gray-900 uppercase tracking-wide border-b-2 border-gray-300 pb-3 mb-6 mt-8">
                                            {trimmed.replace(/\*\*/g, '')}
                                          </h2>
                                        );
                                      }
                                      
                                      // Section heading (starts with ### or numbered)
                                      if (trimmed.includes('###') || trimmed.match(/^\d+\.|^[IVX]+\./)) {
                                        return (
                                          <h3 key={idx} className="font-bold text-lg text-gray-800 mt-8 mb-4 uppercase">
                                            {trimmed.replace(/###/g, '').trim()}
                                          </h3>
                                        );
                                      }
                                      
                                      // Clause or numbered item
                                      if (trimmed.match(/^CLÁUSULA|^Artículo|^Capítulo|^Cláusula/i)) {
                                        return (
                                          <div key={idx} className="mb-6">
                                            <p className="font-bold text-base text-gray-900 mb-2 uppercase">
                                              {trimmed}
                                            </p>
                                          </div>
                                        );
                                      }
                                      
                                      // List item
                                      if (trimmed.match(/^[-•]\s/) || trimmed.match(/^[a-z]\)/) || trimmed.match(/^\d+\)/)) {
                                        return (
                                          <div key={idx} className="ml-8 mb-2">
                                            <p className="text-gray-700 text-base">
                                              {trimmed}
                                            </p>
                                          </div>
                                        );
                                      }
                                      
                                      // Regular paragraph - handle internal line breaks
                                      return (
                                        <p key={idx} className="text-gray-800 text-base text-justify leading-loose mb-4 indent-8 whitespace-pre-line">
                                          {trimmed}
                                        </p>
                                      );
                                    });
                                  })()}
                                  
                                  {/* Signature section */}
                                  <div className="mt-16 pt-8 border-t-2 border-gray-300">
                                    <div className="grid grid-cols-2 gap-12">
                                      <div className="text-center">
                                        <div className="border-t-2 border-gray-800 pt-2 mt-16">
                                          <p className="text-sm font-semibold text-gray-900">PRIMERA PARTE</p>
                                          <p className="text-xs text-gray-600 mt-1">Nombre y Firma</p>
                                        </div>
                                      </div>
                                      <div className="text-center">
                                        <div className="border-t-2 border-gray-800 pt-2 mt-16">
                                          <p className="text-sm font-semibold text-gray-900">SEGUNDA PARTE</p>
                                          <p className="text-xs text-gray-600 mt-1">Nombre y Firma</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
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
                                onClick={() => handleEditDraft(draft)}
                                className="flex items-center gap-2"
                              >
                                <FileText className="h-4 w-4" />
                                Editar y Guardar
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
                </TabsContent>

                <TabsContent value="documents">
                  <MyDocuments 
                    lawyerId={user.id} 
                    canCreateAgents={user.can_create_agents || false}
                  />
                </TabsContent>
              </Tabs>
            </div>

      {currentDraft && (
        <DocumentEditor
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setCurrentDraft(null);
          }}
          initialContent={currentDraft.content}
          documentType={currentDraft.documentType}
          lawyerId={user.id}
          canCreateAgents={user.can_create_agents || false}
          onSaved={() => setActiveTab("documents")}
        />
      )}
    </>
  );
}
