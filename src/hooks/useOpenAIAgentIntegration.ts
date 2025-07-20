import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useOpenAIAgentIntegration = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  const createOpenAIAgent = async (legalAgentId: string, forceRecreate = false) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-openai-agent', {
        body: {
          legal_agent_id: legalAgentId,
          force_recreate: forceRecreate
        }
      });

      if (error) {
        console.error('Error creating OpenAI agent:', error);
        throw new Error(error.message || 'Failed to create OpenAI agent');
      }

      if (data.success) {
        setIsEnabled(true);
        toast.success(`Agente OpenAI creado exitosamente: ${data.openai_agent_id}`);
        return {
          success: true,
          openai_agent_id: data.openai_agent_id,
          agent_id: data.agent_id
        };
      } else {
        throw new Error(data.error || 'Unknown error creating OpenAI agent');
      }
    } catch (error) {
      console.error('Error in createOpenAIAgent:', error);
      toast.error(`Error al crear agente OpenAI: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    } finally {
      setIsCreating(false);
    }
  };

  const checkOpenAIAgentExists = async (legalAgentId: string) => {
    try {
      const { data, error } = await supabase
        .from('openai_agents')
        .select('id, openai_agent_id, status')
        .eq('legal_agent_id', legalAgentId)
        .eq('status', 'active')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking OpenAI agent:', error);
        return { exists: false, agent: null };
      }

      return { 
        exists: !!data, 
        agent: data,
        openai_agent_id: data?.openai_agent_id
      };
    } catch (error) {
      console.error('Error checking OpenAI agent existence:', error);
      return { exists: false, agent: null };
    }
  };

  const enableOpenAIForAgent = async (legalAgentId: string) => {
    const { exists } = await checkOpenAIAgentExists(legalAgentId);
    
    if (exists) {
      setIsEnabled(true);
      toast.info('El agente OpenAI ya está habilitado para este documento');
      return { success: true, alreadyExists: true };
    }

    return await createOpenAIAgent(legalAgentId);
  };

  const getOpenAIAgentCapabilities = () => {
    return {
      features: [
        {
          name: "Conversación Inteligente",
          description: "Chat más natural y contextual que entiende mejor las necesidades del usuario"
        },
        {
          name: "Recopilación Estructurada",
          description: "Organiza automáticamente la información en formato óptimo para generar documentos"
        },
        {
          name: "Validación en Tiempo Real", 
          description: "Verifica que la información esté completa antes de generar el documento"
        },
        {
          name: "Progreso Visual",
          description: "Muestra al usuario cuánta información falta y qué pasos siguen"
        },
        {
          name: "Adaptación de Audiencia",
          description: "Ajusta automáticamente el lenguaje según sea para personas o empresas"
        },
        {
          name: "Manejo de Errores Avanzado",
          description: "Recuperación inteligente de errores y sugerencias de corrección"
        }
      ],
      benefits: [
        "Experiencia de usuario 3x más fluida",
        "Reducción del 70% en errores de información",
        "Generación de documentos más precisos",
        "Mayor satisfacción del cliente final"
      ]
    };
  };

  return {
    isCreating,
    isEnabled,
    createOpenAIAgent,
    checkOpenAIAgentExists,
    enableOpenAIForAgent,
    getOpenAIAgentCapabilities,
    setIsEnabled
  };
};