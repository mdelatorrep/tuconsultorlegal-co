import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Copy, 
  Brain, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  Edit,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/utils/htmlSanitizer";
import { cn } from "@/lib/utils";

interface DraftResultDisplayProps {
  content: string;
  documentType: string;
  prompt: string;
  timestamp: string;
  onEdit: () => void;
  onCopy: (content: string) => void;
}

interface ParsedContent {
  reasoning: string;
  documentHtml: string;
  isStructured: boolean;
}

/**
 * Parse the AI response to extract reasoning and document content
 */
function parseAIResponse(content: string): ParsedContent {
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(content);
    if (parsed.Razonamiento && parsed["Documento Legal"]) {
      return {
        reasoning: parsed.Razonamiento,
        documentHtml: parsed["Documento Legal"],
        isStructured: true,
      };
    }
  } catch {
    // Not JSON, continue with other parsing methods
  }

  // Check for specific markers in the content
  const reasoningMatch = content.match(/["']?Razonamiento["']?\s*:\s*["']([^"']+)["']/i);
  const documentMatch = content.match(/["']?Documento Legal["']?\s*:\s*["']?([\s\S]+?)(?:["']?\s*}|$)/i);

  if (reasoningMatch && documentMatch) {
    return {
      reasoning: reasoningMatch[1],
      documentHtml: documentMatch[1],
      isStructured: true,
    };
  }

  // Fallback: treat entire content as document
  return {
    reasoning: "",
    documentHtml: content,
    isStructured: false,
  };
}

/**
 * Extract placeholders from the document content
 */
function extractPlaceholders(html: string): string[] {
  const placeholderRegex = /\[([A-ZÁÉÍÓÚÑ\s_]+)\]/g;
  const matches = new Set<string>();
  let match;
  while ((match = placeholderRegex.exec(html)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
}

export default function DraftResultDisplay({
  content,
  documentType,
  prompt,
  timestamp,
  onEdit,
  onCopy,
}: DraftResultDisplayProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("document");
  const [reasoningExpanded, setReasoningExpanded] = useState(false);

  const parsed = parseAIResponse(content);
  const placeholders = extractPlaceholders(parsed.documentHtml);
  const sanitizedHtml = sanitizeHtml(parsed.documentHtml);

  const copyDocument = () => {
    // Create a temporary element to get plain text from HTML
    const temp = document.createElement("div");
    temp.innerHTML = sanitizedHtml;
    const plainText = temp.textContent || temp.innerText || "";
    onCopy(plainText);
  };

  const copyHtml = () => {
    onCopy(parsed.documentHtml);
    toast({
      title: "HTML copiado",
      description: "El código HTML del documento ha sido copiado.",
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {documentType}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {prompt}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {new Date(timestamp).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Badge>
        </div>

        {/* Placeholders warning */}
        {placeholders.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {placeholders.length} campos por completar
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {placeholders.slice(0, 8).map((placeholder, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                    >
                      {placeholder}
                    </Badge>
                  ))}
                  {placeholders.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{placeholders.length - 8} más
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Reasoning Section (collapsible) */}
        {parsed.isStructured && parsed.reasoning && (
          <div className="border-b">
            <button
              onClick={() => setReasoningExpanded(!reasoningExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-sm">Razonamiento de la IA</h4>
                  <p className="text-xs text-muted-foreground">
                    Supuestos y decisiones tomadas para generar el documento
                  </p>
                </div>
              </div>
              {reasoningExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                reasoningExpanded ? "max-h-[500px]" : "max-h-0"
              )}
            >
              <div className="p-4 pt-0">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-100 dark:border-purple-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {parsed.reasoning}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document Content */}
        <div className="p-4 lg:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="document" className="text-sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Documento
                </TabsTrigger>
                <TabsTrigger value="html" className="text-sm">
                  <span className="font-mono">{"</>"}</span>
                  <span className="ml-2">HTML</span>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyDocument}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar texto
                </Button>
                <Button variant="default" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>

            <TabsContent value="document" className="mt-0">
              <div
                className="bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-lg shadow-inner overflow-hidden"
                style={{ minHeight: "400px" }}
              >
                {/* Document header simulation */}
                <div className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {documentType}.pdf
                  </span>
                </div>

                {/* Document content */}
                <div
                  className="p-8 lg:p-12 max-h-[600px] overflow-y-auto"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    lineHeight: "1.8",
                  }}
                >
                  <div
                    className="prose prose-sm lg:prose-base max-w-none
                      prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                      prose-h1:text-2xl prose-h1:text-center prose-h1:font-bold prose-h1:uppercase prose-h1:tracking-wide prose-h1:border-b-2 prose-h1:border-gray-300 prose-h1:pb-4 prose-h1:mb-6
                      prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
                      prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:text-justify prose-p:mb-4
                      prose-li:text-gray-800 dark:prose-li:text-gray-200
                      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
                      [&_[style*='ESPECIFICAR']]:bg-amber-100 [&_[style*='ESPECIFICAR']]:px-1 [&_[style*='ESPECIFICAR']]:rounded"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />

                  {/* Highlight placeholders visually */}
                  <style>{`
                    .prose [class*="placeholder"],
                    .prose :where(p, li, td):has(> :only-child:empty)::before {
                      background-color: rgb(254 243 199);
                      padding: 0 4px;
                      border-radius: 4px;
                    }
                  `}</style>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="html" className="mt-0">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyHtml}
                  className="absolute top-2 right-2 z-10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar HTML
                </Button>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto max-h-[500px] text-sm font-mono">
                  <code>{parsed.documentHtml}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Success indicator */}
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Documento generado exitosamente</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
