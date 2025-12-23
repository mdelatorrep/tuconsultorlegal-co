import { Coins, Flame, Trophy, Gift, CheckCircle, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DailyTask {
  id: string;
  name: string;
  reward: number;
  completed: boolean;
  claimed: boolean;
}

interface DailyProgressProps {
  balance: number;
  dailyTasks: DailyTask[];
  streak: number;
  totalCreditsToday: number;
  onClaimReward: (taskId: string) => void;
  onViewCredits: () => void;
  loading?: boolean;
}

export function DailyProgress({
  balance,
  dailyTasks,
  streak,
  totalCreditsToday,
  onClaimReward,
  onViewCredits,
  loading
}: DailyProgressProps) {
  const completedTasks = dailyTasks.filter(t => t.completed).length;
  const totalTasks = dailyTasks.length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Tasks that are completed but not yet claimed
  const claimableTasks = dailyTasks.filter(t => t.completed && !t.claimed);

  return (
    <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Balance */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Coins className="h-6 w-6 text-white" />
              </div>
              {claimableTasks.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Gift className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {loading ? '...' : balance.toLocaleString()}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">créditos disponibles</p>
            </div>
          </div>

          {/* Streak */}
          {streak > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-orange-100 dark:bg-orange-900/40">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-orange-700 dark:text-orange-300">
                {streak} días
              </span>
            </div>
          )}

          {/* Daily Progress */}
          <div className="flex-1 max-w-[200px] hidden md:block">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-700 dark:text-amber-300">Progreso diario</span>
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                {completedTasks}/{totalTasks}
              </span>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-2 bg-amber-200 dark:bg-amber-800"
            />
          </div>

          {/* Credits earned today */}
          {totalCreditsToday > 0 && (
            <Badge className="bg-emerald-500 text-white hidden sm:flex">
              +{totalCreditsToday} hoy
            </Badge>
          )}

          {/* View Credits Button */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={onViewCredits}
            className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
          >
            Ver todo
          </Button>
        </div>

        {/* Claimable rewards notification */}
        {claimableTasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 flex-wrap">
              <Gift className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                ¡Tienes {claimableTasks.length} recompensa{claimableTasks.length > 1 ? 's' : ''} por reclamar!
              </span>
              {claimableTasks.slice(0, 2).map(task => (
                <Button
                  key={task.id}
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
                  onClick={() => onClaimReward(task.id)}
                >
                  +{task.reward} ({task.name})
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
