import { Button } from "@/components/ui/button";
import { LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Bot, Settings, Users, Crown, Lock, User, Database, Gavel } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface UnifiedSidebarProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function UnifiedSidebar({ user, currentView, onViewChange, onLogout }: UnifiedSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  // En móvil (offcanvas), nunca colapsar. En desktop, usar el estado del sidebar
  const collapsed = !isMobile && state === 'collapsed';
  
  const handleViewChange = (view: string) => {
    onViewChange(view);
    // Close sidebar on mobile after selection
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
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
          title: "SUIN-Juriscol",
          icon: Database,
          view: "suin-juriscol" as const
        },
        {
          title: "Consulta Procesos",
          icon: Gavel,
          view: "process-query" as const
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
          title: "Perfil Público",
          icon: User,
          view: "public-profile" as const
        },
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
      className={isMobile ? "w-72" : (collapsed ? "w-14" : "w-64")}
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      {!isMobile && <SidebarTrigger className="m-2 self-end" />}
      
      <SidebarContent>
        {/* Header del Sidebar */}
        {!collapsed && (
          <div className="p-4 border-b space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-sm">Portal Abogados</h2>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {user?.name}
            </p>
          </div>
        )}

        {/* Menu Items */}
        {menuItems.map((section, index) => (
          <SidebarGroup key={index}>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase">
                {section.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.view}>
                    <SidebarMenuButton 
                      isActive={currentView === item.view}
                      onClick={() => handleViewChange(item.view)}
                      className={`w-full justify-start min-h-[44px] ${(item as any).isPremium ? 'opacity-75' : ''}`}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          {(item as any).isPremium && (
                            <div className="flex items-center gap-1 ml-auto shrink-0">
                              <Crown className="h-3 w-3 text-amber-500" />
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </>
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
            className="w-full flex items-center gap-2 justify-start min-h-[44px]"
            title={collapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}