import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, Briefcase, Scale, Building2, Receipt, Landmark, Shield,
  Star, MessageSquare, Search, Users, Building, Crown, Zap,
  ChevronRight, Sparkles
} from "lucide-react";

interface SpecializedAgent {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  category: string;
  target_audience: string;
  icon: string;
  color_class: string;
  credits_per_session: number;
  is_premium: boolean;
  is_featured: boolean;
  usage_count: number;
  avg_rating: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Briefcase,
  Scale,
  Building2,
  Receipt,
  Landmark,
  Shield,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  laboral: 'Laboral',
  civil: 'Civil',
  comercial: 'Comercial',
  tributario: 'Tributario',
  administrativo: 'Administrativo',
  penal: 'Penal',
  familia: 'Familia',
};

const AUDIENCE_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  personas: { label: 'Personas', icon: Users },
  empresas: { label: 'Empresas', icon: Building },
  ambos: { label: 'Todos', icon: Users },
};

interface SpecializedAgentsGridProps {
  onSelectAgent: (agent: SpecializedAgent) => void;
  lawyerId?: string;
}

export const SpecializedAgentsGrid = ({ onSelectAgent, lawyerId }: SpecializedAgentsGridProps) => {
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const { data, error } = await supabase
          .from('specialized_agents_catalog')
          .select('*')
          .eq('status', 'active')
          .order('display_order', { ascending: true });

        if (error) throw error;
        setAgents(data || []);
      } catch (error) {
        console.error('Error fetching agents:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los agentes",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const categories = ['all', ...new Set(agents.map(a => a.category))];

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = !searchQuery || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredAgents = filteredAgents.filter(a => a.is_featured);
  const regularAgents = filteredAgents.filter(a => !a.is_featured);

  const renderAgentCard = (agent: SpecializedAgent) => {
    const IconComponent = ICON_MAP[agent.icon] || Bot;
    const AudienceIcon = AUDIENCE_LABELS[agent.target_audience]?.icon || Users;

    return (
      <Card 
        key={agent.id}
        className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${
          agent.is_featured ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-card' : 'hover:border-primary/30'
        }`}
        onClick={() => onSelectAgent(agent)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className={`p-3 rounded-xl ${agent.color_class} text-white shadow-lg`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex items-center gap-1">
              {agent.is_featured && (
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              )}
              {agent.is_premium && (
                <Crown className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-lg mt-3 group-hover:text-primary transition-colors">
            {agent.name}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {agent.short_description || agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {CATEGORY_LABELS[agent.category] || agent.category}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AudienceIcon className="h-3 w-3" />
                {AUDIENCE_LABELS[agent.target_audience]?.label}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agent.credits_per_session > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {agent.credits_per_session}
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          
          {agent.usage_count > 0 && (
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {agent.usage_count} sesiones
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="w-12 h-12 bg-muted rounded-xl" />
              <div className="h-5 bg-muted rounded w-3/4 mt-3" />
              <div className="h-4 bg-muted rounded w-full mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-12 text-center">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No hay agentes disponibles</h3>
          <p className="text-muted-foreground">
            Los agentes especializados estarán disponibles próximamente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Agentes Especializados
          </h2>
          <p className="text-muted-foreground">
            Asistentes IA expertos en diferentes áreas del derecho colombiano
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar agente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {categories.filter(c => c !== 'all').map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">
              {CATEGORY_LABELS[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {/* Featured Agents */}
          {featuredAgents.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Destacados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredAgents.map(renderAgentCard)}
              </div>
            </div>
          )}

          {/* Regular Agents */}
          {regularAgents.length > 0 && (
            <div>
              {featuredAgents.length > 0 && (
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  Todos los agentes
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularAgents.map(renderAgentCard)}
              </div>
            </div>
          )}

          {filteredAgents.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <Search className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">
                  No se encontraron agentes con los filtros seleccionados
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpecializedAgentsGrid;
