import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StreakIndicatorProps {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  className?: string;
}

export function StreakIndicator({ 
  currentStreak, 
  longestStreak, 
  lastActivityDate,
  className 
}: StreakIndicatorProps) {
  // Check if streak is active (activity within last 24 hours)
  const isStreakActive = lastActivityDate 
    ? (new Date().getTime() - new Date(lastActivityDate).getTime()) < 24 * 60 * 60 * 1000
    : false;

  const getStreakColor = () => {
    if (currentStreak >= 30) return 'text-amber-500';
    if (currentStreak >= 14) return 'text-orange-500';
    if (currentStreak >= 7) return 'text-red-500';
    if (currentStreak >= 3) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getStreakMessage = () => {
    if (currentStreak >= 30) return '¡Racha legendaria!';
    if (currentStreak >= 14) return '¡Imparable!';
    if (currentStreak >= 7) return '¡En fuego!';
    if (currentStreak >= 3) return '¡Buen ritmo!';
    if (currentStreak >= 1) return '¡Sigue así!';
    return 'Inicia tu racha';
  };

  return (
    <div className={cn(
      "bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative",
            isStreakActive && "animate-pulse"
          )}>
            <Flame className={cn("h-10 w-10", getStreakColor())} />
            {currentStreak > 0 && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {currentStreak > 99 ? '99+' : currentStreak}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">{currentStreak}</span>
              <span className="text-muted-foreground">días</span>
            </div>
            <p className={cn("text-sm font-medium", getStreakColor())}>
              {getStreakMessage()}
            </p>
          </div>
        </div>
        
        <div className="text-right space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>Mejor: {longestStreak} días</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Calendar className="h-3 w-3" />
            {isStreakActive ? (
              <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
                Activa hoy
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                ¡Usa la app hoy!
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Streak milestones */}
      <div className="mt-4 flex gap-2 flex-wrap">
        {[3, 7, 14, 30].map((milestone) => (
          <Badge 
            key={milestone}
            variant={currentStreak >= milestone ? "default" : "outline"}
            className={cn(
              "text-xs",
              currentStreak >= milestone 
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0"
                : "opacity-50"
            )}
          >
            {milestone} días
          </Badge>
        ))}
      </div>
    </div>
  );
}
