import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StandardModuleWrapperProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: string;
  actions?: ReactNode;
}

/**
 * Wrapper estandarizado para todos los módulos del portal de abogados.
 * Proporciona estructura consistente sin headers redundantes.
 * El header principal está en ModuleLayout (en la barra superior).
 * Este componente solo agrega padding y estructura interna al contenido.
 */
export function StandardModuleWrapper({
  children,
  title,
  subtitle,
  icon: Icon,
  badge,
  actions
}: StandardModuleWrapperProps) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Compact module header - solo si necesita diferenciarse del header principal */}
      {(title || subtitle || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg lg:text-xl font-semibold text-foreground truncate">
                  {title}
                </h2>
                {badge && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      
      {/* Module content */}
      {children}
    </div>
  );
}
