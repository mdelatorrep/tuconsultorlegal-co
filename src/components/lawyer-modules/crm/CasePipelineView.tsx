import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { 
  Briefcase, 
  DollarSign, 
  User, 
  Calendar,
  MoreHorizontal,
  Plus,
  TrendingUp,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  lawyerData: any;
  onCaseClick?: (caseId: string) => void;
}

interface Case {
  id: string;
  title: string;
  case_number: string | null;
  client_id: string;
  client_name?: string;
  pipeline_stage: string;
  expected_value: number;
  probability: number;
  health_score: number;
  priority: string;
  next_action_date: string | null;
  status: string;
  case_type: string;
}

const PIPELINE_STAGES = [
  { id: 'inicial', label: 'Inicial', color: 'bg-slate-100 border-slate-300' },
  { id: 'investigacion', label: 'Investigación', color: 'bg-blue-50 border-blue-300' },
  { id: 'en_curso', label: 'En Curso', color: 'bg-amber-50 border-amber-300' },
  { id: 'audiencias', label: 'Audiencias', color: 'bg-purple-50 border-purple-300' },
  { id: 'resolucion', label: 'Resolución', color: 'bg-emerald-50 border-emerald-300' },
  { id: 'cobro', label: 'Cobro', color: 'bg-green-50 border-green-300' }
];

export default function CasePipelineView({ lawyerData, onCaseClick }: Props) {
  const { toast } = useToast();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, [lawyerData.id]);

  const fetchCases = async () => {
    try {
      // Fetch cases with client info
      const { data: casesData, error: casesError } = await supabase
        .from('crm_cases')
        .select(`
          id, title, case_number, client_id, pipeline_stage, 
          expected_value, probability, health_score, priority, 
          next_action_date, status, case_type
        `)
        .eq('lawyer_id', lawyerData.id)
        .eq('status', 'active')
        .order('expected_value', { ascending: false });

      if (casesError) throw casesError;

      // Fetch client names
      const clientIds = [...new Set((casesData || []).map(c => c.client_id))];
      const { data: clientsData } = await supabase
        .from('crm_clients')
        .select('id, name')
        .in('id', clientIds);

      const clientMap = new Map(clientsData?.map(c => [c.id, c.name]) || []);

      const enrichedCases = (casesData || []).map(c => ({
        ...c,
        pipeline_stage: c.pipeline_stage || 'inicial',
        expected_value: Number(c.expected_value) || 0,
        probability: c.probability || 50,
        health_score: c.health_score || 100,
        client_name: clientMap.get(c.client_id) || 'Cliente'
      }));

      setCases(enrichedCases);
    } catch (error) {
      console.error('Error fetching pipeline cases:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los casos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStage = destination.droppableId;

    // Optimistic update
    setCases(prev => prev.map(c => 
      c.id === draggableId ? { ...c, pipeline_stage: newStage } : c
    ));

    try {
      const { error } = await supabase
        .from('crm_cases')
        .update({ pipeline_stage: newStage })
        .eq('id', draggableId);

      if (error) throw error;

      toast({
        title: "Caso actualizado",
        description: `Movido a ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`,
      });
    } catch (error) {
      console.error('Error updating case stage:', error);
      fetchCases(); // Revert on error
      toast({
        title: "Error",
        description: "No se pudo actualizar el caso",
        variant: "destructive"
      });
    }
  };

  const getCasesByStage = (stageId: string) => 
    cases.filter(c => c.pipeline_stage === stageId);

  const getStageValue = (stageId: string) => 
    getCasesByStage(stageId).reduce((sum, c) => sum + c.expected_value, 0);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const totalPipelineValue = cases.reduce((sum, c) => sum + c.expected_value, 0);
  const weightedValue = cases.reduce((sum, c) => sum + (c.expected_value * c.probability / 100), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPipelineValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Total Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(weightedValue)}</p>
                <p className="text-xs text-muted-foreground">Valor Ponderado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{cases.length}</p>
                <p className="text-xs text-muted-foreground">Casos Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {cases.filter(c => c.health_score < 50).length}
                </p>
                <p className="text-xs text-muted-foreground">Casos en Riesgo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Pipeline de Casos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage.id} className="flex-shrink-0 w-72">
                  <div className={`rounded-lg border-2 ${stage.color} p-3`}>
                    {/* Stage Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {getCasesByStage(stage.id).length} casos • {formatCurrency(getStageValue(stage.id))}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Droppable Area */}
                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[200px] space-y-2 transition-colors rounded-md p-1 ${
                            snapshot.isDraggingOver ? 'bg-primary/10' : ''
                          }`}
                        >
                          {getCasesByStage(stage.id).map((caseItem, index) => (
                            <Draggable 
                              key={caseItem.id} 
                              draggableId={caseItem.id} 
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onCaseClick?.(caseItem.id)}
                                  className={`bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
                                    snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                                  } ${caseItem.health_score < 50 ? 'border-orange-300' : ''}`}
                                >
                                  {/* Case Card Content */}
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{caseItem.title}</p>
                                        {caseItem.case_number && (
                                          <p className="text-xs text-muted-foreground">#{caseItem.case_number}</p>
                                        )}
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{caseItem.client_name}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <Badge variant="outline" className="text-xs">
                                        {caseItem.case_type}
                                      </Badge>
                                      <span className="text-xs font-semibold text-emerald-600">
                                        {formatCurrency(caseItem.expected_value)}
                                      </span>
                                    </div>

                                    {/* Health & Probability Indicator */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${
                                            caseItem.health_score >= 70 ? 'bg-green-500' :
                                            caseItem.health_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${caseItem.health_score}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {caseItem.probability}%
                                      </span>
                                    </div>

                                    {caseItem.next_action_date && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(caseItem.next_action_date), 'dd MMM', { locale: es })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              ))}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
}
