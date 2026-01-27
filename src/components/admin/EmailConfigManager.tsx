import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Eye, Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface EmailConfig {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_from_name: string;
  smtp_from_email: string;
  is_active: boolean;
}

interface EmailTemplate {
  id: string;
  template_key: string;
  template_name: string;
  subject: string;
  html_body: string;
  variables: any;
  is_active: boolean;
}

interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_type: string;
  template_key: string;
  subject: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

export function EmailConfigManager() {
  const { toast } = useToast();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
    loadTemplates();
    loadLogs();
  }, []);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from('email_configuration')
      .select('*')
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive"
      });
      return;
    }

    setConfig(data);
  };

  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('template_name');

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las plantillas",
        variant: "destructive"
      });
      return;
    }

    setTemplates(data || []);
  };

  const loadLogs = async () => {
    const { data, error } = await supabase
      .from('email_notifications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los logs",
        variant: "destructive"
      });
      return;
    }

    setLogs(data || []);
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    setLoading(true);
    const { error } = await supabase
      .from('email_configuration')
      .update({
        smtp_from_name: config.smtp_from_name,
        smtp_from_email: config.smtp_from_email,
        is_active: config.is_active
      })
      .eq('id', config.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Guardado",
      description: "Configuración actualizada correctamente"
    });
  };

  const handleTestEmail = async () => {
    if (!config?.smtp_from_email) return;

    setLoading(true);
    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: config.smtp_from_email,
        subject: 'Email de Prueba - Praxis Hub',
        html: '<h1>¡Funciona!</h1><p>Este es un email de prueba del sistema de notificaciones de Praxis Hub.</p>',
        recipient_type: 'admin'
      }
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el email de prueba",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Enviado",
      description: "Email de prueba enviado correctamente"
    });
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: selectedTemplate.subject,
        html_body: selectedTemplate.html_body,
        is_active: selectedTemplate.is_active
      })
      .eq('id', selectedTemplate.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la plantilla",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Guardado",
      description: "Plantilla actualizada correctamente"
    });
    loadTemplates();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fallido</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
    }
  };

  if (!config) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-6 h-6" />
        <h1 className="text-2xl font-bold">Configuración de Email</h1>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuración SMTP</TabsTrigger>
          <TabsTrigger value="templates">Plantillas</TabsTrigger>
          <TabsTrigger value="logs">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servidor SMTP</CardTitle>
              <CardDescription>Configuración del servidor de correo electrónico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Servidor</Label>
                  <Input value={config.smtp_host} disabled />
                </div>
                <div>
                  <Label>Puerto</Label>
                  <Input value={config.smtp_port} disabled />
                </div>
              </div>

              <div>
                <Label>Usuario</Label>
                <Input value={config.smtp_user} disabled />
              </div>

              <div>
                <Label>Nombre del Remitente</Label>
                <Input
                  value={config.smtp_from_name}
                  onChange={(e) => setConfig({ ...config, smtp_from_name: e.target.value })}
                />
              </div>

              <div>
                <Label>Email del Remitente</Label>
                <Input
                  value={config.smtp_from_email}
                  onChange={(e) => setConfig({ ...config, smtp_from_email: e.target.value })}
                  type="email"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveConfig} disabled={loading}>
                  Guardar Configuración
                </Button>
                <Button onClick={handleTestEmail} disabled={loading} variant="outline">
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email de Prueba
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Plantillas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded cursor-pointer hover:bg-accent ${
                      selectedTemplate?.id === template.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="font-medium">{template.template_name}</div>
                    <div className="text-sm text-muted-foreground">{template.template_key}</div>
                    {template.is_active && <Badge className="mt-1">Activa</Badge>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Editor de Plantilla</CardTitle>
                {selectedTemplate && (
                  <CardDescription>
                    Variables disponibles: {Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables.join(', ') : ''}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedTemplate ? (
                  <>
                    <div>
                      <Label>Asunto</Label>
                      <Input
                        value={selectedTemplate.subject}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Cuerpo HTML</Label>
                      <Textarea
                        value={selectedTemplate.html_body}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, html_body: e.target.value })}
                        rows={15}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSaveTemplate} disabled={loading}>
                        Guardar Plantilla
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Selecciona una plantilla para editar
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Historial de Notificaciones</CardTitle>
                <Button onClick={loadLogs} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.created_at).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell><Badge variant="outline">{log.recipient_type}</Badge></TableCell>
                      <TableCell className="text-sm">{log.template_key}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
