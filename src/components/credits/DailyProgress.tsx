import { useEffect, useCallback } from 'react';
import { Coins, Flame, Gift, ChevronRight, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useGamification } from '@/hooks/useGamification';

interface DailyProgressProps {
  lawyerId: string;
  onViewCredits?: () => void;
}

export function DailyProgress({ lawyerId, onViewCredits }: DailyProgressProps) {
  const { balance, loading: creditsLoading, refreshBalance } = useCredits(lawyerId || null);
  const { tasks, progress, loading: gamificationLoading, refreshProgress } = useGamification(lawyerId || null);

  const loading = creditsLoading || gamificationLoading || !lawyerId;

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

  const dailyTasks = tasks.filter(t => t.task_type === 'daily');
  const completedCount = dailyTasks.filter(task => {
    const p = progress.find(pr => pr.task_id === task.id);
    return p?.status === 'completed' || p?.status === 'claimed';
  }).length;
  const claimableCount = dailyTasks.filter(task => {
    const p = progress.find(pr => pr.task_id === task.id);
    return p?.status === 'completed';
  }).length;
  const totalTasks = dailyTasks.length || 3;
  const progressPercent = (completedCount / totalTasks) * 100;
  const streak = balance?.current_streak || 0;

  const handleRefresh = useCallback(() => {
    refreshProgress();
    refreshBalance();
  }, [refreshProgress, refreshBalance]);

  if (loading) {
    return (
      <div className="h-12 rounded-lg bg-muted/50 animate-pulse" />
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
      {/* Balance */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Coins className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-bold text-amber-600">{balance?.current_balance || 0}</span>
        <span className="text-xs text-muted-foreground hidden sm:inline">créditos</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border shrink-0" />

      {/* Progress */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0">{completedCount}/{totalTasks} misiones</span>
        <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[120px]" />
      </div>

      {/* Claimable badge */}
      {claimableCount > 0 && (
        <Badge className="bg-green-600 text-green-50 text-xs shrink-0 animate-pulse">
          <Gift className="h-3 w-3 mr-1" />
          {claimableCount} recompensa{claimableCount > 1 ? 's' : ''}
        </Badge>
      )}

      {/* Streak */}
      {streak > 0 && (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 shrink-0">
          <Flame className="h-3 w-3 mr-1" />
          {streak}d
        </Badge>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Actualizar">
          <RefreshCw className="h-3 w-3 text-muted-foreground" />
        </Button>
        {onViewCredits && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
            onClick={onViewCredits}
          >
            Ver misiones
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
