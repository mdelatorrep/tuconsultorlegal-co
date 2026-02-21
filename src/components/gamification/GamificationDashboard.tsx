import { useGamification } from '@/hooks/useGamification';
import { useCredits } from '@/hooks/useCredits';
import { GamificationPanel } from '@/components/credits/GamificationPanel';
import { LevelProgressBar } from './LevelProgressBar';
import { StreakIndicator } from './StreakIndicator';
import { Award } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GamificationDashboardProps {
  lawyerId: string;
  className?: string;
}

export function GamificationDashboard({ lawyerId, className }: GamificationDashboardProps) {
  const { 
    tasks, 
    progress, 
    loading: gamificationLoading,
    checkAndClaimTask,
    getTotalCreditsEarned,
  } = useGamification(lawyerId || null);
  
  const { balance, loading: creditsLoading } = useCredits(lawyerId || null);

  const loading = gamificationLoading || creditsLoading;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Badges earned from claimed tasks
  const earnedBadges = progress
    .filter(p => p.status === 'claimed' && p.task?.badge_name)
    .map(p => p);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top Row: Level + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LevelProgressBar 
          currentXP={balance?.total_earned || 0}
          totalCreditsEarned={getTotalCreditsEarned()}
        />
        <StreakIndicator 
          currentStreak={balance?.current_streak || 0}
          longestStreak={balance?.longest_streak || 0}
          lastActivityDate={balance?.last_activity_date || undefined}
        />
      </div>
      
      {/* Missions Panel - the real functional component */}
      <GamificationPanel 
        tasks={tasks}
        progress={progress}
        onClaimTask={checkAndClaimTask}
        loading={loading}
      />

      {/* Earned Badges - inline, no separate tab */}
      {earnedBadges.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            Badges Ganados ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedBadges.map(p => (
              <div 
                key={p.id}
                className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-lg mb-2">
                  <Award className="h-8 w-8" />
                </div>
                <h4 className="font-medium text-sm text-center">{p.task?.badge_name}</h4>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {p.task?.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
