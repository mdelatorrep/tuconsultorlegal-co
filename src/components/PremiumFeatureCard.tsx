import { Lock, Crown, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PremiumFeatureCardProps {
  title: string;
  description: string;
  icon?: React.ComponentType<any>;
  featureName: string;
  onUpgrade?: () => void;
  onRedirectToSubscription?: () => void;
}

export default function PremiumFeatureCard({ 
  title, 
  description, 
  icon: Icon = Crown, 
  featureName,
  onUpgrade,
  onRedirectToSubscription
}: PremiumFeatureCardProps) {
  
  const handleUpgradeClick = () => {
    if (onRedirectToSubscription) {
      onRedirectToSubscription();
    } else if (onUpgrade) {
      onUpgrade();
    }
  };
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Icon className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            {title}
            <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="w-3 h-3 mr-1" />
              PREMIUM
            </Badge>
          </CardTitle>
          <CardDescription className="text-center">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-muted-foreground">
              Para acceder a <strong>{featureName}</strong>, necesitas activar tu plan Premium.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
              <span>Acceso completo a herramientas de IA</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
              <span>Análisis avanzado de documentos</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
              <span>Creación de contenido legal</span>
            </div>
          </div>
          
          <Button 
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Crown className="w-4 h-4 mr-2" />
            {onRedirectToSubscription ? 'Ver Planes de Suscripción' : 'Actualizar a Premium'}
          </Button>
          
          <p className="text-xs text-muted-foreground">
            {onRedirectToSubscription 
              ? 'Selecciona el plan que mejor se adapte a tus necesidades' 
              : 'Contacta al administrador para activar esta funcionalidad'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}