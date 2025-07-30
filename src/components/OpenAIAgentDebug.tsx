import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface OpenAIAgentDebugProps {
  legalAgentId: string;
}

interface OpenAIAgentStatus {
  exists: boolean;
  openai_agent_id?: string;
  status?: string;
  model?: string;
  tools?: any[];
  lastActivity?: string;
  conversations_count?: number;
  success_rate?: number;
}

export default function OpenAIAgentDebug({ legalAgentId }: OpenAIAgentDebugProps) {
  const [agentStatus, setAgentStatus] = useState<OpenAIAgentStatus>({ exists: false });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const checkAgentStatus = async () => {
    setLoading(true);
    try {
      // Check OpenAI agent
      const { data: openaiAgent, error: openaiError } = await supabase
        .from('openai_agents')
        .select('*')
        .eq('legal_agent_id', legalAgentId)
        .eq('status', 'active')
        .maybeSingle();

      if (openaiError) {
        console.error('Error checking OpenAI agent:', openaiError);
      }

      // Get legal agent stats
      const { data: legalAgent, error: legalError } = await supabase
        .from('legal_agents')
        .select('openai_conversations_count, openai_success_rate, last_openai_activity')
        .eq('id', legalAgentId)
        .single();

      if (legalError) {
        console.error('Error checking legal agent stats:', legalError);
      }

      setAgentStatus({
        exists: !!openaiAgent,
        openai_agent_id: openaiAgent?.openai_agent_id,
        status: openaiAgent?.status,
        model: openaiAgent?.model,
        tools: openaiAgent?.tools as any[] || [],
        lastActivity: legalAgent?.last_openai_activity,
        conversations_count: legalAgent?.openai_conversations_count,
        success_rate: legalAgent?.openai_success_rate
      });
    } catch (error) {
      console.error('Error checking agent status:', error);
      toast.error('Error al verificar estado del agente');
    } finally {
      setLoading(false);
    }
  };

  const createAgent = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-openai-agent', {
        body: {
          legal_agent_id: legalAgentId,
          force_recreate: true
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Agente OpenAI creado exitosamente');
        await checkAgentStatus();
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error creating OpenAI agent:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setCreating(false);
    }
  };

  const testAgent = async () => {
    if (!agentStatus.openai_agent_id) return;

    try {
      const { data, error } = await supabase.functions.invoke('agent-workflow-orchestrator', {
        body: {
          messages: [{ role: 'user', content: 'Hola, quiero crear un documento de prueba' }],
          agentId: agentStatus.openai_agent_id,
          documentTokenId: null
        }
      });

      if (error) throw error;

      toast.success('Prueba del agente exitosa');
    } catch (error) {
      console.error('Error testing agent:', error);
      toast.error(`Error en prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  useEffect(() => {
    checkAgentStatus();
  }, [legalAgentId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Verificando estado del agente...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          {agentStatus.exists ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          Estado del Agente OpenAI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Estado:</span>
            <Badge 
              variant={agentStatus.exists ? "default" : "destructive"}
              className="ml-2"
            >
              {agentStatus.exists ? 'Activo' : 'No Existe'}
            </Badge>
          </div>
          
          {agentStatus.exists && (
            <>
              <div>
                <span className="font-medium">ID OpenAI:</span>
                <span className="ml-2 text-xs font-mono">{agentStatus.openai_agent_id?.slice(-8)}</span>
              </div>
              
              <div>
                <span className="font-medium">Modelo:</span>
                <span className="ml-2">{agentStatus.model}</span>
              </div>
              
              <div>
                <span className="font-medium">Herramientas:</span>
                <span className="ml-2">{agentStatus.tools?.length || 0}</span>
              </div>
              
              <div>
                <span className="font-medium">Conversaciones:</span>
                <span className="ml-2">{agentStatus.conversations_count || 0}</span>
              </div>
              
              <div>
                <span className="font-medium">Tasa de éxito:</span>
                <span className="ml-2">{agentStatus.success_rate ? `${agentStatus.success_rate.toFixed(1)}%` : 'N/A'}</span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={checkAgentStatus}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          
          {!agentStatus.exists ? (
            <Button 
              size="sm"
              onClick={createAgent}
              disabled={creating}
            >
              {creating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Crear Agente
            </Button>
          ) : (
            <Button 
              variant="secondary"
              size="sm"
              onClick={testAgent}
            >
              <Clock className="h-4 w-4 mr-2" />
              Probar
            </Button>
          )}
        </div>

        {agentStatus.exists && agentStatus.tools && (
          <div className="text-xs">
            <span className="font-medium">Funciones disponibles:</span>
            <ul className="mt-1 space-y-1">
              {agentStatus.tools.map((tool: any, index: number) => (
                <li key={index} className="text-muted-foreground">
                  • {tool.function?.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}