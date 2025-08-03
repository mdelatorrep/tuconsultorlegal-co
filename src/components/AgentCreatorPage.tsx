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
  
  const [formData, setFormData] = useState({
    docName: "",
    docDesc: "",
    docCat: "",
    targetAudience: "personas", // "personas" o "empresas"
    docTemplate: "",
    initialPrompt: "",
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

  const { toast } = useToast();
  const isMobile = useIsMobile();

  const steps = [
    { id: 1, title: "Info Básica", description: "Información del documento" },
    { id: 2, title: "Plantilla", description: "Texto del documento" },
    { id: 3, title: "Prompt", description: "Instrucciones iniciales" },
    { id: 4, title: "Magia IA", description: "Procesamiento automático" },
    { id: 5, title: "Revisar", description: "Envío a revisión" },
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

      if (error) {
        console.error('❌ Error loading categories:', error);
        return;
      }

      console.log('✅ Categories loaded:', data);
      const categoryNames = data?.map(cat => cat.name) || [];
      console.log('📋 Category names:', categoryNames);
      setCategories(categoryNames);
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
    // Evitar auto-save en la carga inicial o cuando no hay datos mínimos
    if (!formData.docName && !formData.docDesc && !formData.docTemplate && !formData.initialPrompt) {
      return;
    }

    // Debounce auto-save para evitar múltiples saves
    const timer = setTimeout(() => {
      if (!isSavingDraft && lawyerData?.canCreateAgents) {
        saveDraft();
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer);
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

  const saveDraft = async () => {
    if (isSavingDraft) return; // Prevent multiple simultaneous saves
    
    // Skip auto-save if user doesn't have permissions
    if (!lawyerData?.canCreateAgents) {
      console.log('Cannot save draft - user does not have agent creation permissions');
      return;
    }
    
    setIsSavingDraft(true);
    try {
      const draftName = formData.docName?.trim() || `Borrador ${new Date().toLocaleDateString()}`;
      
      console.log('Attempting to save draft with lawyerId:', lawyerData.id);
      
      const { data, error } = await supabase.functions.invoke('save-agent-draft', {
        body: {
          lawyerId: lawyerData.id,
          draftId: currentDraftId,
          draftName,
          stepCompleted: currentStep,
          formData: {
            ...formData,
            // Ensure clean data
            docName: formData.docName?.trim() || '',
            docDesc: formData.docDesc?.trim() || '',
            docTemplate: formData.docTemplate?.trim() || '',
            initialPrompt: formData.initialPrompt?.trim() || ''
          },
          aiResults
        }
      });

      if (error) {
        console.error('Error saving draft:', error);
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
          console.log('Draft created with ID:', data.draftId);
        } else {
          console.log('Draft updated successfully');
        }
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const loadDraft = async (draft: any) => {
    try {
      // Validate draft data before loading
      if (!draft || !draft.id) {
        throw new Error('Invalid draft data');
      }

      setFormData({
        docName: draft.doc_name || "",
        docDesc: draft.doc_desc || "",
        docCat: draft.doc_cat || "",
        targetAudience: ['personas', 'empresas'].includes(draft.target_audience) ? draft.target_audience : "personas",
        docTemplate: draft.doc_template || "",
        initialPrompt: draft.initial_prompt || "",
        slaHours: Math.max(1, Math.min(draft.sla_hours || 4, 72)),
        slaEnabled: draft.sla_enabled !== undefined ? draft.sla_enabled : true,
        lawyerSuggestedPrice: draft.lawyer_suggested_price || "",
      });

      // Safely load AI results
      if (draft.ai_results && typeof draft.ai_results === 'object') {
        setAiResults({
          enhancedPrompt: draft.ai_results.enhancedPrompt || "",
          extractedPlaceholders: Array.isArray(draft.ai_results.extractedPlaceholders) ? draft.ai_results.extractedPlaceholders : [],
          calculatedPrice: draft.ai_results.calculatedPrice || "",
          priceJustification: draft.ai_results.priceJustification || "",
        });
      } else {
        setAiResults({
          enhancedPrompt: "",
          extractedPlaceholders: [],
          calculatedPrice: "",
          priceJustification: "",
        });
      }

      const stepCompleted = Math.max(1, Math.min(draft.step_completed || 1, 5));
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
      initialPrompt: "",
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

  const handleNext = () => {
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
      // Validate step 2 fields
      if (!formData.docTemplate.trim()) {
        toast({
          title: "Plantilla requerida",
          description: "Por favor ingresa el contenido de la plantilla del documento.",
          variant: "destructive",
        });
        return;
      }
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
    } else if (currentStep === 3) {
      // Validate step 3 fields
      if (!formData.initialPrompt.trim()) {
        toast({
          title: "Prompt requerido",
          description: "Por favor ingresa las instrucciones iniciales para el agente.",
          variant: "destructive",
        });
        return;
      }
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
    } else if (currentStep === 4) {
      // Validate step 4 fields (AI processing and price)
      if (!aiResults.enhancedPrompt || aiResults.extractedPlaceholders.length === 0) {
        toast({
          title: "Procesamiento IA incompleto",
          description: "Debes completar el procesamiento de IA antes de continuar.",
          variant: "destructive",
        });
        return;
      }
      if (!formData.lawyerSuggestedPrice || formData.lawyerSuggestedPrice.trim() === '') {
        toast({
          title: "Precio requerido",
          description: "Por favor ingresa un precio sugerido para el documento.",
          variant: "destructive",
        });
        return;
      }
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
    } else if (currentStep < 5) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepReached(Math.max(maxStepReached, nextStep));
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

  const processWithAI = async () => {
    setIsProcessing(true);
    setCurrentStep(4);
    setMaxStepReached(Math.max(maxStepReached, 4)); // Update max step reached
    
    try {
      console.log('Processing with AI...', {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCat: formData.docCat,
        templateLength: formData.docTemplate.length,
        promptLength: formData.initialPrompt.length,
        lawyerData: lawyerData, // Add this to debug
        hasPermissions: !!lawyerData?.canCreateAgents
      });

      // AI processing doesn't require special permissions, only basic authentication

      const { data, error } = await supabase.functions.invoke('process-agent-ai', {
        body: {
          docName: formData.docName,
          docDesc: formData.docDesc,
          docCat: formData.docCat,
          docTemplate: formData.docTemplate,
          initialPrompt: formData.initialPrompt,
          targetAudience: formData.targetAudience
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al procesar con IA');
      }

      if (!data?.success) {
        console.error('AI processing failed:', data);
        throw new Error(data?.error || 'Error en el procesamiento de IA');
      }

      console.log('AI processing successful:', {
        enhancedPromptLength: data.enhancedPrompt?.length,
        placeholdersCount: data.extractedPlaceholders?.length,
        suggestedPrice: data.suggestedPrice
      });

      setAiResults({
        enhancedPrompt: data.enhancedPrompt || '',
        extractedPlaceholders: data.extractedPlaceholders || [],
        calculatedPrice: data.suggestedPrice || '$ 50,000 COP',
        priceJustification: data.priceJustification || 'Precio estimado basado en complejidad del documento.'
      });

      setAiProcessingSuccess(true);
      setIsProcessing(false);

      toast({
        title: "Procesamiento completado",
        description: `Se generó un prompt mejorado y se identificaron ${data.extractedPlaceholders?.length || 0} variables.`,
      });

    } catch (error) {
      console.error('Error processing with AI:', error);
      setIsProcessing(false);
      setAiProcessingSuccess(false);
      
      toast({
        title: "Error en el procesamiento",
        description: error instanceof Error ? error.message : "No se pudo procesar con IA. Intenta nuevamente.",
        variant: "destructive",
      });

      // Stay on step 4 to show error and allow retry
      // setCurrentStep(3); // Commented out to prevent redirect
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
    if (!formData.docTemplate.trim()) {
      toast({
        title: "Plantilla requerida",
        description: "Debes escribir una plantilla antes de mejorarla con IA.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingTemplate(true);
    
    try {
      console.log('Improving template with AI...', {
        templateLength: formData.docTemplate.length,
        docName: formData.docName,
        docCategory: formData.docCat
      });

      const { data, error } = await supabase.functions.invoke('improve-template-ai', {
        body: {
          templateContent: formData.docTemplate,
          docName: formData.docName,
          docCategory: formData.docCat,
          docDescription: formData.docDesc,
          targetAudience: formData.targetAudience
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Error al mejorar la plantilla con IA');
      }

      if (!data?.success) {
        console.error('AI template improvement failed:', data);
        throw new Error(data?.error || 'Error en la mejora de la plantilla');
      }

      console.log('Template improvement successful:', {
        originalLength: data.originalLength,
        improvedLength: data.improvedLength
      });

      // Update the template with the improved version
      setFormData(prev => ({ ...prev, docTemplate: data.improvedTemplate }));

      setIsImprovingTemplate(false);

      toast({
        title: "Plantilla mejorada exitosamente",
        description: `Se mejoró la plantilla de ${data.originalLength} a ${data.improvedLength} caracteres.`,
      });

    } catch (error) {
      console.error('Error improving template with AI:', error);
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
    console.log('=== improveDocumentInfo CALLED ===');
    console.log('Form data validation:', {
      docName: formData.docName?.trim(),
      docDesc: formData.docDesc?.trim(),
      docCat: formData.docCat,
      targetAudience: formData.targetAudience
    });

    if (!formData.docName.trim() || !formData.docDesc.trim() || !formData.docCat) {
      console.log('Validation failed - missing required fields');
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el nombre, descripción y categoría del documento.",
        variant: "destructive",
      });
      return;
    }

    console.log('Setting isImprovingDocInfo to true');
    setIsImprovingDocInfo(true);
    
    try {
      console.log('Improving document info with AI...', {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCategory: formData.docCat,
        targetAudience: formData.targetAudience
      });

      console.log('About to call supabase.functions.invoke...');
      
      const requestBody = {
        docName: formData.docName,
        docDesc: formData.docDesc,
        docCategory: formData.docCat,
        targetAudience: formData.targetAudience
      };
      
      console.log('Request body being sent:', requestBody);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La mejora de IA tomó demasiado tiempo')), 30000)
      );
      
      console.log('Calling improve-document-info function...');
      
      const functionPromise = supabase.functions.invoke('improve-document-info', {
        body: requestBody
      });
      
      console.log('Function promise created, awaiting response...');
      
      const { data, error } = await Promise.race([functionPromise, timeoutPromise]) as any;

      console.log('=== SUPABASE FUNCTION RESPONSE ===');
      console.log('Raw response data:', data);
      console.log('Raw response error:', error);
      console.log('Response type of data:', typeof data);
      console.log('Response type of error:', typeof error);
      console.log('====================================');

      if (error) {
        console.error('Supabase function error:', error);
        setIsImprovingDocInfo(false);
        toast({
          title: "Error al mejorar información",
          description: "No se pudo mejorar la información del documento. Continuando con datos originales.",
          variant: "destructive",
        });
        // Continue to next step with original data
        setCurrentStep(2);
        setMaxStepReached(Math.max(maxStepReached, 2));
        return;
      }

      if (!data?.success) {
        console.error('AI document info improvement failed:', data);
        throw new Error(data?.error || 'Error en la mejora de información del documento');
      }

      console.log('Document info improvement successful:', {
        improvedName: data.improvedName,
        improvedDescription: data.improvedDescription
      });

      // Show the improvement to the user
      setDocInfoImprovement({
        improvedName: data.improvedName,
        improvedDescription: data.improvedDescription,
        originalName: data.originalName,
        originalDescription: data.originalDescription,
        showImprovement: true,
        isEditing: false,
      });

      setIsImprovingDocInfo(false);

      toast({
        title: "Mejoras sugeridas por IA",
        description: "Revisa las mejoras sugeridas para el nombre y descripción del documento.",
      });

    } catch (error) {
      console.error('=== ERROR IN improveDocumentInfo ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setIsImprovingDocInfo(false);
      
      toast({
        title: "Error al mejorar información",
        description: "No se pudo mejorar la información del documento. Continuando con datos originales.",
        variant: "destructive",
      });

      // Continue to next step even if improvement fails
      setCurrentStep(2);
      setMaxStepReached(Math.max(maxStepReached, 2));
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
          description: "Debes completar el procesamiento de IA en el paso 4 antes de enviar a revisión.",
          variant: "destructive",
        });
        return;
      }

      // Validate lawyer suggested price is provided
      if (!formData.lawyerSuggestedPrice || formData.lawyerSuggestedPrice.trim() === '') {
        toast({
          title: "Precio requerido",
          description: "Por favor ingresa un precio sugerido para el documento.",
          variant: "destructive",
        });
        return;
      }

      // Convert lawyer suggested price to integer (remove $ and commas), ensure it's a valid number
      const lawyerPriceValue = parseInt(formData.lawyerSuggestedPrice.replace(/[^0-9]/g, '')) || 50000; // Default minimum
      // Convert calculated price to integer (for admin review), default to lawyer price if invalid
      const calculatedPriceValue = parseInt(aiResults.calculatedPrice.replace(/[^0-9]/g, '')) || lawyerPriceValue;
      
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
      
      const { data, error } = await supabase
         .from('legal_agents')
         .insert({
            name: formData.docName,
            description: formData.docDesc,
            category: formData.docCat,
            template_content: formData.docTemplate,
            ai_prompt: aiResults.enhancedPrompt,
            placeholder_fields: aiResults.extractedPlaceholders,
            price: calculatedPriceValue, // Use the unified price field
            price_justification: aiResults.priceJustification || 'Precio estimado por el abogado',
           status: 'pending_review',
           created_by: lawyerData.id, // Usar el ID del lawyer profile directamente
           target_audience: formData.targetAudience,
           sla_hours: formData.slaEnabled ? formData.slaHours : null,
           sla_enabled: formData.slaEnabled,
           document_name: formData.docName, // Use the same name as the agent name
           document_description: formData.docDesc,
           frontend_icon: 'FileText',
           button_cta: 'Generar Documento'
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Error creating agent:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        let errorMessage = "No se pudo crear el agente. Intenta nuevamente.";
        
        // Provide specific error messages for common issues
        if (error.message?.includes('foreign key')) {
          errorMessage = "Error de permisos. Por favor cierra sesión e inicia sesión nuevamente.";
        } else if (error.message?.includes('duplicate')) {
          errorMessage = "Ya existe un agente con este nombre. Usa un nombre diferente.";
        } else if (error.message?.includes('violates check')) {
          errorMessage = "Los datos del agente no son válidos. Revisa todos los campos.";
        } else if (error.message?.includes('null value')) {
          errorMessage = "Faltan campos requeridos. Asegúrate de completar todos los pasos correctamente.";
        } else if (error.code === 'PGRST116') {
          errorMessage = "No se pudo guardar el agente. Verifica que todos los campos estén completos.";
        }
        
        toast({
          title: "Error al enviar a revisión",
          description: `${errorMessage} (${error.message})`,
          variant: "destructive",
        });
        return;
      }

      if (!data) {
        console.error('No data returned from insert operation');
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

      // Reset form and go back
      setFormData({
        docName: "",
        docDesc: "",
        docCat: "",
        targetAudience: "personas",
        docTemplate: "",
        initialPrompt: "",
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
    } catch (error) {
      console.error('Error publishing agent:', error);
      toast({
        title: "Error al enviar a revisión",
        description: "No se pudo enviar el agente a revisión. Intenta nuevamente.",
        variant: "destructive",
      });
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
              onClick={saveDraft}
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
                            <SelectItem value="" disabled>
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

            {/* Step 3: Initial Prompt */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Prompt Inicial para el Agente de IA</h2>
                
                
                {/* Show AI improvements */}
                {promptImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 text-green-800 dark:text-green-200">
                        ✨ Prompt Mejorado por IA
                      </h3>
                      
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Prompt del Agente</Label>
                        {promptImprovement.isEditing ? (
                          <div className="space-y-2">
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">Editando mejora:</p>
                            <Textarea
                              value={promptImprovement.improvedPrompt}
                              onChange={(e) => handlePromptEdit(e.target.value)}
                              className="border-emerald-200 dark:border-emerald-800 focus:border-emerald-300 dark:focus:border-emerald-700"
                              placeholder="Edita el prompt mejorado"
                              rows={12}
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Original:</p>
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border text-sm max-h-40 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{promptImprovement.originalPrompt}</pre>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Mejorado:</p>
                              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded border border-emerald-200 dark:border-emerald-800 text-sm max-h-60 overflow-y-auto">
                                <pre className="whitespace-pre-wrap">{promptImprovement.improvedPrompt}</pre>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-end gap-3'} mt-6`}>
                        <Button 
                          variant="outline" 
                          onClick={rejectPromptImprovement}
                          className={isMobile ? "w-full" : ""}
                        >
                          Mantener Original
                        </Button>
                        {!promptImprovement.isEditing && (
                          <Button 
                            variant="outline" 
                            onClick={enableEditingPrompt}
                            className={`text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/20 ${isMobile ? "w-full" : ""}`}
                          >
                            <Wand2 className="h-4 w-4 mr-2" />
                            Editar Mejoras
                          </Button>
                        )}
                        <Button 
                          onClick={acceptPromptImprovement}
                          className={`bg-emerald-600 hover:bg-emerald-700 ${isMobile ? "w-full" : ""}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {promptImprovement.isEditing ? 'Aplicar Cambios' : 'Aplicar Mejoras'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regular form fields */}
                {!promptImprovement.showImprovement && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-blue-800 dark:text-blue-200">📋 Guía para el Prompt</h3>
                      <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                        <p><strong>✅ Incluye:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Rol específico del agente (ej: "asistente legal especializado en...")</li>
                          <li>Objetivo claro del documento</li>
                          <li>Información que debe recopilar del usuario</li>
                          <li>Tono de conversación (profesional, amigable, etc.)</li>
                          <li>Validaciones especiales (si aplica)</li>
                        </ul>
                        <p className="pt-2"><strong>❌ Evita:</strong></p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>Instrucciones técnicas complejas</li>
                          <li>Referencias a herramientas específicas</li>
                          <li>Detalles de formato del documento final</li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                      <h3 className="text-lg font-semibold mb-3">💡 Ejemplo de Prompt Efectivo</h3>
                      <div className="bg-white dark:bg-gray-800 border rounded p-4 text-sm">
                        <pre className="whitespace-pre-wrap font-mono text-gray-700 dark:text-gray-300">
{`Eres un asistente legal especializado en contratos de arrendamiento residencial en Colombia.

TU OBJETIVO: Ayudar a propietarios e inquilinos a crear un contrato de arrendamiento completo y legalmente válido.

INFORMACIÓN A RECOPILAR:
1. Datos del arrendador (nombre, cédula, dirección)
2. Datos del arrendatario (nombre, cédula, teléfono, ocupación)
3. Información del inmueble (dirección completa, estrato, área)
4. Condiciones económicas (canon, depósito, incrementos)
5. Duración del contrato y fecha de inicio
6. Servicios incluidos/excluidos
7. Condiciones especiales (mascotas, huéspedes, etc.)

ESTILO DE CONVERSACIÓN:
- Mantén un tono profesional pero cercano
- Explica brevemente por qué necesitas cada dato
- Confirma información importante antes de continuar
- Haz una pregunta a la vez para no abrumar

VALIDACIONES:
- Asegúrate de que las cédulas tengan formato válido
- Confirma que las fechas sean coherentes
- Verifica que los montos estén en pesos colombianos`}
                        </pre>
                      </div>
                    </div>

                    <p className="text-muted-foreground mb-4">
                      <strong>Instrucción:</strong> Escribe tu prompt inicial siguiendo la guía anterior. En el siguiente paso, la IA optimizará tu prompt automáticamente junto con el análisis completo del documento.
                    </p>
                    
                    <div className="flex gap-2 mb-4">
                      <Textarea
                        value={formData.initialPrompt}
                        onChange={(e) => handleInputChange('initialPrompt', e.target.value)}
                        placeholder="Escribe aquí tu prompt inicial siguiendo la guía anterior..."
                        rows={12}
                        className="text-sm flex-1"
                      />
                    </div>

                    
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>💡 Tip:</strong> Escribe tu prompt inicial siguiendo la guía anterior. 
                        En el siguiente paso, la IA mejorará automáticamente tu prompt junto con todo el análisis del documento.
                      </p>
                    </div>

                    <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                      <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                      </Button>
                      <Button onClick={processWithAI} className={`bg-emerald-600 hover:bg-emerald-700 ${isMobile ? "w-full" : ""}`}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Procesar con IA
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: AI Processing & Review */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold mb-6">Revisión y Mejora por IA</h2>
                <p className="text-muted-foreground mb-6">
                  Nuestra plataforma ha analizado tus insumos y ha generado una configuración optimizada para el nuevo agente. Por favor, revisa y aprueba.
                </p>

                {isProcessing ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-lg">Procesando con IA...</p>
                    <p className="text-muted-foreground">Esto puede tomar unos segundos</p>
                  </div>
                 ) : aiProcessingSuccess ? (
                   <div className="space-y-8">
                      {/* Enhanced Prompt */}
                      <div>
                        <h3 className="text-xl font-bold mb-2">1. Prompt del Agente (Mejorado)</h3>
                        <Textarea
                          value={aiResults.enhancedPrompt}
                          onChange={(e) => setAiResults(prev => ({ ...prev, enhancedPrompt: e.target.value }))}
                          rows={15}
                          className="text-sm"
                          placeholder="Prompt del agente mejorado por IA..."
                        />
                      </div>

                     {/* Extracted Placeholders */}
                     <div>
                       <h3 className="text-xl font-bold mb-2">2. Variables Identificadas en la Plantilla</h3>
                       <div className="p-4 bg-muted rounded-md border">
                         <div className="flex flex-wrap gap-2">
                           {aiResults.extractedPlaceholders.map((item, index) => (
                             <Badge key={index} variant="secondary">
                               {item.placeholder}
                             </Badge>
                           ))}
                         </div>
                       </div>
                     </div>

                      {/* Lawyer Price Input */}
                      <div>
                        <h3 className="text-xl font-bold mb-2">3. Precio para el Cliente Final</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Ingresa el precio que consideras justo para cobrar al cliente final por este documento.
                        </p>
                        <div className="space-y-2">
                          <Label htmlFor="lawyerPrice" className="text-base font-medium">
                            Precio Sugerido (COP) - Requerido *
                          </Label>
                          <Input
                            id="lawyerPrice"
                            type="text"
                            placeholder="Ej: $ 80,000 COP"
                            value={formData.lawyerSuggestedPrice}
                            onChange={(e) => handleInputChange('lawyerSuggestedPrice', e.target.value)}
                            className={`text-lg font-semibold ${!formData.lawyerSuggestedPrice ? 'border-red-300 focus:border-red-500' : ''}`}
                          />
                          {!formData.lawyerSuggestedPrice && (
                            <p className="text-sm text-red-600">Este campo es requerido para continuar al paso 5</p>
                          )}
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            💡 <strong>Sugerencia del sistema:</strong> {aiResults.calculatedPrice}<br/>
                            <span className="text-xs">{aiResults.priceJustification}</span>
                          </p>
                        </div>
                      </div>

                      <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex justify-between'}`}>
                        <Button variant="outline" onClick={handlePrev} className={isMobile ? "w-full" : ""}>
                          <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <Button onClick={handleNext} className={isMobile ? "w-full" : ""}>
                          Siguiente <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
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

            {/* Step 5: Publish */}
            {currentStep === 5 && (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto h-24 w-24 text-success mb-6" />
                <h2 className="text-3xl font-bold mb-4">¡Todo Listo!</h2>
                 <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                   El nuevo agente para el documento <strong>"{formData.docName}"</strong> está configurado y listo para ser enviado a revisión. 
                   Una vez aprobado por el administrador, estará disponible para todos los clientes en el sitio web.
                 </p>
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
                   >
                     Enviar a Revisión
                   </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
