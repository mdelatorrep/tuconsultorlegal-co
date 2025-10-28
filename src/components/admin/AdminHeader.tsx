import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bell, LogOut, Trash2, MessageCircle, Bot, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";

interface AdminHeaderProps {
  currentView: string;
  currentSection?: { label: string };
  unreadMessagesCount: number;
  pendingAgentsCount: number;
  onLogout: () => void;
  onClearMemory: () => Promise<void>;
  onRefresh?: () => void;
}

export const AdminHeader = ({
  currentView,
  currentSection,
  unreadMessagesCount,
  pendingAgentsCount,
  onLogout,
  onClearMemory,
  onRefresh
}: AdminHeaderProps) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const viewDescriptions: Record<string, string> = {
    dashboard: 'Vista general del sistema jurídico',
    lawyers: 'Gestiona abogados registrados en el sistema',
    agents: 'Administra agentes legales de IA',
    openai: 'Configuración de OpenAI y modelos',
    blogs: 'Gestiona contenido del blog jurídico',
    'legal-content': 'Edita términos, privacidad y propiedad intelectual',
    messages: 'Responde consultas de usuarios',
    'custom-requests': 'Gestiona solicitudes de documentos personalizados',
    knowledge: 'Administra la base de conocimiento',
    stats: 'Visualiza estadísticas del sistema',
    categories: 'Configura categorías de documentos',
    subscriptions: 'Administra planes y suscripciones',
    'email-config': 'Configura el sistema de notificaciones por email',
    config: 'Configuración avanzada del sistema'
  };

  const totalNotifications = unreadMessagesCount + pendingAgentsCount;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="lg:hidden" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {currentSection?.label || 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewDescriptions[currentView] || 'Gestiona el portal administrativo'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        {onRefresh && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        )}

        {/* Notifications */}
        <Popover open={showNotifications} onOpenChange={setShowNotifications}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="relative"
            >
              <Bell className="w-4 h-4" />
              {totalNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center font-bold">
                  {totalNotifications}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="end">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notificaciones
              </h4>
              <Separator />
              
              {unreadMessagesCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Consultas sin responder</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {unreadMessagesCount}
                  </Badge>
                </div>
              )}
              
              {pendingAgentsCount > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">Agentes por revisar</span>
                  </div>
                  <Badge variant="outline" className="text-xs border-orange-300">
                    {pendingAgentsCount}
                  </Badge>
                </div>
              )}
              
              {totalNotifications === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium">Todo al día</p>
                  <p className="text-xs">No hay notificaciones pendientes</p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Memory */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Limpiar Memoria</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-orange-500" />
                Limpiar Memoria de Agentes
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará toda la memoria almacenada de los agentes de chat para TODOS los usuarios.
                <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                  <li>Conversaciones activas</li>
                  <li>Thread IDs de OpenAI</li>
                  <li>Historial completo</li>
                  <li>Datos de sesiones</li>
                </ul>
                <p className="mt-3 font-semibold text-orange-600">
                  ⚠️ Los usuarios deberán iniciar conversaciones nuevas.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onClearMemory}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirmar Limpieza
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Logout */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                Confirmar Cierre de Sesión
              </AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas cerrar la sesión de administrador?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700"
              >
                Cerrar Sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
