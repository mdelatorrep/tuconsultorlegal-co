import { toast } from '@/hooks/use-toast';

export interface AdminError {
  message: string;
  code?: string;
  details?: any;
}

export const handleAdminError = (error: any, operation: string = 'operación', logout?: () => void) => {
  console.error(`Error in ${operation}:`, error);
  
  const errorMessage = error?.message || error?.error || 'Error desconocido';
  
  // Handle authentication/session errors
  if (errorMessage.includes('session') || 
      errorMessage.includes('token') || 
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('authentication failed')) {
    toast({
      title: "Sesión expirada",
      description: "Tu sesión de administrador ha expirado. Serás redirigido al login.",
      variant: "destructive"
    });
    if (logout) logout();
    return;
  }
  
  // Handle permission errors
  if (errorMessage.includes('permission denied') || 
      errorMessage.includes('insufficient privileges') ||
      errorMessage.includes('access denied')) {
    toast({
      title: "Sin permisos suficientes",
      description: `No tienes permisos para realizar esta ${operation}. Verifica tu nivel de acceso.`,
      variant: "destructive"
    });
    return;
  }
  
  // Handle network connectivity errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('connectivity') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')) {
    toast({
      title: "Error de conectividad",
      description: "Problema de conexión con el servidor. Verifica tu internet e intenta nuevamente.",
      variant: "destructive"
    });
    return;
  }
  
  // Handle specific entity not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    toast({
      title: "Recurso no encontrado",
      description: `El elemento que intentas acceder no existe o fue eliminado.`,
      variant: "destructive"
    });
    return;
  }
  
  // Handle account locked errors
  if (errorMessage.includes('Account temporarily locked') || errorMessage.includes('locked until')) {
    toast({
      title: "Cuenta bloqueada",
      description: "La cuenta está temporalmente bloqueada. Usa la función de desbloqueo de emergencia.",
      variant: "destructive"
    });
    return;
  }
  
  // Handle validation errors
  if (errorMessage.includes('validation') || 
      errorMessage.includes('invalid') ||
      errorMessage.includes('required')) {
    toast({
      title: "Datos inválidos",
      description: "Los datos proporcionados no son válidos. Verifica la información e intenta nuevamente.",
      variant: "destructive"
    });
    return;
  }
  
  // Handle server errors (5xx)
  if (errorMessage.includes('500') || 
      errorMessage.includes('internal server error') ||
      errorMessage.includes('service unavailable')) {
    toast({
      title: "Error del servidor",
      description: "El servidor está experimentando problemas. Intenta nuevamente en unos momentos.",
      variant: "destructive"
    });
    return;
  }
  
  // Handle rate limiting
  if (errorMessage.includes('rate limit') || 
      errorMessage.includes('too many requests') ||
      errorMessage.includes('too many attempts')) {
    toast({
      title: "Demasiadas solicitudes",
      description: "Has excedido el límite de solicitudes. Espera unos minutos antes de intentar nuevamente.",
      variant: "destructive"
    });
    return;
  }
  
  // Generic error fallback
  toast({
    title: `Error en ${operation}`,
    description: errorMessage.length > 100 
      ? "Ocurrió un error inesperado. Intenta nuevamente o contacta al soporte técnico."
      : errorMessage,
    variant: "destructive"
  });
};

// Specialized error handlers for common operations
export const handleLoginError = (error: any, setShowUnlockDialog?: (show: boolean) => void) => {
  const errorMessage = error?.message || 'Error de autenticación';
  
  if (errorMessage.includes('Account temporarily locked')) {
    if (setShowUnlockDialog) {
      setShowUnlockDialog(true);
    }
    return 'Cuenta temporalmente bloqueada';
  }
  
  if (errorMessage.includes('Too many attempts')) {
    return 'Demasiados intentos de acceso. Espera antes de intentar nuevamente.';
  }
  
  if (errorMessage.includes('Invalid credentials')) {
    return 'Credenciales incorrectas. Verifica tu email y contraseña.';
  }
  
  if (errorMessage.includes('Account not found')) {
    return 'No existe una cuenta de administrador con este email.';
  }
  
  if (errorMessage.includes('Account inactive')) {
    return 'Cuenta de administrador desactivada. Contacta al administrador del sistema.';
  }
  
  if (errorMessage.includes('Connection error') || errorMessage.includes('network')) {
    return 'Error de conectividad. Verifica tu conexión a internet.';
  }
  
  return 'Error de autenticación. Intenta nuevamente.';
};

export const handleDataLoadError = (error: any, dataType: string) => {
  const errorMessage = error?.message || 'Error al cargar datos';
  
  if (errorMessage.includes('permission denied') || errorMessage.includes('insufficient privileges')) {
    return `Sin permisos para cargar ${dataType}. Tu sesión expiró o no tienes permisos suficientes.`;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Error de conectividad. No se pudo conectar con el servidor.';
  }
  
  return `No se pudieron cargar los datos de ${dataType}. Intenta nuevamente.`;
};