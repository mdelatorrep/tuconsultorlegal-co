import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Unlock, AlertTriangle } from 'lucide-react';

interface AdminUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onSuccess: () => void;
}

export default function AdminUnlockDialog({ open, onOpenChange, email, onSuccess }: AdminUnlockDialogProps) {
  const [secretKey, setSecretKey] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async () => {
    if (!secretKey.trim()) {
      setError('Por favor ingresa la clave de emergencia');
      return;
    }

    setIsUnlocking(true);
    setError('');

    try {
      console.log('Attempting to unlock admin account via edge function...');
      
      const { data, error: functionError } = await supabase.functions.invoke('unlock-admin', {
        body: {
          email: email,
          secret_key: secretKey.trim()
        }
      });

      if (functionError) {
        console.error('Edge function error:', functionError);
        setError('Error al conectar con el servicio de desbloqueo');
        return;
      }

      if (data?.error) {
        console.error('Unlock error:', data.error);
        setError(data.error);
        return;
      }

      if (data?.success) {
        console.log('Account unlocked successfully');
        onSuccess();
        onOpenChange(false);
        setSecretKey('');
      } else {
        setError('Respuesta inesperada del servidor');
      }

    } catch (error) {
      console.error('Unlock admin error:', error);
      setError('Error inesperado. Intenta nuevamente.');
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            Desbloqueo de Emergencia
          </DialogTitle>
          <DialogDescription>
            La cuenta de administrador está temporalmente bloqueada. Use la clave de emergencia para desbloquear.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Email:</strong> {email}<br />
              <strong>Clave requerida:</strong> UNLOCK_ADMIN_2025_SECURE_KEY
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Clave de Emergencia</Label>
            <Input
              id="secret-key"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Ingresa la clave de emergencia"
              disabled={isUnlocking}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUnlocking}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUnlock}
              disabled={isUnlocking}
            >
              {isUnlocking ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Desbloqueando...
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Desbloquear Cuenta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}