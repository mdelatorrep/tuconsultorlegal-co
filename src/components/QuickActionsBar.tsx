import { useState, useEffect, useCallback } from 'react';
import { Command, Search, ArrowRight, Keyboard, Home, Brain, FileText, Settings } from 'lucide-react';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useQuickActions, QuickAction, iconComponents } from '@/hooks/useQuickActions';
import { cn } from '@/lib/utils';

interface QuickActionsBarProps {
  onNavigate: (view: string) => void;
  onLogout?: () => void;
  onOpenChat?: (message: string) => void;
  isEnabled?: boolean;
}

const categoryIcons: Record<string, React.ReactNode> = {
  navigation: <Home className="h-4 w-4" />,
  create: <FileText className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  ai: <Brain className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

const categoryNames: Record<string, string> = {
  navigation: 'Navegación',
  create: 'Crear',
  search: 'Buscar',
  ai: 'IA',
  settings: 'Configuración',
};

export function QuickActionsBar({ 
  onNavigate, 
  onLogout, 
  onOpenChat,
  isEnabled = true 
}: QuickActionsBarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { actions, searchActions, getActionsByCategory } = useQuickActions({
    onNavigate,
    onLogout,
    onOpenChat,
  });

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    if (!isEnabled) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isEnabled]);

  const handleSelect = useCallback((action: QuickAction) => {
    setOpen(false);
    setSearch('');
    action.action();
  }, []);

  const filteredActions = searchActions(search);

  // Group actions by category
  const groupedActions = filteredActions.reduce((acc, action) => {
    if (!acc[action.category]) {
      acc[action.category] = [];
    }
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  if (!isEnabled) return null;

  return (
    <>
      {/* Floating trigger button (mobile) */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-20 right-4 z-50 md:hidden",
          "w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "hover:scale-110 transition-transform",
          "animate-fade-in"
        )}
      >
        <Command className="h-6 w-6" />
      </button>

      {/* Desktop shortcut hint */}
      <div className="hidden md:flex fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg",
            "bg-card border shadow-sm",
            "text-sm text-muted-foreground",
            "hover:bg-muted transition-colors"
          )}
        >
          <Keyboard className="h-4 w-4" />
          <span>Acciones rápidas</span>
          <Badge variant="outline" className="text-xs">
            ⌘K
          </Badge>
        </button>
      </div>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="¿Qué quieres hacer? Escribe para buscar..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p>No se encontraron resultados.</p>
              <p className="text-xs">Intenta con otras palabras clave.</p>
            </div>
          </CommandEmpty>

          {/* Recent / Suggested when no search */}
          {!search && (
            <CommandGroup heading="Sugerido">
              {actions.slice(0, 5).map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.id}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{action.name}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    )}
                  </div>
                  {action.shortcut && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {action.shortcut}
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Grouped results */}
          {Object.entries(groupedActions).map(([category, categoryActions]) => (
            <CommandGroup 
              key={category} 
              heading={
                <div className="flex items-center gap-2">
                  {categoryIcons[category]}
                  <span>{categoryNames[category]}</span>
                </div>
              }
            >
              {categoryActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.id} ${action.name} ${action.keywords.join(' ')}`}
                  onSelect={() => handleSelect(action)}
                  className="flex items-center gap-3 py-2"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{action.name}</p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </p>
                    )}
                  </div>
                  {action.shortcut && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {action.shortcut}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {/* Help hint at bottom */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↑↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">↵</kbd>
                seleccionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px]">esc</kbd>
                cerrar
              </span>
            </div>
          </div>
        </CommandList>
      </CommandDialog>
    </>
  );
}
