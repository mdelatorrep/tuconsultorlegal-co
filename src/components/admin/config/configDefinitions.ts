import { 
  Bot, 
  FileText, 
  Scale, 
  MessageSquare, 
  Wrench,
  Sparkles,
  Gavel,
  Search,
  Users,
  Calendar,
  Shield,
  CreditCard,
  Trophy,
  Mic
} from "lucide-react";
import React from "react";

export interface AIFunction {
  id: string;
  name: string;
  description: string;
  promptKey: string;
  modelKey?: string;
  reasoningEffortKey?: string;
  webSearchKey?: string;
}

export interface AICategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  functions: AIFunction[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'select' | 'json';
  options?: { value: string; label: string }[];
  defaultValue?: string;
  description?: string;
  suffix?: string;
}

export interface OperationalGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  fields: ConfigField[];
}

// AI Function Categories - Simplified
export const AI_CATEGORIES: AICategory[] = [
  {
    id: 'agents',
    name: 'Agentes IA',
    description: 'Creación y comportamiento de agentes',
    icon: React.createElement(Bot, { className: "w-4 h-4" }),
    functions: [
      { id: 'improve_clause', name: 'Mejorar Cláusulas', description: 'Optimiza cláusulas legales', promptKey: 'improve_clause_ai_prompt', modelKey: 'improve_clause_ai_model', reasoningEffortKey: 'improve_clause_reasoning_effort', webSearchKey: 'web_search_enabled_improve_clause' },
      { id: 'suggest_blocks', name: 'Bloques de Conversación', description: 'Genera bloques para agentes', promptKey: 'suggest_conversation_blocks_prompt', modelKey: 'suggest_blocks_ai_model', reasoningEffortKey: 'suggest_blocks_reasoning_effort' },
      { id: 'agent_creation', name: 'ADN de Agentes', description: 'Comportamiento base de agentes', promptKey: 'agent_creation_system_prompt', modelKey: 'agent_creation_ai_model', reasoningEffortKey: 'agent_creation_reasoning_effort' }
    ]
  },
  {
    id: 'documents',
    name: 'Documentos',
    description: 'Generación y chat de documentos',
    icon: React.createElement(FileText, { className: "w-4 h-4" }),
    functions: [
      { id: 'document_chat', name: 'Chat de Documentos', description: 'Recopila información del usuario', promptKey: 'document_chat_prompt', modelKey: 'document_chat_ai_model', reasoningEffortKey: 'document_chat_reasoning_effort' },
      { id: 'generate_document', name: 'Generar Documento', description: 'Genera el documento final', promptKey: 'generate_document_prompt', modelKey: 'openai_assistant_model', reasoningEffortKey: 'generate_document_reasoning_effort' }
    ]
  },
  {
    id: 'legal-tools',
    name: 'Herramientas Legales',
    description: 'Investigación, análisis, redacción, estrategia',
    icon: React.createElement(Scale, { className: "w-4 h-4" }),
    functions: [
      { id: 'research', name: 'Investigación', description: 'Análisis de legislación', promptKey: 'research_system_prompt', modelKey: 'research_ai_model', reasoningEffortKey: 'research_reasoning_effort', webSearchKey: 'web_search_enabled_research' },
      { id: 'analysis', name: 'Análisis', description: 'Evaluación de documentos', promptKey: 'analysis_system_prompt', modelKey: 'analysis_ai_model', reasoningEffortKey: 'analysis_reasoning_effort', webSearchKey: 'web_search_enabled_analysis' },
      { id: 'drafting', name: 'Redacción', description: 'Creación de documentos', promptKey: 'drafting_system_prompt', modelKey: 'drafting_ai_model', reasoningEffortKey: 'drafting_reasoning_effort', webSearchKey: 'web_search_enabled_drafting' },
      { id: 'strategy', name: 'Estrategia', description: 'Estrategias legales', promptKey: 'strategy_system_prompt', modelKey: 'strategy_ai_model', reasoningEffortKey: 'strategy_reasoning_effort', webSearchKey: 'web_search_enabled_strategy' },
      { id: 'case_predictor', name: 'Predictor de Casos', description: 'Predice resultados', promptKey: 'case_predictor_system_prompt', modelKey: 'case_predictor_ai_model', reasoningEffortKey: 'case_predictor_reasoning_effort' }
    ]
  },
  {
    id: 'copilot',
    name: 'Copiloto Legal',
    description: 'Sugerencias y autocompletado en tiempo real',
    icon: React.createElement(Sparkles, { className: "w-4 h-4" }),
    functions: [
      { id: 'copilot_suggest', name: 'Sugerencias', description: 'Sugerencias mientras escribe', promptKey: 'copilot_suggest_prompt', modelKey: 'copilot_ai_model', reasoningEffortKey: 'copilot_reasoning_effort' },
      { id: 'copilot_autocomplete', name: 'Autocompletado', description: 'Completa cláusulas', promptKey: 'copilot_autocomplete_prompt', modelKey: 'copilot_ai_model', reasoningEffortKey: 'copilot_reasoning_effort' },
      { id: 'copilot_risks', name: 'Detección de Riesgos', description: 'Identifica riesgos', promptKey: 'copilot_risk_detection_prompt', modelKey: 'copilot_ai_model', reasoningEffortKey: 'copilot_reasoning_effort' },
      { id: 'copilot_improve', name: 'Mejorar Texto', description: 'Mejora claridad', promptKey: 'copilot_improve_prompt', modelKey: 'copilot_ai_model', reasoningEffortKey: 'copilot_reasoning_effort' }
    ]
  },
  {
    id: 'assistants',
    name: 'Asistentes',
    description: 'Lexi, routing y entrenamiento',
    icon: React.createElement(MessageSquare, { className: "w-4 h-4" }),
    functions: [
      { id: 'lexi', name: 'Lexi', description: 'Asistente legal principal', promptKey: 'lexi_chat_prompt', modelKey: 'lexi_ai_model', reasoningEffortKey: 'lexi_reasoning_effort', webSearchKey: 'web_search_enabled_lexi' },
      { id: 'routing', name: 'Routing', description: 'Clasificación de consultas', promptKey: 'routing_chat_prompt', modelKey: 'routing_ai_model', reasoningEffortKey: 'routing_reasoning_effort' },
      { id: 'training', name: 'Entrenamiento', description: 'Formación de abogados', promptKey: 'legal_training_assistant_prompt', modelKey: 'training_assistant_ai_model', reasoningEffortKey: 'training_reasoning_effort', webSearchKey: 'web_search_enabled_training' }
    ]
  },
  {
    id: 'queries',
    name: 'Consultas Externas',
    description: 'Procesos judiciales y SUIN-Juriscol',
    icon: React.createElement(Search, { className: "w-4 h-4" }),
    functions: [
      { id: 'process_query', name: 'Rama Judicial', description: 'Consulta procesos', promptKey: 'process_query_ai_prompt', modelKey: 'process_query_ai_model', reasoningEffortKey: 'process_query_reasoning_effort', webSearchKey: 'web_search_enabled_process_query' },
      { id: 'suin_juriscol', name: 'SUIN-Juriscol', description: 'Normativa colombiana', promptKey: 'suin_juriscol_ai_prompt', modelKey: 'suin_juriscol_ai_model', reasoningEffortKey: 'suin_juriscol_reasoning_effort', webSearchKey: 'web_search_enabled_suin_juriscol' }
    ]
  },
  {
    id: 'utilities',
    name: 'Utilidades',
    description: 'Funciones de soporte',
    icon: React.createElement(Wrench, { className: "w-4 h-4" }),
    functions: [
      { id: 'improve_document_info', name: 'Mejorar Info', description: 'Optimiza descripciones', promptKey: 'document_description_optimizer_prompt', modelKey: 'document_description_optimizer_model', reasoningEffortKey: 'improve_document_info_reasoning_effort' },
      { id: 'crm_segmentation', name: 'Segmentación CRM', description: 'Clasificación de clientes', promptKey: 'crm_segmentation_prompt', modelKey: 'crm_segmentation_ai_model', reasoningEffortKey: 'crm_segmentation_reasoning_effort' },
      { id: 'organize_file', name: 'Organizar Archivos', description: 'Organización de archivos', promptKey: 'organize_file_prompt', modelKey: 'organize_file_ai_model', reasoningEffortKey: 'organize_file_reasoning_effort' }
    ]
  }
];

