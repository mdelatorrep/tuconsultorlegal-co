import { useState, useEffect } from "react";
import OpenAIAgentDebug from "./OpenAIAgentDebug";
import DocumentPDFPreview from "./DocumentPDFPreview";
import { sanitizeHtml } from "@/utils/htmlSanitizer";
import RichTextTemplateEditor from "@/components/RichTextTemplateEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthManager } from "@/hooks/useAuthManager";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import UnifiedSidebar from "./UnifiedSidebar";
import { 
  ArrowLeft, 
  Edit, 
  Pause, 
  Play, 
  Trash2, 
  Eye,
  DollarSign,
  Calendar,
  User,
  FileText,
  Save,
  X,
  Plus,
  Settings,
  Wand2,
  AlertTriangle,
  Info,
  RefreshCw,
  Sparkles,
  Clock,
  Users,
  MessageSquare,
  CheckCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ConversationGuideBuilder } from "@/components/ConversationGuideBuilder";
import { FieldInstructionsManager } from "@/components/FieldInstructionsManager";

interface LegalAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  template_content: string;
  ai_prompt: string;
  placeholder_fields: any; // JSONB field from database
  price: number;
  price_justification: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  document_name: string | null;
  document_description: string | null;
  target_audience: string | null;
  button_cta: string | null;
  frontend_icon: string | null;
  sla_enabled: boolean;
  sla_hours: number;
  openai_enabled?: boolean;
}

interface AgentManagerPageProps {
  user: any;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
  lawyerData: any;
}

