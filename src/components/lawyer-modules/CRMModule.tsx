import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Briefcase, Clock, Brain, Loader2, Zap, Building2, FileText, ChevronDown, ChevronRight, Kanban } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import CRMClientsView from "./crm/CRMClientsView";
import CRMCasesView from "./crm/CRMCasesView";
import CRMTasksView from "./crm/CRMTasksView";
import CRMDocumentsView from "./crm/CRMDocumentsView";
import CRMEntitiesView from "./crm/CRMEntitiesView";
import CasePipelineView from "./crm/CasePipelineView";
import LeadPipeline from "./crm/LeadPipeline";

interface CRMModuleProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface CRMStats {
  clients: number;
  cases: number;
  tasks: number;
  leads: number;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  count: number;
  defaultOpen: boolean;
}

export default function CRMModule({ user, currentView, onViewChange, onLogout }: CRMModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<CRMStats>({ clients: 0, cases: 0, tasks: 0, leads: 0 });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pipeline: true,
    clients: true,
    leads: false,
    tasks: true,
    cases: false,
    documents: false,
    entities: false,
  });
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(user?.id);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clientsResult, casesResult, tasksResult, leadsResult] = await Promise.all([
        supabase.from('crm_clients').select('id').eq('lawyer_id', user.id),
        supabase.from('crm_cases').select('id').eq('lawyer_id', user.id),
        supabase.from('crm_tasks').select('id').eq('lawyer_id', user.id).eq('status', 'pending'),
        supabase.from('crm_leads').select('id').eq('lawyer_id', user.id),
      ]);

      setStats({
        clients: clientsResult.data?.length || 0,
        cases: casesResult.data?.length || 0,
        tasks: tasksResult.data?.length || 0,
        leads: leadsResult.data?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching CRM stats:', error);
    }
  };

  const handleAISegmentation = async () => {
    if (!hasEnoughCredits('crm_ai')) {
      toast({
        title: "Créditos insuficientes",
        description: `Necesitas ${getToolCost('crm_ai')} créditos para la segmentación IA.`,
        variant: "destructive",
      });
      return;
    }

    const creditResult = await consumeCredits('crm_ai');
    if (!creditResult.success) return;

    setIsLoadingAI(true);
    try {
      const { error } = await supabase.functions.invoke('crm-ai-segmentation', {
        body: { lawyerId: user.id }
      });
      if (error) throw error;
      toast({
        title: "Segmentación IA completada",
        description: "Los clientes han sido organizados por segmentos inteligentes",
      });
    } catch (error) {
      console.error('Error in AI segmentation:', error);
      toast({
        title: "Error en segmentación",
        description: "No se pudo completar la segmentación automática",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const commonProps = {
    searchTerm,
    onRefresh: fetchStats,
    lawyerData: user,
  };

  const sections: SectionConfig[] = [
    { id: 'pipeline', label: 'Pipeline de Casos', icon: Kanban, count: stats.cases, defaultOpen: true },
    { id: 'clients', label: 'Clientes', icon: Users, count: stats.clients, defaultOpen: true },
    { id: 'leads', label: 'Leads', icon: Zap, count: stats.leads, defaultOpen: false },
    { id: 'tasks', label: 'Tareas Pendientes', icon: Clock, count: stats.tasks, defaultOpen: true },
    { id: 'cases', label: 'Casos', icon: Briefcase, count: stats.cases, defaultOpen: false },
    { id: 'documents', label: 'Documentos', icon: FileText, count: 0, defaultOpen: false },
    { id: 'entities', label: 'Entidades B2B', icon: Building2, count: 0, defaultOpen: false },
  ];

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'pipeline':
        return <CasePipelineView lawyerData={user} />;
      case 'clients':
        return <CRMClientsView {...commonProps} />;
      case 'leads':
        return <LeadPipeline {...commonProps} />;
      case 'tasks':
        return <CRMTasksView {...commonProps} />;
      case 'cases':
        return <CRMCasesView {...commonProps} />;
      case 'documents':
        return <CRMDocumentsView {...commonProps} />;
      case 'entities':
        return <CRMEntitiesView {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar clientes, casos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <ToolCostIndicator toolType="crm_ai" lawyerId={user?.id} />
          <Button
            onClick={handleAISegmentation}
            disabled={isLoadingAI || !hasEnoughCredits('crm_ai')}
            size="sm"
          >
            {isLoadingAI ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando IA...</>
            ) : (
              <><Brain className="h-4 w-4 mr-2" />Segmentación IA</>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users, value: stats.clients, label: 'Clientes' },
          { icon: Briefcase, value: stats.cases, label: 'Casos' },
          { icon: Clock, value: stats.tasks, label: 'Tareas' },
          { icon: Zap, value: stats.leads, label: 'Leads' },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Collapsible Sections */}
      {sections.map((section) => {
        const Icon = section.icon;
        const isOpen = openSections[section.id];

        return (
          <Collapsible
            key={section.id}
            open={isOpen}
            onOpenChange={() => toggleSection(section.id)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{section.label}</span>
                    {section.count > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {section.count}
                      </span>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  {renderSectionContent(section.id)}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}
    </div>
  );
}
