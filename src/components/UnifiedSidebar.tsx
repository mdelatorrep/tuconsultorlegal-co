import { Button } from "@/components/ui/button";
import { LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Bot, Settings } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface UnifiedSidebarProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function UnifiedSidebar({ user, currentView, onViewChange, onLogout }: UnifiedSidebarProps) {
  // Sidebar menu configuration
  const menuItems = [
    {
      title: "Panel Principal",
      items: [
        {
          title: "Dashboard",
          icon: Home,
          view: "dashboard" as const
        }
      ]
    },
    {
      title: "Herramientas Legales",
      items: [
        {
          title: "Investigación",
          icon: Search,
          view: "research" as const
        },
        {
          title: "Análisis",
          icon: Eye,
          view: "analyze" as const
        },
        {
          title: "Redacción",
          icon: PenTool,
          view: "draft" as const
        },
        {
          title: "Estrategia",
          icon: Target,
          view: "strategize" as const
        },
        {
          title: "Integraciones",
          icon: Settings,
          view: "integrations" as const
        }
      ]
    },
    ...(user?.canCreateAgents ? [{
      title: "Gestión IA",
      items: [
        {
          title: "Crear Agente",
          icon: Bot,
          view: "agent-creator" as const
        },
        {
          title: "Gestionar Agentes",
          icon: Settings,
          view: "agent-manager" as const
        }
      ]
    }] : []),
    {
      title: "Desarrollo",
      items: [
        {
          title: "Formación IA",
          icon: Brain,
          view: "training" as const
        }
      ]
    },
    ...(user?.canCreateBlogs ? [{
      title: "Contenido",
      items: [
        {
          title: "Gestión Blog",
          icon: BookOpen,
          view: "blog-manager" as const
        }
      ]
    }] : []),
    {
      title: "Estadísticas",
      items: [
        {
          title: "Métricas",
          icon: BarChart3,
          view: "stats" as const
        }
      ]
    }
  ];

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        {/* Header del Sidebar */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">Portal Abogados</h2>
          <p className="text-sm text-muted-foreground">{user?.name}</p>
        </div>

        {/* Menu Items */}
        {menuItems.map((section, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton 
                      onClick={() => onViewChange(item.view)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        currentView === item.view 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Logout Button */}
        <div className="p-4 border-t mt-auto">
          <Button
            onClick={onLogout}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}