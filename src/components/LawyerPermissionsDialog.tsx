import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot, BookOpen, BarChart3, Save, X, Brain, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
// import { useLawyerAuthContext } from './LawyerAuthProvider';

interface LawyerPermissions {
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_use_ai_tools: boolean;
  is_active: boolean;
}

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_use_ai_tools: boolean;
  active: boolean;
}

interface LawyerPermissionsDialogProps {
  lawyer: Lawyer | null;
  open: boolean;
  onClose: () => void;
  onPermissionsUpdated: () => void;
  authHeaders: Record<string, string>;
}

export default function LawyerPermissionsDialog({
  lawyer,
  open,
  onClose,
  onPermissionsUpdated,
  authHeaders
}: LawyerPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<LawyerPermissions>({
    can_create_agents: false,
    can_create_blogs: false,
    can_use_ai_tools: false,
    is_active: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize permissions when lawyer changes
  useEffect(() => {
    if (lawyer) {
      setPermissions({
        can_create_agents: lawyer.can_create_agents ?? false,
        can_create_blogs: lawyer.can_create_blogs ?? false,
        can_use_ai_tools: lawyer.can_use_ai_tools ?? false,
        is_active: lawyer.active ?? true
      });
    }
  }, [lawyer]);

  const handleSave = async () => {
    if (!lawyer) return;

    console.log('=== STARTING PERMISSION UPDATE ===');
    console.log('Lawyer ID:', lawyer.id);
    console.log('New permissions:', permissions);
    
    setIsLoading(true);
    try {
      // Usar la nueva función edge específica
      const { data, error } = await supabase.functions.invoke('update-lawyer-permissions', {
        body: {
          lawyerId: lawyer.id,
          permissions: {
            can_create_agents: permissions.can_create_agents,
            can_create_blogs: permissions.can_create_blogs,
            can_use_ai_tools: permissions.can_use_ai_tools
          },
          is_active: permissions.is_active
        },
        headers: authHeaders
      });

      console.log('=== FUNCTION RESPONSE ===');
      console.log('Data:', data);
      console.log('Error:', error);

      if (error) {
        console.error('Function invocation error:', error);
        toast({
          title: "Error",
          description: `Error al actualizar permisos: ${error.message}`,
          variant: "destructive"
        });
        return;
      }

      if (!data.success) {
        console.error('Function returned error:', data.error);
        const errorMessage = data.error === 'Lawyer not found' 
          ? 'Abogado no encontrado. Por favor, recarga la página para actualizar la lista.'
          : `Error: ${data.error}`;
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      console.log('=== UPDATE SUCCESSFUL ===');
      console.log('Updated lawyer data:', data.data);

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${lawyer.full_name} han sido actualizados correctamente`,
      });

      // Actualizar la lista de abogados
      onPermissionsUpdated();
      
      // Refrescar permisos del usuario actual si es el mismo que se está editando
      // Note: refreshUserPermissions is not available in admin context
      // if (lawyer.id) {
      //   await refreshUserPermissions();
      // }
      
      onClose();
      
    } catch (error) {
      console.error('=== CATCH ERROR ===', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado al actualizar los permisos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const permissionItems = [
    {
      key: 'can_create_agents' as keyof LawyerPermissions,
      label: 'Crear Agentes de IA',
      description: 'Permite al abogado crear y gestionar agentes legales de IA',
      icon: Bot,
      color: 'text-blue-600'
    },
    {
      key: 'can_create_blogs' as keyof LawyerPermissions,
      label: 'Crear Artículos de Blog',
      description: 'Permite al abogado crear y publicar artículos en el blog',
      icon: BookOpen,
      color: 'text-green-600'
    },
    {
      key: 'can_use_ai_tools' as keyof LawyerPermissions,
      label: 'Usar Herramientas de IA',
      description: 'Permite al abogado acceder y usar las herramientas legales de IA',
      icon: Brain,
      color: 'text-purple-600'
    }
  ];

  if (!lawyer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Editar Permisos de Abogado
          </DialogTitle>
          <DialogDescription>
            Configura los permisos para <strong>{lawyer.full_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lawyer Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {lawyer.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="font-medium">{lawyer.full_name}</div>
              <div className="text-sm text-muted-foreground">{lawyer.email}</div>
            </div>
            <Badge variant={permissions.is_active ? "default" : "secondary"}>
              {permissions.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          <Separator />

          {/* Active Status Toggle */}
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <div className={`p-2 rounded-lg bg-muted ${permissions.is_active ? 'text-green-600' : 'text-destructive'}`}>
              <Power className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                  Estado de la Cuenta
                </Label>
                <Switch
                  id="is_active"
                  checked={permissions.is_active}
                  onCheckedChange={(checked) => 
                    setPermissions(prev => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {permissions.is_active 
                  ? 'El abogado puede acceder al portal. Sus créditos se mantienen.' 
                  : 'El abogado no podrá iniciar sesión. Sus créditos se conservan para cuando se reactive.'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Permissions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Permisos del Sistema</h4>
            
            <div className="space-y-4">
              {permissionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={item.key} className="text-sm font-medium cursor-pointer">
                          {item.label}
                        </Label>
                        <Switch
                          id={item.key}
                          checked={permissions[item.key] || false}
                          onCheckedChange={(checked) => 
                            setPermissions(prev => ({ ...prev, [item.key]: checked }))
                          }
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}