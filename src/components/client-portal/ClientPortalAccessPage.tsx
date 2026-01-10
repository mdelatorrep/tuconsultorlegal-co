import { useParams } from 'react-router-dom';
import { ClientPortalPage } from './ClientPortalPage';

export function ClientPortalAccessPage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Enlace Inválido</h1>
          <p className="text-muted-foreground">
            El enlace de acceso al portal no es válido. Por favor, solicita un nuevo enlace a tu abogado.
          </p>
        </div>
      </div>
    );
  }

  return <ClientPortalPage accessToken={token} />;
}
