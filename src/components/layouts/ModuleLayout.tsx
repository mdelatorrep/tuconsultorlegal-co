import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Crown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { CreditBalanceIndicator } from "@/components/credits/CreditBalanceIndicator";
import { useCredits } from "@/hooks/useCredits";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface ModuleLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onBack?: () => void;
  showCredits?: boolean;
  lawyerId?: string;
  isPremium?: boolean;
  actions?: ReactNode;
}

export function ModuleLayout({
  children,
  title,
  subtitle,
  icon,
  breadcrumbs,
  onBack,
  showCredits = true,
  lawyerId,
  isPremium,
  actions,
}: ModuleLayoutProps) {
  const { balance, loading: creditsLoading } = useCredits(lawyerId || null);

  return (
    <main className="flex-1 min-w-0 overflow-auto">
      {/* Header */}
      <header className="h-12 md:h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex h-full items-center justify-between px-3 md:px-4">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <SidebarTrigger className="flex-shrink-0" />
            
            {/* Back button */}
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex-shrink-0 gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Volver</span>
              </Button>
            )}

            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, index) => (
                    <BreadcrumbItem key={index}>
                      {index < breadcrumbs.length - 1 ? (
                        <>
                          <BreadcrumbLink
                            className="cursor-pointer hover:text-primary"
                            onClick={crumb.onClick}
                          >
                            {crumb.label}
                          </BreadcrumbLink>
                          <BreadcrumbSeparator />
                        </>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            {/* Title with icon */}
            <div className="flex items-center gap-2 min-w-0">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <h1 className="font-semibold truncate text-sm md:text-base lg:text-lg">
                {title}
              </h1>
            </div>
          </div>

          {/* Right side: Credits + Premium Badge + Actions */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {showCredits && lawyerId && (
              <div className="hidden sm:flex items-center gap-1">
                <CreditBalanceIndicator
                  balance={balance?.current_balance}
                  loading={creditsLoading}
                  size="sm"
                />
              </div>
            )}

            {isPremium && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs gap-1">
                <Crown className="h-3 w-3" />
                <span className="hidden sm:inline">Premium</span>
              </Badge>
            )}

            {actions}
          </div>
        </div>
      </header>

      {/* Subtitle bar if provided */}
      {subtitle && (
        <div className="border-b bg-muted/30 px-3 md:px-4 py-2">
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      )}

      {/* Main content */}
      <div className="container mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6">
        {children}
      </div>
    </main>
  );
}
