import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CreditBalanceIndicatorProps {
  balance: number | null | undefined;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function CreditBalanceIndicator({ 
  balance, 
  loading = false, 
  size = 'md',
  showIcon = true,
  className 
}: CreditBalanceIndicatorProps) {
  if (loading) {
    return <Skeleton className={cn("h-6 w-20", className)} />;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "gap-1 font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Coins className="shrink-0" size={iconSizes[size]} />}
      <span>{balance ?? 0}</span>
    </Badge>
  );
}
