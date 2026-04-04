import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Briefcase, Clock, Brain, Zap, Loader2, LinkIcon } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { ToolCostIndicator } from "@/components/credits/ToolCostIndicator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CRMClientsView from "./crm/CRMClientsView";
import CRMCasesView from "./crm/CRMCasesView";
import CRMTasksView from "./crm/CRMTasksView";
import CRMDocumentsView from "./crm/CRMDocumentsView";
import CRMEntitiesView from "./crm/CRMEntitiesView";
import CasePipelineView from "./crm/CasePipelineView";
import LeadPipeline from "./crm/LeadPipeline";
import CRMOnboarding, { type OnboardingStepStatus } from "./crm/CRMOnboarding";
import CRMNewsFeed from "./crm/CRMNewsFeed";
import CRMAIChat from "./crm/CRMAIChat";
import PortalAccessManager from "./crm/PortalAccessManager";

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

export default function CRMModule({ user, currentView, onViewChange, onLogout }: CRMModuleProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<CRMStats>({ clients: 0, cases: 0, tasks: 0, leads: 0 });
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStepStatus>({
    profile: false, clients: false, cases: false, tasks: false,
  });
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isPortalManagerOpen, setIsPortalManagerOpen] = useState(false);
  const [portalClients, setPortalClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [processViewMode, setProcessViewMode] = useState<'kanban' | 'list'>('kanban');
  const [clientsSubTab, setClientsSubTab] = useState<'clients' | 'entities' | 'leads'>('clients');
  const [activeTab, setActiveTab] = useState("novedades");
  const [autoOpenClients, setAutoOpenClients] = useState(false);
  const [autoOpenCases, setAutoOpenCases] = useState(false);
  const [autoOpenTasks, setAutoOpenTasks] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
    fetchPortalClients();
    fetchOnboardingStatus();
  }, []);

  const fetchOnboardingStatus = async () => {
    try {
      const [profileResult, clientsResult, casesResult, tasksResult] = await Promise.all([
        supabase.from('lawyer_public_profiles').select('id').eq('lawyer_id', user.id).eq('is_published', true).maybeSingle(),
        supabase.from('crm_clients').select('id').eq('lawyer_id', user.id).limit(1),
        supabase.from('crm_cases').select('id').eq('lawyer_id', user.id).limit(1),
        supabase.from('crm_tasks').select('id').eq('lawyer_id', user.id).limit(1),
      ]);
      setOnboardingSteps({
        profile: !!profileResult.data,
        clients: (clientsResult.data?.length || 0) > 0,
        cases: (casesResult.data?.length || 0) > 0,
        tasks: (tasksResult.data?.length || 0) > 0,
      });
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
    }
  };

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

  const fetchPortalClients = async () => {
    try {
      const { data } = await supabase
        .from('crm_clients')
        .select('id, name, email')
        .eq('lawyer_id', user.id)
        .order('name');
      setPortalClients(data || []);
    } catch (err) {
      console.error('Error fetching clients for portal:', err);
    }
  };

  const commonProps = {
    searchTerm,
    onRefresh: fetchStats,
    lawyerData: user,
  };

  const allOnboardingComplete = Object.values(onboardingSteps).every(Boolean);

  return (
    <div className="space-y-4">
      {/* Onboarding for users who haven't completed all steps */}
      {!allOnboardingComplete && (
        <CRMOnboarding
          onNavigateToProfile={() => onViewChange('public-profile')}
          onOpenClients={() => {
            setActiveTab('clientes');
            setClientsSubTab('clients');
            setAutoOpenClients(true);
          }}
          onOpenCases={() => {
            setActiveTab('procesos');
            setProcessViewMode('list');
            setAutoOpenCases(true);
          }}
          onOpenTasks={() => {
            setActiveTab('tareas');
            setAutoOpenTasks(true);
          }}
          completedSteps={onboardingSteps}
        />
      )}

      {/* Toolbar: Stats + Search + AI */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.clients}</span>
            <span className="text-muted-foreground text-xs">Clientes</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.cases}</span>
            <span className="text-muted-foreground text-xs">Procesos</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.tasks}</span>
            <span className="text-muted-foreground text-xs">Tareas</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold">{stats.leads}</span>
            <span className="text-muted-foreground text-xs">Contactos</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-[200px]"
          />
          <Button
            onClick={() => setIsAIChatOpen(true)}
            size="sm"
            variant="outline"
          >
            <Brain className="h-4 w-4 mr-1" />
            Consultar IA
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="novedades" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
          <TabsTrigger value="procesos">Procesos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
          <TabsTrigger value="mas">Más</TabsTrigger>
        </TabsList>

        {/* Tab 1: Novedades */}
        <TabsContent value="novedades">
          <CRMNewsFeed lawyerId={user.id} />
        </TabsContent>

        {/* Tab 2: Procesos */}
        <TabsContent value="procesos">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={processViewMode === 'kanban' ? 'default' : 'outline'}
                onClick={() => setProcessViewMode('kanban')}
              >
                Kanban
              </Button>
              <Button
                size="sm"
                variant={processViewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setProcessViewMode('list')}
              >
                Lista
              </Button>
            </div>
            {processViewMode === 'kanban' ? (
              <CasePipelineView lawyerData={user} />
            ) : (
              <CRMCasesView {...commonProps} />
            )}
          </div>
        </TabsContent>

        {/* Tab 3: Clientes */}
        <TabsContent value="clientes">
          <div className="space-y-3">
           <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant={clientsSubTab === 'clients' ? 'default' : 'outline'}
                onClick={() => setClientsSubTab('clients')}
              >
                Clientes
              </Button>
              <Button
                size="sm"
                variant={clientsSubTab === 'entities' ? 'default' : 'outline'}
                onClick={() => setClientsSubTab('entities')}
              >
                Empresas
              </Button>
              <Button
                size="sm"
                variant={clientsSubTab === 'leads' ? 'default' : 'outline'}
                onClick={() => setClientsSubTab('leads')}
              >
                Contactos Potenciales
              </Button>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPortalManagerOpen(true)}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-1" />
                  Accesos Portal
                </Button>
              </div>
            </div>
            {clientsSubTab === 'clients' && <CRMClientsView {...commonProps} />}
            {clientsSubTab === 'entities' && <CRMEntitiesView {...commonProps} />}
            {clientsSubTab === 'leads' && <LeadPipeline {...commonProps} />}
          </div>
        </TabsContent>

        {/* Tab 4: Tareas */}
        <TabsContent value="tareas">
          <CRMTasksView {...commonProps} />
        </TabsContent>

        {/* Tab 5: Más */}
        <TabsContent value="mas">
          <CRMDocumentsView {...commonProps} />
        </TabsContent>
      </Tabs>

      {/* AI Chat Dialog */}
      <CRMAIChat
        open={isAIChatOpen}
        onOpenChange={setIsAIChatOpen}
        lawyerId={user.id}
      />

      {/* Portal Access Manager Dialog */}
      <PortalAccessManager
        open={isPortalManagerOpen}
        onOpenChange={setIsPortalManagerOpen}
        lawyerId={user.id}
        clients={portalClients}
      />
    </div>
  );
}
