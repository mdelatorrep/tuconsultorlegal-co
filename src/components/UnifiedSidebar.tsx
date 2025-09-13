import { Button } from "@/components/ui/button";
import { LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Bot, Settings, Users, Crown, Lock } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface UnifiedSidebarProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function UnifiedSidebar({ user, currentView, onViewChange, onLogout }: UnifiedSidebarProps) {
  const isMobile = useIsMobile();
  
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
          title: "Gestión de Clientes",
          icon: Users,
          view: "crm" as const,
          isPremium: !user?.canUseAiTools
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
        },
        {
          title: "Métricas",
          icon: BarChart3,
          view: "stats" as const
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
      title: "Cuenta",
      items: [
        {
          title: "Suscripción",
          icon: Crown,
          view: "subscription" as const
        }
      ]
    }
  ];

  return (
    <Sidebar 
      className={`${isMobile ? 'w-16 lg:w-64' : 'w-64'} transition-all duration-300`}
      collapsible="icon"
      variant={isMobile ? "floating" : "sidebar"}
      side="left"
    >
      <SidebarContent>
        {/* Header del Sidebar */}
        <div className="p-4 border-b">
          <h2 className={`text-lg font-semibold text-foreground ${isMobile ? 'hidden lg:block' : ''}`}>
            Portal Abogados
          </h2>
          <p className={`text-sm text-muted-foreground ${isMobile ? 'hidden lg:block' : ''}`}>
            {user?.name}
          </p>
        </div>

        {/* Menu Items */}
        {menuItems.map((section, index) => (
          <SidebarGroup key={index}>
            <SidebarGroupLabel className={isMobile ? 'hidden lg:block' : ''}>
              {section.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton 
                      onClick={() => onViewChange(item.view)}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                        currentView === item.view 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      } ${(item as any).isPremium ? 'opacity-75' : ''} ${
                        isMobile ? 'justify-center lg:justify-between' : ''
                      }`}
                      title={isMobile ? item.title : undefined}
                    >
                      <div className={`flex items-center gap-3 ${isMobile ? 'lg:flex' : ''}`}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className={isMobile ? 'hidden lg:inline' : ''}>{item.title}</span>
                      </div>
                      {(item as any).isPremium && (
                        <div className={`flex items-center gap-1 ${isMobile ? 'absolute top-1 right-1 lg:relative lg:top-auto lg:right-auto' : ''}`}>
                          <Crown className={`h-3 w-3 text-amber-500 ${isMobile ? 'h-2 w-2 lg:h-3 lg:w-3' : ''}`} />
                          <Lock className={`h-3 w-3 text-muted-foreground ${isMobile ? 'hidden lg:block' : ''}`} />
                        </div>
                      )}
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
            className={`w-full flex items-center gap-2 ${isMobile ? 'justify-center lg:justify-start px-2 lg:px-4' : ''}`}
            title={isMobile ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="h-4 w-4" />
            <span className={isMobile ? 'hidden lg:inline' : ''}>Cerrar Sesión</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}