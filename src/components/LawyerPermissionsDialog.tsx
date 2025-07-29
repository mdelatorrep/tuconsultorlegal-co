import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot, BookOpen, BarChart3, Save, X, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LawyerPermissions {
  can_create_agents: boolean;
  can_create_blogs: boolean;
  can_use_ai_tools: boolean;
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
    can_use_ai_tools: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize permissions when lawyer changes
  useEffect(() => {
    if (lawyer) {
      setPermissions({
        can_create_agents: lawyer.can_create_agents ?? false,
        can_create_blogs: lawyer.can_create_blogs ?? false,
        can_use_ai_tools: lawyer.can_use_ai_tools ?? false
      });
    }
  }, [lawyer]);

  const handleSave = async () => {
    if (!lawyer) return;

    console.log('=== STARTING PERMISSION UPDATE ===');
    console.log('Lawyer ID:', lawyer.id);
    console.log('Permissions to update:', permissions);
    console.log('Auth headers provided:', authHeaders);
    
    setIsLoading(true);
    try {
      // En lugar de usar el cliente de Supabase directo, hacer una llamada HTTP directa
      // usando los headers de autenticación del admin
      const response = await fetch(
        `https://tkaezookvtpulfpaffes.supabase.co/rest/v1/lawyer_profiles?id=eq.${lawyer.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYWV6b29rdnRwdWxmcGFmZmVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3NzEwNzUsImV4cCI6MjA2NzM0NzA3NX0.j7fSfaXMqwmytVuXIU4_miAbn-v65b5x0ncRr0K-CNE',
            'prefer': 'return=representation',
            ...authHeaders
          },
          body: JSON.stringify({
            can_create_agents: permissions.can_create_agents,
            can_create_blogs: permissions.can_create_blogs,
            can_use_ai_tools: permissions.can_use_ai_tools
          })
        }
      );

      console.log('=== HTTP RESPONSE ===');
      console.log('Status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('HTTP Error updating lawyer_profiles:', data);
        toast({
          title: "Error",
          description: `Error: ${response.statusText} - ${JSON.stringify(data)}`,
          variant: "destructive"
        });
        return;
      }

      console.log('=== UPDATE SUCCESSFUL ===');
      console.log('Response data:', data);

      // Verificar directamente en la base de datos que se actualizó
      console.log('=== VERIFYING UPDATE IN DATABASE ===');
      const { data: verificationData, error: verificationError } = await supabase
        .from('lawyer_profiles')
        .select('id, can_create_agents, can_create_blogs, can_use_ai_tools, updated_at')
        .eq('id', lawyer.id)
        .single();
      
      console.log('Database verification:', verificationData);
      console.log('Verification error:', verificationError);

      toast({
        title: "Permisos actualizados",
        description: `Los permisos de ${lawyer.full_name} han sido actualizados correctamente`,
      });

      console.log('=== CALLING onPermissionsUpdated ===');
      onPermissionsUpdated();
      console.log('=== CALLING onClose ===');
      onClose();
    } catch (error) {
      console.error('=== CATCH ERROR ===', error);
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive"
      });
    } finally {
      console.log('=== FINALLY BLOCK ===');
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