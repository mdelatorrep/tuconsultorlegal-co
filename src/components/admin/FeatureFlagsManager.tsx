import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ToggleLeft, Save, RefreshCw, Search, Home, Database, Gavel, Radar,
  Eye, PenTool, Mic, Users, UserCircle, Calendar, Sparkles, Target,
  TrendingUp, Bot, Settings, BarChart3, Mail, Brain, BookOpen, Coins,
  Trophy, User
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FeatureFlag {
  key: string;
  label: string;
  section: string;
  icon: any;
  enabled: boolean;
}

const FEATURE_DEFINITIONS: Omit<FeatureFlag, 'enabled'>[] = [
  // Panel Principal
  { key: 'dashboard', label: 'Dashboard', section: 'Panel Principal', icon: Home },
  // Investigación
  { key: 'research', label: 'Investigación Legal', section: 'Investigación', icon: Search },
  { key: 'suin-juriscol', label: 'SUIN-Juriscol', section: 'Investigación', icon: Database },
  { key: 'process-query', label: 'Consulta Procesos', section: 'Investigación', icon: Gavel },
  { key: 'process-monitor', label: 'Monitor Procesos', section: 'Investigación', icon: Radar },
  // Documentos
  { key: 'analyze', label: 'Análisis', section: 'Documentos', icon: Eye },
  { key: 'draft', label: 'Redacción con Copilot', section: 'Documentos', icon: PenTool },
  { key: 'voice-assistant', label: 'Asistente de Voz', section: 'Documentos', icon: Mic },
  // Clientes
  { key: 'crm', label: 'Gestión CRM', section: 'Clientes', icon: Users },
  { key: 'client-portal', label: 'Portal Clientes', section: 'Clientes', icon: UserCircle },
  { key: 'legal-calendar', label: 'Calendario Legal', section: 'Clientes', icon: Calendar },
  // Herramientas IA
  { key: 'specialized-agents', label: 'Agentes Especializados', section: 'Herramientas IA', icon: Sparkles },
  { key: 'strategize', label: 'Estrategia Legal', section: 'Herramientas IA', icon: Target },
  { key: 'case-predictor', label: 'Predictor de Casos', section: 'Herramientas IA', icon: TrendingUp },
  // Gestión IA
  { key: 'agent-creator', label: 'Crear Agente', section: 'Gestión IA', icon: Bot },
  { key: 'agent-manager', label: 'Gestionar Agentes', section: 'Gestión IA', icon: Settings },
  { key: 'stats', label: 'Métricas', section: 'Gestión IA', icon: BarChart3 },
  { key: 'request-agent-access', label: 'Solicitar Acceso (Agentes)', section: 'Gestión IA', icon: Mail },
  // Desarrollo
  { key: 'training', label: 'Formación IA', section: 'Desarrollo', icon: Brain },
  // Contenido
  { key: 'blog-manager', label: 'Gestión Blog', section: 'Contenido', icon: BookOpen },
  { key: 'request-blog-access', label: 'Solicitar Acceso (Blog)', section: 'Contenido', icon: Mail },
  // Mi Cuenta
  { key: 'credits', label: 'Mis Créditos', section: 'Mi Cuenta', icon: Coins },
  { key: 'gamification', label: 'Logros y Ranking', section: 'Mi Cuenta', icon: Trophy },
  { key: 'public-profile', label: 'Perfil Público', section: 'Mi Cuenta', icon: User },
  { key: 'account-settings', label: 'Configuración', section: 'Mi Cuenta', icon: Settings },
];

export default function FeatureFlagsManager() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [originalFlags, setOriginalFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchFlags = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'feature_flags_sidebar')
      .single();

    if (error) {
      console.error('Error fetching feature flags:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los feature flags', variant: 'destructive' });
    } else if (data) {
      const val = typeof data.config_value === 'string' ? JSON.parse(data.config_value) : data.config_value;
      setFlags(val);
      setOriginalFlags(val);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFlags(); }, []);

  const handleToggle = (key: string) => {
    setFlags(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = JSON.stringify(flags) !== JSON.stringify(originalFlags);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase.functions.invoke('update-system-config', {
        body: { configKey: 'feature_flags_sidebar', configValue: flags },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setOriginalFlags(flags);
      toast({ title: 'Guardado', description: 'Feature flags actualizados correctamente' });
    } catch (err) {
      console.error('Error saving flags:', err);
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = (enabled: boolean) => {
    const updated: Record<string, boolean> = {};
    FEATURE_DEFINITIONS.forEach(f => { updated[f.key] = enabled; });
    setFlags(updated);
  };

  // Group by section
  const sections = FEATURE_DEFINITIONS.reduce<Record<string, typeof FEATURE_DEFINITIONS>>((acc, f) => {
    if (!acc[f.section]) acc[f.section] = [];
    acc[f.section].push(f);
    return acc;
  }, {});

  const filteredSections = Object.entries(sections).map(([section, items]) => ({
    section,
    items: items.filter(i =>
      i.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.section.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = FEATURE_DEFINITIONS.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ToggleLeft className="h-5 w-5 text-primary" />
            Feature Flags — Portal Abogados
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Controla qué funcionalidades están visibles en el sidebar del portal de abogados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {enabledCount}/{totalCount} activas
          </Badge>
          <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
            Activar todas
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAll(false)}>
            Desactivar todas
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar funcionalidad..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Flags grid by section */}
      <div className="grid gap-4">
        {filteredSections.map(({ section, items }) => (
          <Card key={section}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{section}</CardTitle>
              <CardDescription className="text-xs">
                {items.filter(i => flags[i.key]).length}/{items.length} habilitadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(item => {
                  const Icon = item.icon;
                  const enabled = flags[item.key] ?? true;
                  const changed = enabled !== (originalFlags[item.key] ?? true);
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        enabled ? 'bg-card' : 'bg-muted/50 opacity-60'
                      } ${changed ? 'ring-2 ring-primary/30' : ''}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-sm truncate">{item.label}</span>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggle(item.key)}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save bar */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      )}
    </div>
  );
}
