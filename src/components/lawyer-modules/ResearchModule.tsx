import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "../UnifiedSidebar";

interface ResearchResult {
  query: string;
  findings: string;
  sources: string[];
  timestamp: string;
}

interface ResearchModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function ResearchModule({ user, currentView, onViewChange, onLogout }: ResearchModuleProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ResearchResult[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Consulta requerida",
        description: "Por favor ingresa una pregunta de investigación.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Simulated research - In production, this would call a specialized edge function
      // that connects to a vector database with Colombian legal documents
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: ResearchResult = {
        query,
        findings: `Basado en la jurisprudencia colombiana sobre "${query}", se encontraron los siguientes elementos relevantes:\n\n1. **Marco Legal**: El Código de Comercio establece en el artículo 518 las condiciones generales para contratos de arrendamiento comercial.\n\n2. **Jurisprudencia**: La Corte Suprema de Justicia en sentencia del 15 de marzo de 2021 (Rad. 11001-31-03-038-2018-00213-01) estableció criterios específicos sobre terminación por fuerza mayor.\n\n3. **Decretos COVID-19**: El Decreto 579 de 2020 estableció protecciones especiales para arrendatarios comerciales durante la pandemia.\n\n**Conclusión**: Existe precedente favorable para la protección del arrendatario comercial en casos de fuerza mayor debidamente comprobada.`,
        sources: [
          "Código de Comercio - Art. 518",
          "Corte Suprema de Justicia - Rad. 11001-31-03-038-2018-00213-01",
          "Decreto 579 de 2020",
          "Concepto DANE sobre fuerza mayor empresarial 2020"
        ],
        timestamp: new Date().toISOString()
      };

      setResults(prev => [mockResult, ...prev]);
      setQuery("");
      
      toast({
        title: "Investigación completada",
        description: "Se encontraron referencias jurídicas relevantes para tu consulta.",
      });
    } catch (error) {
      console.error("Error en investigación:", error);
      toast({
        title: "Error en la investigación",
        description: "Hubo un problema al procesar tu consulta.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        {/* Main Content */}
        <main className="flex-1">
          {/* Header with Sidebar Toggle */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4">
              <SidebarTrigger className="mr-4" />
              <h1 className="text-lg font-semibold">Investigación Jurídica IA</h1>
            </div>
          </header>

          <div className="container mx-auto px-6 py-6">
            <div className="max-w-6xl mx-auto">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <Search className="h-8 w-8 text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold text-primary">Investigación Jurídica IA</h2>
                    <p className="text-muted-foreground">
                      Asistente de investigación con acceso a legislación y jurisprudencia colombiana
                    </p>
                  </div>
                </div>

      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Nueva Consulta
          </CardTitle>
          <CardDescription>
            Haz preguntas complejas sobre legislación, jurisprudencia o normativa colombiana
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ej: Resume la línea jurisprudencial de la Corte Suprema sobre terminación de contratos de arrendamiento comercial por pandemia en Colombia"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Investigando...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Iniciar Investigación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Resultados de Investigación</h3>
          {results.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {result.query.length > 80 
                      ? `${result.query.substring(0, 80)}...` 
                      : result.query
                    }
                  </CardTitle>
                  <Badge variant="outline">
                    {new Date(result.timestamp).toLocaleDateString()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Hallazgos
                  </h4>
                  <div className="whitespace-pre-wrap text-sm">
                    {result.findings}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Fuentes Consultadas</h4>
                  <div className="space-y-1">
                    {result.sources.map((source, idx) => (
                      <Badge key={idx} variant="secondary" className="mr-2 mb-2">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Realiza tu primera consulta de investigación jurídica
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