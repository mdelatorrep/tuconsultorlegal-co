import { supabase } from '@/integrations/supabase/client';

interface LogActivityParams {
  caseId: string;
  lawyerId: string;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export const useCaseActivityLogger = () => {
  const logActivity = async ({
    caseId,
    lawyerId,
    activityType,
    title,
    description,
    metadata
  }: LogActivityParams) => {
    try {
      const { error } = await supabase
        .from('crm_case_activities')
        .insert({
          case_id: caseId,
          lawyer_id: lawyerId,
          activity_type: activityType,
          title,
          description,
          metadata: metadata || {},
          activity_date: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging case activity:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in logActivity:', error);
      return { success: false, error };
    }
  };

  const logAIToolUsage = async (params: {
    caseId: string;
    lawyerId: string;
    toolType: 'analysis' | 'research' | 'strategy' | 'drafting';
    resultId: string;
    inputSummary: string;
  }) => {
    const toolLabels: Record<string, string> = {
      analysis: 'Análisis de documento',
      research: 'Investigación legal',
      strategy: 'Estrategia legal',
      drafting: 'Redacción de documento'
    };

    const toolIcons: Record<string, string> = {
      analysis: '📄',
      research: '🔍',
      strategy: '🎯',
      drafting: '✍️'
    };

    return logActivity({
      caseId: params.caseId,
      lawyerId: params.lawyerId,
      activityType: 'ai_tool',
      title: `${toolIcons[params.toolType]} ${toolLabels[params.toolType]}`,
      description: params.inputSummary,
      metadata: {
        tool_type: params.toolType,
        result_id: params.resultId,
        logged_at: new Date().toISOString()
      }
    });
  };

  return {
    logActivity,
    logAIToolUsage
  };
};

export default useCaseActivityLogger;
