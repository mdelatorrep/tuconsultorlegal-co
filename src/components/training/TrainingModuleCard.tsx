import { motion } from "framer-motion";
import { CheckCircle, Clock, Lock, Play, Star, Zap, BookOpen, Award } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TrainingModuleCardProps {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  progress?: number;
  score?: number;
  xpReward: number;
  badgeName?: string;
  icon: React.ElementType;
  iconColor: string;
  onStart: () => void;
  onContinue: () => void;
  onReview: () => void;
  index: number;
}

export function TrainingModuleCard({
  id,
  title,
  description,
  estimatedTime,
  difficulty,
  status,
  progress = 0,
  score,
  xpReward,
  badgeName,
  icon: Icon,
  iconColor,
  onStart,
  onContinue,
  onReview,
  index
}: TrainingModuleCardProps) {
  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'Básico': return 'bg-green-100 text-green-700 border-green-200';
      case 'Intermedio': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Avanzado': return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getStatusContent = () => {
    switch (status) {
      case 'completed':
        return {
          badge: (
            <Badge className="bg-green-500 text-white">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completado
            </Badge>
          ),
          action: (
            <Button variant="outline" size="sm" onClick={onReview}>
              <BookOpen className="w-4 h-4 mr-2" />
              Revisar
            </Button>
          )
        };
      case 'in_progress':
        return {
          badge: (
            <Badge className="bg-primary text-primary-foreground">
              <Play className="w-3 h-3 mr-1" />
              En Progreso
            </Badge>
          ),
          action: (
            <Button size="sm" onClick={onContinue}>
              <Play className="w-4 h-4 mr-2" />
              Continuar
            </Button>
          )
        };
      case 'available':
        return {
          badge: (
            <Badge variant="outline" className="border-primary text-primary">
              <Star className="w-3 h-3 mr-1" />
              Disponible
            </Badge>
          ),
          action: (
            <Button size="sm" onClick={onStart} className="bg-gradient-to-r from-primary to-primary/80">
              <Play className="w-4 h-4 mr-2" />
              Comenzar
            </Button>
          )
        };
      case 'locked':
      default:
        return {
          badge: (
            <Badge variant="secondary" className="text-muted-foreground">
              <Lock className="w-3 h-3 mr-1" />
              Bloqueado
            </Badge>
          ),
          action: null
        };
    }
  };

  const statusContent = getStatusContent();
  const isLocked = status === 'locked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={!isLocked ? { y: -4, transition: { duration: 0.2 } } : {}}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300",
        isLocked ? "opacity-60" : "hover:shadow-lg hover:border-primary/30",
        status === 'in_progress' && "border-primary/50 shadow-md"
      )}>
        {/* Gradient overlay for completed modules */}
        {status === 'completed' && (
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <motion.div
                animate={status === 'in_progress' ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className={cn(
                  "p-2.5 rounded-xl",
                  isLocked ? "bg-muted" : "bg-gradient-to-br from-primary/20 to-primary/5"
                )}
              >
                <Icon className={cn("w-6 h-6", isLocked ? "text-muted-foreground" : iconColor)} />
              </motion.div>
              <div className="space-y-1">
                <h3 className={cn("font-semibold", isLocked && "text-muted-foreground")}>
                  {title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {statusContent.badge}
                  <Badge variant="outline" className={getDifficultyColor()}>
                    {difficulty}
                  </Badge>
                </div>
              </div>
            </div>

            {/* XP Reward badge */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
                status === 'completed' 
                  ? "bg-green-100 text-green-700" 
                  : "bg-yellow-100 text-yellow-700"
              )}
            >
              <Zap className="w-3 h-3" />
              {status === 'completed' ? '+' : ''}{xpReward} XP
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className={cn(
            "text-sm line-clamp-2",
            isLocked ? "text-muted-foreground/70" : "text-muted-foreground"
          )}>
            {description}
          </p>

          {/* Progress bar for in_progress modules */}
          {status === 'in_progress' && progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Score for completed modules */}
          {status === 'completed' && score !== undefined && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
              <Award className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Puntuación: {score}/100
              </span>
              {badgeName && (
                <Badge className="ml-auto bg-green-600 text-white text-xs">
                  {badgeName}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{estimatedTime}</span>
            </div>
            {statusContent.action}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
