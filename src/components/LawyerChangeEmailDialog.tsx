import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, AlertCircle } from 'lucide-react';
import { useLawyerAuth } from '@/hooks/useLawyerAuth';
import { useToast } from '@/hooks/use-toast';

interface LawyerChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LawyerChangeEmailDialog({ open, onOpenChange }: LawyerChangeEmailDialogProps) {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { updateEmail } = useLawyerAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmail || !confirmEmail) {
      setErrorMessage('Por favor completa todos los campos');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    if (newEmail !== confirmEmail) {
      setErrorMessage('Los emails no coinciden');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const success = await updateEmail(newEmail);
      
      if (success) {
        toast({
          title: "Email actualizado",
          description: "Se ha enviado un enlace de confirmación a tu nuevo email. Por favor, verifica tu bandeja de entrada.",
          duration: 6000,
        });
        onOpenChange(false);
        setNewEmail('');
        setConfirmEmail('');
      } else {
        setErrorMessage('Error al actualizar el email. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Change email error:', error);
      setErrorMessage('Error de conexión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Cambiar Email
          </DialogTitle>
          <DialogDescription>
            Ingresa tu nuevo email. Te enviaremos un enlace de confirmación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="newEmail">Nuevo Email</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nuevo.email@ejemplo.com"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmEmail">Confirmar Email</Label>
              <Input
                id="confirmEmail"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder="nuevo.email@ejemplo.com"
                disabled={isLoading}
                required
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Importante: Deberás confirmar el cambio de email haciendo clic en el enlace que te enviaremos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Email'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
