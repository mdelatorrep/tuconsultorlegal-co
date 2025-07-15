import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, FileText, User, Mail, Bot } from "lucide-react";
import { toast } from "sonner";

interface DocumentFormFlowProps {
  agentId: string;
  onBack: () => void;
  onComplete: (token: string) => void;
}

interface PlaceholderField {
  field: string;
  description: string;
  type?: string;
  required?: boolean;
}

interface AgentData {
  id: string;
  name: string;
  document_name: string;
  placeholder_fields: any;
  template_content: string;
  final_price: number | null;
  suggested_price: number;
  sla_hours: number | null;
}

export default function DocumentFormFlow({ agentId, onBack, onComplete }: DocumentFormFlowProps) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [additionalClause, setAdditionalClause] = useState('');
  const [needsAdditionalClause, setNeedsAdditionalClause] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingClause, setProcessingClause] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      setAgent({
        ...data,
        placeholder_fields: Array.isArray(data.placeholder_fields) ? data.placeholder_fields : []
      });
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Error al cargar el agente');
    } finally {
      setLoading(false);
    }
  };

  const processAdditionalClause = async () => {
    if (!additionalClause.trim() || !agent) return;

    setProcessingClause(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-clause-ai', {
        body: {
          clause: additionalClause,
          document_type: agent.document_name,
          context: formData
        }
      });

      if (error) throw error;
      
      setAdditionalClause(data.improvedClause);
      toast.success('Cláusula mejorada con IA');
    } catch (error) {
      console.error('Error processing clause:', error);
      toast.error('Error al procesar la cláusula');
    } finally {
      setProcessingClause(false);
    }
  };

  const createDocumentToken = async () => {
    if (!agent) return;

    setCreating(true);
    try {
      // Prepare document content with form data and additional clause
      let documentContent = agent.template_content;
      
      // Replace placeholders with form data
      Object.entries(formData).forEach(([key, value]) => {
        documentContent = documentContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      // Add additional clause if provided
      if (additionalClause.trim()) {
        documentContent += `\n\nCLÁUSULA ADICIONAL:\n${additionalClause}`;
      }

      const { data, error } = await supabase.functions.invoke('create-document-token', {
        body: {
          document_content: documentContent,
          document_type: agent.document_name,
          user_email: userInfo.email,
          user_name: userInfo.name,
          sla_hours: agent.sla_hours || 4
        }
      });

      if (error) throw error;

      toast.success('Documento creado exitosamente');
      onComplete(data.token);
    } catch (error) {
      console.error('Error creating document token:', error);
      toast.error('Error al crear el documento');
    } finally {
      setCreating(false);
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">Error: No se pudo cargar el agente</p>
        <Button onClick={onBack} className="mt-4">Volver</Button>
      </div>
    );
  }

  const placeholderFields = agent.placeholder_fields || [];
  const totalSteps = placeholderFields.length + 2; // placeholders + additional clause + user info

  // Step: Placeholder fields
  if (currentStep < placeholderFields.length) {
    const currentField = placeholderFields[currentStep];
    
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-2">
                  Paso {currentStep + 1} de {totalSteps}
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {agent.document_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor={currentField.field} className="text-lg font-medium">
                {currentField.description}
              </Label>
              {currentField.type === 'textarea' ? (
                <Textarea
                  id={currentField.field}
                  value={formData[currentField.field] || ''}
                  onChange={(e) => updateFormData(currentField.field, e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              ) : (
                <Input
                  id={currentField.field}
                  type={currentField.type || 'text'}
                  value={formData[currentField.field] || ''}
                  onChange={(e) => updateFormData(currentField.field, e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
            
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={nextStep}
                disabled={currentField.required && !formData[currentField.field]?.trim()}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: Additional clause
  if (currentStep === placeholderFields.length) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground mb-2">
                  Paso {currentStep + 1} de {totalSteps}
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              ¿Necesitas alguna cláusula adicional?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {needsAdditionalClause === null && (
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  ¿Te gustaría agregar alguna cláusula especial o condición adicional a tu documento?
                </p>
                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setNeedsAdditionalClause(false)}
                    className="flex-1"
                  >
                    No, continuar
                  </Button>
                  <Button
                    onClick={() => setNeedsAdditionalClause(true)}
                    className="flex-1"
                  >
                    Sí, agregar cláusula
                  </Button>
                </div>
              </div>
            )}

            {needsAdditionalClause && (
              <div className="space-y-4">
                <Label htmlFor="additional-clause">
                  Describe la cláusula adicional que necesitas
                </Label>
                <Textarea
                  id="additional-clause"
                  value={additionalClause}
                  onChange={(e) => setAdditionalClause(e.target.value)}
                  placeholder="Ejemplo: Quiero incluir una cláusula de confidencialidad..."
                  rows={4}
                />
                <Button
                  variant="outline"
                  onClick={processAdditionalClause}
                  disabled={!additionalClause.trim() || processingClause}
                  className="w-full"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  {processingClause ? 'Mejorando con IA...' : 'Mejorar con IA'}
                </Button>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={nextStep}
                disabled={needsAdditionalClause === null}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step: User information
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-2">
                Paso {currentStep + 1} de {totalSteps}
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Información de contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-name">Nombre completo</Label>
              <Input
                id="user-name"
                value={userInfo.name}
                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Tu nombre completo"
              />
            </div>
            <div>
              <Label htmlFor="user-email">Correo electrónico</Label>
              <Input
                id="user-email"
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-medium mb-2">Resumen del documento:</h4>
            <p className="text-sm text-muted-foreground mb-2">{agent.document_name}</p>
            <p className="text-lg font-bold text-success">
              Precio: ${(agent.final_price || agent.suggested_price).toLocaleString()} COP
            </p>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            <Button
              onClick={createDocumentToken}
              disabled={!userInfo.name.trim() || !userInfo.email.trim() || creating}
            >
              {creating ? 'Creando...' : 'Crear Documento'}
              <FileText className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}