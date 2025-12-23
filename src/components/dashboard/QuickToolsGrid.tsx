import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Search, Eye, PenTool, Target, Users } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface Tool {
  title: string;
  icon: LucideIcon;
  view: string;
  gradient: string;
}

interface QuickToolsGridProps {
  onViewChange: (view: string) => void;
  newLeadsCount?: number;
}

const tools: Tool[] = [
  { title: "Investigación", icon: Search, view: "research", gradient: "from-blue-500 to-cyan-500" },
  { title: "Análisis", icon: Eye, view: "analyze", gradient: "from-purple-500 to-pink-500" },
  { title: "Redacción", icon: PenTool, view: "draft", gradient: "from-green-500 to-emerald-500" },
  { title: "Estrategia", icon: Target, view: "strategize", gradient: "from-orange-500 to-red-500" },
  { title: "CRM", icon: Users, view: "crm", gradient: "from-blue-500 to-indigo-500" },
];

export function QuickToolsGrid({ onViewChange, newLeadsCount = 0 }: QuickToolsGridProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg md:text-xl font-semibold">Herramientas Rápidas</h2>
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
          PREMIUM ACTIVO
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tools.map((tool) => (
          <Card
            key={tool.view}
            className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-0 relative"
            onClick={() => onViewChange(tool.view)}
          >
            {/* CRM notification badge */}
            {tool.view === "crm" && newLeadsCount > 0 && (
              <div className="absolute -top-2 -right-2 z-10">
                <Badge className="bg-destructive text-destructive-foreground px-2 py-1 text-xs font-bold animate-pulse shadow-lg">
                  {newLeadsCount}
                </Badge>
              </div>
            )}
            <CardContent className="p-4 text-center">
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-r ${tool.gradient} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-300`}
              >
                <tool.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-sm">{tool.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
