import { useState } from 'react';
import { 
  Trophy, Lock, Check, Star, Crown, Zap, Target, 
  FileText, Search, Users, BookOpen, MessageSquare,
  Brain, Flame, Award, Medal, Shield, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'research' | 'documents' | 'crm' | 'social' | 'mastery';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirement: number;
  current: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  reward: number;
}

interface AchievementsPanelProps {
  achievements: Achievement[];
  totalUnlocked: number;
  className?: string;
}

const iconMap: Record<string, React.ElementType> = {
  'Trophy': Trophy,
  'Star': Star,
  'Crown': Crown,
  'Zap': Zap,
  'Target': Target,
  'FileText': FileText,
  'Search': Search,
  'Users': Users,
  'BookOpen': BookOpen,
  'MessageSquare': MessageSquare,
  'Brain': Brain,
  'Flame': Flame,
  'Award': Award,
  'Medal': Medal,
  'Shield': Shield,
  'Sparkles': Sparkles,
};

const tierColors = {
  bronze: 'from-orange-400 to-orange-600',
  silver: 'from-slate-300 to-slate-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-purple-400 to-pink-500',
};

const tierBgColors = {
  bronze: 'bg-orange-100 dark:bg-orange-900/30',
  silver: 'bg-slate-100 dark:bg-slate-900/30',
  gold: 'bg-yellow-100 dark:bg-yellow-900/30',
  platinum: 'bg-purple-100 dark:bg-purple-900/30',
};

const categoryNames = {
  research: 'Investigación',
  documents: 'Documentos',
  crm: 'CRM',
  social: 'Social',
  mastery: 'Maestría',
};

// Generate mock achievements
function generateAchievements(): Achievement[] {
  return [
    // Research achievements
    { id: 'research-1', name: 'Primer Paso', description: 'Realiza tu primera investigación', icon: 'Search', category: 'research', tier: 'bronze', requirement: 1, current: 1, isUnlocked: true, reward: 5 },
    { id: 'research-10', name: 'Investigador', description: 'Completa 10 investigaciones', icon: 'Search', category: 'research', tier: 'silver', requirement: 10, current: 7, isUnlocked: false, reward: 15 },
    { id: 'research-50', name: 'Experto en Investigación', description: 'Completa 50 investigaciones', icon: 'Search', category: 'research', tier: 'gold', requirement: 50, current: 7, isUnlocked: false, reward: 50 },
    { id: 'research-100', name: 'Maestro Investigador', description: 'Completa 100 investigaciones', icon: 'Brain', category: 'research', tier: 'platinum', requirement: 100, current: 7, isUnlocked: false, reward: 100 },
    
    // Document achievements
    { id: 'doc-1', name: 'Primer Documento', description: 'Crea tu primer documento', icon: 'FileText', category: 'documents', tier: 'bronze', requirement: 1, current: 1, isUnlocked: true, reward: 5 },
    { id: 'doc-10', name: 'Redactor', description: 'Crea 10 documentos', icon: 'FileText', category: 'documents', tier: 'silver', requirement: 10, current: 4, isUnlocked: false, reward: 20 },
    { id: 'doc-50', name: 'Experto en Redacción', description: 'Crea 50 documentos', icon: 'FileText', category: 'documents', tier: 'gold', requirement: 50, current: 4, isUnlocked: false, reward: 75 },
    { id: 'doc-100', name: 'Maestro Redactor', description: 'Crea 100 documentos', icon: 'Award', category: 'documents', tier: 'platinum', requirement: 100, current: 4, isUnlocked: false, reward: 150 },
    
    // CRM achievements
    { id: 'crm-5', name: 'Primeros Clientes', description: 'Agrega 5 clientes al CRM', icon: 'Users', category: 'crm', tier: 'bronze', requirement: 5, current: 3, isUnlocked: false, reward: 10 },
    { id: 'crm-25', name: 'Gestor de Clientes', description: 'Agrega 25 clientes', icon: 'Users', category: 'crm', tier: 'silver', requirement: 25, current: 3, isUnlocked: false, reward: 30 },
    { id: 'crm-100', name: 'Red de Contactos', description: 'Agrega 100 clientes', icon: 'Users', category: 'crm', tier: 'gold', requirement: 100, current: 3, isUnlocked: false, reward: 100 },
    
    // Social achievements
    { id: 'ref-1', name: 'Primer Referido', description: 'Invita a un colega', icon: 'MessageSquare', category: 'social', tier: 'bronze', requirement: 1, current: 0, isUnlocked: false, reward: 20 },
    { id: 'ref-5', name: 'Embajador', description: 'Invita a 5 colegas', icon: 'MessageSquare', category: 'social', tier: 'silver', requirement: 5, current: 0, isUnlocked: false, reward: 50 },
    { id: 'ref-10', name: 'Influencer Legal', description: 'Invita a 10 colegas', icon: 'Crown', category: 'social', tier: 'gold', requirement: 10, current: 0, isUnlocked: false, reward: 100 },
    
    // Mastery achievements
    { id: 'streak-7', name: 'Semana Perfecta', description: 'Mantén una racha de 7 días', icon: 'Flame', category: 'mastery', tier: 'silver', requirement: 7, current: 3, isUnlocked: false, reward: 25 },
    { id: 'streak-30', name: 'Mes Imparable', description: 'Mantén una racha de 30 días', icon: 'Flame', category: 'mastery', tier: 'gold', requirement: 30, current: 3, isUnlocked: false, reward: 100 },
    { id: 'all-tools', name: 'Todoterreno', description: 'Usa todas las herramientas', icon: 'Sparkles', category: 'mastery', tier: 'gold', requirement: 7, current: 4, isUnlocked: false, reward: 50 },
    { id: 'certified', name: 'Certificado IA Legal', description: 'Completa la certificación', icon: 'Shield', category: 'mastery', tier: 'platinum', requirement: 1, current: 0, isUnlocked: false, reward: 100 },
  ];
}

