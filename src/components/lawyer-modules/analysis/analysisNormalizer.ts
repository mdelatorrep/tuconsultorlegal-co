/**
 * Consolidated normalization utilities for AI analysis results.
 * Handles schema drift from LLM responses (field aliases, type coercion, defaults).
 */

export interface SourceConsulted {
  data: string;
  url: string;
  consultDate: string;
  result: 'verificado' | 'no_encontrado' | 'parcial';
}

export interface PendingVerification {
  data: string;
  source: string;
  url: string;
  impact?: string;
}

export interface LegalFrameworkItem {
  norm: string;
  status: 'vigente' | 'modificada' | 'derogada' | 'no_verificada';
  verifiedUrl?: string;
}

export interface AnalysisResult {
  id?: string;
  fileName: string;
  documentType: string;
  documentSubtype?: string;
  documentCategory?: 'contrato' | 'actuacion_procesal' | 'providencia_judicial' | 'mecanismo_constitucional' | 'acto_administrativo' | 'documento_notarial' | 'respuesta_legal' | 'escrito_juridico' | 'informe' | 'correspondencia' | 'anexo' | 'otro';
  detectionConfidence?: 'alta' | 'media' | 'baja';
  extractionQuality?: 'full' | 'partial' | 'minimal';
  extractionMethod?: string;
  webSearchUsed?: boolean;
  jurisdiction?: string;
  applicableStatute?: string;
  activatedLegalFramework?: LegalFrameworkItem[];
  summary?: string;
  clauses?: Array<{ name: string; content: string; riskLevel: string; recommendation: string }>;
  risks?: Array<{ type: string; description: string; severity: string; mitigation?: string }>;
  recommendations?: string[];
  keyDates?: Array<{ date: string; description: string; importance: string }>;
  parties?: Array<{ name: string; role: string }>;
  legalReferences?: Array<{ reference: string; context: string; verified?: boolean }>;
  missingElements?: string[];
  sourcesConsulted?: SourceConsulted[];
  pendingVerifications?: PendingVerification[];
  strategicConclusion?: string;
  timestamp: Date;
}

// ── Helpers ──

const safeArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);
const safeString = (v: any, fallback: string) => (typeof v === 'string' ? v : fallback);

// ── Field Normalizers ──

export function normalizeConfidence(v: any): 'alta' | 'media' | 'baja' | undefined {
  if (typeof v === 'string') {
    const lower = v.toLowerCase();
    if (['alta', 'high'].includes(lower)) return 'alta';
    if (['media', 'medium'].includes(lower)) return 'media';
    return 'baja';
  }
  if (typeof v === 'number') return v >= 0.7 ? 'alta' : v >= 0.4 ? 'media' : 'baja';
  return undefined;
}

export function normalizeClauses(v: any): AnalysisResult['clauses'] {
  return safeArray(v).map((c: any) => ({
    name: c.name || c.clause || c.title || 'Elemento',
    content: c.content || c.description || c.text || c.clause || '',
    riskLevel: c.riskLevel || c.risk_level || c.risk || 'medio',
    recommendation: c.recommendation || c.recomendacion || '',
  }));
}

export function normalizeRisks(v: any) {
  return safeArray(v).map((r: any) => ({
    type: r.type || r.tipo || r.risk || r.name || 'Riesgo',
    description: r.description || r.descripcion || r.detail || '',
    severity: r.severity || r.severidad || r.level || r.nivel || 'medio',
    mitigation: r.mitigation || r.mitigacion || r.recommendation || undefined,
  }));
}

export function normalizeRecommendations(v: any): string[] {
  if (Array.isArray(v)) return v.map((r: any) => (typeof r === 'string' ? r : r.recommendation || r.text || String(r)));
  return [];
}

export function normalizeParties(v: any): AnalysisResult['parties'] {
  if (typeof v === 'string') {
    return v.trim() && !v.toLowerCase().includes('no identificad') ? [{ name: v, role: '' }] : [];
  }
  if (Array.isArray(v)) {
    return v.map((p: any) => ({
      name: p.name || p.nombre || 'Parte',
      role: p.role || p.rol || p.likelyProfile || '',
    }));
  }
  if (v && typeof v === 'object') {
    const result: AnalysisResult['parties'] = [];
    if (Array.isArray(v.extracted)) v.extracted.forEach((p: any) => result.push({ name: p.name || p.nombre || 'Parte', role: p.role || p.rol || '' }));
    if (Array.isArray(v.inferredRoles)) v.inferredRoles.forEach((p: any) => result.push({ name: p.role || 'Parte inferida', role: p.likelyProfile || p.role || '' }));
    return result;
  }
  return [];
}

export function normalizeKeyDates(v: any): AnalysisResult['keyDates'] {
  if (Array.isArray(v)) {
    return v.map((d: any) => ({
      date: d.date || d.fecha || d.possibleDate1 || '',
      description: d.description || d.descripcion || d.context || '',
      importance: d.importance || d.importancia || 'normal',
    }));
  }
  if (v && typeof v === 'object') {
    const result: AnalysisResult['keyDates'] = [];
    if (Array.isArray(v.extractedFromFilename)) {
      v.extractedFromFilename.forEach((d: any) => {
        result.push({ date: d.possibleDate1 || d.possibleDate2 || '', description: d.context || '', importance: 'baja' });
      });
    }
    return result;
  }
  return [];
}

