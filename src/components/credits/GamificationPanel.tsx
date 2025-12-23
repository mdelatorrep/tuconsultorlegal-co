import { useState } from 'react';
import { 
  Award, Check, Clock, Gift, LogIn, Search, FileText, 
  UserPlus, TrendingUp, Newspaper, Star, Zap, CreditCard,
  User, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { GamificationTask, GamificationProgress } from '@/hooks/useGamification';

interface GamificationPanelProps {
  tasks: GamificationTask[];
  progress: GamificationProgress[];
  onClaimTask: (taskKey: string) => Promise<{ success: boolean }>;
  loading?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'User': <User className="h-5 w-5" />,
  'Search': <Search className="h-5 w-5" />,
  'FileText': <FileText className="h-5 w-5" />,
  'UserPlus': <UserPlus className="h-5 w-5" />,
  'Award': <Award className="h-5 w-5" />,
  'CreditCard': <CreditCard className="h-5 w-5" />,
  'LogIn': <LogIn className="h-5 w-5" />,
  'Zap': <Zap className="h-5 w-5" />,
  'TrendingUp': <TrendingUp className="h-5 w-5" />,
  'Newspaper': <Newspaper className="h-5 w-5" />,
  'Star': <Star className="h-5 w-5" />,
};

export function GamificationPanel({ 
  tasks, 
  progress, 
  onClaimTask,
  loading 
}: GamificationPanelProps) {
  const [claimingTask, setClaimingTask] = useState<string | null>(null);

  const getTaskProgress = (taskId: string): GamificationProgress | undefined => {
    return progress.find(p => p.task_id === taskId);
  };

  const handleClaim = async (taskKey: string) => {
    setClaimingTask(taskKey);
    await onClaimTask(taskKey);
    setClaimingTask(null);
  };

  const onetimeTasks = tasks.filter(t => t.task_type === 'onetime');
  const dailyTasks = tasks.filter(t => t.task_type === 'daily');
  const weeklyTasks = tasks.filter(t => t.task_type === 'weekly');
  const achievementTasks = tasks.filter(t => t.task_type === 'achievement');

  const completedCount = progress.filter(p => p.status === 'completed' || p.status === 'claimed').length;
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

  const renderTask = (task: GamificationTask) => {
    const taskProgress = getTaskProgress(task.id);
    const isCompleted = taskProgress?.status === 'completed';
    const isClaimed = taskProgress?.status === 'claimed';
    const isInProgress = taskProgress?.status === 'in_progress';

    return (
      <div 
        key={task.id}
        className={cn(
          "flex items-center gap-4 p-4 rounded-lg border transition-all",
          isClaimed && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
          isCompleted && !isClaimed && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
          !isCompleted && !isClaimed && "hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "p-2 rounded-full",
          isClaimed ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" :
          isCompleted ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400" :
          "bg-muted text-muted-foreground"
        )}>
          {iconMap[task.icon || 'Star'] || <Star className="h-5 w-5" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{task.name}</h4>
            {task.badge_name && (
              <Badge variant="outline" className="text-xs shrink-0">
                {task.badge_name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {task.description}
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            +{task.credit_reward}
          </Badge>
          
          {isClaimed ? (
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400">
              <Check className="h-3 w-3 mr-1" />
              Reclamado
            </Badge>
          ) : isCompleted ? (
            <Button 
              size="sm" 
              onClick={() => handleClaim(task.task_key)}
              disabled={claimingTask === task.task_key}
              className="animate-pulse"
            >
              {claimingTask === task.task_key ? 'Reclamando...' : 'Reclamar'}
              <Gift className="h-4 w-4 ml-1" />
            </Button>
          ) : isInProgress ? (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              En progreso
            </Badge>
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Misiones y Logros
            </CardTitle>
            <CardDescription>
              Completa tareas para ganar créditos y desbloquear badges
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{completedCount}/{totalTasks}</div>
            <div className="text-xs text-muted-foreground">completadas</div>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2 mt-4" />
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="onetime" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="onetime" className="text-xs">
              Inicio
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {onetimeTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="daily" className="text-xs">
              Diarias
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {dailyTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              Semanales
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {weeklyTasks.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">
              Logros
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {achievementTasks.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="onetime" className="space-y-2 mt-0">
            {onetimeTasks.map(renderTask)}
          </TabsContent>
          
          <TabsContent value="daily" className="space-y-2 mt-0">
            {dailyTasks.map(renderTask)}
          </TabsContent>
          
          <TabsContent value="weekly" className="space-y-2 mt-0">
            {weeklyTasks.map(renderTask)}
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-2 mt-0">
            {achievementTasks.map(renderTask)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