export default function AgentManagerPage({ user, currentView, onViewChange, onLogout, lawyerData }: AgentManagerPageProps) {
  const [agents, setAgents] = useState<LegalAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<LegalAgent | null>(null);
  const [editingAgent, setEditingAgent] = useState<LegalAgent | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const { getAuthHeadersAsync } = useAuthManager();

  // Detalles y Guía de Conversación
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [convBlocks, setConvBlocks] = useState<any[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [fieldInstructions, setFieldInstructions] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // AI Improvement states
  const [isImprovingDocInfo, setIsImprovingDocInfo] = useState(false);
  const [isImprovingTemplate, setIsImprovingTemplate] = useState(false);
  const [isReprocessingTemplate, setIsReprocessingTemplate] = useState(false);
  
  // Auto-save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Improvement suggestions
  const [docInfoSuggestions, setDocInfoSuggestions] = useState<any>(null);
  const [templateSuggestions, setTemplateSuggestions] = useState<any>(null);

  const fetchConversationBlocks = async (legalAgentId: string) => {
    setConvLoading(true);
    try {
      const [blocksResult, instructionsResult] = await Promise.all([
        supabase
          .from('conversation_blocks')
          .select('id, block_name, intro_phrase, placeholders, block_order')
          .eq('legal_agent_id', legalAgentId)
          .order('block_order', { ascending: true }),
        supabase
          .from('field_instructions')
          .select('id, field_name, validation_rule, help_text')
          .eq('legal_agent_id', legalAgentId)
      ]);

      if (blocksResult.error) {
        console.error('Error fetching conversation blocks:', blocksResult.error);
        setConvBlocks([]);
      } else {
        setConvBlocks(blocksResult.data || []);
      }

      if (instructionsResult.error) {
        console.error('Error fetching field instructions:', instructionsResult.error);
        setFieldInstructions([]);
      } else {
        setFieldInstructions(instructionsResult.data || []);
      }
    } catch (e) {
      console.error('Unexpected error loading conversation data:', e);
      setConvBlocks([]);
      setFieldInstructions([]);
    } finally {
      setConvLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('name')
        .eq('is_active', true)
        .in('category_type', ['document', 'both'])
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      const categoryNames = data?.map(cat => cat.name) || [];
      setCategories(categoryNames);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    if (selectedAgent?.id) {
      fetchConversationBlocks(selectedAgent.id);
    } else {
      setConvBlocks([]);
      setFieldInstructions([]);
    }
  }, [selectedAgent?.id]);

  useEffect(() => {
    fetchAgents();
    loadCategories();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      // Mostrar agentes en todos los estados: activos, pendientes y suspendidos
      const { data, error } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('created_by', lawyerData.id) // Usar el ID del lawyer profile directamente
        .in('status', ['active', 'pending_review', 'suspended']) // Incluir también suspendidos
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        toast({
          title: "Error al cargar agentes",
          description: "No se pudieron cargar los agentes creados.",
          variant: "destructive",
        });
        return;
      }

      setAgents((data || []) as LegalAgent[]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (agentId: string, newStatus: 'active' | 'suspended') => {
    // Verificar que el usuario sea admin
    if (!lawyerData.is_admin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden cambiar el estado de los agentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      const authHeaders = await getAuthHeadersAsync('lawyer');
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: {
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin,
          status: newStatus
        },
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al actualizar el estado del agente');
      }

      toast({
        title: "Estado actualizado",
        description: data.message || `El agente ha sido ${newStatus === 'active' ? 'activado' : 'suspendido'}.`,
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { ...agent, status: newStatus } : agent
      ));
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al actualizar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleApproveAgent = async (agentId: string) => {
    // Verificar que el usuario sea admin
    if (!lawyerData.is_admin) {
      toast({
        title: "Sin permisos",
        description: "Solo los administradores pueden aprobar agentes.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Intentar ambos tipos de autenticación
      const lawyerHeaders = await getAuthHeadersAsync('lawyer');
      const adminHeaders = await getAuthHeadersAsync('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      // Primero obtener los datos del agente para copiar el nombre
      const agent = agents.find(a => a.id === agentId);
      if (!agent) {
        throw new Error('Agente no encontrado');
      }

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: {
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin,
          status: 'approved',
          document_name: agent.name
        },
        headers: authHeaders
      });

      if (error) {
        console.error('Error updating agent:', error);
        throw error;
      }

      // Create OpenAI Agent after approval
      try {
        console.log('Creating OpenAI agent for approved agent:', agentId);
        const { data: openaiAgentResult, error: openaiError } = await supabase.functions.invoke('create-openai-agent', {
          body: {
            legal_agent_id: agentId,
            force_recreate: false
          }
        });

        if (openaiError) {
          console.error('Error creating OpenAI agent:', openaiError);
          toast({
            title: "Agente aprobado con advertencia",
            description: "El agente fue aprobado exitosamente, pero hubo un problema al configurar el agente de IA. Se puede configurar manualmente después.",
            variant: "destructive",
          });
        } else {
          console.log('OpenAI agent created successfully:', openaiAgentResult);
          toast({
            title: "¡Agente aprobado!",
            description: "El agente fue aprobado y el agente de IA fue creado correctamente.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Error creating OpenAI agent:', error);
        toast({
          title: "Agente aprobado con advertencia",
          description: "El agente fue aprobado exitosamente, pero hubo un error al configurar el agente de IA.",
          variant: "destructive",
        });
      }

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al aprobar el agente');
      }

      toast({
        title: "Agente aprobado",
        description: data.message || "El agente ha sido aprobado y está activo.",
      });

      // Update local state
      setAgents(agents.map(agent => 
        agent.id === agentId ? { 
          ...agent, 
          status: 'approved',
          price_approved_by: lawyerData.id,
          price_approved_at: new Date().toISOString()
        } : agent
      ));
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error inesperado al aprobar el agente.",
        variant: "destructive",
      });
    }
  };

  const handleEditAgent = async (agent: LegalAgent) => {
    // Los abogados pueden editar sus propios agentes
    
    // Extract current placeholders from template to ensure consistency
    const currentPlaceholders = extractPlaceholdersFromTemplate(agent.template_content || '');
    
    setEditingAgent({ 
      ...agent,
      // Ensure placeholder_fields is up-to-date with current template
      placeholder_fields: currentPlaceholders.length > 0 ? currentPlaceholders : agent.placeholder_fields,
      // Ensure all fields have default values
      sla_enabled: agent.sla_enabled ?? true,
      sla_hours: agent.sla_hours ?? 4,
      button_cta: agent.button_cta ?? 'Generar Documento',
      frontend_icon: agent.frontend_icon ?? 'FileText'
    });
    
    // Load conversation blocks and field instructions BEFORE opening dialog
    if (agent.id) {
      await fetchConversationBlocks(agent.id);
    }
    
    setIsEditDialogOpen(true);
  };

  const handleSaveAgent = async (silent = false) => {
    if (!editingAgent) return;
    
    // Validations
    if (!editingAgent.name?.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive"
      });
      return;
    }
    
    if (!editingAgent.template_content?.trim()) {
      toast({
        title: "Error",
        description: "La plantilla es obligatoria",
        variant: "destructive"
      });
      return;
    }
    
    // Validate placeholders
    const extractedPlaceholders = extractPlaceholdersFromTemplate(editingAgent.template_content);
    if (extractedPlaceholders.length === 0 && !silent) {
      toast({
        title: "Advertencia",
        description: "No se encontraron placeholders. Usa formato {{campo}}",
        variant: "destructive"
      });
    }
    
    // Check placeholders in blocks - NORMALIZAR comparación
    const placeholdersInBlocks = new Set<string>();
    convBlocks.forEach(block => {
      // Normalizar: remover llaves si existen
      block.placeholders?.forEach((p: string) => {
        const normalized = p.replace(/\{\{|\}\}/g, '').trim();
        placeholdersInBlocks.add(normalized);
      });
    });
    
    // Comparar placeholders normalizados
    const missingInBlocks = extractedPlaceholders.filter(p => {
      const normalizedPlaceholder = p.placeholder.replace(/\{\{|\}\}/g, '').trim();
      return !placeholdersInBlocks.has(normalizedPlaceholder);
    });
    
    if (missingInBlocks.length > 0 && !silent) {
      const confirmed = window.confirm(
        `Hay ${missingInBlocks.length} placeholders sin asignar a bloques: ${missingInBlocks.map(p => p.placeholder).join(', ')}. ¿Continuar?`
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      const lawyerHeaders = await getAuthHeadersAsync('lawyer');
      const adminHeaders = await getAuthHeadersAsync('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const requestBody = {
        agent_id: editingAgent.id,
        user_id: lawyerData.id,
        is_admin: lawyerData.is_admin,
        name: editingAgent.name,
        description: editingAgent.description,
        document_name: editingAgent.document_name,
        document_description: editingAgent.document_description,
        category: editingAgent.category,
        price: editingAgent.price,
        price_justification: editingAgent.price_justification,
        target_audience: editingAgent.target_audience,
        template_content: editingAgent.template_content,
        ai_prompt: editingAgent.ai_prompt,
        placeholder_fields: extractedPlaceholders,
        button_cta: editingAgent.button_cta,
        frontend_icon: editingAgent.frontend_icon,
        sla_enabled: editingAgent.sla_enabled,
        sla_hours: editingAgent.sla_hours,
        conversation_blocks: convBlocks.map((block, index) => ({
          block_name: block.block_name,
          intro_phrase: block.intro_phrase,
          placeholders: block.placeholders,
          block_order: index + 1
        })),
        field_instructions: fieldInstructions.map(instruction => ({
          field_name: instruction.field_name,
          validation_rule: instruction.validation_rule,
          help_text: instruction.help_text
        }))
      };

      console.log('📤 Sending update request with body keys:', Object.keys(requestBody));

      const { data, error } = await supabase.functions.invoke('update-agent', {
        body: requestBody,
        headers: authHeaders
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al actualizar el agente');
      }

      if (!silent) {
        toast({
          title: "Agente actualizado",
          description: data.message || "El agente ha sido actualizado correctamente.",
        });
      }

      setHasUnsavedChanges(false);
      
      // ✅ CRITICAL: Check database directly if OpenAI agent exists for this legal agent
      const { data: openaiAgent } = await supabase
        .from('openai_agents')
        .select('id')
        .eq('legal_agent_id', editingAgent.id)
        .eq('status', 'active')
        .maybeSingle();

      if (openaiAgent) {
        try {
          console.log('🔄 Recreating OpenAI assistant with updated data...');
          
          const { data: openaiData, error: openaiError } = await supabase.functions.invoke('create-openai-agent', {
            body: {
              legal_agent_id: editingAgent.id,
              force_recreate: true
            },
            headers: authHeaders
          });
          
          if (openaiError) {
            console.error('Error recreating OpenAI agent:', openaiError);
            if (!silent) {
              toast({
                title: "Advertencia",
                description: "El agente se guardó pero no se pudo actualizar el asistente de IA. Intenta desde el panel de OpenAI.",
                variant: "destructive",
              });
            }
          } else if (openaiData?.success) {
            console.log('✅ OpenAI assistant recreated successfully');
            if (!silent) {
              toast({
                title: "Asistente actualizado",
                description: "El asistente de IA se actualizó con los nuevos bloques de conversación",
              });
            }
          }
        } catch (openaiError) {
          console.error('Error updating OpenAI assistant:', openaiError);
        }
      }

      // Refresh agent data from database after save
      const { data: refreshedAgent } = await supabase
        .from('legal_agents')
        .select('*')
        .eq('id', editingAgent.id)
        .single();

      if (refreshedAgent) {
        setAgents(agents.map(agent => 
          agent.id === editingAgent.id ? (refreshedAgent as LegalAgent) : agent
        ));
      } else {
        setAgents(agents.map(agent => 
          agent.id === editingAgent.id ? editingAgent : agent
        ));
      }
      
      if (!silent) {
        setIsEditDialogOpen(false);
        setEditingAgent(null);
      }
    } catch (error: any) {
      console.error('Error:', error);
      if (!silent) {
        toast({
          title: "Error",
          description: error.message || "Ocurrió un error inesperado al actualizar el agente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFieldChange = (field: string, value: any) => {
    if (!editingAgent) return;
    setEditingAgent({ ...editingAgent, [field]: value });
    setHasUnsavedChanges(true);
    
    // Auto-detect placeholder changes when template changes
    if (field === 'template_content') {
      const newPlaceholders = extractPlaceholdersFromTemplate(value);
      setEditingAgent(prev => ({
        ...prev!,
        [field]: value,
        placeholder_fields: newPlaceholders
      }));
    }
  };
  
  // Extract placeholders from template
  const extractPlaceholdersFromTemplate = (template: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      const placeholder = match[1].trim();
      if (!matches.find(m => m.placeholder === placeholder)) {
        matches.push({
          placeholder,
          pregunta: `¿Cuál es ${placeholder.toLowerCase()}?`
        });
      }
    }
    
    return matches;
  };
  
  // Re-extract placeholders when template changes
  const handleReprocessTemplate = async () => {
    if (!editingAgent?.template_content) {
      toast({
        title: "Error",
        description: "No hay plantilla para procesar",
        variant: "destructive"
      });
      return;
    }
    
    setIsReprocessingTemplate(true);
    try {
      // Extract placeholders locally
      const newPlaceholders = extractPlaceholdersFromTemplate(editingAgent.template_content);
      
      // Check for orphaned placeholders in blocks - NORMALIZAR comparación
      const blocksPlaceholders = new Set();
      convBlocks.forEach(block => {
        block.placeholders?.forEach((p: string) => {
          const normalized = p.replace(/\{\{|\}\}/g, '').trim();
          blocksPlaceholders.add(normalized);
        });
      });
      
      const orphaned = [...blocksPlaceholders].filter(
        p => !newPlaceholders.some(np => np.placeholder === p)
      );
      
      if (orphaned.length > 0) {
        const confirmed = window.confirm(
          `Los siguientes campos están en bloques pero ya no en la plantilla: ${orphaned.join(', ')}.\n\n¿Deseas continuar?`
        );
        if (!confirmed) {
          setIsReprocessingTemplate(false);
          return;
        }
      }
      
      // Call AI to regenerate prompt - SAME LOGIC AS CREATION
      const requestPayload = {
        docName: editingAgent.name.trim(),
        docDesc: editingAgent.description?.trim() || 'Documento legal generado automáticamente',
        category: editingAgent.category || 'General',
        docTemplate: editingAgent.template_content.trim(),
        conversationBlocks: (convBlocks || []).map((b, idx) => ({
          blockName: b.block_name || '',
          introPhrase: b.intro_phrase || '',
          placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
          blockOrder: idx + 1
        })),
        fieldInstructions: (fieldInstructions || []).map(fi => ({
          fieldName: fi.field_name,
          validationRule: fi.validation_rule,
          helpText: fi.help_text
        })),
        targetAudience: editingAgent.target_audience || 'personas'
      };

      let data: any = null;
      let error: any = null;

      // Try primary function with timeout
      try {
        const invokeWithTimeout = async <T,>(p: Promise<T>, ms = 60000): Promise<T> => {
          return await Promise.race([
            p,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
          ]) as T;
        };
        
        ({ data, error } = await invokeWithTimeout(
          supabase.functions.invoke('ai-agent-processor', { body: requestPayload }),
          60000
        ));
      } catch (e) {
        console.warn('⏳ ai-agent-processor timeout/exception, preparing fallback...', e);
        error = error || e;
      }

      // Fallback to process-agent-ai if needed
      const hasPlaceholdersArray = Array.isArray(data?.placeholders) || Array.isArray(data?.extractedPlaceholders);
      const needFallback = !!error || !data || !data.enhancedPrompt || !hasPlaceholdersArray;

      if (needFallback) {
        console.warn('🔄 Falling back to process-agent-ai');
        ({ data, error } = await supabase.functions.invoke('process-agent-ai', {
          body: {
            docName: requestPayload.docName,
            docDesc: requestPayload.docDesc,
            docCat: requestPayload.category,
            docTemplate: requestPayload.docTemplate,
            initialPrompt: `Eres un asistente legal. Prepara un prompt óptimo para generar el documento "${requestPayload.docName}" para "${requestPayload.targetAudience}" usando la plantilla dada. Extrae placeholders y formula preguntas necesarias para completarlos.`,
            targetAudience: requestPayload.targetAudience
          }
        }));
      }
      
      if (error) throw error;
      
      if (!data || !data.enhancedPrompt) {
        throw new Error('La IA no pudo generar el prompt mejorado');
      }
      
      // Update agent with AI-generated prompt and placeholders
      handleEditFieldChange('ai_prompt', data.enhancedPrompt);
      handleEditFieldChange('placeholder_fields', newPlaceholders);
      
      toast({
        title: "✅ Plantilla Re-procesada",
        description: `Se encontraron ${newPlaceholders.length} placeholders y se regeneró el prompt AI automáticamente.`,
      });
    } catch (error: any) {
      console.error('Error reprocessing template:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo reprocesar la plantilla",
        variant: "destructive"
      });
    } finally {
      setIsReprocessingTemplate(false);
    }
  };
  
  // Improve document name and description with AI
  const handleImproveDocInfo = async () => {
    if (!editingAgent?.name || !editingAgent?.description) {
      toast({
        title: "Error",
        description: "Se requiere nombre y descripción",
        variant: "destructive"
      });
      return;
    }
    
    setIsImprovingDocInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-document-info', {
        body: {
          docName: editingAgent.name,
          docDesc: editingAgent.description,
          docCategory: editingAgent.category,
          targetAudience: editingAgent.target_audience || 'personas'
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setDocInfoSuggestions({
          improvedName: data.improvedName,
          improvedDescription: data.improvedDescription,
          originalName: editingAgent.name,
          originalDescription: editingAgent.description
        });
      }
    } catch (error: any) {
      console.error('Error improving doc info:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo mejorar la información",
        variant: "destructive"
      });
    } finally {
      setIsImprovingDocInfo(false);
    }
  };
  
  
  // Check consistency between template and blocks
  const checkConsistency = () => {
    if (!editingAgent?.template_content) return { orphanedInBlocks: [], missingInBlocks: [] };
    
    const templatePlaceholders = extractPlaceholdersFromTemplate(editingAgent.template_content);
    const blocksPlaceholders = new Set<string>();
    
    // Normalizar placeholders de los bloques
    convBlocks.forEach(block => {
      block.placeholders?.forEach((p: string) => {
        const normalized = p.replace(/\{\{|\}\}/g, '').trim();
        blocksPlaceholders.add(normalized);
      });
    });
    
    const orphanedInBlocks = [...blocksPlaceholders].filter(
      p => !templatePlaceholders.some(tp => tp.placeholder === p)
    );
    
    const missingInBlocks = templatePlaceholders.filter(
      tp => !blocksPlaceholders.has(tp.placeholder)
    );
    
    return { orphanedInBlocks, missingInBlocks };
  };
  
  // Auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges || !editingAgent || isSaving) return;
    
    const timer = setTimeout(() => {
      handleSaveAgent(true);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [editingAgent, convBlocks, fieldInstructions, hasUnsavedChanges]);
  
  // Warning before closing with unsaved changes
  const handleCloseDialog = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm("Hay cambios sin guardar. ¿Deseas salir sin guardar?");
      if (!confirmed) return;
    }
    setIsEditDialogOpen(false);
    setEditingAgent(null);
    setHasUnsavedChanges(false);
    setDocInfoSuggestions(null);
    setTemplateSuggestions(null);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'suspended':
        return 'Suspendido';
      case 'draft':
        return 'Borrador';
      case 'pending_review':
        return 'Pendiente de Revisión';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-success text-success-foreground">Activo</Badge>;
      case 'suspended':
        return <Badge variant="secondary">Suspendido</Badge>;
      case 'draft':
        return <Badge variant="outline">Borrador</Badge>;
      case 'pending_review':
        return <Badge variant="destructive">Pendiente de Revisión</Badge>;
      default:
        return <Badge variant="secondary">{getStatusText(status)}</Badge>;
    }
  };

  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    // Los abogados pueden eliminar sus propios agentes, los admins pueden eliminar cualquiera
    // Confirmación antes de eliminar
    const confirmed = window.confirm(`¿Estás seguro de que quieres eliminar el agente "${agentName}"? Esta acción no se puede deshacer.`);
    
    if (!confirmed) {
      return;
    }

    try {
      // Intentar ambos tipos de autenticación
      const lawyerHeaders = await getAuthHeadersAsync('lawyer');
      const adminHeaders = await getAuthHeadersAsync('admin');
      const authHeaders = lawyerHeaders.authorization ? lawyerHeaders : adminHeaders;
      
      if (!authHeaders.authorization) {
        toast({
          title: "Error",
          description: "Token de autenticación no encontrado. Por favor, inicia sesión nuevamente.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('delete-agent', {
        body: JSON.stringify({
          agent_id: agentId,
          user_id: lawyerData.id,
          is_admin: lawyerData.is_admin
        }),
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Error al eliminar el agente');
      }

      toast({
        title: "Agente eliminado",
        description: data.message || `Agente "${agentName}" eliminado exitosamente`,
      });

      // Update local state
      setAgents(agents.filter(agent => agent.id !== agentId));
    } catch (error: any) {
      console.error('Delete agent error:', error);
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el agente",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando agentes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-indigo-500/5">
        <UnifiedSidebar 
          user={user}
          currentView={currentView}
          onViewChange={onViewChange}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0">
          <header className="h-14 lg:h-16 border-b bg-gradient-to-r from-background/95 to-indigo-500/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 relative overflow-hidden sticky top-0 z-40">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-50"></div>
            <div className="relative flex h-14 lg:h-16 items-center px-3 lg:px-6">
              <SidebarTrigger className="mr-2 lg:mr-4 hover:bg-indigo-500/10 rounded-lg p-2 transition-all duration-200 flex-shrink-0" />
              <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                <div className="p-1.5 lg:p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg lg:rounded-xl shadow-lg flex-shrink-0">
                  <Settings className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base lg:text-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent truncate">
                    Gestionar Agentes
                  </h1>
                  <p className="text-xs lg:text-sm text-muted-foreground hidden sm:block truncate">
                    Administra y configura tus agentes legales
                  </p>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 lg:py-8">
            <div className="max-w-6xl mx-auto">
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-primary mb-2">
                      Gestión de Agentes Legales
                    </h1>
              <p className="text-lg text-muted-foreground">
                Administra tus agentes creados: activa, suspende o modifica según sea necesario.
              </p>
            </div>
            {lawyerData.is_admin && agents.length > 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (!confirm(`¿Deseas regenerar los prompts de IA de TODOS los agentes (${agents.length})?\n\nEsto actualizará los prompts para incluir todos los bloques de conversación y validaciones correctamente.`)) {
                    return;
                  }
                  
                  try {
                    toast({
                      title: "Regenerando prompts...",
                      description: `Procesando ${agents.length} agentes. Esto puede tomar varios segundos.`,
                    });
                    
                    const { data, error } = await supabase.functions.invoke('regenerate-agent-prompts', {
                      body: { agent_ids: agents.map(a => a.id) }
                    });
                    
                    if (error) throw error;
                    
                    if (data?.success) {
                      toast({
                        title: "✅ Prompts regenerados",
                        description: `Procesados: ${data.processed}, Actualizados: ${data.updated}, Omitidos: ${data.skipped}`,
                      });
                      
                      // Recargar los agentes
                      fetchAgents();
                    } else {
                      throw new Error('No se pudieron regenerar los prompts');
                    }
                  } catch (error: any) {
                    console.error('Error regenerating prompts:', error);
                    toast({
                      title: "Error",
                      description: error.message || "No se pudieron regenerar los prompts",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar Todos los Prompts
              </Button>
            )}
          </div>
        </div>

        {/* Separar agentes por estado */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No has creado ningún agente aún. Ve al panel principal para crear tu primer agente.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Sección de Agentes Pendientes de Revisión */}
            {agents.filter(agent => agent.status === 'pending_review').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Pendientes de Revisión
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes enviados para aprobación del administrador
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    {agents.filter(agent => agent.status === 'pending_review').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'pending_review').map((agent) => (
                    <Card key={agent.id} className="relative border-yellow-200 dark:border-yellow-800">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0 flex flex-col gap-1">
                            {getStatusBadge(agent.status)}
                            {agent.target_audience && (
                              <Badge variant="outline" className="text-xs">
                                {agent.target_audience === 'personas' ? '👤 Personas' : 
                                 agent.target_audience === 'empresas' ? '🏢 Empresas' : '🌐 Ambos'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          {agent.sla_enabled && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Clock className="h-4 w-4 flex-shrink-0 text-blue-500" />
                              <span className="text-muted-foreground">ANS:</span>
                              <span className="font-medium text-blue-600">{agent.sla_hours}h</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          {/* View Details */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Approve Button (visible for admins on pending_review agents) */}
                          {lawyerData.is_admin && (
                            <Button 
                              size="sm"
                              onClick={() => handleApproveAgent(agent.id)}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                          )}

                          {/* Regenerate Prompt (only for admins) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  toast({
                                    title: "Regenerando prompt...",
                                    description: "Esto puede tomar unos segundos",
                                  });
                                  
                                  const { data, error } = await supabase.functions.invoke('regenerate-agent-prompts', {
                                    body: { agent_id: agent.id }
                                  });
                                  
                                  if (error) throw error;
                                  
                                  if (data?.success && data?.updated > 0) {
                                    toast({
                                      title: "✅ Prompt regenerado",
                                      description: `El prompt de "${agent.name}" ha sido actualizado exitosamente.`,
                                    });
                                    fetchAgents();
                                  } else {
                                    throw new Error(data?.errors?.[0]?.error || 'No se pudo regenerar el prompt');
                                  }
                                } catch (error: any) {
                                  console.error('Error regenerating prompt:', error);
                                  toast({
                                    title: "Error",
                                    description: error.message || "No se pudo regenerar el prompt",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Regenerar
                            </Button>
                          )}

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Agentes Activos */}
            {agents.filter(agent => agent.status === 'active').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Activos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes aprobados y operativos en la plataforma
                    </p>
                  </div>
                  <Badge variant="default" className="ml-auto bg-success text-success-foreground">
                    {agents.filter(agent => agent.status === 'active').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'active').map((agent) => (
                    <Card key={agent.id} className="relative border-green-200 dark:border-green-800">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0 flex flex-col gap-1">
                            {getStatusBadge(agent.status)}
                            {agent.target_audience && (
                              <Badge variant="outline" className="text-xs">
                                {agent.target_audience === 'personas' ? '👤 Personas' : 
                                 agent.target_audience === 'empresas' ? '🏢 Empresas' : '🌐 Ambos'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          {agent.sla_enabled && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Clock className="h-4 w-4 flex-shrink-0 text-blue-500" />
                              <span className="text-muted-foreground">ANS:</span>
                              <span className="font-medium text-blue-600">{agent.sla_hours}h</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Regenerate Prompt (only for admins) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                try {
                                  toast({
                                    title: "Regenerando prompt...",
                                    description: "Esto puede tomar unos segundos",
                                  });
                                  
                                  const { data, error } = await supabase.functions.invoke('regenerate-agent-prompts', {
                                    body: { agent_id: agent.id }
                                  });
                                  
                                  if (error) throw error;
                                  
                                  if (data?.success && data?.updated > 0) {
                                    toast({
                                      title: "✅ Prompt regenerado",
                                      description: `El prompt de "${agent.name}" ha sido actualizado exitosamente.`,
                                    });
                                    fetchAgents(); // Recargar la lista
                                  } else {
                                    throw new Error(data?.errors?.[0]?.error || 'No se pudo regenerar el prompt');
                                  }
                                } catch (error: any) {
                                  console.error('Error regenerating prompt:', error);
                                  toast({
                                    title: "Error",
                                    description: error.message || "No se pudo regenerar el prompt",
                                    variant: "destructive"
                                  });
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Regenerar
                            </Button>
                          )}

                          {/* Suspend/Activate (solo para admin) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(agent.id, agent.status === 'active' ? 'suspended' : 'active')}
                            >
                              {agent.status === 'active' ? (
                                <>
                                  <Pause className="h-4 w-4 mr-1" />
                                  Suspender
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-1" />
                                  Activar
                                </>
                              )}
                            </Button>
                          )}

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Sección de Agentes Suspendidos */}
            {agents.filter(agent => agent.status === 'suspended').length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                    <Pause className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Agentes Suspendidos
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Agentes temporalmente suspendidos por el administrador
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-auto">
                    {agents.filter(agent => agent.status === 'suspended').length}
                  </Badge>
                </div>
                
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {agents.filter(agent => agent.status === 'suspended').map((agent) => (
                    <Card key={agent.id} className="relative border-red-200 dark:border-red-800 opacity-75">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg mb-2 line-clamp-2">{agent.name}</CardTitle>
                            <CardDescription className="text-sm mb-3 line-clamp-3">
                              {agent.description}
                            </CardDescription>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(agent.status)}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="truncate">{agent.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <DollarSign className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{agent.price === 0 ? 'GRATIS' : `$${agent.price.toLocaleString()} COP`}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{new Date(agent.created_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="text-muted-foreground">Variables:</span>
                            <span>{agent.placeholder_fields.length} campos</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>

                          {/* Edit */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAgent(agent)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>

                          {/* Reactivate (solo para admin) */}
                          {lawyerData.is_admin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusChange(agent.id, 'active')}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Reactivar
                            </Button>
                          )}

                          {/* Delete */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay agentes en ninguna categoría */}
            {agents.filter(agent => agent.status === 'pending_review').length === 0 && 
             agents.filter(agent => agent.status === 'active').length === 0 && 
             agents.filter(agent => agent.status === 'suspended').length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No tienes agentes en estas categorías. Ve al panel principal para crear un agente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dialog for viewing agent details with Tabs */}
        <Dialog open={isDetailsOpen} onOpenChange={(open) => {
          setIsDetailsOpen(open);
          if (!open) setSelectedAgent(null);
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl">{selectedAgent?.name}</DialogTitle>
                  <DialogDescription className="mt-1">
                    Detalles completos del agente legal
                  </DialogDescription>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {selectedAgent && getStatusBadge(selectedAgent.status)}
                  {selectedAgent?.target_audience && (
                    <Badge variant="outline" className="text-xs">
                      {selectedAgent.target_audience === 'personas' ? '👤 Personas' : 
                       selectedAgent.target_audience === 'empresas' ? '🏢 Empresas' : '🌐 Ambos'}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
            
            {selectedAgent && (
              <Tabs defaultValue="summary" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">📊 Resumen</TabsTrigger>
                  <TabsTrigger value="template">📄 Plantilla</TabsTrigger>
                  <TabsTrigger value="conversation">💬 Conversación</TabsTrigger>
                  <TabsTrigger value="openai">🤖 OpenAI</TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto mt-4">
                  {/* TAB 1: RESUMEN */}
                  <TabsContent value="summary" className="space-y-6 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Información General */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Información General
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoría:</span>
                            <span className="font-medium">{selectedAgent.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Precio:</span>
                            <span className="font-medium">{selectedAgent.price === 0 ? 'GRATIS' : `$${selectedAgent.price.toLocaleString()} COP`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Audiencia:</span>
                            <span className="font-medium">
                              {selectedAgent.target_audience === 'personas' ? 'Personas' : 
                               selectedAgent.target_audience === 'empresas' ? 'Empresas' : 'Ambos'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Creado:</span>
                            <span>{new Date(selectedAgent.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Actualizado:</span>
                            <span>{new Date(selectedAgent.updated_at).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Configuración ANS */}
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Configuración ANS
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ANS Habilitado:</span>
                            <Badge variant={selectedAgent.sla_enabled ? "default" : "secondary"}>
                              {selectedAgent.sla_enabled ? 'Sí' : 'No'}
                            </Badge>
                          </div>
                          {selectedAgent.sla_enabled && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tiempo Límite:</span>
                              <span className="font-medium text-blue-600">{selectedAgent.sla_hours} horas</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Variables:</span>
                            <span className="font-medium">{selectedAgent.placeholder_fields.length} campos</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Bloques Conv.:</span>
                            <span className="font-medium">{convBlocks.length} bloques</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Descripción */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Descripción
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
                        {selectedAgent.description}
                      </p>
                    </div>

                    {/* Variables */}
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Variables ({selectedAgent.placeholder_fields.length})
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {selectedAgent.placeholder_fields.map((field: any, index: number) => {
                          const fieldName = typeof field === 'string' 
                            ? field 
                            : (field.placeholder || field.name || field.field_name || `Campo ${index + 1}`);
                          return (
                            <Badge key={index} variant="outline" className="justify-start text-xs py-1.5">
                              {fieldName}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: PLANTILLA */}
                  <TabsContent value="template" className="space-y-4 mt-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Plantilla del Documento</h4>
                      <DocumentPDFPreview
                        templateContent={selectedAgent.template_content}
                        documentName={selectedAgent.name}
                        placeholders={selectedAgent.placeholder_fields}
                        buttonVariant="outline"
                        buttonSize="sm"
                      />
                    </div>
                    <div 
                      className="p-4 bg-muted rounded-lg text-sm max-h-[50vh] overflow-y-auto"
                      style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        lineHeight: '1.7',
                        color: 'hsl(var(--foreground))'
                      }}
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedAgent.template_content) }}
                    />
                  </TabsContent>

                  {/* TAB 3: CONVERSACIÓN */}
                  <TabsContent value="conversation" className="space-y-6 mt-0">
                    {/* Guía de Conversación */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Guía de Conversación
                        </h4>
                        <Badge variant="outline">{convBlocks.length} bloques</Badge>
                      </div>
                      {convLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                          <span className="text-muted-foreground">Cargando guía...</span>
                        </div>
                      ) : convBlocks.length === 0 ? (
                        <div className="text-center py-8 bg-muted rounded-lg">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No hay bloques de conversación configurados.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                          {convBlocks.map((b) => (
                            <Card key={b.id} className="bg-muted/50">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="font-medium text-sm">{b.block_order}. {b.block_name}</div>
                                  <Badge variant="secondary" className="text-xs">
                                    {Array.isArray(b.placeholders) ? b.placeholders.length : 0} campos
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2 italic">"{b.intro_phrase}"</p>
                                {Array.isArray(b.placeholders) && b.placeholders.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {b.placeholders.map((ph: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">{ph}</Badge>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Instrucciones de Campos */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Instrucciones de Campos
                        </h4>
                        <Badge variant="outline">{fieldInstructions.length} instrucciones</Badge>
                      </div>
                      {fieldInstructions.length === 0 ? (
                        <div className="text-center py-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">No hay instrucciones específicas configuradas.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {fieldInstructions.map((instruction, idx) => (
                            <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{instruction.field_name}</Badge>
                              </div>
                              {instruction.help_text && (
                                <p className="text-xs text-muted-foreground">{instruction.help_text}</p>
                              )}
                              {instruction.validation_rule && (
                                <p className="text-xs text-blue-600 mt-1">Validación: {instruction.validation_rule}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 4: OPENAI */}
                  <TabsContent value="openai" className="space-y-6 mt-0">
                    {/* OpenAI Agent Debug Component */}
                    <OpenAIAgentDebug legalAgentId={selectedAgent.id} />
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Prompt de IA</h4>
                        {lawyerData.is_admin && convBlocks.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!selectedAgent) return;
                              try {
                                toast({
                                  title: "Regenerando prompt...",
                                  description: "Esto puede tomar unos segundos",
                                });
                                
                                const { data, error } = await supabase.functions.invoke('regenerate-agent-prompts', {
                                  body: { agent_id: selectedAgent.id }
                                });
                                
                                if (error) throw error;
                                
                                if (data?.success && data?.updated > 0) {
                                  toast({
                                    title: "✅ Prompt regenerado",
                                    description: `El prompt de IA ha sido actualizado con ${convBlocks.length} bloques y ${fieldInstructions.length} validaciones.`,
                                  });
                                  
                                  const { data: updatedAgent, error: fetchError } = await supabase
                                    .from('legal_agents')
                                    .select('*')
                                    .eq('id', selectedAgent.id)
                                    .single();
                                  
                                  if (!fetchError && updatedAgent) {
                                    setSelectedAgent(updatedAgent as LegalAgent);
                                    setAgents(agents.map(a => a.id === updatedAgent.id ? updatedAgent as LegalAgent : a));
                                  }
                                } else {
                                  throw new Error(data?.errors?.[0]?.error || 'No se pudo regenerar el prompt');
                                }
                              } catch (error: any) {
                                console.error('Error regenerating prompt:', error);
                                toast({
                                  title: "Error",
                                  description: error.message || "No se pudo regenerar el prompt",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerar Prompt
                          </Button>
                        )}
                      </div>
                      <div className="p-4 bg-muted rounded-lg text-xs font-mono max-h-60 overflow-y-auto whitespace-pre-wrap">
                        {selectedAgent.ai_prompt}
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
        {/* Edit Agent Dialog with Tabs */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Editar Agente Legal
                {isSaving && <Badge variant="outline" className="text-xs">Guardando...</Badge>}
                {hasUnsavedChanges && !isSaving && <Badge variant="secondary" className="text-xs">Cambios sin guardar</Badge>}
              </DialogTitle>
              <DialogDescription>
                Modifica la información del agente legal
              </DialogDescription>
            </DialogHeader>
            
            {editingAgent && (
              <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">📝 Información</TabsTrigger>
                  <TabsTrigger value="template">📄 Plantilla</TabsTrigger>
                  <TabsTrigger value="conversation">💬 Conversación</TabsTrigger>
                  <TabsTrigger value="config">⚙️ Configuración</TabsTrigger>
                </TabsList>

                {/* Check consistency warnings */}
                {(() => {
                  const { orphanedInBlocks, missingInBlocks } = checkConsistency();
                  return (
                    <>
                      {orphanedInBlocks.length > 0 && (
                        <Alert variant="destructive" className="mt-4">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Placeholders huérfanos en bloques</AlertTitle>
                          <AlertDescription>
                            Los siguientes campos están en bloques pero ya no existen en la plantilla: {orphanedInBlocks.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                      {missingInBlocks.length > 0 && (
                        <Alert className="mt-4">
                          <Info className="h-4 w-4" />
                          <AlertTitle>Campos sin asignar</AlertTitle>
                          <AlertDescription>
                            Estos campos están en la plantilla pero no en bloques: {missingInBlocks.map(p => p.placeholder).join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  );
                })()}

                <div className="flex-1 overflow-y-auto mt-4">
                  {/* TAB 1: INFORMACIÓN BÁSICA */}
                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor="name">Nombre del Agente *</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleImproveDocInfo}
                          disabled={isImprovingDocInfo}
                        >
                          {isImprovingDocInfo ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <Input
                        id="name"
                        value={editingAgent.name}
                        onChange={(e) => handleEditFieldChange('name', e.target.value)}
                        placeholder="Nombre del agente"
                      />
                    </div>

                    {/* AI Suggestions for Doc Info */}
                    {docInfoSuggestions && (
                      <Card className="bg-muted/50">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Sugerencias de IA
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-xs">Nombre sugerido:</Label>
                            <p className="text-sm">{docInfoSuggestions.improvedName}</p>
                          </div>
                          <div>
                            <Label className="text-xs">Descripción sugerida:</Label>
                            <p className="text-sm">{docInfoSuggestions.improvedDescription}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                handleEditFieldChange('name', docInfoSuggestions.improvedName);
                                handleEditFieldChange('description', docInfoSuggestions.improvedDescription);
                                setDocInfoSuggestions(null);
                                toast({ title: "Sugerencias aplicadas" });
                              }}
                            >
                              Aplicar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDocInfoSuggestions(null)}>
                              Rechazar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div>
                      <Label htmlFor="description">Descripción *</Label>
                      <Textarea
                        id="description"
                        value={editingAgent.description}
                        onChange={(e) => handleEditFieldChange('description', e.target.value)}
                        placeholder="Descripción del agente"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Categoría *</Label>
                        <Select
                          value={editingAgent.category}
                          onValueChange={(value) => handleEditFieldChange('category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.length > 0 ? (
                              categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="loading" disabled>
                                Cargando categorías...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="target_audience">Audiencia Objetivo</Label>
                        <Select
                          value={editingAgent.target_audience || 'personas'}
                          onValueChange={(value) => handleEditFieldChange('target_audience', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona audiencia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personas">👤 Personas</SelectItem>
                            <SelectItem value="empresas">🏢 Empresas</SelectItem>
                            <SelectItem value="ambos">🌐 Ambos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: PLANTILLA */}
                  <TabsContent value="template" className="space-y-4 mt-0">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="template_content">Contenido de la Plantilla *</Label>
                        <div className="flex gap-2">
                          <DocumentPDFPreview
                            templateContent={editingAgent.template_content}
                            documentName={editingAgent.name}
                            placeholders={extractPlaceholdersFromTemplate(editingAgent.template_content)}
                            buttonVariant="outline"
                            buttonSize="sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleReprocessTemplate}
                            disabled={isReprocessingTemplate}
                          >
                            {isReprocessingTemplate ? (
                              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1" />
                            )}
                            Re-analizar
                          </Button>
                        </div>
                      </div>
                      <RichTextTemplateEditor
                        value={editingAgent.template_content}
                        onChange={(value) => handleEditFieldChange('template_content', value)}
                        placeholder="Contenido de la plantilla del documento. Usa {{campo}} para placeholders."
                        minHeight="300px"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Placeholders detectados: {extractPlaceholdersFromTemplate(editingAgent.template_content).length}
                      </p>
                    </div>
                  </TabsContent>

                  {/* TAB 3: GUÍA DE CONVERSACIÓN */}
                  <TabsContent value="conversation" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Guía de Conversación</h3>
                        <Badge variant="outline">{convBlocks.length} bloques</Badge>
                      </div>
                      
                      {convLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                          <span>Cargando bloques de conversación...</span>
                        </div>
                      ) : extractPlaceholdersFromTemplate(editingAgent.template_content).length > 0 ? (
                        <>
                          {convBlocks.length === 0 && (
                            <Alert className="mb-4">
                              <Info className="h-4 w-4" />
                              <AlertTitle>Primera vez configurando conversación</AlertTitle>
                              <AlertDescription>
                                Este agente no tiene bloques de conversación configurados. Crea los bloques para organizar cómo se recolecta la información del usuario.
                              </AlertDescription>
                            </Alert>
                          )}
                          <ConversationGuideBuilder 
                            placeholders={extractPlaceholdersFromTemplate(editingAgent.template_content).map(p => p.placeholder)}
                            conversationBlocks={convBlocks.map(block => ({
                              id: block.id,
                              name: block.block_name,
                              introduction: block.intro_phrase,
                              placeholders: Array.isArray(block.placeholders) ? block.placeholders : []
                            }))}
                            onBlocksChange={(blocks) => {
                              const updatedBlocks = blocks.map((block, index) => ({
                                id: block.id,
                                block_name: block.name,
                                intro_phrase: block.introduction,
                                placeholders: block.placeholders,
                                block_order: index + 1
                              }));
                              setConvBlocks(updatedBlocks);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                          <p>No se han detectado placeholders en la plantilla.</p>
                          <p className="text-xs mt-1">Los placeholders se detectan automáticamente en el formato {`{{nombre_campo}}`}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Instrucciones de Campos</h3>
                        <Badge variant="outline">{fieldInstructions.length} instrucciones</Badge>
                      </div>
                      
                      {extractPlaceholdersFromTemplate(editingAgent.template_content).length > 0 ? (
                        <>
                          {fieldInstructions.length === 0 && (
                            <Alert className="mb-4">
                              <Info className="h-4 w-4" />
                              <AlertTitle>Instrucciones opcionales</AlertTitle>
                              <AlertDescription>
                                Puedes agregar validaciones y textos de ayuda específicos para cada campo. Esto es opcional pero mejora la experiencia del usuario.
                              </AlertDescription>
                            </Alert>
                          )}
                          <FieldInstructionsManager
                            placeholders={extractPlaceholdersFromTemplate(editingAgent.template_content).map(p => p.placeholder)}
                            fieldInstructions={fieldInstructions.map(instruction => ({
                              id: instruction.id,
                              fieldName: instruction.field_name,
                              validationRule: instruction.validation_rule,
                              helpText: instruction.help_text
                            }))}
                            onInstructionsChange={(instructions) => {
                              const updatedInstructions = instructions.map(instruction => ({
                                id: instruction.id,
                                field_name: instruction.fieldName,
                                validation_rule: instruction.validationRule,
                                help_text: instruction.helpText
                              }));
                              setFieldInstructions(updatedInstructions);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>Primero necesitas crear una plantilla con placeholders en formato {`{{campo}}`}.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* TAB 4: CONFIGURACIÓN */}
                  <TabsContent value="config" className="space-y-4 mt-0">
                    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm">⏱️ Configuración de ANS</h3>
                          <p className="text-xs text-muted-foreground">Acuerdo de Nivel de Servicio</p>
                        </div>
                        <Switch
                          checked={editingAgent.sla_enabled ?? true}
                          onCheckedChange={(checked) => handleEditFieldChange('sla_enabled', checked)}
                        />
                      </div>
                      
                      {editingAgent.sla_enabled && (
                        <div>
                          <Label htmlFor="sla_hours" className="text-sm">
                            Tiempo límite de respuesta (horas)
                          </Label>
                          <Select 
                            value={(editingAgent.sla_hours ?? 4).toString()} 
                            onValueChange={(value) => handleEditFieldChange('sla_hours', parseInt(value))}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Selecciona el tiempo límite" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 hora</SelectItem>
                              <SelectItem value="2">2 horas</SelectItem>
                              <SelectItem value="4">4 horas (recomendado)</SelectItem>
                              <SelectItem value="6">6 horas</SelectItem>
                              <SelectItem value="8">8 horas</SelectItem>
                              <SelectItem value="12">12 horas</SelectItem>
                              <SelectItem value="24">24 horas</SelectItem>
                              <SelectItem value="48">48 horas</SelectItem>
                              <SelectItem value="72">72 horas (máximo)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t mt-4">
                  <Button 
                    onClick={() => handleSaveAgent(false)}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar Cambios
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}