import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Monitor, Shield, Settings, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LogRocketConfigProps {
  onConfigSave?: (config: any) => void;
}

export const LogRocketConfig: React.FC<LogRocketConfigProps> = ({ onConfigSave }) => {
  const [appId, setAppId] = useState('');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [enableConsoleCapture, setEnableConsoleCapture] = useState(true);
  const [enableNetworkCapture, setEnableNetworkCapture] = useState(true);
  const [enableErrorCapture, setEnableErrorCapture] = useState(true);
  const [captureIP, setCaptureIP] = useState(false);
  const { toast } = useToast();

  const handleSaveConfig = () => {
    if (!appId.trim()) {
      toast({
        title: "Error de configuración",
        description: "Por favor ingresa tu App ID de LogRocket",
        variant: "destructive"
      });
      return;
    }

    const config = {
      appId: appId.trim(),
      environment,
      enableConsoleCapture,
      enableNetworkCapture,
      enableErrorCapture,
      captureIP
    };

    // Save to localStorage for persistence
    localStorage.setItem('logrocket-config', JSON.stringify(config));
    
    toast({
      title: "Configuración guardada",
      description: "La configuración de LogRocket se ha guardado correctamente",
    });

    if (onConfigSave) {
      onConfigSave(config);
    }
  };

  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem('logrocket-config');
      if (saved) {
        const config = JSON.parse(saved);
        setAppId(config.appId || '');
        setEnvironment(config.environment || 'production');
        setEnableConsoleCapture(config.enableConsoleCapture ?? true);
        setEnableNetworkCapture(config.enableNetworkCapture ?? true);
        setEnableErrorCapture(config.enableErrorCapture ?? true);
        setCaptureIP(config.captureIP ?? false);
      }
    } catch (error) {
      console.error('Error loading LogRocket config:', error);
    }
  };

  React.useEffect(() => {
    loadSavedConfig();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Monitor className="h-8 w-8 text-primary mr-3" />
          <h1 className="text-3xl font-bold">Configuración LogRocket</h1>
        </div>
        <p className="text-muted-foreground">
          Configura el monitoreo de experiencia de usuario para Tu Consultor Legal
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Información importante:</strong> LogRocket captura sesiones de usuario con fines de debugging y mejora de UX. 
          Toda la información sensible se sanitiza automáticamente antes del envío.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Configuración Básica
          </CardTitle>
          <CardDescription>
            Configuración principal para la integración con LogRocket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="appId">App ID de LogRocket</Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="ej: abc123/tu-app-id"
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground">
              Encuentra tu App ID en el dashboard de LogRocket en Settings → Application
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as any)}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="production">Producción</option>
              <option value="staging">Staging</option>
              <option value="development">Desarrollo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Configuración de Captura
          </CardTitle>
          <CardDescription>
            Controla qué información se captura en las sesiones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Captura de Consola</Label>
              <p className="text-sm text-muted-foreground">
                Capturar logs, errores y warnings de consola
              </p>
            </div>
            <Switch
              checked={enableConsoleCapture}
              onCheckedChange={setEnableConsoleCapture}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Captura de Red</Label>
              <p className="text-sm text-muted-foreground">
                Capturar requests HTTP y respuestas (datos sensibles se sanitizan)
              </p>
            </div>
            <Switch
              checked={enableNetworkCapture}
              onCheckedChange={setEnableNetworkCapture}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Captura de Errores</Label>
              <p className="text-sm text-muted-foreground">
                Capturar errores JavaScript automáticamente
              </p>
            </div>
            <Switch
              checked={enableErrorCapture}
              onCheckedChange={setEnableErrorCapture}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Capturar IP</Label>
              <p className="text-sm text-muted-foreground">
                <span className="text-destructive">⚠️ Deshabilitado por defecto para cumplir GDPR</span>
              </p>
            </div>
            <Switch
              checked={captureIP}
              onCheckedChange={setCaptureIP}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características de Monitoreo Legal</CardTitle>
          <CardDescription>
            Funcionalidades específicas para plataformas legales implementadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Seguimiento de Documentos", desc: "Generación y descarga de documentos legales" },
              { name: "Consultas con IA", desc: "Interacciones con asesores legales especializados" },
              { name: "Flujo de Pagos", desc: "Proceso completo de pagos con Bold" },
              { name: "Sesiones de Chat", desc: "Conversaciones con Lexi y advisors" },
              { name: "Sanitización de Datos", desc: "Protección automática de información sensible" },
              { name: "Tracking GDPR", desc: "Cumplimiento de regulaciones de privacidad" }
            ].map((feature, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{feature.name}</p>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={handleSaveConfig} size="lg" className="px-8">
          <Settings className="h-4 w-4 mr-2" />
          Guardar Configuración
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Próximos pasos:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Obtén tu App ID desde <a href="https://app.logrocket.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">app.logrocket.com</a></li>
            <li>Configura la URL de tu dominio en LogRocket</li>
            <li>Guarda la configuración arriba</li>
            <li>LogRocket se activará automáticamente en producción</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default LogRocketConfig;