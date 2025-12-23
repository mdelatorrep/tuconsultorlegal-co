import { useCallback, useMemo, ReactNode } from 'react';
import { 
  Home, Search, FileText, Users, Brain, BookOpen, 
  Target, BarChart3, Bot, PenTool, Scale, Database,
  Settings, LogOut, Plus, Coins, Trophy
} from 'lucide-react';

export interface QuickAction {
  id: string;
  name: string;
  description?: string;
  iconName: string;
  category: 'navigation' | 'create' | 'search' | 'ai' | 'settings';
  keywords: string[];
  action: () => void;
  shortcut?: string;
}

interface UseQuickActionsProps {
  onNavigate: (view: string) => void;
  onLogout?: () => void;
  onOpenChat?: (message: string) => void;
}

export const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Search, FileText, Users, Brain, BookOpen, Target, BarChart3, 
  Bot, PenTool, Scale, Database, Settings, LogOut, Plus, Coins, Trophy
};

export function useQuickActions({ onNavigate, onLogout, onOpenChat }: UseQuickActionsProps) {
  const actions: QuickAction[] = useMemo(() => [
    { id: 'nav-dashboard', name: 'Ir al Dashboard', description: 'Volver a la pantalla principal', iconName: 'Home', category: 'navigation', keywords: ['dashboard', 'inicio', 'home'], action: () => onNavigate('dashboard'), shortcut: '⌘D' },
    { id: 'nav-research', name: 'Investigación Legal', description: 'Buscar jurisprudencia', iconName: 'Search', category: 'navigation', keywords: ['investigar', 'buscar', 'research'], action: () => onNavigate('research'), shortcut: '⌘R' },
    { id: 'nav-analyze', name: 'Analizar Documento', description: 'Análisis con IA', iconName: 'Brain', category: 'navigation', keywords: ['analizar', 'análisis'], action: () => onNavigate('analyze'), shortcut: '⌘A' },
    { id: 'nav-draft', name: 'Redactar Documento', description: 'Crear documentos', iconName: 'PenTool', category: 'navigation', keywords: ['redactar', 'draft'], action: () => onNavigate('draft') },
    { id: 'nav-strategize', name: 'Estrategia Legal', description: 'Análisis estratégico', iconName: 'Target', category: 'navigation', keywords: ['estrategia', 'caso'], action: () => onNavigate('strategize') },
    { id: 'nav-crm', name: 'CRM - Clientes', description: 'Gestionar clientes', iconName: 'Users', category: 'navigation', keywords: ['crm', 'clientes'], action: () => onNavigate('crm'), shortcut: '⌘C' },
    { id: 'nav-suin', name: 'SUIN Juriscol', description: 'Búsqueda normativa', iconName: 'Scale', category: 'navigation', keywords: ['suin', 'juriscol'], action: () => onNavigate('suin-juriscol') },
    { id: 'nav-processes', name: 'Consultar Procesos', description: 'Procesos judiciales', iconName: 'Database', category: 'navigation', keywords: ['procesos', 'radicado'], action: () => onNavigate('process-query') },
    { id: 'nav-stats', name: 'Estadísticas', description: 'Ver métricas', iconName: 'BarChart3', category: 'navigation', keywords: ['estadísticas', 'stats'], action: () => onNavigate('stats') },
    { id: 'nav-credits', name: 'Créditos', description: 'Gestionar créditos', iconName: 'Coins', category: 'navigation', keywords: ['créditos', 'credits'], action: () => onNavigate('credits') },
    { id: 'nav-agents', name: 'Mis Agentes', description: 'Gestionar agentes IA', iconName: 'Bot', category: 'navigation', keywords: ['agentes', 'bot'], action: () => onNavigate('agent-manager') },
    { id: 'nav-training', name: 'Capacitación', description: 'Cursos', iconName: 'BookOpen', category: 'navigation', keywords: ['capacitación', 'training'], action: () => onNavigate('training') },
    { id: 'nav-gamification', name: 'Logros y Ranking', description: 'Ver logros y leaderboard', iconName: 'Trophy', category: 'navigation', keywords: ['logros', 'ranking'], action: () => onNavigate('gamification') },
    { id: 'create-document', name: 'Nuevo Documento', description: 'Crear documento legal', iconName: 'Plus', category: 'create', keywords: ['nuevo', 'crear'], action: () => onNavigate('draft') },
    { id: 'create-client', name: 'Nuevo Cliente', description: 'Agregar cliente', iconName: 'Plus', category: 'create', keywords: ['nuevo', 'cliente'], action: () => onNavigate('crm') },
    { id: 'create-agent', name: 'Nuevo Agente', description: 'Crear agente IA', iconName: 'Plus', category: 'create', keywords: ['nuevo', 'agente'], action: () => onNavigate('agent-creator') },
    { id: 'ai-research', name: 'Investigar con IA', iconName: 'Brain', category: 'ai', keywords: ['ia', 'investigar'], action: () => { onNavigate('research'); onOpenChat?.('Investigar sobre'); } },
    { id: 'ai-analyze', name: 'Analizar con IA', iconName: 'Brain', category: 'ai', keywords: ['ia', 'analizar'], action: () => onNavigate('analyze') },
    { id: 'ai-strategy', name: 'Estrategia con IA', iconName: 'Brain', category: 'ai', keywords: ['ia', 'estrategia'], action: () => onNavigate('strategize') },
    { id: 'settings-profile', name: 'Mi Perfil Público', iconName: 'Settings', category: 'settings', keywords: ['perfil', 'profile'], action: () => onNavigate('public-profile') },
    { id: 'settings-logout', name: 'Cerrar Sesión', iconName: 'LogOut', category: 'settings', keywords: ['salir', 'logout'], action: () => onLogout?.() },
  ], [onNavigate, onLogout, onOpenChat]);

  const searchActions = useCallback((query: string): QuickAction[] => {
    if (!query.trim()) return actions;
    const lowerQuery = query.toLowerCase();
    return actions.filter(action => 
      action.name.toLowerCase().includes(lowerQuery) ||
      action.description?.toLowerCase().includes(lowerQuery) ||
      action.keywords.some(keyword => keyword.includes(lowerQuery))
    );
  }, [actions]);

  const getActionsByCategory = useCallback((category: QuickAction['category']) => {
    return actions.filter(action => action.category === category);
  }, [actions]);

  return { actions, searchActions, getActionsByCategory };
}