export function normalizeLegalRefs(v: any): AnalysisResult['legalReferences'] {
  if (Array.isArray(v)) {
    return v.map((r: any) => ({
      reference: r.reference || r.referencia || r.name || String(r),
      context: r.context || r.contexto || r.subject || '',
      verified: r.verified ?? undefined,
    }));
  }
  if (v && typeof v === 'object') {
    const result: AnalysisResult['legalReferences'] = [];
    const found = Array.isArray(v.foundInDocument) ? v.foundInDocument : [];
    const recommended = Array.isArray(v.recommendedToCheck) ? v.recommendedToCheck : [];
    found.forEach((r: any) => result.push({ reference: r.reference || String(r), context: r.context || 'Encontrado en documento' }));
    recommended.forEach((r: any) => result.push({ reference: r.reference || String(r), context: r.subject || r.context || 'Referencia recomendada' }));
    return result;
  }
  return [];
}

export function normalizeMissing(v: any): string[] {
  if (Array.isArray(v)) return v.map((m: any) => (typeof m === 'string' ? m : m.description || m.name || String(m)));
  return [];
}

export function normalizeSources(v: any): SourceConsulted[] {
  return safeArray(v).map((s: any) => ({
    data: s.data || s.dato || s.description || '',
    url: s.url || s.link || '',
    consultDate: s.consultDate || s.fecha || s.date || '',
    result: (['verificado', 'no_encontrado', 'parcial'].includes(s.result) ? s.result : 'parcial') as SourceConsulted['result'],
  }));
}

export function normalizePendingVerifications(v: any): PendingVerification[] {
  return safeArray(v).map((p: any) => ({
    data: p.data || p.dato || p.description || '',
    source: p.source || p.fuente || '',
    url: p.url || p.link || '',
    impact: p.impact || p.impacto || undefined,
  }));
}

export function normalizeLegalFramework(v: any): LegalFrameworkItem[] {
  return safeArray(v).map((f: any) => ({
    norm: f.norm || f.norma || f.name || '',
    status: (['vigente', 'modificada', 'derogada', 'no_verificada'].includes(f.status) ? f.status : 'no_verificada') as LegalFrameworkItem['status'],
    verifiedUrl: f.verifiedUrl || f.url || undefined,
  }));
}

/**
 * Normalize a raw AI output object (from edge function or from DB history) into a clean AnalysisResult.
 */
export function normalizeAnalysisOutput(raw: any, defaults: { fileName?: string; timestamp?: Date; id?: string } = {}): AnalysisResult {
  const out = raw || {};
  const rawClauses = out.clauses || out.keyTerms || out.elements;

  return {
    id: defaults.id,
    fileName: safeString(defaults.fileName || out.fileName, 'Documento'),
    documentType: safeString(out.documentType, 'Documento Legal'),
    documentSubtype: out.documentSubtype || undefined,
    documentCategory: normalizeCategory(out.documentCategory),
    detectionConfidence: normalizeConfidence(out.detectionConfidence),
    extractionQuality: out.extractionQuality || undefined,
    extractionMethod: out.extractionMethod || undefined,
    webSearchUsed: out.webSearchUsed ?? undefined,
    jurisdiction: out.jurisdiction || undefined,
    applicableStatute: out.applicableStatute || undefined,
    activatedLegalFramework: normalizeLegalFramework(out.activatedLegalFramework),
    summary: safeString(out.summary, ''),
    clauses: normalizeClauses(rawClauses),
    risks: normalizeRisks(out.risks),
    recommendations: normalizeRecommendations(out.recommendations),
    keyDates: normalizeKeyDates(out.keyDates),
    parties: normalizeParties(out.parties),
    legalReferences: normalizeLegalRefs(out.legalReferences),
    missingElements: normalizeMissing(out.missingElements),
    sourcesConsulted: normalizeSources(out.sourcesConsulted),
    pendingVerifications: normalizePendingVerifications(out.pendingVerifications),
    strategicConclusion: out.strategicConclusion || undefined,
    timestamp: defaults.timestamp || new Date(out.timestamp || Date.now()),
  };
}

function normalizeCategory(v: any): AnalysisResult['documentCategory'] {
  const valid = ['contrato', 'actuacion_procesal', 'providencia_judicial', 'mecanismo_constitucional', 'acto_administrativo', 'documento_notarial', 'respuesta_legal', 'escrito_juridico', 'informe', 'correspondencia', 'anexo', 'otro'];
  const s = safeString(v, 'otro').toLowerCase();
  return (valid.includes(s) ? s : 'otro') as AnalysisResult['documentCategory'];
}

// ── UI Helpers ──

export function getCategoryLabel(category?: string): string {
  const labels: Record<string, string> = {
    contrato: 'Contrato',
    actuacion_procesal: 'Actuación Procesal',
    providencia_judicial: 'Providencia Judicial',
    mecanismo_constitucional: 'Mecanismo Constitucional',
    acto_administrativo: 'Acto Administrativo',
    documento_notarial: 'Documento Notarial',
    respuesta_legal: 'Respuesta Legal',
    escrito_juridico: 'Escrito Jurídico',
    informe: 'Informe',
    correspondencia: 'Correspondencia',
    anexo: 'Anexo',
    otro: 'Otro'
  };
  return labels[category || 'otro'] || 'Documento';
}

export function getElementLabel(category?: string): string {
  const labels: Record<string, string> = {
    contrato: 'Cláusula',
    actuacion_procesal: 'Pretensión',
    providencia_judicial: 'Considerando',
    mecanismo_constitucional: 'Fundamento',
    acto_administrativo: 'Disposición',
    documento_notarial: 'Estipulación',
    respuesta_legal: 'Argumento',
    escrito_juridico: 'Fundamento',
    informe: 'Hallazgo',
    correspondencia: 'Punto',
    anexo: 'Sección',
    otro: 'Elemento'
  };
  return labels[category || 'otro'] || 'Elemento';
}
