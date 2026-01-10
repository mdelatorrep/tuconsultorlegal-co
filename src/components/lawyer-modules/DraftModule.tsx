import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PenTool, FileText, Copy, Loader2, Sparkles, Target, TrendingUp, Clock, FolderOpen, Coins, Wand2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DocumentEditorWithCopilot from "./draft/DocumentEditorWithCopilot";
import MyDocuments from "./draft/MyDocuments";
import DraftResultDisplay from "./draft/DraftResultDisplay";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";

interface DraftModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  initialTranscript?: string;
  onTranscriptUsed?: () => void;
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

export default function DraftModule({ user, currentView, onViewChange, onLogout, initialTranscript, onTranscriptUsed }: DraftModuleProps) {
  const [prompt, setPrompt] = useState(initialTranscript || "");
  const [documentType, setDocumentType] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [drafts, setDrafts] = useState<DraftResult[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<DraftResult | null>(null);
  const [activeTab, setActiveTab] = useState("generate");
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  // Handle initial transcript from voice assistant
  useEffect(() => {
    if (initialTranscript && initialTranscript.length > 0) {
      setPrompt(initialTranscript);
      onTranscriptUsed?.();
      toast({
        title: "📝 Transcripción cargada",
        description: "Tu dictado de voz ha sido cargado. Selecciona el tipo de documento y genera.",
      });
    }
  }, [initialTranscript, onTranscriptUsed, toast]);

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
                            Estudio de Redacción con Copilot
                          </h1>
                          <p className="text-lg text-muted-foreground mt-2">
                            Generación inteligente con asistente IA integrado
                          </p>
                        </div>
                      </div>

                      {/* Copilot Features Banner */}
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-200/50 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Wand2 className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold text-purple-700 dark:text-purple-300">Copilot Legal Integrado</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <span>Autocompletado inteligente</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                            <span>Chat contextual de ayuda</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="h-4 w-4 text-green-500" />
                            <span>Sugerencias en tiempo real</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-3">
                            <Target className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="text-2xl font-bold text-blue-600">{drafts.length}</p>
                              <p className="text-sm text-muted-foreground">Borradores generados</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-8 w-8 text-emerald-600" />
                            <div>
                              <p className="text-2xl font-bold text-emerald-600">95%</p>
                              <p className="text-sm text-muted-foreground">Precisión legal</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/20">
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
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold">Borradores Generados</h3>
                      {drafts.map((draft, index) => (
                        <DraftResultDisplay
                          key={index}
                          content={draft.content}
                          documentType={draft.documentType}
                          prompt={draft.prompt}
                          timestamp={draft.timestamp}
                          onEdit={() => handleEditDraft(draft)}
                          onCopy={copyToClipboard}
                        />
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
        <DocumentEditorWithCopilot
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
