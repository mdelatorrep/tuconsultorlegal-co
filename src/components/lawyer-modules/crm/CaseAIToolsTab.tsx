import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Eye, Search, Target, FileSignature, Brain, Sparkles, 
  Calendar, ExternalLink, ChevronRight, Plus, Loader2 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AIToolResult {
  id: string;
  tool_type: string;
  input_data: any;
  output_data: any;
  created_at: string;
  metadata?: any;
}

interface CaseAIToolsTabProps {
  caseId: string;
  caseTitle: string;
  lawyerId: string;
  onNavigateToTool?: (toolType: string, caseId: string) => void;
}

const CaseAIToolsTab: React.FC<CaseAIToolsTabProps> = ({
  caseId,
  caseTitle,
  lawyerId,
  onNavigateToTool
}) => {
  const [results, setResults] = useState<AIToolResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchToolResults();
  }, [caseId]);

  const fetchToolResults = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('legal_tools_results')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching AI tool results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'analysis': return <Eye className="h-4 w-4" />;
      case 'research': return <Search className="h-4 w-4" />;
      case 'strategy': return <Target className="h-4 w-4" />;
      case 'drafting': return <FileSignature className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getToolLabel = (toolType: string) => {
    switch (toolType) {
      case 'analysis': return 'Análisis';
      case 'research': return 'Investigación';
      case 'strategy': return 'Estrategia';
      case 'drafting': return 'Redacción';
      default: return 'Herramienta IA';
    }
  };

  const getToolColor = (toolType: string) => {
    switch (toolType) {
      case 'analysis': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'research': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'strategy': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'drafting': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getResultSummary = (result: AIToolResult): string => {
    switch (result.tool_type) {
      case 'analysis':
        return result.input_data?.fileName || result.output_data?.documentType || 'Documento analizado';
      case 'research':
        return result.input_data?.query || 'Investigación legal';
      case 'strategy':
        return result.input_data?.caseDescription?.substring(0, 80) + '...' || 'Estrategia legal';
      case 'drafting':
        return result.input_data?.documentTitle || result.input_data?.topic || 'Documento redactado';
      default:
        return 'Resultado de herramienta IA';
    }
  };

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.tool_type === activeTab);

  const toolCounts = {
    all: results.length,
    analysis: results.filter(r => r.tool_type === 'analysis').length,
    research: results.filter(r => r.tool_type === 'research').length,
    strategy: results.filter(r => r.tool_type === 'strategy').length,
    drafting: results.filter(r => r.tool_type === 'drafting').length
  };

  const quickActions = [
    { type: 'analysis', label: 'Analizar documento', icon: Eye, color: 'text-orange-600' },
    { type: 'research', label: 'Investigar jurisprudencia', icon: Search, color: 'text-blue-600' },
    { type: 'strategy', label: 'Generar estrategia', icon: Target, color: 'text-purple-600' },
    { type: 'drafting', label: 'Redactar documento', icon: FileSignature, color: 'text-green-600' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Acciones Rápidas IA
          </CardTitle>
          <CardDescription>
            Ejecutar herramientas IA vinculadas directamente a este caso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.type}
                variant="outline"
                className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => onNavigateToTool?.(action.type, caseId)}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs text-center">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Herramientas IA Aplicadas
              </CardTitle>
              <CardDescription>
                {results.length} resultado{results.length !== 1 ? 's' : ''} vinculado{results.length !== 1 ? 's' : ''} a este caso
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchToolResults}>
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="all" className="text-xs">
                Todos ({toolCounts.all})
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                ({toolCounts.analysis})
              </TabsTrigger>
              <TabsTrigger value="research" className="text-xs">
                <Search className="h-3 w-3 mr-1" />
                ({toolCounts.research})
              </TabsTrigger>
              <TabsTrigger value="strategy" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                ({toolCounts.strategy})
              </TabsTrigger>
              <TabsTrigger value="drafting" className="text-xs">
                <FileSignature className="h-3 w-3 mr-1" />
                ({toolCounts.drafting})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px]">
              {filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-2">
                    {activeTab === 'all' 
                      ? 'No hay herramientas IA aplicadas a este caso'
                      : `No hay ${getToolLabel(activeTab).toLowerCase()} vinculados`
                    }
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Usa las acciones rápidas para ejecutar herramientas IA para este caso
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToTool?.('analysis', caseId)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ejecutar herramienta IA
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className={`p-2 rounded-lg ${getToolColor(result.tool_type)}`}>
                        {getToolIcon(result.tool_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getToolLabel(result.tool_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(result.created_at), 'dd MMM yyyy, HH:mm', { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {getResultSummary(result)}
                        </p>
                        {result.output_data?.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {result.output_data.summary}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseAIToolsTab;
