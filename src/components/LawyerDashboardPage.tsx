import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, BarChart3, Settings, Plus, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AgentManagerPage from "./AgentManagerPage";

// Data Types
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
      setIsLoading(true);
      
      // Load agents data from Supabase
      const { data: agentsData, error: agentsError } = await supabase
        .from('legal_agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentsError) {
        console.error('Error loading agents:', agentsError);
        toast({
          title: "Error al cargar agentes",
          description: agentsError.message,
          variant: "destructive"
        });
        return;
      }

      setAgents(agentsData || []);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show Agent Manager when clicked
  if (showAgentManager) {
    return (
      <AgentManagerPage 
        onBack={() => setShowAgentManager(false)}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando dashboard del abogado...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onNavigate('home')}
                className="self-start hover:bg-muted/80 transition-colors"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Inicio
              </Button>
              
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Dashboard del Abogado
                </h1>
                <p className="text-lg text-muted-foreground">
                  Gestiona y supervisa todos los agentes legales del sistema
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Manage Agents Card */}
            <Card 
              className="group cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm"
              onClick={() => setShowAgentManager(true)}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <Settings className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {agents.length}
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Gestionar Agentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Administra, edita y supervisa todos los agentes legales disponibles en la plataforma.
                </p>
                <div className="mt-4 text-sm text-primary font-medium group-hover:underline">
                  Ver todos los agentes →
                </div>
              </CardContent>
            </Card>

            {/* Create New Agent Card */}
            <Card 
              className="group cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm"
              onClick={() => onNavigate('agent-creator')}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-full bg-green-500/10 text-green-600 group-hover:bg-green-500/20 transition-colors">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    +
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Crear Nuevo Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Desarrolla y configura un nuevo agente legal especializado para casos específicos.
                </p>
                <div className="mt-4 text-sm text-primary font-medium group-hover:underline">
                  Crear agente →
                </div>
              </CardContent>
            </Card>

            {/* Admin Panel Card */}
            <Card 
              className="group cursor-pointer border-2 hover:border-primary/50 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm md:col-span-2 lg:col-span-1"
              onClick={() => onNavigate('admin')}
            >
              <CardHeader className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-full bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold text-muted-foreground">
                    📊
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Panel de Administración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Accede a métricas avanzadas, reportes y configuración del sistema.
                </p>
                <div className="mt-4 text-sm text-primary font-medium group-hover:underline">
                  Ver panel →
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}