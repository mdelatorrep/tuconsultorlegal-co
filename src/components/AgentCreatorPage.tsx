import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft, ArrowRight, CheckCircle, Loader2, Copy, Wand2, Bold, Italic, Underline, Type, AlignLeft, AlignCenter, AlignRight, Save, FileText, Trash2 } from "lucide-react";
import { ConversationGuideBuilder } from "@/components/ConversationGuideBuilder";
import { FieldInstructionsManager } from "@/components/FieldInstructionsManager";

interface AgentCreatorPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function AgentCreatorPage({ onBack, lawyerData }: AgentCreatorPageProps) {
  console.log('=== AGENT CREATOR PAGE LOADED ===');
  console.log('=== LAWYER DATA DEBUG ===');
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImprovingTemplate, setIsImprovingTemplate] = useState(false);
  const [isImprovingDocInfo, setIsImprovingDocInfo] = useState(false);
  
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<any[]>([]);
  
  // Interfaces for new conversation guide system
  interface ConversationBlock {
    id: string;
    name: string;
    introduction: string;
    placeholders: string[];
  }

  interface FieldInstruction {
    id: string;
    fieldName: string;
    validationRule: string;
    helpText: string;
  }

  const [formData, setFormData] = useState({
    docName: "",
    docDesc: "",
    docCat: "",
    targetAudience: "personas", // "personas" o "empresas"
    docTemplate: "",
    conversation_blocks: [] as ConversationBlock[],
    field_instructions: [] as FieldInstruction[],
    slaHours: 4,
    slaEnabled: true,
    lawyerSuggestedPrice: "",
  });
  
  const [aiResults, setAiResults] = useState({
    enhancedPrompt: "",
    extractedPlaceholders: [] as Array<{ placeholder: string; pregunta: string }>,
    calculatedPrice: "", // Price calculated by AI for admin review only
    priceJustification: "",
  });
  
  const [docInfoImprovement, setDocInfoImprovement] = useState({
    improvedName: "",
    improvedDescription: "",
    originalName: "",
    originalDescription: "",
    showImprovement: false,
    isEditing: false,
  });

  const [promptImprovement, setPromptImprovement] = useState({
    improvedPrompt: "",
    originalPrompt: "",
    showImprovement: false,
    isEditing: false,
  });
  
  const [aiProcessingSuccess, setAiProcessingSuccess] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(1); // Track the highest step reached
  // Auto-publicación tras IA y control de envío
  const [autoSubmitAfterAI, setAutoSubmitAfterAI] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const steps = [
    { id: 1, title: "Info Básica", description: "Información del documento" },
    { id: 2, title: "Plantilla", description: "Texto del documento" },
    { id: 3, title: "Guía de Conversación", description: "Estructura de la conversación" },
    { id: 4, title: "Revisar", description: "Envío a revisión" },
  ];

  const [categories, setCategories] = useState<string[]>([]);

  // Load categories from database
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    console.log('🔄 Loading categories...');
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('name')
        .eq('is_active', true)
        .in('category_type', ['document', 'both'])
        .order('display_order')
        .order('name');

      console.log('🔍 Raw query response:', { data, error });

      if (error) {
        console.error('❌ Error loading categories:', error);
        return;
      }

      console.log('✅ Categories loaded:', data);
      const categoryNames = data?.map(cat => cat.name) || [];
      console.log('📋 Category names extracted:', categoryNames);
      console.log('📊 Categories count:', categoryNames.length);
      
      setCategories(categoryNames);
      console.log('💾 Categories set in state');
    } catch (error) {
      console.error('❌ Error loading categories:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'slaEnabled') {
      setFormData(prev => ({ ...prev, [field]: value === 'true' }));
    } else if (field === 'slaHours') {
      setFormData(prev => ({ ...prev, [field]: parseInt(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Draft functionality
  useEffect(() => {
    loadDrafts();
  }, []);

  // Auto-save draft when form data changes (excluding initial load)
  useEffect(() => {
    console.log('🔄 Auto-save effect triggered');
    console.log('📊 Auto-save conditions check:', {
      hasDocName: !!formData.docName,
      hasDocDesc: !!formData.docDesc,
      hasDocTemplate: !!formData.docTemplate,
      hasConversationBlocks: formData.conversation_blocks && formData.conversation_blocks.length > 0,
      isSavingDraft,
      canCreateAgents: lawyerData?.canCreateAgents,
      currentStep,
      lawyerId: lawyerData?.id
    });

    // Evitar auto-save en la carga inicial o cuando no hay datos mínimos
    if (!formData.docName && !formData.docDesc && !formData.docTemplate && formData.conversation_blocks.length === 0) {
      console.log('❌ Auto-save skipped - no minimal data present');
      return;
    }

    console.log('✅ Auto-save conditions met, setting timer...');
    // Debounce auto-save para evitar múltiples saves
    const timer = setTimeout(() => {
      console.log('⏰ Auto-save timer triggered');
      if (!isSavingDraft && lawyerData?.canCreateAgents) {
        console.log('🚀 Executing auto-save...');
        saveDraft();
      } else {
        console.log('❌ Auto-save blocked:', {
          isSavingDraft,
          canCreateAgents: lawyerData?.canCreateAgents
        });
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => {
      console.log('🧹 Clearing auto-save timer');
      clearTimeout(timer);
    };
  }, [formData, currentStep, aiResults, isSavingDraft, lawyerData?.canCreateAgents]);

  const loadDrafts = async () => {
    if (!lawyerData?.canCreateAgents) {
      console.log('Cannot load drafts - user does not have agent creation permissions');
      setDrafts([]);
      return;
    }
    
    setIsLoadingDrafts(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-agent-drafts', {
        body: { lawyerId: lawyerData.id } // Usar el ID del lawyer profile directamente
      });

      if (error) {
        console.error('Error loading drafts:', error);
        return;
      }

      if (data?.success) {
        setDrafts(data.drafts || []);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const saveDraft = async (stepOverride?: number) => {
    console.log('💾 saveDraft function called');
    
    if (isSavingDraft) {
      console.log('❌ Save blocked - already saving draft');
      return; // Prevent multiple simultaneous saves
    }
    
    // Skip auto-save if user doesn't have permissions
    if (!lawyerData?.canCreateAgents) {
      console.log('❌ Save blocked - user does not have agent creation permissions');
      return;
    }
    
    console.log('✅ Save conditions met, proceeding...');
    setIsSavingDraft(true);
    
    try {
      const draftName = formData.docName?.trim() || `Borrador ${new Date().toLocaleDateString()}`;
      
      console.log('📤 Attempting to save draft:', {
        lawyerId: lawyerData.id,
        currentDraftId,
        draftName,
        stepCompleted: stepOverride ?? currentStep,
        hasFormData: !!formData
      });
      
      const stepToSave = stepOverride ?? currentStep;
      const includeBlocks = stepToSave >= 3 && Array.isArray(formData.conversation_blocks);
      const includeInstructions = stepToSave >= 3 && Array.isArray(formData.field_instructions);

      const conversationBlocksPayload = includeBlocks && (formData.conversation_blocks?.length || 0) > 0
        ? (formData.conversation_blocks || []).map((b, idx) => ({
            blockName: b.name?.trim() || '',
            introPhrase: b.introduction?.trim() || '',
            placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
            order: idx + 1
          }))
        : undefined; // Avoid sending empty array to prevent unintended clearing

      const fieldInstructionsPayload = includeInstructions && (formData.field_instructions?.length || 0) > 0
        ? formData.field_instructions
        : undefined; // Avoid sending empty array to prevent unintended clearing

      const { data, error } = await supabase.functions.invoke('save-agent-with-blocks', {
        body: {
          lawyerId: lawyerData.id,
          draftId: currentDraftId,
          draftName,
          stepCompleted: stepToSave,
          agentData: {
            doc_name: formData.docName?.trim() || '',
            doc_desc: formData.docDesc?.trim() || '',
            doc_cat: formData.docCat || '',
            target_audience: formData.targetAudience || 'personas',
            doc_template: formData.docTemplate?.trim() || '',
            initial_prompt: '',
            sla_hours: formData.slaHours || 4,
            sla_enabled: formData.slaEnabled !== undefined ? formData.slaEnabled : true,
            lawyer_suggested_price: formData.lawyerSuggestedPrice?.trim() || '',
            ai_results: aiResults
          },
          conversationBlocks: conversationBlocksPayload,
          fieldInstructions: fieldInstructionsPayload
        }
      });

      console.log('📥 Save function response:', { data, error });

      if (error) {
        console.error('❌ Error saving draft:', error);
        // Only show error toast for manual saves, not auto-saves
        if (!currentDraftId) {
          toast({
            title: "Error al guardar borrador",
            description: error.message || "No se pudo guardar el borrador",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.success) {
        if (!currentDraftId) {
          setCurrentDraftId(data.draftId);
          console.log('✅ Draft created with ID:', data.draftId);
        } else {
          console.log('✅ Draft updated successfully');
        }
      } else {
        console.log('⚠️ Save function returned unsuccessful response:', data);
      }
    } catch (error) {
      console.error('❌ Error saving draft:', error);
    } finally {
      setIsSavingDraft(false);
      console.log('🏁 Save draft process completed');
    }
  };

  const loadDraft = async (draft: any) => {
    try {
      // Validate draft data before loading
      if (!draft || !draft.id) {
        throw new Error('Invalid draft data');
      }

      // Map server blocks/instructions to UI shape
      const mappedBlocks = Array.isArray(draft.conversation_blocks)
        ? [...draft.conversation_blocks]
            .sort((a: any, b: any) => (a.block_order ?? 0) - (b.block_order ?? 0))
            .map((b: any) => ({
              id: b.id || `block-${crypto?.randomUUID?.() || Date.now()}`,
              name: b.block_name || '',
              introduction: b.intro_phrase || '',
              placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
            }))
        : [];

      const mappedInstructions = Array.isArray(draft.field_instructions)
        ? draft.field_instructions.map((i: any) => ({
            id: i.id || `instruction-${crypto?.randomUUID?.() || Date.now()}`,
            fieldName: i.field_name || '',
            validationRule: i.validation_rule || '',
            helpText: i.help_text || '',
          }))
        : [];

      setFormData({
        docName: draft.doc_name || "",
        docDesc: draft.doc_desc || "",
        docCat: draft.doc_cat || "",
        targetAudience: ['personas', 'empresas'].includes(draft.target_audience) ? draft.target_audience : "personas",
        docTemplate: draft.doc_template || "",
        conversation_blocks: mappedBlocks,
        field_instructions: mappedInstructions,
        slaHours: Math.max(1, Math.min(draft.sla_hours || 4, 72)),
        slaEnabled: draft.sla_enabled !== undefined ? draft.sla_enabled : true,
        lawyerSuggestedPrice: draft.lawyer_suggested_price || "",
      });

      // Safely load AI results
      if (draft.ai_results && typeof draft.ai_results === 'object') {
        const aiData = {
          enhancedPrompt: draft.ai_results.enhancedPrompt || "",
          extractedPlaceholders: Array.isArray(draft.ai_results.extractedPlaceholders) ? draft.ai_results.extractedPlaceholders : [],
          calculatedPrice: draft.ai_results.calculatedPrice || "",
          priceJustification: draft.ai_results.priceJustification || "",
        };
        setAiResults(aiData);
        
        // Set AI processing success if there are meaningful AI results
        const hasValidAIResults = aiData.enhancedPrompt || aiData.calculatedPrice || aiData.extractedPlaceholders.length > 0;
        setAiProcessingSuccess(hasValidAIResults);
      } else {
        setAiResults({
          enhancedPrompt: "",
          extractedPlaceholders: [],
          calculatedPrice: "",
          priceJustification: "",
        });
        setAiProcessingSuccess(false);
      }

      const stepCompleted = Math.max(1, Math.min(draft.step_completed || 1, 4));
      setCurrentStep(stepCompleted);
      setMaxStepReached(Math.max(maxStepReached, stepCompleted));
      setCurrentDraftId(draft.id);
      setShowDrafts(false);

      toast({
        title: "Borrador cargado",
        description: `Se cargó el borrador "${draft.draft_name}".`,
      });
    } catch (error) {
      console.error('Error loading draft:', error);
      toast({
        title: "Error al cargar borrador",
        description: "No se pudo cargar el borrador seleccionado.",
        variant: "destructive",
      });
    }
  };

  const deleteDraft = async (draftId: string, draftName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-agent-draft', {
        body: {
          draftId,
          lawyerId: lawyerData.id // Usar el ID del lawyer profile directamente
        }
      });

      if (error) {
        console.error('Error deleting draft:', error);
        toast({
          title: "Error al eliminar borrador",
          description: "No se pudo eliminar el borrador.",
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        setDrafts(prev => prev.filter(d => d.id !== draftId));
        if (currentDraftId === draftId) {
          setCurrentDraftId(null);
        }
        
        toast({
          title: "Borrador eliminado",
          description: `Se eliminó el borrador "${draftName}".`,
        });
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({
        title: "Error al eliminar borrador",
        description: "No se pudo eliminar el borrador.",
        variant: "destructive",
      });
    }
  };

  const clearDraft = () => {
    setFormData({
      docName: "",
      docDesc: "",
      docCat: "",
      targetAudience: "personas",
      docTemplate: "",
      conversation_blocks: [],
      field_instructions: [],
      slaHours: 4,
      slaEnabled: true,
      lawyerSuggestedPrice: "",
    });
    setAiResults({
      enhancedPrompt: "",
      extractedPlaceholders: [],
      calculatedPrice: "",
      priceJustification: "",
    });
    setCurrentStep(1);
    setCurrentDraftId(null);
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate step 1 fields before proceeding
      if (!formData.docName.trim() || !formData.docDesc.trim() || !formData.docCat) {
        toast({
          title: "Campos requeridos",
          description: "Por favor completa el nombre, descripción y categoría del documento antes de continuar.",
          variant: "destructive",
        });
        return;
      }
      // For step 1, improve document info with AI first
      improveDocumentInfo();
    } else if (currentStep === 2) {
      // Validate step 2 fields and extract placeholders
      if (!formData.docTemplate.trim()) {
        toast({
          title: "Plantilla requerida",
          description: "Por favor ingresa el contenido de la plantilla del documento.",
          variant: "destructive",
        });
        return;
      }
      
      // Extract placeholders from template before going to step 3
      extractPlaceholdersFromTemplate();
      
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      await saveDraft(nextStep);
    } else if (currentStep === 3) {
      // Validate step 3 fields
      if (!formData.conversation_blocks || formData.conversation_blocks.length === 0) {
        toast({
          title: "Bloques de conversación requeridos",
          description: "Por favor organiza los placeholders en bloques de conversación.",
          variant: "destructive",
        });
        return;
      }
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      await saveDraft(nextStep);
    } else if (currentStep < 4) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
      await saveDraft(nextStep);
    }
  };
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to navigate to a specific step (only if it's been reached before)
  const goToStep = (stepNumber: number) => {
    if (stepNumber <= maxStepReached && stepNumber >= 1) {
      setCurrentStep(stepNumber);
    }
  };


  const acceptPromptImprovement = () => {
    setFormData(prev => ({
      ...prev,
      initialPrompt: promptImprovement.improvedPrompt,
    }));
    setPromptImprovement(prev => ({ ...prev, showImprovement: false, isEditing: false }));
    
    toast({
      title: "Mejoras aplicadas",
      description: "Se actualizó el prompt del agente.",
    });
  };

  const rejectPromptImprovement = () => {
    setPromptImprovement(prev => ({ ...prev, showImprovement: false, isEditing: false }));
    
    toast({
      title: "Mejoras rechazadas",
      description: "Se mantuvo el prompt original.",
    });
  };

  const enableEditingPrompt = () => {
    setPromptImprovement(prev => ({ ...prev, isEditing: true }));
  };

  const handlePromptEdit = (value: string) => {
    setPromptImprovement(prev => ({ ...prev, improvedPrompt: value }));
  };

  // Function to extract placeholders from template
  const extractPlaceholdersFromTemplate = () => {
    const template = formData.docTemplate;
    if (!template) return;

    // Extract placeholders using regex {{placeholder_name}}
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const matches = [];
    let match;
    
    while ((match = placeholderRegex.exec(template)) !== null) {
      const placeholder = match[1].trim();
      if (placeholder && !matches.some(m => m.placeholder === placeholder)) {
        matches.push({
          placeholder: placeholder,
          pregunta: `Ingresa ${placeholder.replace(/_/g, ' ')}`
        });
      }
    }

    console.log('Extracted placeholders from template:', matches);
    
    setAiResults(prev => ({
      ...prev,
      extractedPlaceholders: matches
    }));

    if (matches.length > 0) {
      toast({
        title: "Placeholders extraídos",
        description: `Se encontraron ${matches.length} placeholders en la plantilla.`,
      });
    } else {
      toast({
        title: "No se encontraron placeholders",
        description: "Asegúrate de usar el formato {{nombre_campo}} en tu plantilla.",
        variant: "destructive",
      });
    }
  };

  const processWithAI = async () => {
    console.log('🎯 [PROCESS-AI] Function initiated', { 
      timestamp: new Date().toISOString(),
      lawyerData: {
        id: lawyerData?.id,
        email: lawyerData?.email,
        canCreateAgents: lawyerData?.canCreateAgents
      },
      formData: {
        docName: formData.docName || 'NOT_SET',
        docDesc: formData.docDesc || 'NOT_SET', 
        docTemplate: formData.docTemplate ? `SET (${formData.docTemplate.length} chars)` : 'NOT_SET',
        docCat: formData.docCat || 'NOT_SET',
        conversationBlocks: formData.conversation_blocks?.length || 0,
        targetAudience: formData.targetAudience || 'NOT_SET'
      },
      currentDraftId,
      currentStep,
      maxStepReached
    });

    // Validate required fields first
    if (!formData.docName?.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del documento es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (!formData.docTemplate?.trim()) {
      toast({
        title: "Campo requerido", 
        description: "La plantilla del documento es obligatoria",
        variant: "destructive",
      });
      return;
    }

    // Soft-check placeholder coverage; proceed anyway, AI can extract/placeholders
    const extracted = (aiResults.extractedPlaceholders || []).map((p) => p.placeholder);
    if (!extracted.length) {
      console.warn('[PROCESS-AI] No placeholders extracted yet; proceeding to let AI extract them.');
    } else {
      const assigned = new Set<string>();
      (formData.conversation_blocks || []).forEach((b) => {
        (b.placeholders || []).forEach((ph) => assigned.add(ph));
      });
      const missing = extracted.filter((ph) => !assigned.has(ph));
      if (missing.length > 0) {
        console.warn('[PROCESS-AI] Missing placeholder assignments; proceeding anyway.', { missing });
      }
    }

    // Set processing state (sin cambiar de paso para no mostrar un paso intermedio)
    setIsProcessing(true);
    setAiProcessingSuccess(false);

    try {
      // Ensure latest conversation structure is saved as draft before AI
      try { await saveDraft(); } catch (e) { console.warn('⚠️ [PROCESS-AI] Auto-save before AI failed', e); }
      console.log('📡 [PROCESS-AI] Calling edge function...');

      // Prepare request payload
      const requestPayload = {
        docName: formData.docName.trim(),
        docDesc: formData.docDesc?.trim() || 'Documento legal generado automáticamente',
        category: formData.docCat || 'General',
        docTemplate: formData.docTemplate.trim(),
        conversationBlocks: (formData.conversation_blocks || []).map((b, idx) => ({
          blockName: b.name?.trim() || '',
          introPhrase: b.introduction?.trim() || '',
          placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
          blockOrder: idx + 1
        })),
        fieldInstructions: formData.field_instructions || [],
        targetAudience: formData.targetAudience || 'personas'
      };

      console.log('📤 [PROCESS-AI] Request payload prepared:', {
        ...requestPayload,
        docTemplate: `${requestPayload.docTemplate.length} characters`
      });

      // Call the AI processing function with timeout and fallback
      const invokeWithTimeout = async <T,>(p: Promise<T>, ms = 60000): Promise<T> => {
        return await Promise.race([
          p,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]) as T;
      };

      let data: any = null;
      let error: any = null;
      let usedFallback = false;

      // Try primary function with timeout
      try {
        ({ data, error } = await invokeWithTimeout(
          supabase.functions.invoke('ai-agent-processor', { body: requestPayload }),
          60000
        ));
      } catch (e) {
        console.warn('⏳ [PROCESS-AI] ai-agent-processor timeout/exception, preparing fallback...', e);
        // Treat as error to trigger fallback below
        error = error || e;
      }

      // Decide if we should fallback: network/HTTP error OR missing required fields
      const hasPlaceholdersArray = Array.isArray((data as any)?.placeholders) || Array.isArray((data as any)?.extractedPlaceholders);
      const needFallback = !!error || !data || !data.enhancedPrompt || !hasPlaceholdersArray;

      if (needFallback) {
        console.warn('🔄 [PROCESS-AI] Falling back to process-agent-ai due to error/invalid response', {
          hasData: !!data,
          hasError: !!error,
          hasEnhancedPrompt: !!data?.enhancedPrompt,
          placeholdersCount: Array.isArray((data as any)?.placeholders)
            ? (data as any).placeholders.length
            : (Array.isArray((data as any)?.extractedPlaceholders) ? (data as any).extractedPlaceholders.length : 0)
        });
        usedFallback = true;
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

      console.log('📊 [PROCESS-AI] Function invocation completed:', {
        hasData: !!data,
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        errorMessage: error?.message || null,
        usedFallback
      });

      // Handle Supabase function errors first
      if (error) {
        console.error('❌ [PROCESS-AI] Supabase error detected after fallback check:', error);
        throw new Error(`Error en la función: ${error.message || 'Error desconocido'}`);
      }

      // Handle missing data
      if (!data) {
        console.error('❌ [PROCESS-AI] No data received - data is null/undefined');
        throw new Error('No se recibió respuesta de la función de procesamiento');
      }

      // Some functions (like ai-agent-processor) might not include a success flag
      // We'll rely on the presence of required fields instead of strict success === true
      // If the backend provided an explicit error, we will handle it below with field validation
      console.log('✅ [PROCESS-AI] Success! Processing results:', {
        hasEnhancedPrompt: !!data.enhancedPrompt,
        enhancedPromptLength: data.enhancedPrompt?.length || 0,
        placeholdersCount: (Array.isArray((data as any).placeholders) ? (data as any).placeholders.length : (Array.isArray((data as any).extractedPlaceholders) ? (data as any).extractedPlaceholders.length : 0)),
        hasSuggestedPrice: !!data.suggestedPrice,
        suggestedPrice: data.suggestedPrice
      });

      // Normalize placeholders from different function variants
      const placeholderListRaw: any[] = Array.isArray((data as any).placeholders)
        ? (data as any).placeholders
        : (Array.isArray((data as any).extractedPlaceholders) ? (data as any).extractedPlaceholders : []);

      // CRITICAL FIX: Validate required AI response fields with better error handling
      if (!data.enhancedPrompt) {
        console.error('❌ [PROCESS-AI] Missing enhancedPrompt in AI response');
        throw new Error('Error: La IA no pudo generar el prompt mejorado. Verifica que la plantilla tenga placeholders válidos como {{nombre_campo}}.');
      }
      
      if (placeholderListRaw.length === 0) {
        console.error('❌ [PROCESS-AI] No placeholders found in AI response');
        // Try to extract from template as fallback
        const templatePlaceholders = extractPlaceholdersFromTemplate();
        if (aiResults.extractedPlaceholders.length === 0) {
          throw new Error('Error: No se encontraron campos (placeholders) en la plantilla. Asegúrate de usar el formato {{nombre_del_campo}}.');
        }
        console.log('✅ [PROCESS-AI] Using template-extracted placeholders as fallback');
      }

      const aiResultsData = {
        enhancedPrompt: data.enhancedPrompt || '',
        extractedPlaceholders: placeholderListRaw.length > 0 
          ? placeholderListRaw.map((p: any) => ({
              placeholder: p.placeholder || p.field || p.name || p.label || '',
              pregunta: p.pregunta || p.question || p.description || `Ingresa ${(p.placeholder || p.field || p.name || p.label || 'valor').toString().replace(/_/g, ' ')}`
            }))
          : aiResults.extractedPlaceholders, // Use existing placeholders if AI didn't return any
        calculatedPrice: data.suggestedPrice || '',
        priceJustification: data.priceJustification || ''
      };

      // Map optional AI-optimized conversation blocks and field instructions back into UI shape
      const rawOptimizedBlocks = (data as any).optimizedConversationBlocks || (data as any).optimized_conversation_blocks || (data as any).optimizedConversation?.blocks || (data as any).conversationBlocksOptimized || [];
      const optimizedBlocksUI = Array.isArray(rawOptimizedBlocks)
        ? rawOptimizedBlocks.map((b: any, idx: number) => ({
            id: b.id || `block-${crypto?.randomUUID?.() || Date.now()}-${idx}`,
            name: b.blockName || b.block_name || b.name || '',
            introduction: b.introPhrase || b.intro_phrase || b.introduction || '',
            placeholders: Array.isArray(b.placeholders) ? b.placeholders : []
          }))
        : [];

      const rawOptimizedInstructions = (data as any).optimizedFieldInstructions || (data as any).optimized_field_instructions || (data as any).fieldInstructions || (data as any).field_instructions || [];
      const optimizedInstructionsUI = Array.isArray(rawOptimizedInstructions)
        ? rawOptimizedInstructions.map((i: any, idx: number) => ({
            id: i.id || `instruction-${crypto?.randomUUID?.() || Date.now()}-${idx}`,
            fieldName: i.fieldName || i.field_name || i.name || '',
            validationRule: i.validationRule || i.validation_rule || '',
            helpText: i.helpText || i.help_text || i.description || ''
          }))
        : [];

      if (optimizedBlocksUI.length || optimizedInstructionsUI.length) {
        console.log('✨ [PROCESS-AI] Applying AI-optimized conversation/data definitions', {
          optimizedBlocks: optimizedBlocksUI.length,
          optimizedInstructions: optimizedInstructionsUI.length
        });
        setFormData(prev => ({
          ...prev,
          conversation_blocks: optimizedBlocksUI.length ? optimizedBlocksUI : prev.conversation_blocks,
          field_instructions: optimizedInstructionsUI.length ? optimizedInstructionsUI : prev.field_instructions
        }));
      }

      // Precompute the structures we'll persist (prefer AI-optimized versions when present)
      const blocksSource: any[] = optimizedBlocksUI.length ? optimizedBlocksUI : (formData.conversation_blocks || []);
      const blocksToSave = blocksSource.map((b: any, idx: number) => ({
        blockName: b.name?.trim() || '',
        introPhrase: b.introduction?.trim() || '',
        placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
        order: (b.blockOrder || b.order || (idx + 1))
      }));
      const instructionsToSave = optimizedInstructionsUI.length ? optimizedInstructionsUI : (formData.field_instructions || []);

      // Update state with results
      setAiResults(aiResultsData);
      setAiProcessingSuccess(true);

      // CRITICAL FIX: Immediately save the draft with AI results to prevent data loss
      console.log('💾 [PROCESS-AI] Saving draft with AI results immediately...');
      try {
        const draftName = formData.docName?.trim() || `Borrador ${new Date().toLocaleDateString()}`;
        
        const { data: saveData, error: saveError } = await supabase.functions.invoke('save-agent-with-blocks', {
          body: {
            lawyerId: lawyerData.id,
            draftId: currentDraftId,
            draftName,
            stepCompleted: 4, // Explicitly set to step 4
            agentData: {
              doc_name: formData.docName?.trim() || '',
              doc_desc: formData.docDesc?.trim() || '',
              doc_cat: formData.docCat || '',
              target_audience: formData.targetAudience || 'personas',
              doc_template: formData.docTemplate?.trim() || '',
              initial_prompt: '',
              sla_hours: formData.slaHours || 4,
              sla_enabled: formData.slaEnabled !== undefined ? formData.slaEnabled : true,
              lawyer_suggested_price: formData.lawyerSuggestedPrice?.trim() || '',
              ai_results: aiResultsData // Use the fresh AI results
            },
            conversationBlocks: blocksToSave,
            fieldInstructions: instructionsToSave
          }
        });

        if (saveError) {
          console.error('⚠️ [PROCESS-AI] Failed to save draft with AI results:', saveError);
        } else {
          console.log('✅ [PROCESS-AI] Draft saved with AI results successfully:', saveData);
          if (saveData?.draftId && !currentDraftId) {
            setCurrentDraftId(saveData.draftId);
          }
        }
      } catch (saveError) {
        console.error('⚠️ [PROCESS-AI] Exception saving draft:', saveError);
      }

      // Show success message and move to step 4 for manual submission
      toast({
        title: "¡Procesamiento completado!",
        description: "Tu agente ha sido procesado correctamente. Ahora puedes enviarlo a revisión.",
      });
      setCurrentStep(4);
      setMaxStepReached(Math.max(maxStepReached, 4));

      console.log('🎉 [PROCESS-AI] Process completed successfully');

    } catch (err) {
      console.error('💥 [PROCESS-AI] Error caught:', err);
      
      setAiProcessingSuccess(false);
      
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido en el procesamiento';
      
      toast({
        title: "Error en el Procesamiento",
        description: "No se pudo procesar la información con IA. Regresa al paso anterior e intenta nuevamente.",
        variant: "destructive",
      });
      
      // Don't go back to step 3, stay on step 4 to show error state
    } finally {
      console.log('🏁 [PROCESS-AI] Finally block executed');
      setIsProcessing(false);
    }
  };

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(formData.docTemplate);
      toast({
        title: "Plantilla copiada",
        description: "El contenido de la plantilla se ha copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar la plantilla. Intenta seleccionar y copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  const improveTemplateWithAI = async () => {
    console.log('🚀 improveTemplateWithAI CALLED');
    console.log('📊 FormData state:', {
      hasTemplate: !!formData.docTemplate?.trim(),
      templateLength: formData.docTemplate?.length || 0,
      docName: formData.docName,
      docCategory: formData.docCat,
      docDescription: formData.docDesc,
      targetAudience: formData.targetAudience
    });

    if (isImprovingTemplate) {
      console.warn('⏳ improveTemplateWithAI already running, ignoring click');
      return;
    }

    if (!formData.docTemplate.trim()) {
      console.log('❌ No template provided');
      toast({
        title: "Plantilla requerida",
        description: "Debes escribir una plantilla antes de mejorarla con IA.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Template validation passed, starting improvement...');
    setIsImprovingTemplate(true);
    
    try {
      console.log('🔄 Calling improve-template-ai function...', {
        templateLength: formData.docTemplate.length,
        docName: formData.docName,
        docCategory: formData.docCat
      });

      console.log('📤 About to invoke improve-template-ai with body:', {
        templateContent: String(formData.docTemplate || '').slice(0, 100) + '...',
        docName: formData.docName,
        docCategory: formData.docCat,
        docDescription: String(formData.docDesc || '').slice(0, 100) + '...',
        targetAudience: formData.targetAudience
      });

      const timeoutMs = 45000; // 45s timeout to avoid indefinite spinner
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Tiempo de espera agotado (${timeoutMs/1000}s) mejorando plantilla`)), timeoutMs)
      );

      const result: any = await Promise.race([
        supabase.functions.invoke('improve-template-ai', {
          body: {
            templateContent: formData.docTemplate,
            docName: formData.docName,
            docCategory: formData.docCat,
            docDescription: formData.docDesc,
            targetAudience: formData.targetAudience
          }
        }),
        timeoutPromise
      ]);

      const { data, error } = result || {};

      console.log('📥 Function response received:', { 
        data: data ? Object.keys(data) : null, 
        error: error ? error.message : null,
        fullData: data,
        fullError: error
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(error.message || 'Error al mejorar la plantilla con IA');
      }

      if (!data?.success) {
        console.error('❌ AI template improvement failed:', data);
        throw new Error(data?.error || 'Error en la mejora de la plantilla');
      }

      console.log('✅ Template improvement successful:', {
        originalLength: data.originalLength,
        improvedLength: data.improvedLength
      });

      // Update the template with the improved version
      setFormData(prev => ({ ...prev, docTemplate: data.improvedTemplate }));

      try {
        await saveDraft(2);
        console.log('💾 Draft saved after template improvement');
      } catch (e) {
        console.warn('⚠️ Failed to auto-save draft after improvement:', e);
      }

      setIsImprovingTemplate(false);

      toast({
        title: "Plantilla mejorada exitosamente",
        description: `Se mejoró la plantilla de ${data.originalLength} a ${data.improvedLength} caracteres.`,
      });

    } catch (error) {
      console.error('❌ Error improving template with AI:', error);
      toast({
        title: "Error al mejorar plantilla",
        description: error instanceof Error ? error.message : "No se pudo mejorar la plantilla con IA. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingTemplate(false);
    }
  };

  const improveDocumentInfo = async () => {
    console.log('🚀 improveDocumentInfo called');
    console.log('📋 Form data validation check:', {
      docName: formData.docName,
      docNameTrimmed: formData.docName?.trim(),
      docDesc: formData.docDesc,
      docDescTrimmed: formData.docDesc?.trim(),
      docCat: formData.docCat,
      targetAudience: formData.targetAudience
    });

    if (!formData.docName.trim() || !formData.docDesc.trim() || !formData.docCat) {
      console.log('❌ Validation failed - missing required fields');
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre, descripción y categoría del documento.",
        variant: "destructive",
      });
      return;
    }

    console.log('✅ Validation passed, setting loading state');
    setIsImprovingDocInfo(true);
    
    try {
      console.log('📤 Calling improve-document-info function...');
      const requestPayload = {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCategory: formData.docCat,
        targetAudience: formData.targetAudience
      };
      console.log('📦 Request payload:', requestPayload);

      const { data, error } = await supabase.functions.invoke('improve-document-info', {
        body: requestPayload
      });

      console.log('📥 Function response received:', { data, error });

      if (error) {
        console.error('❌ Error from Supabase function:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('❌ Function returned unsuccessful response:', data);
        throw new Error(data?.error || 'Error en la mejora de información del documento');
      }

      console.log('✅ Function successful, updating UI with improvements');
      // Show the improvement to the user
      setDocInfoImprovement({
        improvedName: data.improvedName,
        improvedDescription: data.improvedDescription,
        originalName: data.originalName,
        originalDescription: data.originalDescription,
        showImprovement: true,
        isEditing: false,
      });

      toast({
        title: "Mejoras sugeridas por IA",
        description: "Revisa las mejoras sugeridas para el nombre y descripción del documento.",
      });

    } catch (error) {
      console.error('🔥 Error in improveDocumentInfo:', error);
      toast({
        title: "Error al mejorar información",
        description: error instanceof Error ? error.message : "No se pudo mejorar la información del documento.",
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finished improveDocumentInfo, clearing loading state');
      setIsImprovingDocInfo(false);
    }
  };

  const acceptDocumentInfo = () => {
    setFormData(prev => ({
      ...prev,
      docName: docInfoImprovement.improvedName,
      docDesc: docInfoImprovement.improvedDescription,
    }));
    setDocInfoImprovement(prev => ({ ...prev, showImprovement: false, isEditing: false }));
    setCurrentStep(2);
    setMaxStepReached(Math.max(maxStepReached, 2));
    
    toast({
      title: "Mejoras aplicadas",
      description: "Se actualizó el nombre y descripción del documento.",
    });
  };

  const rejectDocumentInfo = () => {
    setDocInfoImprovement(prev => ({ ...prev, showImprovement: false, isEditing: false }));
    setCurrentStep(2);
    setMaxStepReached(Math.max(maxStepReached, 2)); // Update max step reached
    
    toast({
      title: "Mejoras rechazadas",
      description: "Se mantuvieron los valores originales.",
    });
  };

  const enableEditingDocInfo = () => {
    setDocInfoImprovement(prev => ({ ...prev, isEditing: true }));
  };

  const handleDocInfoEdit = (field: 'improvedName' | 'improvedDescription', value: string) => {
    setDocInfoImprovement(prev => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    console.log('=== HANDLEPUBLISH STARTED ===');
    console.log('Current timestamp:', new Date().toISOString());
    console.log('LawyerData:', lawyerData);
    console.log('FormData:', formData);
    console.log('AIResults:', aiResults);
    console.log('currentStep:', currentStep);
    
    try {
      if (!formData.docName || !formData.docDesc || !formData.docCat || !formData.docTemplate) {
        toast({
          title: "Campos incompletos",
          description: "Por favor completa todos los campos requeridos antes de enviar a revisión.",
          variant: "destructive",
        });
        return;
      }

      if (!aiResults.enhancedPrompt || aiResults.extractedPlaceholders.length === 0) {
        toast({
          title: "Procesamiento IA incompleto",
          description: "Debes completar el procesamiento de IA en el paso anterior antes de enviar a revisión.",
          variant: "destructive",
        });
        console.error('❌ [HANDLE-PUBLISH] Missing AI results:', {
          hasEnhancedPrompt: !!aiResults.enhancedPrompt,
          placeholdersCount: aiResults.extractedPlaceholders.length,
          currentStep
        });
        return;
      }

      // El precio será definido por el administrador al aprobar
      const lawyerPriceValue = 0;
      const calculatedPriceValue = 0;
      
      console.log('Publishing agent with data:', {
        name: formData.docName,
        created_by: lawyerData.id,
        lawyerPriceValue,
        calculatedPriceValue,
        hasPermissions: !!lawyerData.canCreateAgents,
        enhancedPromptLength: aiResults.enhancedPrompt.length,
        placeholdersCount: aiResults.extractedPlaceholders.length
      });
      
      if (!lawyerData.canCreateAgents) {
        throw new Error('No tienes permisos para crear agentes. Solicita acceso al administrador.');
      }
      
      // Prepare agent data
      const agentData = {
        name: formData.docName,
        description: formData.docDesc,
        category: formData.docCat,
        template_content: formData.docTemplate,
        ai_prompt: aiResults.enhancedPrompt,
        placeholder_fields: aiResults.extractedPlaceholders,
        price: 0,
        price_justification: '',
        status: 'pending_review',
        created_by: lawyerData.id,
        target_audience: formData.targetAudience,
        sla_hours: formData.slaEnabled ? formData.slaHours : null,
        sla_enabled: formData.slaEnabled,
        document_name: formData.docName,
        document_description: formData.docDesc,
        frontend_icon: 'FileText',
        button_cta: 'Generar Documento'
      };

      // Create final agent in legal_agents table directly
      const { data, error } = await supabase
        .from('legal_agents')
        .insert(agentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating legal agent:', error);
        throw new Error(`Failed to create agent: ${error.message}`);
      }

      // Now handle conversation blocks for the final agent
      if (formData.conversation_blocks && formData.conversation_blocks.length > 0) {
        const blocksToInsert = formData.conversation_blocks.map((b, idx) => ({
          agent_id: data.id,
          block_name: b.name?.trim() || '',
          intro_phrase: b.introduction?.trim() || '',
          placeholders: Array.isArray(b.placeholders) ? b.placeholders : [],
          block_order: idx + 1
        }));

        const { error: blocksError } = await supabase
          .from('conversation_blocks')
          .insert(blocksToInsert);

        if (blocksError) {
          console.error('Error creating conversation blocks:', blocksError);
          // Don't fail the whole operation for block errors
        }
      }

      // Handle field instructions for the final agent
      if (formData.field_instructions && formData.field_instructions.length > 0) {
        const instructionsToInsert = formData.field_instructions.map((instruction) => ({
          agent_id: data.id,
          field_name: instruction.fieldName,
          validation_rule: instruction.validationRule,
          help_text: instruction.helpText
        }));

        const { error: instructionsError } = await supabase
          .from('field_instructions')
          .insert(instructionsToInsert);

        if (instructionsError) {
          console.error('Error creating field instructions:', instructionsError);
          // Don't fail the whole operation for instruction errors
        }
      }

      if (!data) {
        console.error('No agent data returned from operation');
        toast({
          title: "Error al enviar a revisión",
          description: "No se pudo crear el agente. Verifica que todos los campos estén completos.",
          variant: "destructive",
        });
        return;
      }

      // Agent will be submitted for review - OpenAI agent will be created upon approval
      toast({
        title: "¡Agente enviado a revisión!",
        description: `El agente "${formData.docName}" fue enviado a revisión exitosamente. Una vez aprobado, se creará automáticamente un agente OpenAI especializado para optimizar la experiencia del usuario.`,
        variant: "default",
      });

      // Delete the current draft since it's now published
      if (currentDraftId) {
        try {
          await supabase.functions.invoke('delete-agent-draft', {
            body: {
              draftId: currentDraftId,
              lawyerId: lawyerData.id
            }
          });
          console.log('Draft deleted after successful publish');
        } catch (draftError) {
          console.warn('Could not delete draft after publish:', draftError);
          // Non-critical error, don't show to user
        }
      }

      // Reset form and go back (solo si no fue auto-enviado tras IA)
      if (!autoSubmitAfterAI) {
        setFormData({
          docName: "",
          docDesc: "",
          docCat: "",
          targetAudience: "personas",
          docTemplate: "",
          conversation_blocks: [],
          field_instructions: [],
          slaHours: 4,
          slaEnabled: true,
          lawyerSuggestedPrice: "",
        });
        setAiResults({
          enhancedPrompt: "",
          extractedPlaceholders: [],
          calculatedPrice: "",
          priceJustification: "",
        });
        setCurrentDraftId(null); // Reset draft ID
        setDocInfoImprovement({
          improvedName: "",
          improvedDescription: "",
          originalName: "",
          originalDescription: "",
          showImprovement: false,
          isEditing: false,
        });
        setPromptImprovement({
          improvedPrompt: "",
          originalPrompt: "",
          showImprovement: false,
          isEditing: false,
        });
        setCurrentStep(1);
        onBack();
      } else {
        // Mantener en paso 5 mostrando confirmación de envío
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Error publishing agent:', error);
      toast({
        title: "Error al enviar a revisión",
        description: "No se pudo enviar el agente a revisión. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Rich text editor functions
  const handleTextFormat = (format: string) => {
    const textarea = document.getElementById('docTemplate') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.docTemplate.substring(start, end);
    let formattedText = '';

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      case 'h1':
        formattedText = `# ${selectedText}`;
        break;
      case 'h2':
        formattedText = `## ${selectedText}`;
        break;
      case 'h3':
        formattedText = `### ${selectedText}`;
        break;
      case 'center':
        formattedText = `<center>${selectedText}</center>`;
        break;
      case 'right':
        formattedText = `<div align="right">${selectedText}</div>`;
        break;
      default:
        formattedText = selectedText;
    }

    const newText = formData.docTemplate.substring(0, start) + formattedText + formData.docTemplate.substring(end);
    setFormData(prev => ({ ...prev, docTemplate: newText }));

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Token Status Alert */}
        {!lawyerData?.canCreateAgents && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-amber-500 rounded-full"></div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                Acceso Limitado
              </h3>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Tu cuenta aún no tiene permisos para crear agentes. Puedes explorar la funcionalidad, pero no podrás guardar borradores ni crear agentes. 
              <br />
              Contacta al administrador para obtener acceso completo.
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
          
          <div className="flex gap-2 ml-auto">
            {/* Save Draft Button */}
            <Button 
              variant="outline" 
              onClick={() => saveDraft()}
              disabled={isSavingDraft || !lawyerData?.canCreateAgents}
              className="flex items-center gap-2"
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSavingDraft ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
            
            {/* Drafts Button */}
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDrafts(true);
                loadDrafts();
              }}
              className="flex items-center gap-2"
              
            >
              <FileText className="h-4 w-4" />
              Borradores ({drafts.length})
            </Button>
          </div>
        </div>

        {/* Drafts Modal */}
        {showDrafts && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Borradores Guardados</CardTitle>
                <CardDescription>
                  Selecciona un borrador para continuar o elimina los que ya no necesites.
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setShowDrafts(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingDrafts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Cargando borradores...</span>
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tienes borradores guardados
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{draft.draft_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Paso {draft.step_completed} • {new Date(draft.updated_at).toLocaleString()}
                        </p>
                        {draft.doc_cat && (
                          <Badge variant="outline" className="mt-1">
                            {draft.doc_cat}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => loadDraft(draft)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Cargar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteDraft(draft.id, draft.draft_name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={clearDraft}>
                      Empezar Nuevo Agente
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl text-primary">Creador de Agentes Legales</CardTitle>
            <CardDescription>
              Crea un nuevo servicio de documento legal para los clientes en 5 sencillos pasos.
              {currentDraftId && (
                <span className="block mt-2 text-emerald-600">
                  <Save className="h-4 w-4 inline mr-1" />
                  Borrador guardado automáticamente
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Steps Indicator */}
            {isMobile ? (
              // Mobile stepper - current step indicator
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    Paso {currentStep} de {steps.length}
                  </div>
                  <div className="text-sm font-medium">
                    {steps[currentStep - 1]?.title}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / steps.length) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {steps[currentStep - 1]?.description}
                </div>
              </div>
            ) : (
              // Desktop stepper - horizontal tabs
              <div className="flex border-b border-border mb-8">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={step.id > maxStepReached}
                    className={`flex-1 text-center py-4 font-semibold border-b-4 transition-colors relative ${
                      currentStep === step.id
                        ? 'border-primary text-primary'
                        : step.id <= maxStepReached
                        ? 'border-transparent text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer'
                        : 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                    }`}
                  >
                    {step.id < currentStep && step.id <= maxStepReached && (
                      <CheckCircle className="h-4 w-4 text-green-600 absolute top-2 right-2" />
                    )}
                    Paso {step.id}: {step.title}
                  </button>
                ))}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Información Básica del Documento</h2>
                
                {/* Loading state while improving with AI */}
                {isImprovingDocInfo && (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-lg">Mejorando información con IA...</p>
                    <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
                  </div>
                )}
                
                {/* Show AI improvements */}
                {docInfoImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                        ✨ Mejoras Sugeridas por IA
                      </h3>
                      
                      <div className="space-y-6">
                        {/* Name comparison */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Nombre del Documento</Label>
                          {docInfoImprovement.isEditing ? (
                            <div className="space-y-2">
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">Editando mejora:</p>
                              <Input
                                value={docInfoImprovement.improvedName}
                                onChange={(e) => handleDocInfoEdit('improvedName', e.target.value)}
                                className="border-emerald-200 dark:border-emerald-800 focus:border-emerald-300 dark:focus:border-emerald-700"
                                placeholder="Edita el nombre mejorado"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Original:</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                                  {docInfoImprovement.originalName}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mejorado:</p>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 text-sm">
                                  {docInfoImprovement.improvedName}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Description comparison */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Descripción</Label>
                          {docInfoImprovement.isEditing ? (
                            <div className="space-y-2">
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">Editando mejora:</p>
                              <Textarea
                                value={docInfoImprovement.improvedDescription}
                                onChange={(e) => handleDocInfoEdit('improvedDescription', e.target.value)}
                                className="border-emerald-200 dark:border-emerald-800 focus:border-emerald-300 dark:focus:border-emerald-700"
                                placeholder="Edita la descripción mejorada"
                                rows={4}
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Original:</p>
                                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                                  {docInfoImprovement.originalDescription}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mejorado:</p>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 text-sm">
                                  {docInfoImprovement.improvedDescription}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-end gap-3'} mt-6`}>
                        <Button 
                          variant="outline" 
                          onClick={rejectDocumentInfo}
                          className={isMobile ? "w-full" : ""}
                        >
                          Mantener Original
                        </Button>
                        {!docInfoImprovement.isEditing && (
                          <Button 
                            variant="outline" 
                            onClick={enableEditingDocInfo}
                            className={`text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/20 ${isMobile ? "w-full" : ""}`}
                          >
                            <Wand2 className="h-4 w-4 mr-2" />
                            Editar Mejoras
                          </Button>
                        )}
                        <Button 
                          onClick={acceptDocumentInfo}
                          className={`bg-emerald-600 hover:bg-emerald-700 ${isMobile ? "w-full" : ""}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {docInfoImprovement.isEditing ? 'Aplicar Cambios' : 'Aplicar Mejoras'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Regular form fields */}
                {!isImprovingDocInfo && !docInfoImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="docName">Nombre del Documento (para clientes)</Label>
                      <Input
                        id="docName"
                        value={formData.docName}
                        onChange={(e) => handleInputChange('docName', e.target.value)}
                        placeholder="Ej: Contrato de Promesa de Compraventa"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docDesc">Descripción Corta (para clientes)</Label>
                      <Textarea
                        id="docDesc"
                        value={formData.docDesc}
                        onChange={(e) => handleInputChange('docDesc', e.target.value)}
                        placeholder="Ej: Asegura la compra de un inmueble mientras se completan los trámites."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="docCat">Categoría</Label>
                      <Select value={formData.docCat} onValueChange={(value) => handleInputChange('docCat', value)}>
                        <SelectTrigger className="mt-1">
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
                     
                     {/* Target Audience Selection */}
                     <div>
                       <Label htmlFor="targetAudience">Dirigido a</Label>
                       <Select value={formData.targetAudience} onValueChange={(value) => handleInputChange('targetAudience', value)}>
                         <SelectTrigger className="mt-1">
                           <SelectValue placeholder="Selecciona el público objetivo" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="personas">👤 Personas (Clientes individuales)</SelectItem>
                           <SelectItem value="empresas">🏢 Empresas (Clientes corporativos)</SelectItem>
                         </SelectContent>
                       </Select>
                       <p className="text-xs text-muted-foreground mt-1">
                         Esto ayudará a la IA a personalizar el documento y las preguntas según el tipo de cliente
                       </p>
                     </div>
                     
                    {/* ANS Configuration */}
                    <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/50">
                      <h3 className="font-semibold text-sm">⏱️ Configuración de ANS (Acuerdo de Nivel de Servicio)</h3>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="slaEnabled"
                          checked={formData.slaEnabled}
                          onChange={(e) => handleInputChange('slaEnabled', e.target.checked.toString())}
                          className="rounded"
                        />
                        <Label htmlFor="slaEnabled" className="text-sm">
                          Habilitar ANS para este tipo de documento
                        </Label>
                      </div>
                      
                      {formData.slaEnabled && (
                        <div>
                          <Label htmlFor="slaHours" className="text-sm">
                            Tiempo límite de respuesta (horas)
                          </Label>
                          <Select 
                            value={formData.slaHours.toString()} 
                            onValueChange={(value) => handleInputChange('slaHours', value)}
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
                              <SelectItem value="24">24 horas (máximo)</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tiempo máximo para revisar y entregar documentos de este tipo
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>💡 Mejora automática:</strong> Al hacer clic en "Siguiente", nuestra IA optimizará automáticamente el nombre y descripción para que sean más atractivos y comprensibles para los usuarios finales.
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Button 
                        onClick={handleNext}
                        disabled={isImprovingDocInfo}
                        className={`${isImprovingDocInfo ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isImprovingDocInfo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Mejorando con IA...
                          </>
                        ) : (
                          <>
                            Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Template */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Plantilla del Documento</h2>
                <div className={`${isMobile ? 'space-y-4' : 'flex items-start justify-between'} mb-4`}>
                  <p className={`text-muted-foreground ${isMobile ? 'mb-2' : 'max-w-md'}`}>
                    Pega el texto completo de tu plantilla. Usa placeholders como `{"{{nombre_del_campo}}"}` para las variables.
                  </p>
                  <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex gap-3 flex-shrink-0'}`}>
                    {formData.docTemplate && (
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        onClick={copyTemplate}
                        className={isMobile ? "w-full justify-center" : "min-w-[140px]"}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    )}
                    {formData.docTemplate && formData.docName && (
                      <Button 
                        variant="outline" 
                        size={isMobile ? "default" : "sm"}
                        onClick={improveTemplateWithAI}
                        disabled={isImprovingTemplate}
                        className={`bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 dark:bg-purple-950/50 dark:hover:bg-purple-950/70 dark:border-purple-800 dark:text-purple-300 ${isMobile ? "w-full justify-center" : "min-w-[140px]"}`}
                      >
                        {isImprovingTemplate ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4 mr-2" />
                        )}
                        {isImprovingTemplate ? (isMobile ? 'Mejorando...' : 'Mejorando...') : (isMobile ? 'Mejorar IA' : 'Mejorar IA')}
                      </Button>
                    )}
                  </div>
                </div>
                
                {formData.docTemplate && formData.docName && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      <strong>💡 Mejora con IA:</strong> Usa el botón "Mejorar con IA" para que nuestra IA optimice tu plantilla, agregue cláusulas legales importantes y mejore la redacción manteniendo todos los placeholders existentes.
                    </p>
                  </div>
                )}

                {/* Rich Text Editor Toolbar */}
                <div className="border border-input rounded-lg overflow-hidden">
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap gap-1 p-2 bg-muted/50 border-b border-input">
                    {/* Text Formatting */}
                    <div className="flex gap-1 border-r border-input pr-2 mr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('bold')}
                        className="h-8 w-8 p-0"
                        title="Negrita"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('italic')}
                        className="h-8 w-8 p-0"
                        title="Cursiva"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('underline')}
                        className="h-8 w-8 p-0"
                        title="Subrayado"
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Headings */}
                    <div className="flex gap-1 border-r border-input pr-2 mr-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('h1')}
                        className="h-8 px-2 text-xs font-bold"
                        title="Título 1"
                      >
                        H1
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('h2')}
                        className="h-8 px-2 text-xs font-bold"
                        title="Título 2"
                      >
                        H2
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('h3')}
                        className="h-8 px-2 text-xs font-bold"
                        title="Título 3"
                      >
                        H3
                      </Button>
                    </div>
                    
                    {/* Alignment */}
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('center')}
                        className="h-8 w-8 p-0"
                        title="Centrar"
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTextFormat('right')}
                        className="h-8 w-8 p-0"
                        title="Alinear a la derecha"
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Text Area */}
                  <Textarea
                    id="docTemplate"
                    value={formData.docTemplate}
                    onChange={(e) => handleInputChange('docTemplate', e.target.value)}
                    placeholder="Ej: CONTRATO DE PROMESA DE COMPRAVENTA... Entre los suscritos a saber: {{nombre_promitente_vendedor}}, mayor de edad..."
                    rows={15}
                    className="font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0"
                  />
                </div>
                
                {/* Help text for formatting */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>💡 Cómo usar el editor:</strong> Selecciona el texto que deseas formatear y luego haz clic en los botones de formato. 
                    Los placeholders como <code>{"{{nombre_campo}}"}</code> no se verán afectados por el formateo.
                  </p>
                </div>

                {/* Preview placeholders if found */}
                {aiResults.extractedPlaceholders.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      ✅ Placeholders encontrados ({aiResults.extractedPlaceholders.length})
                    </h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {aiResults.extractedPlaceholders.map((item, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                          {item.placeholder}
                        </Badge>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={extractPlaceholdersFromTemplate}
                      className="text-xs"
                    >
                      🔄 Re-escanear placeholders
                    </Button>
                  </div>
                )}
                
                <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                  <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button onClick={handleNext} className={isMobile ? "w-full" : ""}>
                    Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Conversation Guide */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Paso 3: Guía de Conversación</h2>
                  <p className="text-muted-foreground">
                    Organiza los placeholders en bloques de conversación. Esto definirá el orden en que Lexi le pedirá la información al cliente.
                  </p>
                </div>

                {aiResults.extractedPlaceholders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">
                        No se encontraron placeholders
                      </h3>
                      <p className="text-amber-700 dark:text-amber-300 mb-4">
                        Para crear la guía de conversación, necesitas agregar placeholders en tu plantilla usando el formato <code>{"{{nombre_campo}}"}</code>
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={handlePrev}
                        className="border-amber-300 text-amber-800 hover:bg-amber-100"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a la plantilla
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>✨ ¡Excelente!</strong> Se encontraron {aiResults.extractedPlaceholders.length} placeholders en tu plantilla. 
                        Ahora organízalos en bloques de conversación para crear una experiencia fluida para el usuario.
                      </p>
                    </div>

                    <ConversationGuideBuilder 
                      placeholders={aiResults.extractedPlaceholders.map(p => p.placeholder)}
                      conversationBlocks={formData.conversation_blocks || []}
                      onBlocksChange={(blocks) => setFormData({ ...formData, conversation_blocks: blocks })}
                    />

                    <FieldInstructionsManager
                      placeholders={aiResults.extractedPlaceholders.map(p => p.placeholder)}
                      fieldInstructions={formData.field_instructions || []}
                      onInstructionsChange={(instructions) => setFormData({ ...formData, field_instructions: instructions })}
                    />
                  </>
                )}

                 <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                  <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                  </Button>
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (isProcessing) return;
                      console.log('🎯 [BUTTON CLICK] Procesar con IA button clicked!');
                      console.log('Current form data:', {
                        docName: formData.docName,
                        hasTemplate: !!formData.docTemplate,
                        conversationBlocks: formData.conversation_blocks?.length || 0,
                        userId: lawyerData?.id
                      });
                      processWithAI();
                    }} 
                    disabled={isProcessing || !formData.docName?.trim() || !formData.docTemplate?.trim()}
                    aria-busy={isProcessing}
                    className={`bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? "w-full" : ""}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Procesar con IA
                      </>
                    )}
                  </Button>
                </div>
                
                {(!formData.docName?.trim() || !formData.docTemplate?.trim()) && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>⚠️ Campos requeridos:</strong> Asegúrate de haber completado el nombre del documento y la plantilla antes de procesar con IA.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: AI Processing & Review */}
            {false && currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Procesando con IA…</h2>
                <p className="text-muted-foreground mb-6">
                  Estamos preparando el agente con la información suministrada. Este paso es automático y no requiere tu intervención.
                </p>

                {isProcessing ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-lg">Procesando con IA...</p>
                    <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
                  </div>
                 ) : aiProcessingSuccess ? (
                  <div className="text-center py-12">
                    <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
                    <p className="text-lg">Listo. Redirigiendo al paso 5…</p>
                  </div>
                 ) : (
                   <div className="text-center py-12">
                     <div className="mb-6">
                       <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                         <span className="text-2xl">⚠️</span>
                       </div>
                       <h3 className="text-xl font-bold mb-2">Error en el Procesamiento</h3>
                       <p className="text-muted-foreground mb-6">
                         No se pudo procesar la información con IA. Regresa al paso anterior e intenta nuevamente.
                       </p>
                       <Button onClick={() => setCurrentStep(3)} variant="outline">
                         <ArrowLeft className="h-4 w-4 mr-2" />
                         Volver a Intentar
                       </Button>
                     </div>
                   </div>
                )}
              </div>
            )}

            {/* Step 4: Publish (antes era Paso 5) */}
            {currentStep === 4 && (
              <div className="text-center py-12">
                {aiProcessingSuccess ? (
                  <>
                    <CheckCircle className="mx-auto h-24 w-24 text-success mb-6" />
                    <h2 className="text-3xl font-bold mb-4">¡Todo Listo!</h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                      El nuevo agente para el documento <strong>"{formData.docName}"</strong> está configurado y listo para ser enviado a revisión. 
                      Una vez aprobado por el administrador, estará disponible para todos los clientes en el sitio web.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Procesamiento Pendiente</h2>
                    <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                      Debes completar el procesamiento con IA en el paso anterior antes de poder enviar a revisión.
                    </p>
                    <Button onClick={() => setCurrentStep(3)} variant="outline" className="mb-4">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver al Paso Anterior
                    </Button>
                  </>
                )}
                   {aiProcessingSuccess && !autoSubmitAfterAI && (
                     <div className={isMobile ? "space-y-3" : "flex items-center justify-center gap-4"}>
                       <Button 
                         onClick={(e) => {
                           e.preventDefault();
                           e.stopPropagation();
                           console.log('=== BUTTON CLICK EVENT ===');
                           console.log('Event:', e);
                           console.log('Current Step:', currentStep);
                           console.log('LawyerData:', lawyerData);
                           console.log('LawyerData permissions (canCreateAgents):', lawyerData?.canCreateAgents);
                           console.log('FormData:', formData);
                           console.log('AIResults:', aiResults);
                           console.log('About to call handlePublish...');
                           handlePublish();
                         }} 
                         size={isMobile ? "default" : "lg"} 
                         className={`${isMobile ? "w-full text-base px-6 py-3" : "text-xl px-10 py-4"}`}
                         disabled={isPublishing}
                       >
                         {isPublishing ? (
                           <>
                             <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                             Enviando...
                           </>
                         ) : (
                           'Enviar a Revisión'
                         )}
                       </Button>

                       <Button
                         variant="outline"
                         size={isMobile ? "default" : "lg"}
                         className={`${isMobile ? "w-full text-base px-6 py-3" : "text-xl px-10 py-4"}`}
                         onClick={() => {
                           window.location.hash = 'abogados';
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                         }}
                         aria-label="Ir al Dashboard de Abogado"
                       >
                         Ir al Dashboard de Abogado
                       </Button>
                     </div>
                   )}

              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
