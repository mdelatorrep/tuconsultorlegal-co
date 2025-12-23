import { 
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, 
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, 
  useSidebar 
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Activity, Users, Bot, BarChart3, BookOpen, MessageCircle, 
  Settings, Mail, Tag, CreditCard, Database, FileText, 
  FileCheck, Zap, Shield, DollarSign, UserCheck, Server, ScrollText
} from "lucide-react";

interface AdminSidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  unreadMessagesCount: number;
  pendingAgentsCount: number;
  pendingBlogsCount: number;
  userEmail?: string;
}

export const AdminSidebar = ({
  currentView,
  setCurrentView,
  unreadMessagesCount,
  pendingAgentsCount,
  pendingBlogsCount,
  userEmail
}: AdminSidebarProps) => {
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const collapsed = state === 'collapsed';

  const sidebarSections = [
    {
      label: "General",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Activity, count: 0 },
      ]
    },
    {
      label: "Usuarios & Roles",
      items: [
        { id: 'lawyers', label: 'Abogados', icon: Users, count: 0 },
        { id: 'users', label: 'Usuarios Finales', icon: UserCheck, count: 0 },
      ]
    },
    {
      label: "Documentos",
      items: [
        { id: 'documents', label: 'Docs Generados', icon: FileText, count: 0 },
      ]
    },
    {
      label: "IA & Automatización",
      items: [
        { id: 'agents', label: 'Agentes Legales', icon: Bot, count: pendingAgentsCount },
        { id: 'openai', label: 'OpenAI Config', icon: Zap, count: 0 },
        { id: 'knowledge', label: 'Base Conocimiento', icon: Database, count: 0 },
      ]
    },
    {
      label: "Contenido & Publicaciones",
      items: [
        { id: 'blogs', label: 'Blog Jurídico', icon: BookOpen, count: pendingBlogsCount },
        { id: 'legal-content', label: 'Contenido Legal', icon: FileText, count: 0 },
        { id: 'categories', label: 'Categorías', icon: Tag, count: 0 },
      ]
    },
    {
      label: "Comunicación",
      items: [
        { id: 'messages', label: 'Mensajes Usuarios', icon: MessageCircle, count: unreadMessagesCount },
        { id: 'custom-requests', label: 'Docs Personalizados', icon: FileCheck, count: 0 },
        { id: 'email-config', label: 'Config Email', icon: Mail, count: 0 },
      ]
    },
    {
      label: "Finanzas",
      items: [
        { id: 'credits', label: 'Gestión Créditos', icon: CreditCard, count: 0 },
        { id: 'subscriptions', label: 'Suscripciones', icon: CreditCard, count: 0 },
        { id: 'revenue', label: 'Ingresos & Pagos', icon: DollarSign, count: 0 },
      ]
    },
    {
      label: "Sistema & Analytics",
      items: [
        { id: 'stats', label: 'Estadísticas', icon: BarChart3, count: 0 },
        { id: 'monitoring', label: 'Monitoreo', icon: Server, count: 0 },
        { id: 'logs', label: 'Logs Sistema', icon: ScrollText, count: 0 },
        { id: 'config', label: 'Config Sistema', icon: Settings, count: 0 },
      ]
    }
  ];

  const handleItemClick = (itemId: string) => {
    setCurrentView(itemId);
    // Close sidebar on mobile after selection
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar 
      className={collapsed ? "w-14" : "w-64"} 
      collapsible={isMobile ? "offcanvas" : "icon"}
    >
      <SidebarContent>
        {/* Header */}
        {!collapsed && (
          <div className="p-4 border-b space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-sm">Admin Panel</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              tuconsultorlegal.co
            </p>
            {userEmail && (
              <p className="text-xs text-primary font-medium truncate">
                {userEmail}
              </p>
            )}
          </div>
        )}

        {/* Navigation Sections */}
        {sidebarSections.map((section) => (
          <SidebarGroup key={section.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase">
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      isActive={currentView === item.id}
                      onClick={() => handleItemClick(item.id)}
                      className="w-full justify-start min-h-[44px]"
                      tooltip={collapsed ? item.label : undefined}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.count > 0 && (
                            <Badge variant="destructive" className="ml-auto text-xs h-5 shrink-0">
                              {item.count}
                            </Badge>
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
      </SidebarContent>
    </Sidebar>
  );
};