// Operational Configuration Groups - Properly typed
export const OPERATIONAL_GROUPS: OperationalGroup[] = [
  {
    id: 'crm',
    name: 'CRM',
    icon: React.createElement(Users, { className: "w-4 h-4" }),
    fields: [
      { key: 'crm_max_leads_per_lawyer', label: 'Máx. leads por abogado', type: 'number', defaultValue: '100' },
      { key: 'crm_auto_followup_days', label: 'Días para seguimiento auto', type: 'number', suffix: 'días', defaultValue: '3' },
      { key: 'crm_reminder_hours', label: 'Horas antes de recordatorio', type: 'number', suffix: 'horas', defaultValue: '24' },
      { key: 'crm_lead_expiration_days', label: 'Expiración de leads', type: 'number', suffix: 'días', defaultValue: '30' },
      { key: 'crm_auto_convert_lead_to_client', label: 'Auto-convertir lead a cliente', type: 'boolean', defaultValue: 'false' },
      { key: 'crm_email_notifications_enabled', label: 'Notificaciones por email', type: 'boolean', defaultValue: 'true' }
    ]
  },
  {
    id: 'calendar',
    name: 'Calendario',
    icon: React.createElement(Calendar, { className: "w-4 h-4" }),
    fields: [
      { key: 'calendar_reminder_hours_before', label: 'Recordatorio antes', type: 'number', suffix: 'horas', defaultValue: '24' },
      { key: 'calendar_auto_docket_enabled', label: 'Auto-docketing', type: 'boolean', defaultValue: 'true' },
      { key: 'calendar_working_hours_start', label: 'Hora inicio laboral', type: 'text', defaultValue: '08:00' },
      { key: 'calendar_working_hours_end', label: 'Hora fin laboral', type: 'text', defaultValue: '18:00' },
      { key: 'calendar_default_event_duration_minutes', label: 'Duración evento default', type: 'number', suffix: 'min', defaultValue: '60' },
      { key: 'calendar_holidays_enabled', label: 'Incluir festivos', type: 'boolean', defaultValue: 'true' }
    ]
  },
  {
    id: 'client-portal',
    name: 'Portal Cliente',
    icon: React.createElement(Shield, { className: "w-4 h-4" }),
    fields: [
      { key: 'client_portal_document_upload_enabled', label: 'Permitir subir documentos', type: 'boolean', defaultValue: 'true' },
      { key: 'client_portal_appointment_scheduling_enabled', label: 'Permitir agendar citas', type: 'boolean', defaultValue: 'true' },
      { key: 'client_portal_case_visibility', label: 'Visibilidad de casos', type: 'select', options: [{ value: 'full', label: 'Completa' }, { value: 'limited', label: 'Limitada' }, { value: 'none', label: 'Ninguna' }], defaultValue: 'limited' },
      { key: 'client_portal_message_enabled', label: 'Mensajería habilitada', type: 'boolean', defaultValue: 'true' },
      { key: 'client_portal_ai_summary_enabled', label: 'Resúmenes IA', type: 'boolean', defaultValue: 'true' },
      { key: 'client_portal_max_file_size_mb', label: 'Tamaño máx. archivo', type: 'number', suffix: 'MB', defaultValue: '10' }
    ]
  },
  {
    id: 'processes',
    name: 'Procesos Judiciales',
    icon: React.createElement(Gavel, { className: "w-4 h-4" }),
    fields: [
      { key: 'process_monitor_sync_frequency_hours', label: 'Frecuencia sincronización', type: 'number', suffix: 'horas', defaultValue: '6' },
      { key: 'process_alert_new_actuacion_enabled', label: 'Alertar nuevas actuaciones', type: 'boolean', defaultValue: 'true' },
      { key: 'process_alert_email_enabled', label: 'Alertas por email', type: 'boolean', defaultValue: 'true' },
      { key: 'process_auto_create_calendar_event', label: 'Auto-crear eventos', type: 'boolean', defaultValue: 'true' },
      { key: 'process_rama_judicial_cache_hours', label: 'Cache Rama Judicial', type: 'number', suffix: 'horas', defaultValue: '12' },
      { key: 'process_auto_link_to_case', label: 'Auto-vincular a casos', type: 'boolean', defaultValue: 'true' }
    ]
  },
  {
    id: 'gamification',
    name: 'Gamificación',
    icon: React.createElement(Trophy, { className: "w-4 h-4" }),
    fields: [
      { key: 'gamification_enabled', label: 'Sistema habilitado', type: 'boolean', defaultValue: 'true' },
      { key: 'gamification_streak_bonus_multiplier', label: 'Multiplicador racha', type: 'number', defaultValue: '1.5' },
      { key: 'gamification_daily_goal_credits', label: 'Meta diaria (créditos)', type: 'number', defaultValue: '10' }
    ]
  },
  {
    id: 'credits',
    name: 'Créditos',
    icon: React.createElement(CreditCard, { className: "w-4 h-4" }),
    fields: [
      { key: 'credits_daily_free_limit', label: 'Límite diario gratis', type: 'number', defaultValue: '5' },
      { key: 'credits_referral_bonus', label: 'Bonus por referido', type: 'number', defaultValue: '50' },
      { key: 'credits_warning_threshold', label: 'Umbral de advertencia', type: 'number', defaultValue: '10' },
      { key: 'credits_welcome_bonus', label: 'Bonus de bienvenida', type: 'number', defaultValue: '100' },
      { key: 'credits_auto_recharge_enabled', label: 'Auto-recarga', type: 'boolean', defaultValue: 'false' },
      { key: 'credits_auto_recharge_amount', label: 'Monto auto-recarga', type: 'number', defaultValue: '500' }
    ]
  },
  {
    id: 'verification',
    name: 'Verificación',
    icon: React.createElement(Shield, { className: "w-4 h-4" }),
    fields: [
      { key: 'verification_verifik_enabled', label: 'Verifik habilitado', type: 'boolean', defaultValue: 'true' },
      { key: 'verification_manual_approval_required', label: 'Aprobación manual', type: 'boolean', defaultValue: 'false' },
      { key: 'verification_expiration_days', label: 'Expiración verificación', type: 'number', suffix: 'días', defaultValue: '365' }
    ]
  },
  {
    id: 'voice',
    name: 'Asistente de Voz',
    icon: React.createElement(Mic, { className: "w-4 h-4" }),
    fields: [
      { key: 'voice_assistant_enabled', label: 'Habilitado', type: 'boolean', defaultValue: 'true' },
      { key: 'voice_transcription_model', label: 'Modelo transcripción', type: 'select', options: [{ value: 'whisper-1', label: 'Whisper 1' }, { value: 'whisper-large-v3', label: 'Whisper Large v3' }], defaultValue: 'whisper-1' },
      { key: 'voice_transcription_language', label: 'Idioma', type: 'select', options: [{ value: 'es', label: 'Español' }, { value: 'en', label: 'English' }], defaultValue: 'es' },
      { key: 'voice_tts_model', label: 'Modelo TTS', type: 'select', options: [{ value: 'tts-1', label: 'TTS 1' }, { value: 'tts-1-hd', label: 'TTS 1 HD' }], defaultValue: 'tts-1' },
      { key: 'voice_tts_voice', label: 'Voz TTS', type: 'select', options: [{ value: 'alloy', label: 'Alloy' }, { value: 'echo', label: 'Echo' }, { value: 'fable', label: 'Fable' }, { value: 'onyx', label: 'Onyx' }, { value: 'nova', label: 'Nova' }, { value: 'shimmer', label: 'Shimmer' }], defaultValue: 'nova' },
      { key: 'voice_max_audio_size_mb', label: 'Tamaño máx. audio', type: 'number', suffix: 'MB', defaultValue: '25' }
    ]
  },
  {
    id: 'specialized-agents',
    name: 'Agentes Especializados',
    icon: React.createElement(Sparkles, { className: "w-4 h-4" }),
    fields: [
      { key: 'specialized_agents_enabled', label: 'Habilitado', type: 'boolean', defaultValue: 'true' },
      { key: 'specialized_agents_max_messages', label: 'Máx. mensajes por sesión', type: 'number', defaultValue: '50' },
      { key: 'specialized_agents_default_credits', label: 'Créditos por uso', type: 'number', defaultValue: '5' },
      { key: 'specialized_agents_openai_integration', label: 'Integración OpenAI', type: 'boolean', defaultValue: 'true' }
    ]
  }
];

// Global Parameters
export const GLOBAL_PARAMS = [
  { key: 'openai_api_timeout', label: 'Timeout API (ms)', type: 'number' as const, defaultValue: '120000' },
  { key: 'max_retries_ai_requests', label: 'Máximo reintentos', type: 'number' as const, defaultValue: '3' },
  { key: 'default_sla_hours', label: 'SLA documentos (horas)', type: 'number' as const, defaultValue: '24' }
];
