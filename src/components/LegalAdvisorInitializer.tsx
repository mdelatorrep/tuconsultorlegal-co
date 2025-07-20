import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Scale, 
  Building, 
  Users, 
  Zap, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Search,
  Globe
} from "lucide-react";

interface InitializationStatus {
  loading: boolean;
  completed: boolean;
  error?: string;
  createdAgents?: any[];
}

export default function LegalAdvisorInitializer() {
  const [initStatus, setInitStatus] = useState<InitializationStatus>({ loading: false, completed: false });
  const { toast } = useToast();

  const initializeLegalAdvisors = async () => {
    setInitStatus({ loading: true, completed: false });
    
    try {
      console.log('Initializing legal advisor agents...');
      
      const { data, error } = await supabase.functions.invoke('create-legal-advisor-agents', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.success) {
        setInitStatus({ 
          loading: false, 
          completed: true, 
          createdAgents: data.created_agents 
        });
        
        toast({
          title: "Agentes Asesores Creados",
          description: `Se crearon exitosamente ${data.created_agents.length} agentes asesores legales`,
        });
      } else {
        throw new Error(data.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error initializing legal advisors:', error);
      setInitStatus({ 
        loading: false, 
        completed: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      });
      
      toast({
        title: "Error",
        description: "No se pudieron crear los agentes asesores",
        variant: "destructive",
      });
    }
  };

  const predefinedAgents = [
    {
      name: "Asesor Civil para Personas",
      specialization: "civil",
      target_audience: "personas",
      icon: <Scale className="w-5 h-5" />,
      description: "Especialista en derecho civil, contratos, responsabilidad civil y derecho de familia",
      capabilities: [
        "Consulta normativa civil actualizada",
        "Análisis de contratos civiles",
        "Asesoría en responsabilidad civil",
        "Orientación en derecho de familia"
      ]
    },
    {
      name: "Asesor Comercial para Empresas",
      specialization: "comercial",
      target_audience: "empresas",
      icon: <Building className="w-5 h-5" />,
      description: "Especialista en derecho comercial, societario y empresarial",
      capabilities: [
        "Constitución de sociedades",
        "Contratos comerciales",
        "Registro mercantil",
        "Compliance empresarial"
      ]
    },
    {
      name: "Asesor Laboral Universal",
      specialization: "laboral",
      target_audience: "ambos",
      icon: <Users className="w-5 h-5" />,
      description: "Especialista en derecho laboral para empleadores y trabajadores",
      capabilities: [
        "Contratos de trabajo",
        "Liquidaciones laborales",
        "Normativa de seguridad social",
        "Procedimientos laborales"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Inicializar Agentes Asesores Legales</h2>
        <p className="text-muted-foreground">
          Crea agentes especializados en asesoría legal con acceso a fuentes actualizadas
        </p>
      </div>

      {/* Capabilities Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-blue-500" />
            <span>Capacidades de los Agentes Asesores</span>
          </CardTitle>
          <CardDescription>
            Estos agentes utilizan OpenAI con herramientas de búsqueda web para consultar fuentes legales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Search className="w-4 h-4 mr-2 text-green-500" />
                Búsqueda Legal Inteligente
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Consulta normativa vigente en tiempo real</li>
                <li>• Acceso a jurisprudencia actualizada</li>
                <li>• Verificación de vigencia de leyes</li>
                <li>• Búsqueda en fuentes oficiales colombianas</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium flex items-center">
                <Globe className="w-4 h-4 mr-2 text-blue-500" />
                Fuentes Oficiales
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Función Pública</li>
                <li>• Corte Constitucional</li>
                <li>• Superintendencias</li>
                <li>• Ministerios especializados</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predefined Agents */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Agentes a Crear:</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predefinedAgents.map((agent, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {agent.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <div className="flex space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {agent.specialization}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {agent.target_audience}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>
                <div className="space-y-2">
                  <h5 className="text-xs font-medium">Capacidades:</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {agent.capabilities.map((capability, capIndex) => (
                      <li key={capIndex} className="flex items-start">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 mr-1 flex-shrink-0" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              
              {initStatus.completed && initStatus.createdAgents?.find(ca => ca.specialization === agent.specialization) && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Initialization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Inicialización</CardTitle>
          <CardDescription>
            Crea los agentes asesores legales con capacidades de búsqueda web
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!initStatus.completed && !initStatus.loading && (
            <Button 
              onClick={initializeLegalAdvisors}
              className="w-full"
              size="lg"
            >
              <Bot className="w-4 h-4 mr-2" />
              Crear Agentes Asesores Legales
            </Button>
          )}

          {initStatus.loading && (
            <div className="flex items-center justify-center py-8 space-x-3">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Creando agentes asesores...</p>
                <p className="text-sm text-muted-foreground">
                  Configurando OpenAI Agents con herramientas de búsqueda
                </p>
              </div>
            </div>
          )}

          {initStatus.error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Error en la inicialización</p>
                <p className="text-sm text-red-600">{initStatus.error}</p>
              </div>
            </div>
          )}

          {initStatus.completed && initStatus.createdAgents && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-800">Agentes creados exitosamente</p>
                  <p className="text-sm text-green-600">
                    {initStatus.createdAgents.length} agentes asesores listos para consultas
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Agentes Creados:</h4>
                {initStatus.createdAgents.map((agent, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Especialización: {agent.specialization}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      {agent.openai_agent_id.substring(0, 8)}...
                    </Badge>
                  </div>
                ))}
              </div>

              <Button 
                onClick={() => setInitStatus({ loading: false, completed: false })}
                variant="outline"
                className="w-full"
              >
                Reinicializar Agentes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {initStatus.completed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Pasos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Agentes Listos</p>
                <p className="text-sm text-muted-foreground">
                  Los usuarios pueden ahora acceder a consultas legales especializadas
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Search className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Búsqueda Activa</p>
                <p className="text-sm text-muted-foreground">
                  Cada consulta buscará automáticamente fuentes legales actualizadas
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Globe className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Fuentes Oficiales</p>
                <p className="text-sm text-muted-foreground">
                  Acceso directo a normativa vigente de Colombia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}