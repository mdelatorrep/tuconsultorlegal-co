import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot, BookOpen, BarChart3, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LawyerPermissions {
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_see_business_stats?: boolean;
}

interface Lawyer {
  id: string;
  email: string;
  full_name: string;
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_see_business_stats?: boolean;
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
    can_see_business_stats: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize permissions when lawyer changes
  if (lawyer && !permissions.can_create_agents && !permissions.can_create_blogs) {
    setPermissions({
      can_create_agents: lawyer.can_create_agents,
      can_create_blogs: lawyer.can_create_blogs,
      can_see_business_stats: lawyer.can_see_business_stats || false
    });
  }

  const handleSave = async () => {
    if (!lawyer) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('lawyer_tokens')
        .update({
          can_create_agents: permissions.can_create_agents,
          can_create_blogs: permissions.can_create_blogs
        })
        .eq('lawyer_id', lawyer.id);

      if (error) {
        console.error('Error updating permissions:', error);
        toast({
          title: "Error",
          description: "No se pudieron actualizar los permisos del abogado",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${lawyer.full_name} han sido actualizados correctamente`,
      });

      onPermissionsUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
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
      key: 'can_see_business_stats' as keyof LawyerPermissions,
      label: 'Ver Estadísticas de Negocio',
      description: 'Permite al abogado acceder a las estadísticas del sistema',
      icon: BarChart3,
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
            <Badge variant={lawyer.active ? "default" : "secondary"}>
              {lawyer.active ? "Activo" : "Inactivo"}
            </Badge>
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