export function AchievementsPanel({ 
  achievements: propAchievements,
  totalUnlocked,
  className 
}: AchievementsPanelProps) {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  
  const achievements = propAchievements.length > 0 ? propAchievements : generateAchievements();
  
  const unlockedCount = achievements.filter(a => a.isUnlocked).length;
  const totalAchievements = achievements.length;
  
  const categories = ['research', 'documents', 'crm', 'social', 'mastery'] as const;

  const renderAchievement = (achievement: Achievement) => {
    const IconComponent = iconMap[achievement.icon] || Trophy;
    const progress = (achievement.current / achievement.requirement) * 100;
    
    return (
      <div 
        key={achievement.id}
        onClick={() => setSelectedAchievement(achievement)}
        className={cn(
          "relative p-4 rounded-xl border cursor-pointer transition-all",
          "hover:scale-[1.02] hover:shadow-md",
          achievement.isUnlocked 
            ? tierBgColors[achievement.tier]
            : "bg-muted/30 opacity-70"
        )}
      >
        {/* Tier indicator */}
        <div className={cn(
          "absolute top-2 right-2 w-2 h-2 rounded-full",
          `bg-gradient-to-br ${tierColors[achievement.tier]}`
        )} />
        
        <div className="flex flex-col items-center text-center gap-2">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            achievement.isUnlocked 
              ? `bg-gradient-to-br ${tierColors[achievement.tier]} text-white shadow-lg`
              : "bg-muted text-muted-foreground"
          )}>
            {achievement.isUnlocked ? (
              <IconComponent className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-sm line-clamp-1">{achievement.name}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {achievement.description}
            </p>
          </div>
          
          {!achievement.isUnlocked && (
            <div className="w-full mt-1">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {achievement.current}/{achievement.requirement}
              </p>
            </div>
          )}
          
          {achievement.isUnlocked && (
            <Badge variant="outline" className="text-[10px]">
              <Check className="h-2 w-2 mr-1" />
              Desbloqueado
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-primary" />
                Logros
              </CardTitle>
              <CardDescription>
                Desbloquea logros para ganar recompensas
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {unlockedCount}/{totalAchievements}
            </Badge>
          </div>
          
          <Progress 
            value={(unlockedCount / totalAchievements) * 100} 
            className="h-2 mt-2" 
          />
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-4 h-9">
              <TabsTrigger value="all" className="text-xs px-2">Todos</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="text-xs px-2">
                  {categoryNames[cat]}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {achievements.map(renderAchievement)}
              </div>
            </TabsContent>
            
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="mt-0">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {achievements.filter(a => a.category === cat).map(renderAchievement)}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedAchievement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    selectedAchievement.isUnlocked 
                      ? `bg-gradient-to-br ${tierColors[selectedAchievement.tier]} text-white shadow-lg`
                      : "bg-muted text-muted-foreground"
                  )}>
                    {(() => {
                      const Icon = iconMap[selectedAchievement.icon] || Trophy;
                      return selectedAchievement.isUnlocked ? (
                        <Icon className="h-8 w-8" />
                      ) : (
                        <Lock className="h-7 w-7" />
                      );
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedAchievement.name}</DialogTitle>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {selectedAchievement.tier}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <DialogDescription className="text-base">
                  {selectedAchievement.description}
                </DialogDescription>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progreso</span>
                    <span className="font-medium">
                      {selectedAchievement.current}/{selectedAchievement.requirement}
                    </span>
                  </div>
                  <Progress 
                    value={(selectedAchievement.current / selectedAchievement.requirement) * 100} 
                    className="h-2" 
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">Recompensa</span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    +{selectedAchievement.reward} créditos
                  </Badge>
                </div>
                
                {selectedAchievement.isUnlocked && selectedAchievement.unlockedAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Desbloqueado el {new Date(selectedAchievement.unlockedAt).toLocaleDateString('es-CO')}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
