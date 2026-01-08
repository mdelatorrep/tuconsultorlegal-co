import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Trophy, Gift, Zap } from 'lucide-react';

interface GamificationCelebrationProps {
  show: boolean;
  points: number;
  taskName: string;
  isAchievement?: boolean;
  badgeName?: string;
  onComplete?: () => void;
}

export function GamificationCelebration({ 
  show, 
  points, 
  taskName,
  isAchievement = false,
  badgeName,
  onComplete 
}: GamificationCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
        >
          {/* Confetti/particles background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: '100vh', 
                  x: `${Math.random() * 100}vw`,
                  rotate: 0,
                  scale: 0
                }}
                animate={{ 
                  y: '-20vh', 
                  rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                  scale: [0, 1, 0.5]
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut'
                }}
                className="absolute"
              >
                <Star 
                  className={`w-6 h-6 ${
                    ['text-yellow-400', 'text-amber-500', 'text-orange-400', 'text-primary'][Math.floor(Math.random() * 4)]
                  }`}
                  fill="currentColor"
                />
              </motion.div>
            ))}
          </div>

          {/* Main celebration card */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ 
              scale: [0, 1.1, 1],
              rotate: [-10, 5, 0]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="relative bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-3xl p-8 shadow-2xl border-4 border-yellow-400/50"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-3xl blur-xl" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  repeatType: 'reverse'
                }}
                className="mb-4"
              >
                {isAchievement ? (
                  <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
                ) : (
                  <Gift className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
                )}
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-2"
              >
                {isAchievement ? '🏆 ¡Logro Desbloqueado!' : '✨ ¡Recompensa Obtenida!'}
              </motion.h2>

              {/* Task/Badge name */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-lg mb-4"
              >
                {isAchievement ? badgeName : taskName}
              </motion.p>

              {/* Points display */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.4, type: 'spring' }}
                className="flex items-center gap-2 bg-yellow-400/20 backdrop-blur-sm rounded-full px-6 py-3 border-2 border-yellow-400/50"
              >
                <Zap className="w-6 h-6 text-yellow-400" fill="currentColor" />
                <span className="text-3xl font-black text-white">+{points}</span>
                <span className="text-white/80 text-lg">créditos</span>
              </motion.div>

              {/* Sparkles decoration */}
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity
                }}
                className="absolute -top-4 -right-4"
              >
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </motion.div>
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [0.95, 1.05, 0.95]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  delay: 0.5
                }}
                className="absolute -bottom-4 -left-4"
              >
                <Sparkles className="w-8 h-8 text-yellow-300" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact inline version for toast-like notifications
export function GamificationMiniCelebration({ 
  points, 
  taskName 
}: { 
  points: number; 
  taskName: string; 
}) {
  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg px-4 py-3 shadow-lg"
    >
      <motion.div
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{ duration: 0.5, repeat: 2 }}
      >
        <Star className="w-6 h-6 text-yellow-400" fill="currentColor" />
      </motion.div>
      <div className="flex-1">
        <p className="font-semibold text-sm">{taskName}</p>
        <p className="text-yellow-300 font-bold">+{points} créditos</p>
      </div>
    </motion.div>
  );
}
