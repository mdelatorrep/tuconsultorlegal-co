import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, FileText, User, Bot } from "lucide-react";
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

interface FieldGroup {
  name: string;
  description: string;
  fields: number[];
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
  ai_prompt: string;
}

export default function DocumentFormFlow({ agentId, onBack, onComplete }: DocumentFormFlowProps) {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentFieldInGroup, setCurrentFieldInGroup] = useState(0);
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([]);
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [userInfo, setUserInfo] = useState({ name: '', email: '' });
  const [additionalClause, setAdditionalClause] = useState('');
  const [needsAdditionalClause, setNeedsAdditionalClause] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [processingClause, setProcessingClause] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAgent();
    // Load any previous chat session data
    loadPreviousSessionData();
  }, [agentId]);

  const loadPreviousSessionData = () => {
    const sessionData = localStorage.getItem(`document_session_${agentId}`);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (parsed.extractedFormData && Object.keys(parsed.extractedFormData).length > 0) {
          setFormData(prev => ({ ...prev, ...parsed.extractedFormData }));
          toast.success('Se cargaron datos de tu sesión anterior');
        }
      } catch (error) {
        console.error('Error loading session data:', error);
      }
    }
  };

  const loadAgent = async () => {
    try {
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) throw error;
      const agentData = {
        ...data,
        placeholder_fields: Array.isArray(data.placeholder_fields) ? data.placeholder_fields : []
      };
      setAgent(agentData);
      
      // Organize fields into groups using AI
      if (agentData.placeholder_fields.length > 0) {
        await organizeFieldGroups(agentData.placeholder_fields as unknown as PlaceholderField[], agentData.ai_prompt);
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      toast.error('Error al cargar el agente');
    } finally {
      setLoading(false);
    }
  };

  const organizeFieldGroups = async (placeholderFields: PlaceholderField[], aiPrompt: string) => {
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase.functions.invoke('organize-form-groups', {
        body: {
          placeholder_fields: placeholderFields,
          ai_prompt: aiPrompt
        }
      });

      if (error) throw error;
      
      setFieldGroups(data.groups || []);
    } catch (error) {
      console.error('Error organizing field groups:', error);
      // Fallback: create a single group with all fields
      setFieldGroups([{
        name: "Información del Documento",
        description: "Completa todos los campos requeridos",
        fields: placeholderFields.map((_, index) => index)
      }]);
    } finally {
      setLoadingGroups(false);
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

  const nextField = () => {
    const currentGroup = fieldGroups[currentGroupIndex];
    if (currentFieldInGroup < currentGroup.fields.length - 1) {
      setCurrentFieldInGroup(prev => prev + 1);
    } else if (currentGroupIndex < fieldGroups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentFieldInGroup(0);
    }
  };

  const prevField = () => {
    if (currentFieldInGroup > 0) {
      setCurrentFieldInGroup(prev => prev - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      const prevGroup = fieldGroups[currentGroupIndex - 1];
      setCurrentFieldInGroup(prevGroup.fields.length - 1);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCurrentStep = () => {
    let step = 0;
    for (let i = 0; i < currentGroupIndex; i++) {
      step += fieldGroups[i].fields.length;
    }
    return step + currentFieldInGroup + 1;
  };

  const getTotalFieldSteps = () => {
    return fieldGroups.reduce((total, group) => total + group.fields.length, 0);
  };

  if (loading || loadingGroups) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {loading ? 'Cargando agente...' : 'Organizando preguntas...'}
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-destructive mb-4">Error: No se pudo cargar el agente</p>
          <Button onClick={onBack}>Volver</Button>
        </div>
      </div>
    );
  }

  const placeholderFields = agent.placeholder_fields || [];
  const totalSteps = getTotalFieldSteps() + 2; // field groups + additional clause + user info
  
  // Check if we're in the field groups phase
  const isInFieldGroups = currentGroupIndex < fieldGroups.length;
  
  // Step: Field groups
  if (isInFieldGroups && fieldGroups.length > 0) {
    const currentGroup = fieldGroups[currentGroupIndex];
    const fieldIndex = currentGroup.fields[currentFieldInGroup];
    const currentField = placeholderFields[fieldIndex];
    
    if (!currentField) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-destructive mb-4">Error: Campo no encontrado</p>
            <Button onClick={onBack}>Volver</Button>
          </div>
        </div>
      );
    }
    
    const isFirstField = currentGroupIndex === 0 && currentFieldInGroup === 0;
    const isLastFieldInGroup = currentFieldInGroup === currentGroup.fields.length - 1;
    const isLastGroup = currentGroupIndex === fieldGroups.length - 1;
    
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    Paso {getCurrentStep()} de {totalSteps}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(getCurrentStep() / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-primary mb-1">
                  {currentGroup.name}
                </div>
                <CardTitle className="text-lg leading-tight">
                  {currentField.description}
                </CardTitle>
                {currentGroup.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentGroup.description}
                  </p>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {currentField.type === 'textarea' ? (
                  <Textarea
                    id={currentField.field}
                    value={formData[currentField.field] || ''}
                    onChange={(e) => updateFormData(currentField.field, e.target.value)}
                    placeholder={`Ingresa ${currentField.description?.toLowerCase() || 'la información'}`}
                    rows={4}
                    className="text-base"
                  />
                ) : (
                  <Input
                    id={currentField.field}
                    type={currentField.type || 'text'}
                    value={formData[currentField.field] || ''}
                    onChange={(e) => updateFormData(currentField.field, e.target.value)}
                    placeholder={`Ingresa ${currentField.description?.toLowerCase() || 'la información'}`}
                    className="text-base"
                  />
                )}
              </div>
              
              {/* Progress indicator for fields in current group */}
              <div className="flex gap-1 justify-center">
                {currentGroup.fields.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 w-4 rounded-full transition-colors ${
                      index === currentFieldInGroup ? 'bg-primary' : 
                      index < currentFieldInGroup ? 'bg-primary/60' : 'bg-secondary'
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={prevField}
                  disabled={isFirstField}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <Button
                  onClick={() => {
                    if (isLastFieldInGroup && isLastGroup) {
                      setCurrentGroupIndex(fieldGroups.length); // Move to additional clause step
                    } else {
                      nextField();
                    }
                  }}
                  disabled={currentField.required && !formData[currentField.field]?.trim()}
                  className="flex-1"
                >
                  {isLastFieldInGroup && isLastGroup ? 'Continuar' : 'Siguiente'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step: Additional clause
  if (currentGroupIndex === fieldGroups.length) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setCurrentGroupIndex(fieldGroups.length - 1)} className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground mb-1">
                    Paso {getTotalFieldSteps() + 1} de {totalSteps}
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((getTotalFieldSteps() + 1) / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="w-5 h-5" />
                ¿Cláusula adicional?
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {needsAdditionalClause === null && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    ¿Te gustaría agregar alguna cláusula especial o condición adicional a tu documento?
                  </p>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={() => setNeedsAdditionalClause(false)}
                      className="w-full"
                    >
                      No, continuar
                    </Button>
                    <Button
                      onClick={() => setNeedsAdditionalClause(true)}
                      className="w-full"
                    >
                      Sí, agregar cláusula
                    </Button>
                  </div>
                </div>
              )}

              {needsAdditionalClause && (
                <div className="space-y-4">
                  <Label htmlFor="additional-clause" className="text-sm font-medium">
                    Describe la cláusula adicional que necesitas
                  </Label>
                  <Textarea
                    id="additional-clause"
                    value={additionalClause}
                    onChange={(e) => setAdditionalClause(e.target.value)}
                    placeholder="Ejemplo: Quiero incluir una cláusula de confidencialidad..."
                    rows={4}
                    className="text-base"
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

              <div className="flex justify-between gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentGroupIndex(fieldGroups.length - 1);
                    setCurrentFieldInGroup(fieldGroups[fieldGroups.length - 1].fields.length - 1);
                  }}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentGroupIndex(fieldGroups.length + 1)}
                  disabled={needsAdditionalClause === null}
                  className="flex-1"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step: User information
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCurrentGroupIndex(fieldGroups.length)} className="shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">
                  Paso {totalSteps} de {totalSteps}
                </div>
                <div className="w-full bg-secondary rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all duration-300 w-full" />
                </div>
              </div>
            </div>
            
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5" />
              Información de contacto
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-name" className="text-sm font-medium">Nombre completo</Label>
                <Input
                  id="user-name"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Tu nombre completo"
                  className="mt-1 text-base"
                />
              </div>
              <div>
                <Label htmlFor="user-email" className="text-sm font-medium">Correo electrónico</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="tu@email.com"
                  className="mt-1 text-base"
                />
              </div>
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h4 className="font-medium mb-2 text-sm">Resumen del documento:</h4>
              <p className="text-sm text-muted-foreground mb-2">{agent.document_name}</p>
              <p className="text-base font-bold text-success">
                Precio: ${(agent.final_price || agent.suggested_price).toLocaleString()} COP
              </p>
            </div>

            <div className="flex justify-between gap-3">
              <Button 
                variant="outline" 
                onClick={() => setCurrentGroupIndex(fieldGroups.length)}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
              <Button
                onClick={createDocumentToken}
                disabled={!userInfo.name.trim() || !userInfo.email.trim() || creating}
                className="flex-1"
              >
                {creating ? 'Creando...' : 'Crear Documento'}
                <FileText className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}