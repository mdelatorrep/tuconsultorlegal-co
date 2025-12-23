import { Crown, Star, Zap, Trophy, Target, Flame } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LevelProgressBarProps {
  currentXP: number;
  totalCreditsEarned: number;
  className?: string;
}

// Level thresholds and names
const LEVELS = [
  { level: 1, name: 'Novato', minXP: 0, icon: Star, color: 'text-slate-500' },
  { level: 2, name: 'Aprendiz', minXP: 50, icon: Zap, color: 'text-blue-500' },
  { level: 3, name: 'Practicante', minXP: 150, icon: Target, color: 'text-green-500' },
  { level: 4, name: 'Profesional', minXP: 350, icon: Trophy, color: 'text-yellow-500' },
  { level: 5, name: 'Experto', minXP: 700, icon: Crown, color: 'text-purple-500' },
  { level: 6, name: 'Maestro', minXP: 1200, icon: Crown, color: 'text-orange-500' },
  { level: 7, name: 'Leyenda', minXP: 2000, icon: Crown, color: 'text-red-500' },
  { level: 8, name: 'Elite Legal', minXP: 3500, icon: Flame, color: 'text-amber-500' },
];

export function LevelProgressBar({ currentXP, totalCreditsEarned, className }: LevelProgressBarProps) {
  // Use totalCreditsEarned as XP if currentXP is not available
  const xp = currentXP || totalCreditsEarned;
  
  // Find current level
  const currentLevelIndex = LEVELS.findIndex((level, index) => {
    const nextLevel = LEVELS[index + 1];
    return !nextLevel || xp < nextLevel.minXP;
  });
  
  const currentLevel = LEVELS[currentLevelIndex] || LEVELS[0];
  const nextLevel = LEVELS[currentLevelIndex + 1];
  
  // Calculate progress to next level
  const xpInCurrentLevel = xp - currentLevel.minXP;
  const xpNeededForNextLevel = nextLevel ? nextLevel.minXP - currentLevel.minXP : 0;
  const progressPercent = nextLevel ? Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100) : 100;
  
  const LevelIcon = currentLevel.icon;
  const NextLevelIcon = nextLevel?.icon;

  return (
    <div className={cn("bg-gradient-to-br from-card to-muted/30 rounded-xl p-4 border shadow-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30"
          )}>
            <LevelIcon className={cn("h-6 w-6", currentLevel.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{currentLevel.name}</span>
              <Badge variant="outline" className="text-xs">
                Nivel {currentLevel.level}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {xp.toLocaleString()} XP total
            </p>
          </div>
        </div>
        
        {nextLevel && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-xs">Siguiente:</span>
              <NextLevelIcon className={cn("h-4 w-4", nextLevel.color)} />
              <span className="text-xs font-medium">{nextLevel.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {(nextLevel.minXP - xp).toLocaleString()} XP restantes
            </p>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <Progress 
          value={progressPercent} 
          className="h-3 bg-muted"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{xpInCurrentLevel.toLocaleString()} XP</span>
          {nextLevel && <span>{xpNeededForNextLevel.toLocaleString()} XP</span>}
        </div>
      </div>
      
      {!nextLevel && (
        <div className="mt-3 text-center">
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
            <Crown className="h-3 w-3 mr-1" />
            ¡Nivel Máximo Alcanzado!
          </Badge>
        </div>
      )}
    </div>
  );
}
