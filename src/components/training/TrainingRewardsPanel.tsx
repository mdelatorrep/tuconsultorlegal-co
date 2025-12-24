import { motion, AnimatePresence } from "framer-motion";
import { Award, Gift, Star, Trophy, Zap, CheckCircle, Lock, Flame, BookOpen, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GamificationTask, GamificationProgress } from "@/hooks/useGamification";

interface TrainingRewardsPanelProps {
  tasks: GamificationTask[];
  progress: GamificationProgress[];
  onClaimReward: (taskKey: string) => void;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  'play': Award,
  'book-open': BookOpen,
  'graduation-cap': Trophy,
  'award': Award,
  'star': Star,
  'flame': Flame,
  'message-square': Target,
  'search': Target,
  'calendar': Gift,
};

export function TrainingRewardsPanel({ tasks, progress, onClaimReward, className }: TrainingRewardsPanelProps) {
  // Filter only training-related tasks
  const trainingTasks = tasks.filter(task => 
    ['start_training', 'complete_first_module', 'complete_3_modules', 'complete_certification', 
     'perfect_module_score', 'training_streak_3', 'training_streak_7', 
     'ask_ai_assistant_5', 'ask_ai_assistant_20', 'daily_training_session'].includes(task.task_key)
  );

  const getTaskProgress = (taskId: string) => {
    return progress.find(p => p.task_id === taskId);
  };

  const getTaskStatus = (task: GamificationTask) => {
    const prog = getTaskProgress(task.id);
    if (!prog) return 'available';
    return prog.status;
  };

  const completedCount = trainingTasks.filter(t => {
    const status = getTaskStatus(t);
    return status === 'completed' || status === 'claimed';
  }).length;

  const totalCreditsAvailable = trainingTasks.reduce((sum, t) => sum + t.credit_reward, 0);
  const earnedCredits = trainingTasks.reduce((sum, t) => {
    const status = getTaskStatus(t);
    return sum + (status === 'claimed' ? t.credit_reward : 0);
  }, 0);

  return (
    <Card className={cn("bg-gradient-to-br from-yellow-50/50 to-orange-50/50 border-yellow-200/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="w-5 h-5 text-yellow-600" />
          Recompensas de Formación
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{completedCount}/{trainingTasks.length} logros</span>
          <span className="flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            {earnedCredits}/{totalCreditsAvailable} créditos
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {trainingTasks.slice(0, 6).map((task, index) => {
            const status = getTaskStatus(task);
            const Icon = iconMap[task.icon || 'star'] || Star;
            const isCompleted = status === 'completed';
            const isClaimed = status === 'claimed';
            const isLocked = status === 'available';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  isClaimed 
                    ? "bg-green-50 border-green-200" 
                    : isCompleted 
                      ? "bg-yellow-50 border-yellow-200" 
                      : "bg-background hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "p-2 rounded-full",
                  isClaimed 
                    ? "bg-green-100" 
                    : isCompleted 
                      ? "bg-yellow-100" 
                      : "bg-muted"
                )}>
                  {isClaimed ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Icon className={cn(
                      "w-4 h-4",
                      isCompleted ? "text-yellow-600" : "text-muted-foreground"
                    )} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isClaimed && "text-green-700"
                  )}>
                    {task.name}
                  </p>
                  {task.badge_name && isClaimed && (
                    <Badge variant="outline" className="text-xs mt-1 border-green-300 text-green-700">
                      🏅 {task.badge_name}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    "text-xs",
                    isClaimed 
                      ? "bg-green-500" 
                      : isCompleted 
                        ? "bg-yellow-500" 
                        : "bg-muted text-muted-foreground"
                  )}>
                    +{task.credit_reward}
                  </Badge>

                  {isCompleted && !isClaimed && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                        onClick={() => onClaimReward(task.task_key)}
                      >
                        Reclamar
                      </Button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {trainingTasks.length > 6 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            +{trainingTasks.length - 6} logros más disponibles
          </p>
        )}

        {/* Progress to certification */}
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">Progreso hacia certificación</span>
          </div>
          <Progress value={(completedCount / trainingTasks.length) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            Completa todos los logros para maximizar tus créditos
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
