import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface ModuleContainerProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  gradientFrom?: string;
  gradientTo?: string;
  heroContent?: ReactNode;
}

export default function ModuleContainer({
  children,
  title,
  subtitle,
  icon: Icon,
  gradientFrom = "primary",
  gradientTo = "primary/5",
  heroContent
}: ModuleContainerProps) {
  return (
    <div className="flex-1 min-w-0 overflow-auto">
      {heroContent && (
        <div className={`relative overflow-hidden bg-gradient-to-br from-${gradientFrom}/10 via-${gradientFrom}/5 to-transparent border-b`}>
          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
            {heroContent}
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
