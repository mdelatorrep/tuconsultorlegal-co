import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LevelProgressBar } from './LevelProgressBar';
import { StreakIndicator } from './StreakIndicator';
import { WeeklyChallenges } from './WeeklyChallenges';
import { AchievementsPanel } from './AchievementsPanel';
import { Leaderboard } from './Leaderboard';
import { GamificationPanel } from '@/components/credits/GamificationPanel';
import { useGamification } from '@/hooks/useGamification';
import { useCredits } from '@/hooks/useCredits';
import { Award, Trophy, Target, Users, Flame, Loader2 } from 'lucide-react';
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
    getCompletedTasksCount
  } = useGamification(lawyerId);
  
  const { balance, loading: creditsLoading } = useCredits(lawyerId);
  
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // Calculate streak from daily login progress
  useEffect(() => {
    const dailyLoginProgress = progress.find(p => {
      const task = tasks.find(t => t.id === p.task_id);
      return task?.task_key === 'daily_login';
    });
    
    if (dailyLoginProgress) {
      // Use completion count as current streak approximation
      setCurrentStreak(dailyLoginProgress.completion_count || 0);
      setLongestStreak(Math.max(dailyLoginProgress.completion_count || 0, 7));
    }
  }, [progress, tasks]);

  const loading = gamificationLoading || creditsLoading;

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Top Row: Level + Streak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LevelProgressBar 
          currentXP={balance?.total_earned || 0}
          totalCreditsEarned={getTotalCreditsEarned()}
        />
        <StreakIndicator 
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          lastActivityDate={new Date().toISOString()}
        />
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="missions" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="missions" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Misiones</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <span className="hidden sm:inline">Desafíos</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Logros</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Ranking</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Badges</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="missions" className="mt-4">
          <GamificationPanel 
            tasks={tasks}
            progress={progress}
            onClaimTask={checkAndClaimTask}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="challenges" className="mt-4">
          <WeeklyChallenges 
            challenges={[]}
            onClaimChallenge={async (id) => {
              await checkAndClaimTask(id);
            }}
            loading={loading}
          />
        </TabsContent>
        
        <TabsContent value="achievements" className="mt-4">
          <AchievementsPanel 
            achievements={[]}
            totalUnlocked={getCompletedTasksCount()}
          />
        </TabsContent>
        
        <TabsContent value="leaderboard" className="mt-4">
          <Leaderboard 
            weeklyLeaderboard={[]}
            monthlyLeaderboard={[]}
            allTimeLeaderboard={[]}
            currentUserId={lawyerId}
          />
        </TabsContent>
        
        <TabsContent value="badges" className="mt-4">
          {/* Badge collection from completed tasks */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {progress
              .filter(p => p.status === 'claimed' && p.task?.badge_name)
              .map(p => (
                <div 
                  key={p.id}
                  className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-lg mb-2">
                    <Award className="h-8 w-8" />
                  </div>
                  <h4 className="font-medium text-sm text-center">{p.task?.badge_name}</h4>
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {p.task?.name}
                  </p>
                </div>
              ))}
            
            {progress.filter(p => p.status === 'claimed' && p.task?.badge_name).length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Aún no tienes badges. ¡Completa misiones para desbloquearlos!</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
