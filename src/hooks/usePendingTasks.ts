import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PendingTask {
  id: string;
  lawyerId: string;
  toolType: string;
  title: string;
  query: string;
  status: 'pending' | 'completed' | 'failed';
  result: any;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface UsePendingTasksOptions {
  lawyerId?: string;
  toolTypes?: string[];
  autoRefresh?: boolean;
}

export const usePendingTasks = (options: UsePendingTasksOptions = {}) => {
  const { lawyerId, toolTypes, autoRefresh = true } = options;
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Map database row to PendingTask
  const mapRowToTask = (row: any): PendingTask => ({
    id: row.id,
    lawyerId: row.lawyer_id,
    toolType: row.tool_type || 'research',
    title: row.title || row.query?.substring(0, 50) + '...',
    query: row.query,
    status: row.status as 'pending' | 'completed' | 'failed',
    result: row.result,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  });

  // Fetch all pending tasks for the lawyer
  const fetchTasks = useCallback(async () => {
    if (!lawyerId) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('async_research_tasks')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false });

      // Filter by status - get pending and recently completed (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      query = query.or(`status.eq.pending,and(status.neq.pending,completed_at.gte.${oneHourAgo})`);

      if (toolTypes && toolTypes.length > 0) {
        query = query.in('tool_type', toolTypes);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;

      setTasks(data?.map(mapRowToTask) || []);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lawyerId, toolTypes]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!lawyerId || !autoRefresh) return;

    fetchTasks();

    // Subscribe to changes on async_research_tasks
    const channel = supabase
      .channel(`pending-tasks-${lawyerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'async_research_tasks',
          filter: `lawyer_id=eq.${lawyerId}`,
        },
        (payload) => {
          console.log('📡 Realtime task update:', payload.eventType, payload);

          if (payload.eventType === 'INSERT') {
            const newTask = mapRowToTask(payload.new);
            setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = mapRowToTask(payload.new);
            const oldStatus = (payload.old as any)?.status;
            
            setTasks(prev => 
              prev.map(t => t.id === updatedTask.id ? updatedTask : t)
            );

            // Show toast when task completes
            if (oldStatus === 'pending' && updatedTask.status === 'completed') {
              toast({
                title: "✅ Tarea completada",
                description: `${getToolTypeName(updatedTask.toolType)}: ${updatedTask.title}`,
              });
            } else if (oldStatus === 'pending' && updatedTask.status === 'failed') {
              toast({
                title: "❌ Tarea fallida",
                description: `${getToolTypeName(updatedTask.toolType)}: ${updatedTask.errorMessage || 'Error desconocido'}`,
                variant: "destructive",
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lawyerId, autoRefresh, fetchTasks, toast]);

  // Get pending count
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  // Get tasks by type
  const getTasksByType = (toolType: string) => 
    tasks.filter(t => t.toolType === toolType);

  // Get pending tasks only
  const pendingTasks = tasks.filter(t => t.status === 'pending');

  // Get recently completed tasks
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return {
    tasks,
    pendingTasks,
    completedTasks,
    pendingCount,
    isLoading,
    fetchTasks,
    getTasksByType,
  };
};

// Helper function to get human-readable tool type name
const getToolTypeName = (toolType: string): string => {
  const names: Record<string, string> = {
    research: 'Investigación',
    analysis: 'Análisis',
    strategy: 'Estrategia',
    drafting: 'Redacción',
    prediction: 'Predicción',
  };
  return names[toolType] || toolType;
};

export { getToolTypeName };
