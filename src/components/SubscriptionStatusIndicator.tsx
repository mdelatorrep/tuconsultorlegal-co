import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Crown, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';

interface SubscriptionStatusIndicatorProps {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
}

export const SubscriptionStatusIndicator: React.FC<SubscriptionStatusIndicatorProps> = ({
  showLabel = true,
  compact = false,
  className = ""
}) => {
  const { user } = useLawyerAuth();

  if (!user) return null;

  const getStatusInfo = () => {
    if (user.canUseAiTools) {
      return {
        icon: Crown,
        label: 'Premium Activo',
        variant: 'default' as const,
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
      };
    } else {
      return {
        icon: AlertTriangle,
        label: 'Plan Gratuito',
        variant: 'outline' as const,
        className: 'text-muted-foreground'
      };
    }
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Icon className="h-3 w-3 text-amber-500" />
        {showLabel && (
          <span className="text-xs text-muted-foreground">
            {user.canUseAiTools ? 'Premium' : 'Gratuito'}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge variant={statusInfo.variant} className={`${statusInfo.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {showLabel && statusInfo.label}
    </Badge>
  );
};