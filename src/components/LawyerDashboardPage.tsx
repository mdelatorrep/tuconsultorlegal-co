import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, FileText, Plus, Settings, BarChart3, Users } from "lucide-react";
import AgentManagerPage from "./AgentManagerPage";

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  suggested_price: number;
  final_price: number | null;
  created_at: string;
}

interface LawyerDashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenChat?: (message?: string) => void;
}

export default function LawyerDashboardPage({ onNavigate }: LawyerDashboardPageProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading agents:', error);
        toast({
          title: "Error al cargar agentes",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      setAgents(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showAgentManager) {
    return (
      <AgentManagerPage 
        onBack={() => setShowAgentManager(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => onNavigate('home')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Inicio
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard del Abogado</h1>
              <p className="text-muted-foreground">Gestiona tus agentes legales</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setShowAgentManager(true)}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Gestionar Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Administra los agentes legales del sistema.
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('agent-creator')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Crear Nuevo Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Desarrolla un nuevo agente legal.
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => onNavigate('admin')}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Panel de Administración
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Accede al panel de administración.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}