import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, User, Bot, FileText } from "lucide-react";
import { toast } from "sonner";
import { useUserAuth } from "@/hooks/useUserAuth";
import { useTermsAudit } from "@/hooks/useTermsAudit";

interface DocumentChatFlowProps {
  agentId: string;
  onBack: () => void;
  onComplete: (token: string) => void;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  showGenerateButton?: boolean;
}

interface AgentData {
  id: string;
  name: string;
  document_name: string;
  template_content: string;
  price: number;
  sla_hours: number | null;
  ai_prompt: string;
  placeholder_fields: any;
}

export default function DocumentChatFlow({ agentId, onBack, onComplete }: DocumentChatFlowProps) {
  const { user, isAuthenticated } = useUserAuth();
  const { logDocumentCreationTerms } = useTermsAudit();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [showUserForm, setShowUserForm] = useState(false);
  const [collectedData, setCollectedData] = useState<Record<string, any>>({});
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados para OpenAI
  const [threadId, setThreadId] = useState<string | null>(null);
  const [openaiAgentId, setOpenaiAgentId] = useState<string | null>(null);

  // Estados para manejo de términos y condiciones
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Cargar perfil de usuario autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserProfile();
    }
  }, [isAuthenticated, user]);

  const loadUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();

    if (data) {
      setUserProfile(data);
      setUserInfo({
        name: data.full_name || user.user_metadata?.full_name || "",
        email: user.email || "",
      });
    }
  };

  // Verificar términos: usuarios autenticados ya los aceptaron en el registro
  useEffect(() => {
    if (isAuthenticated) {
      setTermsAccepted(true);
      setShowTermsDialog(false);
      setDataProcessingConsent(true);
      setAcceptedTerms(true);
      setAcceptedPrivacy(true);
    } else {
      const accepted = localStorage.getItem(`terms_accepted_${agentId}`);
      const dataConsent = localStorage.getItem(`data_consent_${agentId}`);

      // IMPORTANTE: Solo ocultar el diálogo si AMBOS están aceptados
      if (accepted === "true" && dataConsent === "true") {
        setTermsAccepted(true);
        setShowTermsDialog(false);
        setAcceptedTerms(true);
        setAcceptedPrivacy(true);
        setDataProcessingConsent(true);
      } else {
        // Si falta alguno, mostrar el diálogo de nuevo
        setShowTermsDialog(true);
        setTermsAccepted(false);
      }
    }
  }, [agentId, isAuthenticated]);

  // Solo cargar agente DESPUÉS de aceptar términos
  useEffect(() => {
    if (termsAccepted) {
      setLoading(true); // Activar loading solo cuando va a cargar
      loadAgent();
    }
  }, [agentId, termsAccepted]);

  useEffect(() => {
    // Usar setTimeout para evitar que el scroll interfiera con el foco
    setTimeout(() => scrollToBottom(), 100);
  }, [messages]);

  // Persist chat data to localStorage with sync to DocumentFormFlow
  useEffect(() => {
    if (messages.length > 0) {
      const chatData = {
        messages,
        collectedData,
        userInfo,
        threadId, // ✅ GUARDAR threadId
        openaiAgentId, // ✅ GUARDAR openaiAgentId
        timestamp: Date.now(),
        agentId,
        mode: "chat",
      };

      localStorage.setItem(`chat_${agentId}`, JSON.stringify(chatData));

      // Sync with form flow data
      localStorage.setItem(
        `document_session_${agentId}`,
        JSON.stringify({
          ...chatData,
          extractedFormData: collectedData,
        }),
      );
    }
  }, [messages, collectedData, userInfo, agentId, threadId, openaiAgentId]);

  // Load persisted data on mount with validation
  useEffect(() => {
    const loadPersistedData = async () => {
      const persistedData = localStorage.getItem(`chat_${agentId}`);
      if (persistedData) {
        try {
          const parsed = JSON.parse(persistedData);
          const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24 hours

          if (isRecent && parsed.messages.length > 1) {
            // Verificar si el threadId aún existe en la base de datos
            if (parsed.threadId && parsed.openaiAgentId) {
              const { data: conversation } = await supabase
                .from("agent_conversations")
                .select("id")
                .eq("thread_id", parsed.threadId)
                .eq("openai_agent_id", parsed.openaiAgentId)
                .maybeSingle();

              // Si no existe conversación en BD, limpiar localStorage
              if (!conversation) {
                console.log("⚠️ ThreadId no válido (conversación limpiada por admin), iniciando nueva sesión");
                localStorage.removeItem(`chat_${agentId}`);
                localStorage.removeItem(`document_session_${agentId}`);
                return;
              }
            }

            // Convert timestamp strings/numbers back to Date objects
            // Y recalcular showGenerateButton para cada mensaje
            const messagesWithDates = parsed.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
              // Recalcular showGenerateButton basado en el contenido actual
              showGenerateButton: msg.role === "assistant" ? shouldShowGenerateButton(msg.content) : false,
            }));

            setMessages(messagesWithDates);
            setCollectedData(parsed.collectedData || {});
            setUserInfo(parsed.userInfo || { name: "", email: "" });

            // ✅ RESTAURAR threadId y openaiAgentId solo si son válidos
            if (parsed.threadId) {
              setThreadId(parsed.threadId);
              console.log("✅ ThreadId restored from localStorage:", parsed.threadId);
            }
            if (parsed.openaiAgentId) {
              setOpenaiAgentId(parsed.openaiAgentId);
              console.log("✅ OpenAI AgentId restored from localStorage:", parsed.openaiAgentId);
            }
          }
        } catch (error) {
          console.error("Error loading persisted chat data:", error);
          localStorage.removeItem(`chat_${agentId}`);
        }
      }
    };

    loadPersistedData();
  }, [agentId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadAgent = async () => {
    try {
      console.log("🔍 Loading agent:", agentId);
      const { data, error } = await supabase.from("legal_agents").select("*").eq("id", agentId).maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Agente no encontrado");
        return;
      }

      setAgent(data);

      // 🔑 VERIFICAR OPENAI ASSISTANT AL INICIO
      console.log("🔍 Checking for OpenAI assistant...", {
        openai_enabled: data.openai_enabled,
        agentId,
      });

      let detectedAssistantId: string | null = null;
      if (data.openai_enabled) {
        const { data: openaiAgent, error: agentError } = await supabase
          .from("openai_agents")
          .select("openai_agent_id, status")
          .eq("legal_agent_id", agentId)
          .eq("status", "active")
          .maybeSingle();

        if (openaiAgent && openaiAgent.openai_agent_id) {
          console.log("✅ OpenAI Assistant found:", openaiAgent.openai_agent_id);
          detectedAssistantId = openaiAgent.openai_agent_id;
          setOpenaiAgentId(openaiAgent.openai_agent_id);
        } else {
          console.log("⚠️ No active OpenAI assistant found, will use fallback chat");
        }
      } else {
        console.log("ℹ️ OpenAI not enabled for this agent");
      }

      console.log("✅ Agent loaded successfully:", {
        name: data.name,
        document_name: data.document_name,
        openai_enabled: data.openai_enabled,
        has_assistant: !!detectedAssistantId,
      });

      // Only add initial message if there are no existing messages
      if (messages.length === 0) {
        const initialMessage: Message = {
          role: "user",
          content: `Quiero crear un ${data.document_name}. Por favor ayúdame con la información necesaria.`,
          timestamp: new Date(),
        };
        setMessages([initialMessage]);

        console.log("📤 Sending initial request to assistant with ID:", detectedAssistantId);
        // Pass the assistantId directly to ensure it's used immediately
        await getInitialResponse(data, initialMessage, detectedAssistantId);
      }
    } catch (error) {
      console.error("❌ Error loading agent:", error);
      toast.error("Error al cargar el agente");
    } finally {
      setLoading(false);
    }
  };

  const getInitialResponse = async (agentData: AgentData, userMessage: Message, assistantId: string | null = null) => {
    try {
      const effectiveAssistantId = assistantId || openaiAgentId;

      console.log("🤖 Getting initial response for document:", agentData.document_name);
      console.log("🔑 OpenAI Assistant:", {
        passedAssistantId: assistantId,
        stateAssistantId: openaiAgentId,
        effectiveAssistantId: effectiveAssistantId,
      });

      // SI HAY OPENAI ASSISTANT, USARLO
      if (effectiveAssistantId) {
        console.log("🚀 Using OpenAI orchestrator for initial response with assistant:", effectiveAssistantId);

        const { data, error } = await supabase.functions.invoke("agent-workflow-orchestrator", {
          body: {
            messages: [{ role: userMessage.role, content: userMessage.content }],
            agentId: effectiveAssistantId,
            documentTokenId: null,
            threadId: null, // New conversation
            userContext:
              isAuthenticated && userInfo.name && userInfo.email
                ? {
                    isAuthenticated: true,
                    name: userInfo.name,
                    email: userInfo.email,
                  }
                : null,
          },
        });

        if (error) {
          console.error("❌ OpenAI orchestrator error:", error);
          throw error;
        }

        console.log("✅ Initial response received from OpenAI");

        // Save threadId for future messages
        if (data.threadId) {
          setThreadId(data.threadId);
        }

        const sanitizedMessage = sanitizeAssistantMessage(data.message);
        const assistantMessage: Message = {
          role: "assistant",
          content: sanitizedMessage,
          timestamp: new Date(),
          showGenerateButton: shouldShowGenerateButton(sanitizedMessage),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        return;
      }

      // FALLBACK: Usar document-chat con prompt conversacional (no el ai_prompt técnico)
      console.log("📝 Using fallback document-chat with conversational prompt");

      const userContextInfo =
        isAuthenticated && userInfo.name && userInfo.email
          ? `\n\nCONTEXTO DE USUARIO AUTENTICADO:
- El usuario YA está registrado en el sistema
- Nombre: ${userInfo.name}
- Email: ${userInfo.email}
- NO solicites su nombre ni correo electrónico, ya los tenemos
- Enfócate ÚNICAMENTE en recopilar la información específica del documento`
          : `\n\nCONTEXTO DE USUARIO ANÓNIMO:
- El usuario NO está registrado
- Deberás solicitar nombre y correo al FINAL, cuando tengas toda la información del documento`;

      // Construir lista de campos requeridos de forma conversacional (sin exponer estructura técnica)
      const requiredFieldsList = agentData.placeholder_fields 
        ? agentData.placeholder_fields.map((field: any) => {
            const fieldName = field.field || field.name || '';
            const description = field.description || field.label || fieldName;
            return `- ${description}`;
          }).join("\n")
        : "";

      // USAR el ai_prompt del agente SOLO si es conversacional, de lo contrario usar prompt genérico
      // Detectar si el ai_prompt es técnico (contiene palabras clave que no deberían mostrarse al usuario)
      const technicalKeywords = ['payload', 'json', 'placeholder', 'template', 'generate_document', 'prompt operativo', 'extraiga placeholders'];
      const isAgentPromptTechnical = technicalKeywords.some(keyword => 
        agentData.ai_prompt?.toLowerCase().includes(keyword.toLowerCase())
      );

      const conversationalPrompt = isAgentPromptTechnical
        ? `Eres Lexi, un asistente legal profesional de Praxis Hub. Ayudarás al usuario a crear su ${agentData.document_name}.

Información que necesitas recopilar (haz UNA pregunta a la vez):
${requiredFieldsList}

Normaliza automáticamente:
- Nombres en MAYÚSCULAS
- Ciudades con departamento (ej: BOGOTÁ, CUNDINAMARCA)
- Cédulas con puntos (ej: 1.234.567.890)
- Fechas en formato: 15 de enero de 2025

Cuando tengas TODA la información, presenta un resumen y pregunta: "He recopilado toda la información necesaria. ¿Deseas proceder con la generación del documento?"

Sé claro, profesional y confiable. No uses formato markdown.
${userContextInfo}`
        : `${agentData.ai_prompt}
${userContextInfo}`;

      const { data, error } = await supabase.functions.invoke("document-chat", {
        body: {
          messages: [{ role: userMessage.role, content: userMessage.content }],
          agent_prompt: conversationalPrompt,
          document_name: agentData.document_name,
        },
      });

      if (error) throw error;

      console.log("✅ Initial response received, length:", data.message?.length);

      const sanitizedMsg = sanitizeAssistantMessage(data.message);
      const assistantMessage: Message = {
        role: "assistant",
        content: sanitizedMsg,
        timestamp: new Date(),
        showGenerateButton: shouldShowGenerateButton(sanitizedMsg),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("❌ Error getting initial response:", error);
      toast.error("Error al inicializar el chat");
    }
  };

  // Function to sanitize assistant messages, removing technical info
  const sanitizeAssistantMessage = (message: string): string => {
    if (!message) return message;
    
    // Patrones de información técnica que no deben mostrarse al usuario
    const technicalPatterns = [
      /ID Agent Conversation:\s*[a-f0-9-]+/gi,
      /Thread ID:\s*[a-zA-Z0-9_-]+/gi,
      /Agent ID:\s*[a-zA-Z0-9_-]+/gi,
      /conversation_id:\s*[a-f0-9-]+/gi,
      /run_id:\s*[a-zA-Z0-9_-]+/gi,
    ];
    
    let sanitized = message;
    for (const pattern of technicalPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Limpiar líneas vacías múltiples
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n').trim();
    
    return sanitized;
  };

  // Function to determine if generate button should be shown
  const shouldShowGenerateButton = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();

    // Frases que indican que el asistente HA COMPLETADO la recopilación
    const completionPhrases = [
      "he recopilado toda la información",
      "toda la información está completa",
      "ya tengo toda la información",
      "información completa",
      "¿deseas proceder con la generación",
      "proceder con la generación del documento",
      "listo para generar el documento",
      "¿deseas que continúe con la generación",
    ];

    // Frases que NO deben activar el botón (está pidiendo información)
    const excludePhrases = [
      "necesito",
      "ayúdame con",
      "por favor",
      "proporciona",
      "¿cuál es",
      "¿cuáles son",
      "dime",
      "indícame",
    ];

    // Solo mostrar si contiene frase de completitud Y NO contiene frases de solicitud
    const hasCompletionPhrase = completionPhrases.some((phrase) => lowerMessage.includes(phrase));
    const hasExcludePhrase = excludePhrases.some((phrase) => lowerMessage.includes(phrase));

    return hasCompletionPhrase && !hasExcludePhrase;
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !agent || sending || isRateLimited) return;

    const userMessage: Message = {
      role: "user",
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setCurrentMessage("");
    setSending(true);

    console.log("📨 Sending message:", {
      messageLength: currentMessage.length,
      totalMessages: updatedMessages.length,
      hasOpenAIAgent: !!openaiAgentId,
      openaiAgentId: openaiAgentId,
      threadId: threadId,
    });

    try {
      // 🎯 USAR OPENAI ASSISTANT SI ESTÁ DISPONIBLE
      console.log("🎯 Using assistant:", {
        hasOpenAI: !!openaiAgentId,
        agentId: openaiAgentId,
        threadId: threadId,
        willUseFallback: !openaiAgentId,
      });

      if (!openaiAgentId) {
        console.log("⚠️ No OpenAI assistant available, using fallback chat with conversational prompt");
        
        // Detectar si el ai_prompt es técnico
        const technicalKeywords = ['payload', 'json', 'placeholder', 'template', 'generate_document', 'prompt operativo', 'extraiga placeholders'];
        const isAgentPromptTechnical = technicalKeywords.some(keyword => 
          agent.ai_prompt?.toLowerCase().includes(keyword.toLowerCase())
        );

        // Construir lista de campos requeridos
        const requiredFieldsList = agent.placeholder_fields 
          ? agent.placeholder_fields.map((field: any) => {
              const fieldName = field.field || field.name || '';
              const description = field.description || field.label || fieldName;
              return `- ${description}`;
            }).join("\n")
          : "";

        const conversationalPrompt = isAgentPromptTechnical
          ? `Eres Lexi, un asistente legal amigable de Praxis Hub. Ayudarás al usuario a crear su ${agent.document_name}.

Información que necesitas recopilar (haz UNA pregunta a la vez):
${requiredFieldsList}

Normaliza automáticamente:
- Nombres en MAYÚSCULAS
- Ciudades con departamento (ej: BOGOTÁ, CUNDINAMARCA)
- Cédulas con puntos (ej: 1.234.567.890)
- Fechas en formato: 15 de enero de 2025

Cuando tengas TODA la información, presenta un resumen y pregunta: "He recopilado toda la información necesaria. ¿Deseas proceder con la generación del documento?"

Sé amable, claro y profesional. No uses formato markdown.`
          : agent.ai_prompt;

        // Fallback to original chat system if no OpenAI agent exists
        const { data, error } = await supabase.functions.invoke("document-chat", {
          body: {
            messages: updatedMessages.map((msg) => ({ role: msg.role, content: msg.content })),
            agent_prompt: conversationalPrompt,
            document_name: agent.document_name,
          },
        });

        if (error) throw error;

        const assistantMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          showGenerateButton: shouldShowGenerateButton(data.message),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setSending(false);
        return;
      }

      // 🚀 USAR OPENAI WORKFLOW ORCHESTRATOR
      console.log("🚀 Calling OpenAI orchestrator with:", {
        agentId: openaiAgentId,
        threadId,
        messageCount: updatedMessages.length,
        lastMessageContent: updatedMessages[updatedMessages.length - 1].content.substring(0, 50),
      });

      const requestBody = {
        messages: updatedMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        agentId: openaiAgentId,
        documentTokenId: null, // Will be set when document is generated
        threadId: threadId,
        userContext:
          isAuthenticated && userInfo.name && userInfo.email
            ? {
                isAuthenticated: true,
                name: userInfo.name,
                email: userInfo.email,
              }
            : null,
      };

      console.log("📤 Request to orchestrator:", JSON.stringify(requestBody, null, 2));

      const { data, error } = await supabase.functions.invoke("agent-workflow-orchestrator", {
        body: requestBody,
      });

      // 🚨 Manejo específico de errores con retry automático
      if (error) {
        console.error("❌ OpenAI Agent error:", error);
        console.error("❌ Error details:", JSON.stringify(error, null, 2));

        // Detectar error de rate limit (429)
        if (
          error.message?.includes("rate_limit") ||
          error.message?.includes("Rate limit") ||
          error.message?.includes("429")
        ) {
          console.log("⏳ Rate limit detectado, reintentando en 2 segundos...");
          setIsRateLimited(true);

          // Esperar 2 segundos y reintentar automáticamente
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Reintentar la llamada
          const { data: retryData, error: retryError } = await supabase.functions.invoke(
            "agent-workflow-orchestrator",
            {
              body: requestBody,
            },
          );

          setIsRateLimited(false);

          if (retryError) {
            // Si el reintento también falla, mostrar error
            toast.error("El sistema está ocupado. Por favor intenta de nuevo en un momento.");
            setSending(false);
            return;
          }

          // Reintento exitoso, continuar con la respuesta
          if (retryData.threadId) {
            setThreadId(retryData.threadId);
          }

          const retryMsg = sanitizeAssistantMessage(retryData.message);
          const assistantMessage: Message = {
            role: "assistant",
            content: retryMsg,
            timestamp: new Date(),
            showGenerateButton: shouldShowGenerateButton(retryMsg),
          };

          const extractedData = extractInformationFromMessage(userMessage.content);
          setCollectedData((prev) => ({ ...prev, ...extractedData }));
          setMessages((prev) => [...prev, assistantMessage]);
          maintainInputFocus();
          setSending(false);
          return;
        }

        // Detectar error de cuota excedida (503)
        if (
          error.message?.includes("quota") ||
          error.message?.includes("exceeded") ||
          error.message?.includes("503")
        ) {
          console.log("⚠️ Cuota de IA excedida, usando fallback...");
          toast.error("El servicio de IA está temporalmente no disponible. Usando modo alternativo.");
          // Continuar con fallback abajo
        }

        // Para otros errores, mostrar mensaje pero sin toast agresivo
        console.error("⚠️ Error no crítico, intentando fallback...");

        // Fallback to original chat system
        const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke("document-chat", {
          body: {
            messages: updatedMessages.map((msg) => ({ role: msg.role, content: msg.content })),
            agent_prompt: agent.ai_prompt,
            document_name: agent.document_name,
          },
        });

        if (fallbackError) {
          console.error("Fallback chat also failed:", fallbackError);
          toast.error(`Error al procesar tu mensaje. Por favor intenta nuevamente.`);
          setSending(false);
          return;
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: fallbackData.message,
          timestamp: new Date(),
          showGenerateButton: shouldShowGenerateButton(fallbackData.message),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setSending(false);
        return;
      }

      // Update thread ID if new thread was created
      if (data.threadId) {
        if (!threadId) {
          console.log("✅ New threadId received:", data.threadId);
        } else {
          console.log("✅ ThreadId confirmed:", data.threadId);
        }
        setThreadId(data.threadId);
      } else {
        console.warn("⚠️ No threadId in response");
      }

      // Verificar que recibimos una respuesta válida
      if (!data || !data.message) {
        console.error("❌ No valid response received from orchestrator");
        console.error("❌ Response data:", JSON.stringify(data, null, 2));
        throw new Error("No se recibió una respuesta válida del asistente");
      }

      console.log("✅ Response received:", {
        messageLength: data.message?.length,
        hasThreadId: !!data.threadId,
        runStatus: data.runStatus,
      });

      const cleanMessage = sanitizeAssistantMessage(data.message);
      const assistantMessage: Message = {
        role: "assistant",
        content: cleanMessage,
        timestamp: new Date(),
        showGenerateButton: shouldShowGenerateButton(cleanMessage),
      };

      // Extract information from the conversation for placeholders
      const extractedData = extractInformationFromMessage(userMessage.content);
      setCollectedData((prev) => ({ ...prev, ...extractedData }));

      // Agregar el mensaje del asistente solo una vez
      setMessages((prev) => [...prev, assistantMessage]);

      // Mantener foco en el input después de recibir respuesta
      maintainInputFocus();
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMsg = error?.message || "Error desconocido al procesar tu mensaje";
      toast.error(`Error: ${errorMsg}`);
      // Mantener foco incluso en caso de error
      maintainInputFocus();
    } finally {
      setSending(false);
    }
  };

  const extractInformationFromMessage = (content: string): Record<string, any> => {
    const extracted: Record<string, any> = {};

    // Extract common patterns based on agent's placeholder fields
    if (agent?.placeholder_fields && Array.isArray(agent.placeholder_fields)) {
      agent.placeholder_fields.forEach((field: any) => {
        if (field.type === "text" || field.type === "string") {
          // Simple extraction based on field labels and common patterns
          const fieldLabel = field.label?.toLowerCase() || field.name?.toLowerCase();
          if (fieldLabel) {
            const regex = new RegExp(`${fieldLabel}[:\\s]+([^\\n\\.]+)`, "i");
            const match = content.match(regex);
            if (match) {
              extracted[field.name] = match[1].trim();
            }
          }
        }
      });
    }

    return extracted;
  };

  const generateDocument = async () => {
    // Usuario autenticado: usar datos del perfil directamente
    if (isAuthenticated && user) {
      const userName = userProfile?.full_name || user.user_metadata?.full_name || "";
      const userEmail = user.email || "";

      if (!userName || !userEmail) {
        toast.error("No se pudo obtener tu información de perfil");
        return;
      }

      setGenerating(true);
      await executeDocumentGeneration(userName, userEmail, user.id);
      return;
    }

    // Usuario anónimo: mostrar formulario para recopilar información de contacto
    setShowUserForm(true);
  };

  const executeDocumentGeneration = async (userName: string, userEmail: string, userId: string | null = null) => {
    // Prevent duplicate generation
    if (documentGenerated || generating) {
      console.log("⚠️ Document generation already in progress or completed");
      return;
    }

    try {
      setDocumentGenerated(true); // Mark as generated immediately to prevent duplicates

      // AUDITORÍA: Registrar generación de documento (CUMPLIMIENTO REGULATORIO)
      if (agent) {
        await logDocumentCreationTerms(
          userEmail,
          agent.document_name || 'Documento',
          agentId,
          userId || undefined,
          userName
        );
      }

      const processedConversation = await processConversationData();

      const { data, error } = await supabase.functions.invoke("generate-document-from-chat", {
        body: {
          conversation: messages.map((msg) => ({ role: msg.role, content: msg.content })),
          template_content: agent.template_content,
          document_name: agent.document_name,
          user_email: userEmail,
          user_name: userName,
          user_id: userId,
          sla_hours: agent.sla_hours || 4,
          collected_data: { ...collectedData, ...processedConversation },
          placeholder_fields: agent.placeholder_fields,
          price: agent.price,
          legal_agent_id: agent.id,
        },
      });

      if (error) {
        setDocumentGenerated(false); // Reset on error so user can retry
        throw error;
      }

      if (isAuthenticated) {
        toast.success(
          <div className="space-y-2">
            <p className="font-semibold">¡Documento generado!</p>
            <p className="text-sm">Puedes verlo en tu panel de documentos</p>
          </div>,
          { duration: 5000 },
        );
      } else {
        const trackingUrl = `${window.location.origin}/seguimiento?token=${data.token}`;
        toast.success(
          <div className="space-y-2">
            <p className="font-semibold">¡Documento generado exitosamente!</p>
            <p className="text-sm">Token: {data.token}</p>
            <button onClick={() => window.open(trackingUrl, "_blank")} className="text-primary underline text-sm">
              Ver seguimiento
            </button>
          </div>,
          { duration: 10000 },
        );
      }

      onComplete(data.token);
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Error al generar el documento");
      setDocumentGenerated(false); // Reset on error
    } finally {
      setGenerating(false);
    }
  };

  const processConversationData = async () => {
    const conversationText = messages.map((msg) => msg.content).join("\n");
    const extractedData: Record<string, any> = {};

    // Extract common information patterns
    const patterns = {
      nombres: /(?:mi nombre es|me llamo|soy)\s+([^,.\n]+)/gi,
      fechas: /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi,
      ciudades: /(?:en|de|desde)\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)*)/gi,
      documentos: /(?:cédula|cc|nit|rut)\s*:?\s*(\d{1,3}(?:\.\d{3})*(?:\.\d{3})*)/gi,
      direcciones: /(?:dirección|vivo en|ubicado en)\s*:?\s*([^,.\n]+)/gi,
      telefonos: /(?:teléfono|celular|móvil)\s*:?\s*(\d+)/gi,
      correos: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi,
    };

    // Extract and normalize data
    Object.entries(patterns).forEach(([key, pattern]) => {
      const matches = conversationText.match(pattern);
      if (matches) {
        extractedData[key] = matches.map((match) =>
          key === "nombres" || key === "ciudades" ? match.toUpperCase() : match,
        );
      }
    });

    return extractedData;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Mantener el foco en el input después de enviar mensaje
  // Mantener el foco en el input después de enviar mensaje
  const maintainInputFocus = () => {
    setTimeout(() => {
      if (inputRef.current && !sending) {
        inputRef.current.focus();
      }
    }, 150);
  };

  // Función para limpiar formato Markdown y devolver texto limpio
  const cleanMarkdown = (text: string): string => {
    if (!text) return "";

    return (
      text
        // Eliminar headers markdown (###, ##, #)
        .replace(/^#{1,6}\s+/gm, "")
        // Eliminar negritas (**texto** o __texto__)
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        // Eliminar cursivas (*texto* o _texto_)
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/_(.+?)_/g, "$1")
        // Eliminar listas con viñetas
        .replace(/^\s*[-*+]\s+/gm, "• ")
        // Eliminar listas numeradas
        .replace(/^\s*\d+\.\s+/gm, "")
        // Limpiar bloques de código
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        // Limpiar líneas horizontales
        .replace(/^[-*_]{3,}$/gm, "")
        // Normalizar espacios múltiples
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    );
  };

  // Función para renderizar texto con URLs clicables
  const renderMessageWithLinks = (text: string): React.ReactNode => {
    if (!text) return null;
    
    // Primero limpiamos el markdown
    const cleanedText = cleanMarkdown(text);
    
    // Regex para detectar URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Dividir el texto por URLs
    const parts = cleanedText.split(urlRegex);
    
    if (parts.length === 1) {
      // No hay URLs, retornar el texto limpio
      return cleanedText;
    }
    
    // Mapear las partes y convertir URLs a links
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        // Limpiar caracteres finales que no son parte de la URL
        const cleanUrl = part.replace(/[.,;:!?)]+$/, '');
        const trailingChars = part.slice(cleanUrl.length);
        
        return (
          <span key={index}>
            <a 
              href={cleanUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {cleanUrl}
            </a>
            {trailingChars}
          </span>
        );
      }
      // Reset regex lastIndex for next iteration
      urlRegex.lastIndex = 0;
      return part;
    });
  };

  // Manejar la aceptación de términos
  const handleContinue = async () => {
    if (acceptedTerms && acceptedPrivacy && dataProcessingConsent) {
      localStorage.setItem(`terms_accepted_${agentId}`, "true");
      localStorage.setItem(`data_consent_${agentId}`, "true");

      // ✅ AUDITORÍA: Registrar aceptación de términos para usuarios anónimos
      if (!isAuthenticated && agent) {
        await logDocumentCreationTerms(
          'anonymous@session.local', // Email temporal
          agent.document_name || 'Documento',
          agentId,
          undefined,
          'Usuario Anónimo'
        );
      }

      // ✅ SOLO limpiar si NO hay conversación activa
      const existingChat = localStorage.getItem(`chat_${agentId}`);
      if (!existingChat) {
        // Nueva sesión, limpiar cualquier dato antiguo
        localStorage.removeItem(`document_session_${agentId}`);
      }
      // Si YA existe un chat, NO borrarlo para mantener threadId

      setTermsAccepted(true);
      setShowTermsDialog(false);
    }
  };

  const canContinue = acceptedTerms && acceptedPrivacy && dataProcessingConsent;

  // Card de aceptación de términos - SE MUESTRA PRIMERO (antes que loading)
  if (!termsAccepted && showTermsDialog) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Bienvenido</CardTitle>
                    <p className="text-sm text-muted-foreground">Asistente Legal Lexi</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Antes de comenzar con tu documento, necesito que aceptes los siguientes términos para poder continuar:
                </p>

                <div className="space-y-4">
                  {/* Checkbox Términos y Condiciones */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                        Acepto los Términos y Condiciones *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Lee nuestros{" "}
                        <a
                          href="/#terminos"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80 font-medium"
                        >
                          Términos y Condiciones
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Checkbox Política de Privacidad */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                        Acepto la Política de Privacidad *
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Lee nuestra{" "}
                        <a
                          href="/#privacidad"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:text-primary/80 font-medium"
                        >
                          Política de Privacidad
                        </a>
                      </p>
                    </div>
                  </div>

                  {/* Checkbox Tratamiento de Datos Personales */}
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="dataProcessing"
                      checked={dataProcessingConsent}
                      onCheckedChange={(checked) => setDataProcessingConsent(checked as boolean)}
                      className="mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="dataProcessing" className="text-sm font-medium cursor-pointer">
                        Acepto el Tratamiento de Datos Personales *
                      </Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Acepto el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 (Ley de Habeas Data
                        en Colombia) y autorizo a Praxis Hub para recopilar, almacenar, usar y circular mi
                        información personal para los fines relacionados con la gestión y seguimiento de este documento
                        legal.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Al continuar, confirmas que has leído y aceptado ambos documentos. Esta información es necesaria
                    para procesar tu solicitud de forma segura.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onBack} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleContinue} disabled={!canContinue} className="flex-1">
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Loading después de aceptar términos
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando asistente legal...</p>
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

  if (showUserForm && !isAuthenticated) {
    const handleSubmit = async () => {
      if (!userInfo.name.trim() || !userInfo.email.trim()) {
        toast.error("Por favor completa toda la información requerida");
        return;
      }

      await executeDocumentGeneration(userInfo.name, userInfo.email, null);
    };

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Información de contacto
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Para finalizar la generación de tu documento, necesitamos tu información de contacto.
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="user-name" className="text-sm font-medium">
                    Nombre completo
                  </label>
                  <Input
                    id="user-name"
                    value={userInfo.name}
                    onChange={(e) => setUserInfo((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Tu nombre completo"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="user-email" className="text-sm font-medium">
                    Correo electrónico
                  </label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="tu@email.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h4 className="font-medium mb-2 text-sm">Resumen del documento:</h4>
                <p className="text-sm text-muted-foreground mb-2">{agent.document_name}</p>
                <p className="text-base font-bold text-success">
                  Precio: {agent.price === 0 ? "GRATIS" : `$${agent.price.toLocaleString()} COP`}
                </p>

                {/* Mostrar resumen de información recopilada */}
                {Object.keys(collectedData).length > 0 && (
                  <div className="border-t pt-3">
                    <h5 className="text-sm font-medium mb-2">Información recopilada:</h5>
                    <div className="text-xs space-y-1">
                      {Object.entries(collectedData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowUserForm(false)} className="flex-1">
                  Volver al chat
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !userInfo.name.trim() ||
                    !userInfo.email.trim() ||
                    !dataProcessingConsent ||
                    generating ||
                    documentGenerated
                  }
                  className="flex-1"
                >
                  {generating ? "Generando..." : documentGenerated ? "Documento Generado" : "Generar Documento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  console.log("DocumentChatFlow rendering:", { loading, agent: !!agent, showUserForm, agentId });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Modal Container - Responsive */}
        <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header - WhatsApp style - Modal optimized */}
          <div className="bg-primary px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-primary-foreground hover:bg-primary-foreground/10 p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-9 h-9 bg-primary-foreground/10 rounded-full flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-semibold text-primary-foreground text-base truncate">{agent.document_name}</h1>
                <p className="text-xs text-primary-foreground/70">Lexi • En línea</p>
              </div>
            </div>
          </div>

          {/* Messages - Modal scrollable area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50 dark:bg-gray-800" style={{ maxHeight: "60vh" }}>
            {isAuthenticated && userInfo.name && (
              <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center gap-2">
                <User className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Sesión iniciada como {userInfo.name}</p>
                  <p className="text-xs text-muted-foreground">Tu documento se vinculará automáticamente a tu cuenta</p>
                </div>
              </div>
            )}

            <div className="space-y-3 pb-4">
              {messages.map((message, index) => (
                <div key={index} className="animate-fade-in">
                  <div className={`flex gap-2 mb-1 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "user" ? (
                      /* User message - right side */
                      <div className="max-w-[80%] group">
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-2.5 shadow-sm">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs opacity-70">
                              {message.timestamp.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Assistant message - left side */
                      <div className="max-w-[80%] group">
                        <div className="bg-white dark:bg-gray-700 border rounded-2xl rounded-tl-md px-4 py-2.5 shadow-sm">
                          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100">
                            {renderMessageWithLinks(message.content)}
                          </div>
                          <div className="flex items-center justify-start gap-1 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {message.timestamp.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Generate button as a special message */}
                  {message.showGenerateButton && (
                    <div className="flex justify-start mb-2 animate-fade-in">
                      <div className="max-w-[80%]">
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              ¡Documento listo para generar!
                            </span>
                          </div>
                          <Button
                            onClick={generateDocument}
                            disabled={generating || documentGenerated}
                            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            size="sm"
                          >
                            {generating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                                Generando...
                              </>
                            ) : documentGenerated ? (
                              <>
                                <FileText className="w-4 h-4 mr-2" />
                                Documento Generado
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4 mr-2" />
                                {isAuthenticated ? "Generar Documento" : "Continuar con mis datos"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%]">
                    <div className="bg-white dark:bg-gray-700 border rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">Escribiendo...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input area - Modal bottom */}
          <div className="border-t bg-white dark:bg-gray-900 px-4 py-3">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRateLimited ? "Por favor espera 1 minuto..." : "Escribe un mensaje..."}
                  disabled={sending || isRateLimited}
                  className={`pr-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-colors text-sm border ${isRateLimited ? "opacity-50 cursor-not-allowed" : ""}`}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={sending || !currentMessage.trim() || isRateLimited}
                size="icon"
                className={`rounded-full w-10 h-10 shrink-0 bg-primary hover:bg-primary/90 ${isRateLimited ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
