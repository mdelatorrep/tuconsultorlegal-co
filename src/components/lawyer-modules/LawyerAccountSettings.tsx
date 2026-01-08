import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Shield, Calendar, BadgeCheck, Key, Settings } from 'lucide-react';
import { LawyerChangeEmailDialog } from '@/components/LawyerChangeEmailDialog';
import { LawyerChangePasswordDialog } from './LawyerChangePasswordDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LawyerAccountSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    colegiadoNumber?: string;
    isVerified?: boolean;
    createdAt?: string;
  };
}

export function LawyerAccountSettings({ user }: LawyerAccountSettingsProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  const memberSince = user.createdAt 
    ? format(new Date(user.createdAt), "d 'de' MMMM, yyyy", { locale: es })
    : 'No disponible';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configuración de Cuenta</h1>
          <p className="text-muted-foreground text-sm">Administra tu información personal y seguridad</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Tu información de perfil registrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="text-sm">Nombre completo</span>
                </div>
                <span className="font-medium">{user.name || 'No especificado'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Correo electrónico</span>
                </div>
                <span className="font-medium text-sm">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">Teléfono</span>
                </div>
                <span className="font-medium">{user.phone || 'No especificado'}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-sm">Número de colegiado</span>
                </div>
                <span className="font-medium">{user.colegiadoNumber || 'No especificado'}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Miembro desde</span>
                </div>
                <span className="font-medium text-sm">{memberSince}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seguridad y Acceso */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Seguridad y Acceso
            </CardTitle>
            <CardDescription>
              Gestiona tus credenciales de acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {/* Estado de verificación */}
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Estado de cuenta</span>
                <Badge variant={user.isVerified ? "default" : "secondary"}>
                  {user.isVerified ? 'Verificado' : 'Pendiente'}
                </Badge>
              </div>

              <Separator />

              {/* Cambiar correo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Correo electrónico</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowEmailDialog(true)}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Cambiar
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Cambiar contraseña */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Contraseña</p>
                    <p className="text-xs text-muted-foreground">••••••••••</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Cambiar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <LawyerChangeEmailDialog 
        open={showEmailDialog} 
        onOpenChange={setShowEmailDialog} 
      />
      <LawyerChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </div>
  );
}
