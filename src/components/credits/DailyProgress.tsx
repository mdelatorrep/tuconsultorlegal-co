import { useEffect, useCallback } from 'react';
import { Coins, Flame, Trophy, Gift, CheckCircle, Circle, ChevronRight, RefreshCw, Target } from 'lucide-react';
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
  const { balance, loading: creditsLoading, refreshBalance } = useCredits(lawyerId || null);
  const { tasks, progress, checkAndClaimTask, loading: gamificationLoading, refreshProgress } = useGamification(lawyerId || null);

  const loading = creditsLoading || gamificationLoading || !lawyerId;

  // Listen for gamification updates to refresh
  useEffect(() => {
    const handleRefresh = () => {
      refreshProgress();
      refreshBalance();
    };

    window.addEventListener('credits:refresh', handleRefresh);
    window.addEventListener('gamification:update', handleRefresh);

    return () => {
      window.removeEventListener('credits:refresh', handleRefresh);
      window.removeEventListener('gamification:update', handleRefresh);
    };
  }, [refreshProgress, refreshBalance]);

  // Get daily tasks
  const dailyTasks = tasks.filter(t => t.task_type === 'daily');
  const dailyProgress = dailyTasks.map(task => {
    const taskProgress = progress.find(p => p.task_id === task.id);
    return {
      id: task.id,
      key: task.task_key,
      name: task.name,
      description: task.description,
      reward: task.credit_reward,
      completed: taskProgress?.status === 'completed' || taskProgress?.status === 'claimed',
      claimed: taskProgress?.status === 'claimed',
      icon: task.icon
    };
  });

  const completedCount = dailyProgress.filter(t => t.completed).length;
  const totalTasks = dailyProgress.length || 3;
  const progressPercent = (completedCount / totalTasks) * 100;
  const claimableTasks = dailyProgress.filter(t => t.completed && !t.claimed);
  const pendingTasks = dailyProgress.filter(t => !t.completed);

  // Calculate streak from gamification data
  const streak = progress.filter(p => p.status === 'claimed').length > 0 ? 1 : 0;

  const handleClaimReward = async (taskKey: string) => {
    await checkAndClaimTask(taskKey);
  };

  const handleRefresh = useCallback(() => {
    refreshProgress();
    refreshBalance();
  }, [refreshProgress, refreshBalance]);

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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleRefresh}
              title="Actualizar"
            >
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
            </Button>
            {streak > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                <Flame className="h-3 w-3 mr-1" />
                {streak} días
              </Badge>
            )}
          </div>
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

        {/* Claimable Tasks Alert */}
        {claimableTasks.length > 0 && (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
              <Gift className="h-4 w-4" />
              <span className="font-medium">
                ¡{claimableTasks.length} recompensa{claimableTasks.length > 1 ? 's' : ''} disponible{claimableTasks.length > 1 ? 's' : ''}!
              </span>
            </div>
          </div>
        )}

        {/* Tasks List */}
        <div className="space-y-2">
          {dailyProgress.slice(0, 3).map((task) => (
            <div 
              key={task.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg text-xs transition-all",
                task.claimed ? "bg-muted/30 opacity-60" : 
                task.completed ? "bg-green-100/50 dark:bg-green-900/20 ring-1 ring-green-300" : 
                "bg-muted/50 hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {task.claimed ? (
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                ) : task.completed ? (
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0 animate-pulse" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  "truncate",
                  task.claimed && "line-through text-muted-foreground"
                )}>
                  {task.name}
                </span>
              </div>
              {task.completed && !task.claimed ? (
                <Button 
                  size="sm" 
                  variant="default"
                  className="h-6 text-xs bg-green-600 hover:bg-green-700 px-2 ml-2 shrink-0"
                  onClick={() => handleClaimReward(task.key)}
                >
                  <Gift className="h-3 w-3 mr-1" />
                  +{task.reward}
                </Button>
              ) : (
                <Badge 
                  variant={task.claimed ? "secondary" : "outline"} 
                  className="text-xs h-5 shrink-0 ml-2"
                >
                  +{task.reward}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Pending Tasks CTA */}
        {pendingTasks.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50 rounded-lg">
            <div className="flex items-start gap-2">
              <Target className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  {pendingTasks.length} misión{pendingTasks.length > 1 ? 'es' : ''} pendiente{pendingTasks.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Usa las herramientas de IA para completarlas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View All Button */}
        {onViewCredits && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
            onClick={onViewCredits}
          >
            <Trophy className="h-3 w-3 mr-2" />
            Ver todas las misiones y recompensas
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}