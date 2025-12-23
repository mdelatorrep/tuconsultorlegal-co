import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Scale, BarChart3, Brain, BookOpen, Search, Eye, PenTool, Target, Home, Bot, Settings, Users, User, Database, Gavel, Coins, Trophy, Radar, Calendar, Wand2, Mic, TrendingUp, UserCircle, ChevronDown, FileSearch, FileText, Briefcase, GraduationCap, ShieldCheck } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreditBalanceIndicator } from "@/components/credits/CreditBalanceIndicator";
import { useCredits } from "@/hooks/useCredits";
import { cn } from "@/lib/utils";

interface UnifiedSidebarProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

interface MenuItem {
  title: string;
  icon: any;
  view: string;
}

interface MenuSection {
  title: string;
  icon?: any;
  items: MenuItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function UnifiedSidebar({ user, currentView, onViewChange, onLogout }: UnifiedSidebarProps) {
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = !isMobile && state === 'collapsed';
  
  const { balance, loading: creditsLoading } = useCredits(user?.id || null);
  
  // State for collapsible sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "investigacion": true,
    "documentos": false,
    "clientes": false,
    "premium": false,
  });
  
  const handleViewChange = (view: string) => {
    onViewChange(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Check if any item in a section is active
  const isSectionActive = (items: MenuItem[]) => {
    return items.some(item => item.view === currentView);
  };
  
  // Organized menu structure with subcategories
  const menuStructure: { key: string; section: MenuSection }[] = [
    {
      key: "principal",
      section: {
        title: "Panel Principal",
        items: [
          { title: "Dashboard", icon: Home, view: "dashboard" }
        ]
      }
    },
    {
      key: "investigacion",
      section: {
        title: "Investigación",
        icon: FileSearch,
        collapsible: true,
        defaultOpen: true,
        items: [
          { title: "Investigación Legal", icon: Search, view: "research" },
          { title: "SUIN-Juriscol", icon: Database, view: "suin-juriscol" },
          { title: "Consulta Procesos", icon: Gavel, view: "process-query" },
          { title: "Monitor Procesos", icon: Radar, view: "process-monitor" },
        ]
      }
    },
    {
      key: "documentos",
      section: {
        title: "Documentos",
        icon: FileText,
        collapsible: true,
        items: [
          { title: "Análisis", icon: Eye, view: "analyze" },
          { title: "Redacción", icon: PenTool, view: "draft" },
          { title: "Copilot Legal", icon: Wand2, view: "legal-copilot" },
          { title: "Asistente de Voz", icon: Mic, view: "voice-assistant" },
        ]
      }
    },
    {
      key: "clientes",
      section: {
        title: "Clientes",
        icon: Briefcase,
        collapsible: true,
        items: [
          { title: "Gestión CRM", icon: Users, view: "crm" },
          { title: "Portal Clientes", icon: UserCircle, view: "client-portal" },
          { title: "Calendario Legal", icon: Calendar, view: "legal-calendar" },
        ]
      }
    },
    {
      key: "herramientas-ia",
      section: {
        title: "Herramientas IA",
        icon: Brain,
        collapsible: true,
        items: [
          { title: "Estrategia Legal", icon: Target, view: "strategize" },
          { title: "Predictor de Casos", icon: TrendingUp, view: "case-predictor" },
          { title: "Verificación", icon: ShieldCheck, view: "lawyer-verification" },
        ]
      }
    },
    {
      key: "gestion-ia",
      section: {
        title: "Gestión IA",
        icon: Bot,
        collapsible: true,
        items: [
          { title: "Crear Agente", icon: Bot, view: "agent-creator" },
          { title: "Gestionar Agentes", icon: Settings, view: "agent-manager" },
          { title: "Métricas", icon: BarChart3, view: "stats" }
        ]
      }
    },
    {
      key: "desarrollo",
      section: {
        title: "Desarrollo",
        icon: GraduationCap,
        items: [
          { title: "Formación IA", icon: Brain, view: "training" }
        ]
      }
    },
    ...(user?.canCreateBlogs ? [{
      key: "contenido",
      section: {
        title: "Contenido",
        icon: BookOpen,
        items: [
          { title: "Gestión Blog", icon: BookOpen, view: "blog-manager" }
        ]
      }
    }] : []),
    {
      key: "cuenta",
      section: {
        title: "Mi Cuenta",
        items: [
          { title: "Mis Créditos", icon: Coins, view: "credits" },
          { title: "Logros y Ranking", icon: Trophy, view: "gamification" },
          { title: "Perfil Público", icon: User, view: "public-profile" }
        ]
      }
    }
  ];

  const renderMenuItem = (item: MenuItem) => (
    <SidebarMenuItem key={item.view}>
      <SidebarMenuButton 
        isActive={currentView === item.view}
        onClick={() => handleViewChange(item.view)}
        className="w-full justify-start min-h-[40px]"
        tooltip={collapsed ? item.title : undefined}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderSection = ({ key, section }: { key: string; section: MenuSection }) => {
    const isOpen = openSections[key] ?? section.defaultOpen ?? false;
    const hasActiveItem = isSectionActive(section.items);

    // Auto-open section if it has active item
    if (hasActiveItem && !isOpen && !collapsed) {
      setOpenSections(prev => ({ ...prev, [key]: true }));
    }

    if (section.collapsible && !collapsed) {
      return (
        <Collapsible 
          key={key} 
          open={isOpen} 
          onOpenChange={() => toggleSection(key)}
          className="group/collapsible"
        >
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1.5 flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  {section.icon && <section.icon className="h-3.5 w-3.5" />}
                  <span>{section.title}</span>
                </div>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform duration-200",
                  isOpen && "rotate-180"
                )} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      );
    }

    return (
      <SidebarGroup key={key}>
        {!collapsed && (
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {section.icon && <section.icon className="h-3.5 w-3.5" />}
            {section.title}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {section.items.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar 
      className={isMobile ? "w-72" : (collapsed ? "w-14" : "w-64")}
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      {!isMobile && <SidebarTrigger className="m-2 self-end" />}
      
      <SidebarContent>
        {/* Header */}
        {!collapsed && (
          <div className="p-4 border-b space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-sm">Portal Abogados</h2>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {user?.name}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <CreditBalanceIndicator 
                balance={balance?.current_balance} 
                loading={creditsLoading}
                size="sm"
              />
              <span className="text-xs text-muted-foreground">créditos</span>
            </div>
          </div>
        )}

        {/* Menu Sections */}
        <div className="flex-1 overflow-y-auto py-2">
          {menuStructure.map(renderSection)}
        </div>

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
