import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface ChangeEmailDialogProps {
  onChangeEmail: (newEmail: string) => Promise<{ error: Error | null }>;
  trigger?: React.ReactNode;
}

export const ChangeEmailDialog: React.FC<ChangeEmailDialogProps> = ({ onChangeEmail, trigger }) => {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Por favor ingresa un email válido');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await onChangeEmail(newEmail);

      if (error) {
        toast.error('Error al solicitar cambio de email: ' + error.message);
      } else {
        toast.success('Confirmación enviada', {
          description: 'Revisa tu nuevo correo para confirmar el cambio.',
        });
        setOpen(false);
        setNewEmail('');
      }
    } catch (error: any) {
      toast.error('Error inesperado: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Cambiar Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Correo Electrónico</DialogTitle>
          <DialogDescription>
            Ingresa tu nuevo correo electrónico. Recibirás un email de confirmación en la nueva dirección.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Nuevo Correo Electrónico</Label>
            <div className="relative">
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo@email.com"
                required
                disabled={isLoading}
                className="pl-10"
              />
              <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Solicitar Cambio'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
