import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, UserPlus } from 'lucide-react';

interface UserInvitationDialogProps {
  trigger?: React.ReactNode;
}

export const UserInvitationDialog: React.FC<UserInvitationDialogProps> = ({ trigger }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [userType, setUserType] = useState<'user' | 'lawyer'>('user');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !fullName) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Create a temporary password (user will set their own via email)
      const temporaryPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password: temporaryPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            is_lawyer: userType === 'lawyer',
            invited: true
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('Este email ya está registrado');
        } else {
          throw error;
        }
        return;
      }

      // Send password reset email so user can set their own password
      if (data.user) {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      }

      toast.success('Invitación enviada', {
        description: `${fullName} recibirá un correo para configurar su cuenta`
      });
      
      setEmail('');
      setFullName('');
      setUserType('user');
      setOpen(false);
    } catch (error: any) {
      toast.error('Error al enviar invitación', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Invitar Usuario
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Invitar Nuevo Usuario
          </DialogTitle>
          <DialogDescription>
            Envía una invitación para que un nuevo usuario se una a la plataforma.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Nombre completo</Label>
            <Input
              id="invite-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invite-email">Correo electrónico</Label>
            <div className="relative">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@ejemplo.com"
                required
                className="pl-10"
              />
              <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-type">Tipo de usuario</Label>
            <Select value={userType} onValueChange={(value: 'user' | 'lawyer') => setUserType(value)}>
              <SelectTrigger id="user-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario Regular</SelectItem>
                <SelectItem value="lawyer">Abogado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
