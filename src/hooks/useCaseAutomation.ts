import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateTaskParams {
  caseId: string;
  lawyerId: string;
  title: string;
  description?: string;
  type?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date;
  metadata?: Record<string, any>;
}

interface LogActivityParams {
  caseId: string;
  lawyerId: string;
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export const useCaseAutomation = () => {
  
  // Create a task linked to a case
  const createTask = async ({
    caseId,
    lawyerId,
    title,
    description,
    type = 'ai_followup',
    priority = 'medium',
    dueDate,
    metadata
  }: CreateTaskParams) => {
    try {
      const { error } = await supabase
        .from('crm_tasks')
        .insert({
          case_id: caseId,
          lawyer_id: lawyerId,
          title,
          description,
          type,
          priority,
          due_date: dueDate?.toISOString() || null,
          metadata: metadata || {},
          status: 'pending'
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error creating task:', error);
      return { success: false, error };
    }
  };

  // Log an activity to the case timeline
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

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error };
    }
  };

  // Handle AI tool completion - creates task and logs activity
  const handleAIToolCompletion = async (params: {
    caseId: string;
    lawyerId: string;
    toolType: 'analysis' | 'research' | 'strategy' | 'drafting' | 'prediction';
    resultId: string;
    inputSummary: string;
    outputSummary: string;
  }) => {
    const { caseId, lawyerId, toolType, resultId, inputSummary, outputSummary } = params;

    const toolConfig: Record<string, { 
      icon: string; 
      label: string; 
      taskTitle: string;
      taskDescription: string;
    }> = {
      analysis: {
        icon: '📄',
        label: 'Análisis de documento',
        taskTitle: 'Revisar conclusiones del análisis',
        taskDescription: 'Revisar y aplicar las conclusiones del análisis de documento realizado con IA'
      },
      research: {
        icon: '🔍',
        label: 'Investigación legal',
        taskTitle: 'Evaluar jurisprudencia encontrada',
        taskDescription: 'Revisar la jurisprudencia y fuentes legales encontradas en la investigación'
      },
      strategy: {
        icon: '🎯',
        label: 'Estrategia legal',
        taskTitle: 'Implementar recomendaciones de estrategia',
        taskDescription: 'Revisar y aplicar las recomendaciones del análisis estratégico'
      },
      drafting: {
        icon: '✍️',
        label: 'Redacción de documento',
        taskTitle: 'Revisar borrador generado',
        taskDescription: 'Revisar, editar y finalizar el documento redactado con IA'
      },
      prediction: {
        icon: '📊',
        label: 'Predicción de caso',
        taskTitle: 'Analizar riesgos identificados',
        taskDescription: 'Revisar los factores de riesgo y probabilidades del análisis predictivo'
      }
    };

    const config = toolConfig[toolType];

    // Log the activity
    await logActivity({
      caseId,
      lawyerId,
      activityType: 'ai_tool',
      title: `${config.icon} ${config.label}`,
      description: inputSummary,
      metadata: {
        tool_type: toolType,
        result_id: resultId,
        output_summary: outputSummary.substring(0, 500)
      }
    });

    // Create follow-up task
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await createTask({
      caseId,
      lawyerId,
      title: config.taskTitle,
      description: config.taskDescription,
      type: 'ai_followup',
      priority: 'medium',
      dueDate: tomorrow,
      metadata: {
        source: 'ai_tool_automation',
        tool_type: toolType,
        result_id: resultId
      }
    });

    return { success: true };
  };

  // Handle process actuation - log activity and create task
  const handleProcessActuation = async (params: {
    caseId: string;
    lawyerId: string;
    processRadicado: string;
    actuationDescription: string;
    actuationDate: string;
  }) => {
    const { caseId, lawyerId, processRadicado, actuationDescription, actuationDate } = params;

    // Log activity
    await logActivity({
      caseId,
      lawyerId,
      activityType: 'process_actuation',
      title: `⚖️ Nueva actuación en proceso ${processRadicado}`,
      description: actuationDescription,
      metadata: {
        radicado: processRadicado,
        actuation_date: actuationDate
      }
    });

    // Create review task
    await createTask({
      caseId,
      lawyerId,
      title: `Revisar actuación del ${new Date(actuationDate).toLocaleDateString('es-CO')}`,
      description: `Nueva actuación en proceso ${processRadicado}: ${actuationDescription}`,
      type: 'process_review',
      priority: 'high',
      metadata: {
        source: 'process_automation',
        radicado: processRadicado
      }
    });

    return { success: true };
  };

  return {
    createTask,
    logActivity,
    handleAIToolCompletion,
    handleProcessActuation
  };
};

export default useCaseAutomation;
