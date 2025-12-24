import { motion } from "framer-motion";
import { CheckCircle, Lock, Play, Star, BookOpen, MessageSquare, FileText, Target, Zap, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ModuleNode {
  id: string;
  title: string;
  shortTitle: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  xpReward: number;
  icon: React.ElementType;
  color: string;
}

interface LearningPathVisualizationProps {
  modules: ModuleNode[];
  onModuleClick: (moduleId: string) => void;
}

export function LearningPathVisualization({ modules, onModuleClick }: LearningPathVisualizationProps) {
  const getStatusIcon = (status: ModuleNode['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Play;
      case 'locked': return Lock;
      default: return Star;
    }
  };

  const getStatusStyles = (status: ModuleNode['status']) => {
    switch (status) {
      case 'completed':
        return {
          node: "bg-green-500 border-green-400 shadow-green-500/30",
          connector: "bg-green-500",
          text: "text-green-600"
        };
      case 'in_progress':
        return {
          node: "bg-primary border-primary/80 shadow-primary/30 animate-pulse",
          connector: "bg-gradient-to-b from-green-500 to-muted",
          text: "text-primary"
        };
      case 'available':
        return {
          node: "bg-primary/20 border-primary/40 hover:bg-primary/30",
          connector: "bg-muted",
          text: "text-primary"
        };
      default:
        return {
          node: "bg-muted border-muted-foreground/20",
          connector: "bg-muted",
          text: "text-muted-foreground"
        };
    }
  };

  return (
    <div className="relative py-4">
      {/* Mobile: Vertical path */}
      <div className="md:hidden space-y-4">
        {modules.map((module, index) => {
          const styles = getStatusStyles(module.status);
          const StatusIcon = getStatusIcon(module.status);
          const ModuleIcon = module.icon;
          const isClickable = module.status !== 'locked';

          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-4"
            >
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <motion.button
                  whileHover={isClickable ? { scale: 1.1 } : {}}
                  whileTap={isClickable ? { scale: 0.95 } : {}}
                  onClick={() => isClickable && onModuleClick(module.id)}
                  disabled={!isClickable}
                  className={cn(
                    "w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all shadow-lg",
                    styles.node,
                    isClickable && "cursor-pointer"
                  )}
                >
                  {module.status === 'completed' ? (
                    <CheckCircle className="w-7 h-7 text-white" />
                  ) : module.status === 'locked' ? (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <ModuleIcon className={cn("w-6 h-6", module.status === 'in_progress' ? "text-white" : module.color)} />
                  )}
                </motion.button>
                {index < modules.length - 1 && (
                  <div className={cn("w-1 h-8 mt-2 rounded-full", styles.connector)} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2">
                  <span className={cn("font-semibold", styles.text)}>{module.title}</span>
                  <Badge variant="outline" className="text-xs">
                    +{module.xpReward} XP
                  </Badge>
                </div>
                {module.status === 'in_progress' && (
                  <Badge className="mt-1 bg-primary/20 text-primary border-primary/30">
                    En progreso
                  </Badge>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Desktop: Horizontal winding path */}
      <div className="hidden md:block">
        <div className="relative">
          {/* SVG Path Background */}
          <svg className="absolute inset-0 w-full h-32 pointer-events-none" preserveAspectRatio="none">
            <path
              d={`M 60 60 ${modules.map((_, i) => {
                const x = 60 + (i * (100 / (modules.length - 1))) * ((100 - 12) / 100);
                return `L ${x}% 60`;
              }).join(' ')}`}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="4"
              strokeLinecap="round"
              className="opacity-50"
            />
          </svg>

          {/* Module nodes */}
          <div className="relative flex justify-between items-center h-32 px-8">
            {modules.map((module, index) => {
              const styles = getStatusStyles(module.status);
              const ModuleIcon = module.icon;
              const isClickable = module.status !== 'locked';

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15 }}
                  className="flex flex-col items-center"
                >
                  <motion.button
                    whileHover={isClickable ? { scale: 1.15, y: -5 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    onClick={() => isClickable && onModuleClick(module.id)}
                    disabled={!isClickable}
                    className={cn(
                      "w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all shadow-lg relative",
                      styles.node,
                      isClickable && "cursor-pointer"
                    )}
                  >
                    {module.status === 'completed' ? (
                      <CheckCircle className="w-8 h-8 text-white" />
                    ) : module.status === 'locked' ? (
                      <Lock className="w-7 h-7 text-muted-foreground" />
                    ) : (
                      <ModuleIcon className={cn("w-7 h-7", module.status === 'in_progress' ? "text-white" : module.color)} />
                    )}
                    
                    {/* XP badge */}
                    {module.status !== 'locked' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm"
                      >
                        +{module.xpReward}
                      </motion.div>
                    )}
                  </motion.button>
                  
                  <span className={cn("text-xs font-medium mt-2 text-center max-w-20", styles.text)}>
                    {module.shortTitle}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Certification badge at the end */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="flex justify-end mt-4 pr-4"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <Award className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-amber-600">Certificación IA Lawyer</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Default modules configuration
export const defaultModules: ModuleNode[] = [
  {
    id: "foundations-ai-law",
    title: "Fundamentos de IA",
    shortTitle: "Fundamentos",
    status: 'available',
    xpReward: 25,
    icon: BookOpen,
    color: "text-blue-500"
  },
  {
    id: "prompt-engineering",
    title: "Ingeniería de Prompts",
    shortTitle: "Prompts",
    status: 'locked',
    xpReward: 30,
    icon: MessageSquare,
    color: "text-green-500"
  },
  {
    id: "document-automation",
    title: "Automatización de Documentos",
    shortTitle: "Automatización",
    status: 'locked',
    xpReward: 35,
    icon: FileText,
    color: "text-purple-500"
  },
  {
    id: "ai-ethics",
    title: "Ética en IA Legal",
    shortTitle: "Ética",
    status: 'locked',
    xpReward: 25,
    icon: Target,
    color: "text-orange-500"
  },
  {
    id: "advanced-implementation",
    title: "Implementación Avanzada",
    shortTitle: "Avanzado",
    status: 'locked',
    xpReward: 40,
    icon: Zap,
    color: "text-red-500"
  }
];
