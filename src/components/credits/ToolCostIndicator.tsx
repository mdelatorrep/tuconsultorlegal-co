import { Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ToolCostIndicatorProps {
  toolName: string;
  cost: number;
  currentBalance: number;
  className?: string;
}

export function ToolCostIndicator({ 
  toolName, 
  cost, 
  currentBalance,
  className 
}: ToolCostIndicatorProps) {
  const hasEnough = currentBalance >= cost;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 cursor-help",
              hasEnough 
                ? "border-green-500 text-green-700 dark:text-green-400" 
                : "border-destructive text-destructive",
              className
            )}
          >
            <Coins className="h-3 w-3" />
            <span>{cost}</span>
            {hasEnough ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <AlertCircle className="h-3 w-3" />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{toolName}</p>
            <p className="text-muted-foreground">
              Costo: {cost} créditos
            </p>
            <p className={hasEnough ? "text-green-600" : "text-destructive"}>
              {hasEnough 
                ? `Disponible (tienes ${currentBalance})` 
                : `Insuficiente (tienes ${currentBalance})`
              }
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
