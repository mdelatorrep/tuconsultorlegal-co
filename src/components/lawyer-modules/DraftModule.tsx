import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenTool, Loader2, Sparkles, FolderOpen, Coins,
  Save, Download, MessageSquare, PanelRightClose, PanelRightOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MyDocuments from "./draft/MyDocuments";
import DraftCopilotPanel from "./draft/DraftCopilotPanel";
import { generatePDF } from "./draft/pdfUtils";
import { useCredits } from "@/hooks/useCredits";
import { QuickPromptSuggestions } from "@/components/ui/QuickPromptSuggestions";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface DraftModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  initialTranscript?: string;
  onTranscriptUsed?: () => void;
}

const DOCUMENT_TYPES = [
  { value: "contrato_colaboracion", label: "Contrato de Colaboración Empresarial" },
  { value: "contrato_prestacion", label: "Contrato de Prestación de Servicios" },
  { value: "contrato_arrendamiento", label: "Contrato de Arrendamiento" },
  { value: "carta_desistimiento", label: "Carta de Desistimiento" },
  { value: "clausula_confidencialidad", label: "Cláusula de Confidencialidad" },
  { value: "poder_especial", label: "Poder Especial" },
  { value: "demanda_civil", label: "Demanda Civil" },
  { value: "contestacion_demanda", label: "Contestación de Demanda" },
  { value: "accion_tutela", label: "Acción de Tutela" },
  { value: "derecho_peticion", label: "Derecho de Petición" },
  { value: "documento_personalizado", label: "Documento Personalizado" }
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header", "bold", "italic", "underline", "strike",
  "list", "bullet", "indent", "align", "link",
];

