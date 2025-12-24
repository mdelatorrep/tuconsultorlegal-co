import { motion } from "framer-motion";
import { Award, Flame, Trophy, Zap, BookOpen, Target, Star, Crown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TrainingHeroSectionProps {
  overallProgress: number;
  completedModules: number;
  totalModules: number;
  totalXP: number;
  currentStreak: number;
  isCertified: boolean;
  lawyerName: string;
}

export function TrainingHeroSection({
  overallProgress,
  completedModules,
  totalModules,
  totalXP,
  currentStreak,
  isCertified,
  lawyerName
}: TrainingHeroSectionProps) {
  const getLevel = () => {
    if (totalXP >= 200) return { name: "Experto IA", icon: Crown, color: "text-amber-500" };
    if (totalXP >= 100) return { name: "Avanzado", icon: Trophy, color: "text-purple-500" };
    if (totalXP >= 50) return { name: "Intermedio", icon: Star, color: "text-blue-500" };
    return { name: "Principiante", icon: BookOpen, color: "text-green-500" };
  };

  const level = getLevel();
  const LevelIcon = level.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-6 md:p-8"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative z-10 grid md:grid-cols-[1fr,auto] gap-6 items-center">
        {/* Left side - Progress info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/30"
            >
              <Award className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                ¡Hola, {lawyerName.split(' ')[0]}!
              </h2>
              <p className="text-muted-foreground">
                {isCertified ? "¡Felicidades, eres IA Lawyer Certificado!" : "Continúa tu camino hacia la certificación"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso General</span>
              <span className="font-bold text-primary">{overallProgress}%</span>
            </div>
            <div className="relative">
              <Progress value={overallProgress} className="h-4 bg-muted" />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-0 h-4 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedModules} de {totalModules} módulos completados
            </p>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border shadow-sm"
            >
              <LevelIcon className={cn("w-5 h-5", level.color)} />
              <span className="text-sm font-medium">{level.name}</span>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border shadow-sm"
            >
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium">{totalXP} XP</span>
            </motion.div>
            
            {currentStreak > 0 && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 shadow-sm"
              >
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">{currentStreak} días</span>
              </motion.div>
            )}
            
            {isCertified && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg">
                <Trophy className="w-3 h-3 mr-1" />
                Certificado
              </Badge>
            )}
          </div>
        </div>

        {/* Right side - Visual progress circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3, type: "spring" }}
          className="hidden md:flex items-center justify-center"
        >
          <div className="relative w-40 h-40">
            {/* Outer ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 440" }}
                animate={{ strokeDasharray: `${(overallProgress / 100) * 440} 440` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={overallProgress}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold text-primary"
              >
                {overallProgress}%
              </motion.span>
              <span className="text-xs text-muted-foreground">completado</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
