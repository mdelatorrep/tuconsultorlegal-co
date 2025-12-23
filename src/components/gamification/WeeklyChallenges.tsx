import { useState } from 'react';
import { 
  Target, Clock, Gift, Check, ChevronRight, 
  Search, FileText, Users, BookOpen, Brain 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WeeklyChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  reward: number;
  expiresAt: Date;
  isCompleted: boolean;
  isClaimed: boolean;
}

interface WeeklyChallengesProps {
  challenges: WeeklyChallenge[];
  onClaimChallenge: (challengeId: string) => Promise<void>;
  loading?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'Search': <Search className="h-5 w-5" />,
  'FileText': <FileText className="h-5 w-5" />,
  'Users': <Users className="h-5 w-5" />,
  'BookOpen': <BookOpen className="h-5 w-5" />,
  'Brain': <Brain className="h-5 w-5" />,
  'Target': <Target className="h-5 w-5" />,
};

// Generate mock challenges based on current week
function generateWeeklyChallenges(): WeeklyChallenge[] {
  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  return [
    {
      id: 'weekly-research-5',
      name: 'Investigador Semanal',
      description: 'Realiza 5 investigaciones legales',
      icon: 'Search',
      target: 5,
      current: Math.floor(Math.random() * 4),
      reward: 15,
      expiresAt: endOfWeek,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'weekly-documents-3',
      name: 'Creador de Documentos',
      description: 'Crea 3 documentos con IA',
      icon: 'FileText',
      target: 3,
      current: Math.floor(Math.random() * 2),
      reward: 20,
      expiresAt: endOfWeek,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'weekly-crm-5',
      name: 'Gestor de Clientes',
      description: 'Agrega 5 clientes al CRM',
      icon: 'Users',
      target: 5,
      current: Math.floor(Math.random() * 3),
      reward: 15,
      expiresAt: endOfWeek,
      isCompleted: false,
      isClaimed: false,
    },
    {
      id: 'weekly-analysis-2',
      name: 'Analista Legal',
      description: 'Realiza 2 análisis estratégicos',
      icon: 'Brain',
      target: 2,
      current: Math.floor(Math.random() * 2),
      reward: 25,
      expiresAt: endOfWeek,
      isCompleted: false,
      isClaimed: false,
    },
  ];
}

export function WeeklyChallenges({ 
  challenges: propChallenges, 
  onClaimChallenge,
  loading 
}: WeeklyChallengesProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  
  // Use prop challenges or generate mock ones
  const challenges = propChallenges.length > 0 ? propChallenges : generateWeeklyChallenges();
  
  // Calculate time remaining
  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const handleClaim = async (challengeId: string) => {
    setClaimingId(challengeId);
    await onClaimChallenge(challengeId);
    setClaimingId(null);
  };

  const completedCount = challenges.filter(c => c.isCompleted || c.current >= c.target).length;
  const totalReward = challenges.reduce((sum, c) => sum + c.reward, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Desafíos Semanales
            </CardTitle>
            <CardDescription>
              Completa desafíos para ganar créditos extra
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" />
            <span>{getTimeRemaining(challenges[0]?.expiresAt || new Date())}</span>
          </div>
        </div>
        
        {/* Overall progress */}
        <div className="mt-2 flex items-center gap-3">
          <Progress value={(completedCount / challenges.length) * 100} className="h-2 flex-1" />
          <Badge variant="outline" className="shrink-0">
            {completedCount}/{challenges.length} completados
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {challenges.map((challenge) => {
          const progress = (challenge.current / challenge.target) * 100;
          const isComplete = challenge.current >= challenge.target;
          
          return (
            <div 
              key={challenge.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                challenge.isClaimed && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
                isComplete && !challenge.isClaimed && "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
                !isComplete && !challenge.isClaimed && "hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "p-2 rounded-full shrink-0",
                challenge.isClaimed ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400" :
                isComplete ? "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400" :
                "bg-muted text-muted-foreground"
              )}>
                {iconMap[challenge.icon] || <Target className="h-5 w-5" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm truncate">{challenge.name}</h4>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {challenge.description}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {challenge.current}/{challenge.target}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  +{challenge.reward}
                </Badge>
                
                {challenge.isClaimed ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400">
                    <Check className="h-3 w-3 mr-1" />
                    Reclamado
                  </Badge>
                ) : isComplete ? (
                  <Button 
                    size="sm" 
                    onClick={() => handleClaim(challenge.id)}
                    disabled={claimingId === challenge.id}
                    className="animate-pulse h-7 text-xs"
                  >
                    {claimingId === challenge.id ? '...' : 'Reclamar'}
                    <Gift className="h-3 w-3 ml-1" />
                  </Button>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          );
        })}
        
        {/* Bonus for completing all */}
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Bono por completar todos</p>
                <p className="text-xs text-muted-foreground">
                  Completa los 4 desafíos esta semana
                </p>
              </div>
            </div>
            <Badge className="bg-primary text-primary-foreground">
              +50 extra
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