export default function DraftModule({ user, currentView, onViewChange, onLogout, initialTranscript, onTranscriptUsed }: DraftModuleProps) {
  const [activeTab, setActiveTab] = useState("studio");
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(initialTranscript || "");
  const [editorContent, setEditorContent] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [hasGeneratedContent, setHasGeneratedContent] = useState(false);
  const quillRef = useRef<any>(null);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (initialTranscript && initialTranscript.length > 0) {
      setDescription(initialTranscript);
      onTranscriptUsed?.();
      toast({
        title: "📝 Transcripción cargada",
        description: "Tu dictado ha sido cargado en la descripción.",
      });
    }
  }, [initialTranscript]);

  const handleGenerate = async () => {
    if (!description.trim() || !documentType) {
      toast({
        title: "Información requerida",
        description: "Selecciona el tipo de documento y escribe una descripción.",
        variant: "destructive",
      });
      return;
    }
    if (!hasEnoughCredits('draft')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('draft')} créditos.`,
        variant: "destructive",
      });
      return;
    }

    if (editorContent && editorContent.replace(/<[^>]*>/g, '').trim().length > 20) {
      const confirmed = window.confirm("El editor ya tiene contenido. ¿Deseas reemplazarlo con el nuevo borrador?");
      if (!confirmed) return;
    }

    setIsDrafting(true);
    try {
      const docLabel = DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType;
      const { data, error } = await supabase.functions.invoke('legal-document-drafting', {
        body: { prompt: description, documentType: docLabel }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Error en la generación');

      let content = data.content || '';
      const nestedJsonMatch = content.match(/\{[\s\S]*"content"\s*:\s*"([\s\S]*?)"\s*[,}]/);
      if (nestedJsonMatch && content.includes('**Razonamiento**') || content.includes('**Documento Legal**')) {
        try {
          const nestedJson = JSON.parse(content.substring(content.indexOf('{')));
          if (nestedJson.content) content = nestedJson.content;
        } catch {
          const docStart = content.indexOf('**CONTRATO') || content.indexOf('**ACCIÓN') || content.indexOf('**DERECHO') || content.indexOf('**PODER') || content.indexOf('**DEMANDA') || content.indexOf('**CARTA') || content.indexOf('**CLÁUSULA');
          if (docStart > 0) content = content.substring(docStart);
        }
      }
      
      content = markdownToHtml(content);

      setEditorContent(content);
      setHasGeneratedContent(true);
      setShowCopilot(true);

      await consumeCredits('draft', { documentType }).catch(err => 
        console.warn("Error consuming credits (content already displayed):", err)
      );

      if (!title.trim()) {
        setTitle(docLabel);
      }

      await supabase.from('legal_tools_results').insert({
        lawyer_id: user.id,
        tool_type: 'draft',
        input_data: { prompt: description, documentType: docLabel },
        output_data: { content: data.content, sections: data.sections },
        metadata: { timestamp: new Date().toISOString() }
      });

      toast({ title: "✅ Borrador generado", description: "El documento se ha cargado en el editor." });
    } catch (error: any) {
      console.error("Error generando borrador:", error);
      toast({
        title: "Error en la generación",
        description: error?.message || "Hubo un problema al generar el borrador.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título requerido", description: "Ingresa un título para el documento.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const docLabel = DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType || "Documento Legal";
      await supabase.from("lawyer_documents").insert({
        lawyer_id: user.id,
        title: title.trim(),
        document_type: docLabel,
        content: editorContent,
        markdown_content: editorContent,
      });
      toast({ title: "✅ Documento guardado", description: "Puedes encontrarlo en Mis Documentos." });
      setActiveTab("documents");
    } catch {
      toast({ title: "Error al guardar", description: "No se pudo guardar el documento.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!editorContent.trim()) {
      toast({ title: "Sin contenido", description: "Genera o escribe un documento primero.", variant: "destructive" });
      return;
    }
    setIsDownloading(true);
    try {
      await generatePDF(editorContent, title.trim() || "Documento Legal");
      toast({ title: "PDF descargado" });
    } catch {
      toast({ title: "Error al generar PDF", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleInsertFromCopilot = (text: string) => {
    const htmlText = text.split('\n').filter(Boolean).map(line => `<p>${line}</p>`).join('');
    setEditorContent(prev => prev + htmlText);
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="studio" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Redactar
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Mis Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="studio" className="mt-3">
          {/* Generation form - shown before content is generated */}
          {!hasGeneratedContent && (
            <div className="max-w-2xl mx-auto space-y-4 mb-4">
              <div className="rounded-lg border bg-background p-5 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="sm:w-[280px]">
                      <SelectValue placeholder="Tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Título del documento (opcional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="flex-1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">¿Qué documento necesitas?</label>
                  <textarea
                    placeholder="Ej: Contrato de prestación de servicios profesionales entre una empresa de software y un consultor independiente, con cláusula de confidencialidad y no competencia..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {!description.trim() && !isDrafting && (
                    <QuickPromptSuggestions
                      suggestions={[
                        "Contrato de prestación de servicios con cláusula de confidencialidad",
                        "Derecho de petición ante EPS por negación de tratamiento médico",
                        "Poder especial para representación en proceso ejecutivo",
                        "Acción de tutela por vulneración del derecho al trabajo",
                      ]}
                      onSelect={(s) => setDescription(s)}
                      disabled={isDrafting}
                    />
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isDrafting || !hasEnoughCredits('draft') || !documentType || !description.trim()}
                  className="w-full h-11"
                  size="lg"
                >
                  {isDrafting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando borrador...
                    </>
                  ) : (
                    <>
                      <PenTool className="h-4 w-4 mr-2" />
                      Generar con IA
                      <span className="ml-3 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-lg text-sm">
                        <Coins className="h-4 w-4" />
                        {getToolCost('draft')}
                      </span>
                    </>
                  )}
                </Button>
                {!hasEnoughCredits('draft') && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <Coins className="h-4 w-4" />
                    Necesitas {getToolCost('draft')} créditos para generar. Créditos insuficientes.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Editor Studio - full workspace after generation */}
          {hasGeneratedContent && (
            <div className="rounded-lg border bg-background overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
              {/* Compact toolbar header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Título del documento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 h-8 text-sm"
                />
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <Button onClick={handleSave} disabled={isSaving || !editorContent.trim()} size="sm" className="h-8 text-xs gap-1.5">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Guardar
                  </Button>
                  <Button variant="outline" onClick={handleDownload} disabled={isDownloading || !editorContent.trim()} size="sm" className="h-8 text-xs gap-1.5">
                    {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    PDF
                  </Button>
                  <Button
                    variant={showCopilot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCopilot(!showCopilot)}
                    className="h-8 text-xs gap-1.5"
                  >
                    {showCopilot ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Copilot</span>
                  </Button>
                </div>
              </div>

              {/* Resizable Editor + Copilot */}
              <ResizablePanelGroup direction="horizontal" className="flex-1" style={{ height: 'calc(100% - 41px)' }}>
                <ResizablePanel defaultSize={showCopilot ? 60 : 100} minSize={40}>
                  <div className="h-full overflow-hidden">
                    <ReactQuill
                      ref={quillRef}
                      theme="snow"
                      value={editorContent}
                      onChange={setEditorContent}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="El borrador generado aparecerá aquí..."
                      className="h-full [&_.ql-container]:border-0 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-editor]:min-h-full [&_.ql-editor]:font-serif [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-editor]:px-8 [&_.ql-editor]:py-6"
                    />
                  </div>
                </ResizablePanel>

                {showCopilot && (
                  <>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={40} minSize={28} maxSize={55}>
                      <DraftCopilotPanel
                        documentContent={editorContent}
                        documentType={DOCUMENT_TYPES.find(t => t.value === documentType)?.label || documentType || "Documento Legal"}
                        lawyerId={user.id}
                        onInsertText={handleInsertFromCopilot}
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
          )}

          {/* Show editor even without generated content for manual writing */}
          {!hasGeneratedContent && (
            <div className="rounded-lg border bg-background overflow-hidden" style={{ height: '400px' }}>
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={editorContent}
                onChange={setEditorContent}
                modules={quillModules}
                formats={quillFormats}
                placeholder="También puedes escribir directamente aquí sin generar con IA..."
                className="h-full [&_.ql-container]:border-0 [&_.ql-toolbar]:border-x-0 [&_.ql-toolbar]:border-t-0 [&_.ql-editor]:min-h-full [&_.ql-editor]:font-serif [&_.ql-editor]:text-base [&_.ql-editor]:leading-relaxed [&_.ql-editor]:px-8 [&_.ql-editor]:py-6"
              />
            </div>
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
  );
}

/** Simple markdown-to-HTML converter for AI output */
function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^---$/gm, '<hr>');
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) { result.push('</ul>'); inList = false; }
      continue;
    }
    if (trimmed.startsWith('<h') || trimmed.startsWith('<hr')) {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(trimmed);
    } else if (trimmed.match(/^[-*] /)) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push(`<li>${trimmed.replace(/^[-*] /, '')}</li>`);
    } else if (trimmed.match(/^\d+\. /)) {
      result.push(`<p>${trimmed}</p>`);
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(`<p>${trimmed}</p>`);
    }
  }
  if (inList) result.push('</ul>');
  return result.join('\n');
}
