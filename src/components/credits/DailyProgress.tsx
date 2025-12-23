import { useEffect, useState } from 'react';
import { Coins, Flame, Trophy, Gift, CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';
import { useGamification } from '@/hooks/useGamification';

interface DailyProgressProps {
  lawyerId: string;
  onViewCredits?: () => void;
}

export function DailyProgress({ lawyerId, onViewCredits }: DailyProgressProps) {
  const { balance, loading: creditsLoading } = useCredits(lawyerId);
  const { tasks, progress, checkAndClaimTask, loading: gamificationLoading } = useGamification(lawyerId);

  const loading = creditsLoading || gamificationLoading;

  // Get daily tasks
  const dailyTasks = tasks.filter(t => t.task_type === 'daily');
  const dailyProgress = dailyTasks.map(task => {
    const taskProgress = progress.find(p => p.task_id === task.id);
    return {
      id: task.id,
      name: task.name,
      reward: task.credit_reward,
      completed: taskProgress?.status === 'completed' || taskProgress?.status === 'claimed',
      claimed: taskProgress?.status === 'claimed'
    };
  });

  const completedCount = dailyProgress.filter(t => t.completed).length;
  const totalTasks = dailyProgress.length || 3; // Default to 3 if no tasks
  const progressPercent = (completedCount / totalTasks) * 100;
  const claimableTasks = dailyProgress.filter(t => t.completed && !t.claimed);

  // Calculate streak from gamification data
  const streak = progress.filter(p => p.status === 'claimed').length > 0 ? 1 : 0;

  const handleClaimReward = async (taskId: string) => {
    await checkAndClaimTask(taskId);
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-amber-600" />
            Progreso Diario
          </span>
          {streak > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <Flame className="h-3 w-3 mr-1" />
              {streak} días
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Balance:</span>
          <span className="text-lg font-bold text-amber-600">
            {balance?.current_balance || 0} <span className="text-xs font-normal">créditos</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Misiones de hoy</span>
            <span className="font-medium">{completedCount}/{totalTasks}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Quick Tasks Preview */}
        {dailyProgress.slice(0, 2).map((task) => (
          <div 
            key={task.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg text-xs",
              task.completed ? "bg-green-100/50 dark:bg-green-900/20" : "bg-muted/50"
            )}
          >
            <div className="flex items-center gap-2">
              {task.completed ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <span className={cn(task.completed && "line-through text-muted-foreground")}>
                {task.name}
              </span>
            </div>
            {task.completed && !task.claimed ? (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 text-xs text-green-600 hover:text-green-700 p-1"
                onClick={() => handleClaimReward(task.id)}
              >
                <Gift className="h-3 w-3 mr-1" />
                +{task.reward}
              </Button>
            ) : (
              <Badge variant="outline" className="text-xs h-5">
                +{task.reward}
              </Badge>
            )}
          </div>
        ))}

        {/* View All Button */}
        {onViewCredits && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-amber-600 hover:text-amber-700"
            onClick={onViewCredits}
          >
            Ver todas las misiones
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}