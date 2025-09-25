import { supabase } from '@/integrations/supabase/client';

export const createLegalAdvisorAgents = async () => {
  try {
    console.log('Triggering creation of legal advisor agents...');
    
    const { data, error } = await supabase.functions.invoke('create-legal-advisor-agents', {
      body: {}
    });

    if (error) {
      console.error('Error creating legal advisor agents:', error);
      throw error;
    }

    console.log('Legal advisor agents created successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to create legal advisor agents:', error);
    throw error;
  }
};

export const checkAgentsStatus = async () => {
  try {
    const { data, error } = await supabase
      .from('legal_advisor_agents')
      .select('name, openai_agent_id, status')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tempAgents = data?.filter(agent => agent.openai_agent_id.startsWith('temp_')) || [];
    
    return {
      total: data?.length || 0,
      needsCreation: tempAgents.length,
      agents: data || []
    };
  } catch (error) {
    console.error('Error checking agents status:', error);
    return { total: 0, needsCreation: 0, agents: [] };
  }
};