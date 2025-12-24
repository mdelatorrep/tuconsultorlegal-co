import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Award, Star, Trophy, Zap, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CelebrationOverlayProps {
  isVisible: boolean;
  type: 'module_complete' | 'certification' | 'achievement' | 'streak';
  title: string;
  subtitle?: string;
  xpEarned?: number;
  badgeName?: string;
  onClose: () => void;
}

export function CelebrationOverlay({
  isVisible,
  type,
  title,
  subtitle,
  xpEarned,
  badgeName,
  onClose
}: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    if (isVisible) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));
      setParticles(newParticles);
    }
  }, [isVisible]);

  const getIcon = () => {
    switch (type) {
      case 'certification': return Trophy;
      case 'achievement': return Award;
      case 'streak': return Sparkles;
      default: return Star;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'certification':
        return {
          bg: "from-amber-500 to-orange-600",
          glow: "shadow-amber-500/50",
          particle: ["bg-amber-400", "bg-orange-400", "bg-yellow-400"]
        };
      case 'achievement':
        return {
          bg: "from-purple-500 to-pink-600",
          glow: "shadow-purple-500/50",
          particle: ["bg-purple-400", "bg-pink-400", "bg-fuchsia-400"]
        };
      case 'streak':
        return {
          bg: "from-orange-500 to-red-600",
          glow: "shadow-orange-500/50",
          particle: ["bg-orange-400", "bg-red-400", "bg-yellow-400"]
        };
      default:
        return {
          bg: "from-green-500 to-emerald-600",
          glow: "shadow-green-500/50",
          particle: ["bg-green-400", "bg-emerald-400", "bg-teal-400"]
        };
    }
  };

  const Icon = getIcon();
  const colors = getColors();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Confetti particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ 
                x: "50vw", 
                y: "50vh", 
                scale: 0,
                rotate: 0
              }}
              animate={{ 
                x: `${particle.x}vw`, 
                y: `${particle.y}vh`,
                scale: [0, 1, 1, 0],
                rotate: Math.random() * 720
              }}
              transition={{ 
                duration: 2,
                delay: particle.delay,
                ease: "easeOut"
              }}
              className={cn(
                "absolute w-3 h-3 rounded-full",
                colors.particle[particle.id % 3]
              )}
            />
          ))}

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 10 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full mx-4"
          >
            {/* Glow effect */}
            <div className={cn(
              "absolute inset-0 blur-3xl opacity-30 rounded-3xl bg-gradient-to-br",
              colors.bg
            )} />

            <div className="relative bg-card rounded-2xl border shadow-2xl overflow-hidden">
              {/* Header with gradient */}
              <div className={cn(
                "h-32 flex items-center justify-center bg-gradient-to-br",
                colors.bg
              )}>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={cn(
                    "p-4 rounded-full bg-white/20 shadow-xl",
                    colors.glow
                  )}
                >
                  <Icon className="w-12 h-12 text-white" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="p-6 text-center space-y-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PartyPopper className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600">¡Felicidades!</span>
                    <PartyPopper className="w-5 h-5 text-yellow-500 transform scale-x-[-1]" />
                  </div>
                  <h2 className="text-2xl font-bold">{title}</h2>
                  {subtitle && (
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                  )}
                </motion.div>

                {/* XP and Badge */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-center gap-4"
                >
                  {xpEarned && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-700">
                      <Zap className="w-5 h-5" />
                      <span className="font-bold">+{xpEarned} XP</span>
                    </div>
                  )}
                  {badgeName && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700">
                      <Award className="w-5 h-5" />
                      <span className="font-bold">{badgeName}</span>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button 
                    onClick={onClose} 
                    size="lg"
                    className={cn("mt-4 bg-gradient-to-r hover:opacity-90", colors.bg)}
                  >
                    ¡Continuar!
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
