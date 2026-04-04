import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const PAGE_HEIGHT = 297;
const MARGIN_TOP = 25;
const MARGIN_BOTTOM = 25;
const FOOTER_HEIGHT = 10;
const SAFE_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM - FOOTER_HEIGHT;
const LINE_HEIGHT = 6;

function stripMarkdownLinks(text: string): string {
  if (!text) return '';
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
}

function addHeader(doc: jsPDF, title: string, moduleName: string) {
  doc.setFillColor(26, 54, 93);
  doc.rect(0, 0, PAGE_WIDTH, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title.length > 60 ? title.substring(0, 57) + '...' : title, MARGIN_LEFT, 18);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${moduleName} · Praxis Hub · ${format(new Date(), "d 'de' MMMM yyyy", { locale: es })}`, MARGIN_LEFT, 28);
  
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF, pageNum: number) {
  const y = PAGE_HEIGHT - 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN_LEFT, y - 3, PAGE_WIDTH - MARGIN_RIGHT, y - 3);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text('Generado por Praxis Hub · praxis-hub-co.lovable.app · Este documento es orientativo y no sustituye la asesoría legal profesional', MARGIN_LEFT, y);
  doc.text(`Página ${pageNum}`, PAGE_WIDTH - MARGIN_RIGHT, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageNum: { current: number }): number {
  if (y + needed > SAFE_BOTTOM) {
    addFooter(doc, pageNum.current);
    doc.addPage();
    pageNum.current++;
    return MARGIN_TOP;
  }
  return y;
}

function addSectionTitle(doc: jsPDF, title: string, y: number, pageNum: { current: number }): number {
  y = checkPageBreak(doc, y, 15, pageNum);
  doc.setFillColor(240, 244, 248);
  doc.roundedRect(MARGIN_LEFT, y - 4, CONTENT_WIDTH, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 54, 93);
  doc.text(title, MARGIN_LEFT + 4, y + 3);
  doc.setTextColor(0, 0, 0);
  return y + 14;
}

function addWrappedText(doc: jsPDF, text: string, y: number, pageNum: { current: number }, opts?: { fontSize?: number; bold?: boolean; indent?: number }): number {
  const fontSize = opts?.fontSize || 9;
  const indent = opts?.indent || 0;
  doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  
  const cleanText = stripMarkdownLinks(text);
  const lines = doc.splitTextToSize(cleanText, CONTENT_WIDTH - indent);
  
  for (const line of lines) {
    y = checkPageBreak(doc, y, LINE_HEIGHT, pageNum);
    doc.text(line, MARGIN_LEFT + indent, y);
    y += LINE_HEIGHT;
  }
  return y;
}

function addBulletList(doc: jsPDF, items: string[], y: number, pageNum: { current: number }): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  for (const item of items) {
    const cleanItem = stripMarkdownLinks(item);
    const lines = doc.splitTextToSize(cleanItem, CONTENT_WIDTH - 8);
    y = checkPageBreak(doc, y, lines.length * LINE_HEIGHT, pageNum);
    doc.text('•', MARGIN_LEFT + 2, y);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], MARGIN_LEFT + 8, y);
      y += LINE_HEIGHT;
    }
  }
  return y;
}

// =================== RESEARCH ===================
export function exportResearchToPdf(result: {
  query: string;
  findings: string;
  sources: string[];
  conclusion?: string;
  analysis?: string;
  keyPoints?: string[];
  legalBasis?: string[];
  recommendations?: string;
  risks?: string;
  timestamp: string;
}) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, 'Investigación Jurídica', 'Módulo de Investigación');
  let y = 45;
  
  y = addSectionTitle(doc, 'Consulta', y, pageNum);
  y = addWrappedText(doc, result.query, y, pageNum);
  y += 4;
  
  y = addSectionTitle(doc, 'Hallazgos Jurídicos', y, pageNum);
  y = addWrappedText(doc, result.findings, y, pageNum);
  y += 4;
  
  if (result.conclusion) {
    y = addSectionTitle(doc, 'Conclusión', y, pageNum);
    y = addWrappedText(doc, result.conclusion, y, pageNum);
    y += 4;
  }
  
  if (result.analysis) {
    y = addSectionTitle(doc, 'Análisis', y, pageNum);
    y = addWrappedText(doc, result.analysis, y, pageNum);
    y += 4;
  }
  
  if (result.keyPoints?.length) {
    y = addSectionTitle(doc, 'Puntos Clave', y, pageNum);
    y = addBulletList(doc, result.keyPoints, y, pageNum);
    y += 4;
  }
  
  if (result.legalBasis?.length) {
    y = addSectionTitle(doc, 'Fundamento Legal', y, pageNum);
    y = addBulletList(doc, result.legalBasis, y, pageNum);
    y += 4;
  }
  
  if (result.recommendations) {
    y = addSectionTitle(doc, 'Recomendaciones Prácticas', y, pageNum);
    y = addWrappedText(doc, result.recommendations, y, pageNum);
    y += 4;
  }
  
  if (result.risks) {
    y = addSectionTitle(doc, 'Riesgos e Incertidumbres', y, pageNum);
    y = addWrappedText(doc, result.risks, y, pageNum);
    y += 4;
  }
  
  if (result.sources?.length) {
    y = addSectionTitle(doc, 'Fuentes Consultadas', y, pageNum);
    y = addBulletList(doc, result.sources.filter(Boolean).map(s => stripMarkdownLinks(s)), y, pageNum);
  }
  
  addFooter(doc, pageNum.current);
  doc.save(`investigacion-${format(new Date(result.timestamp), 'yyyy-MM-dd')}.pdf`);
}

// =================== STRATEGY ===================
export function exportStrategyToPdf(analysis: {
  caseDescription: string;
  legalActions: { action: string; viability: string; description: string; requirements: string[] }[];
  legalArguments: { argument: string; foundation: string; strength: string }[];
  counterarguments: { argument: string; response: string; mitigation: string }[];
  precedents: { case: string; relevance: string; outcome: string }[];
  recommendations: string[];
  timestamp: string;
}) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, 'Análisis Estratégico Legal', 'Módulo de Estrategia');
  let y = 45;
  
  y = addSectionTitle(doc, 'Descripción del Caso', y, pageNum);
  y = addWrappedText(doc, analysis.caseDescription, y, pageNum);
  y += 4;
  
  y = addSectionTitle(doc, 'Vías de Acción Legal', y, pageNum);
  for (const action of analysis.legalActions) {
    y = addWrappedText(doc, `${action.action} [Viabilidad: ${action.viability}]`, y, pageNum, { bold: true });
    y = addWrappedText(doc, action.description, y, pageNum, { indent: 4 });
    if (action.requirements.length) {
      y = addWrappedText(doc, 'Requisitos:', y, pageNum, { bold: true, indent: 4 });
      y = addBulletList(doc, action.requirements, y, pageNum);
    }
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Argumentos Jurídicos', y, pageNum);
  for (const arg of analysis.legalArguments) {
    y = addWrappedText(doc, `${arg.argument} [Fuerza: ${arg.strength}]`, y, pageNum, { bold: true });
    y = addWrappedText(doc, `Fundamento: ${arg.foundation}`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Posibles Contraargumentos', y, pageNum);
  for (const counter of analysis.counterarguments) {
    y = addWrappedText(doc, counter.argument, y, pageNum, { bold: true });
    y = addWrappedText(doc, `Respuesta: ${counter.response}`, y, pageNum, { indent: 4 });
    y = addWrappedText(doc, `Mitigación: ${counter.mitigation}`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Precedentes Relevantes', y, pageNum);
  for (const p of analysis.precedents) {
    y = addWrappedText(doc, p.case, y, pageNum, { bold: true });
    y = addWrappedText(doc, `Relevancia: ${p.relevance}`, y, pageNum, { indent: 4 });
    y = addWrappedText(doc, `Resultado: ${p.outcome}`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Recomendaciones Estratégicas', y, pageNum);
  y = addBulletList(doc, analysis.recommendations, y, pageNum);
  
  addFooter(doc, pageNum.current);
  doc.save(`estrategia-${format(new Date(analysis.timestamp), 'yyyy-MM-dd')}.pdf`);
}

// =================== CASE PREDICTOR ===================
export function exportPredictionToPdf(prediction: {
  successProbability: number;
  timeEstimate: { min: number; max: number; unit: string };
  confidenceLevel: string;
  riskFactors: { factor: string; impact: string; mitigation: string }[];
  recommendedArguments: { argument: string; strength: string; precedent?: string }[];
  similarCases: { description: string; outcome: string; relevance: number }[];
  analysis: string;
}, caseType: string, caseDescription: string) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, 'Predicción de Caso', 'Predictor de Casos IA');
  let y = 45;
  
  y = addSectionTitle(doc, 'Información del Caso', y, pageNum);
  y = addWrappedText(doc, `Tipo: ${caseType}`, y, pageNum, { bold: true });
  y = addWrappedText(doc, caseDescription, y, pageNum);
  y += 4;
  
  y = addSectionTitle(doc, 'Resultado de la Predicción', y, pageNum);
  y = addWrappedText(doc, `Probabilidad de Éxito: ${prediction.successProbability}%`, y, pageNum, { bold: true, fontSize: 12 });
  y = addWrappedText(doc, `Nivel de Confianza: ${prediction.confidenceLevel}`, y, pageNum);
  y = addWrappedText(doc, `Tiempo Estimado: ${prediction.timeEstimate.min} - ${prediction.timeEstimate.max} ${prediction.timeEstimate.unit}`, y, pageNum);
  y += 4;
  
  y = addSectionTitle(doc, 'Análisis General', y, pageNum);
  y = addWrappedText(doc, prediction.analysis, y, pageNum);
  y += 4;
  
  y = addSectionTitle(doc, 'Factores de Riesgo', y, pageNum);
  for (const risk of prediction.riskFactors) {
    y = addWrappedText(doc, `${risk.factor} [Impacto: ${risk.impact}]`, y, pageNum, { bold: true });
    y = addWrappedText(doc, `Mitigación: ${risk.mitigation}`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Argumentos Recomendados', y, pageNum);
  for (const arg of prediction.recommendedArguments) {
    y = addWrappedText(doc, `${arg.argument} [Fuerza: ${arg.strength}]`, y, pageNum, { bold: true });
    if (arg.precedent) y = addWrappedText(doc, `Precedente: ${arg.precedent}`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  y = addSectionTitle(doc, 'Casos Similares', y, pageNum);
  for (const caso of prediction.similarCases) {
    y = addWrappedText(doc, caso.description, y, pageNum);
    y = addWrappedText(doc, `Resultado: ${caso.outcome} · Relevancia: ${Math.round(caso.relevance * 100)}%`, y, pageNum, { indent: 4 });
    y += 3;
  }
  
  addFooter(doc, pageNum.current);
  doc.save(`prediccion-caso-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// =================== ANALYSIS ===================
export function exportAnalysisToPdf(result: any) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, `Análisis: ${result.fileName || 'Documento'}`, 'Módulo de Análisis');
  let y = 45;
  
  if (result.jurisdiction || result.applicableStatute) {
    y = addSectionTitle(doc, 'Jurisdicción y Estatuto', y, pageNum);
    if (result.jurisdiction) y = addWrappedText(doc, `Jurisdicción: ${result.jurisdiction}`, y, pageNum);
    if (result.applicableStatute) y = addWrappedText(doc, `Estatuto: ${result.applicableStatute}`, y, pageNum);
    y += 4;
  }
  
  if (result.activatedLegalFramework?.length) {
    y = addSectionTitle(doc, 'Marco Normativo Activado', y, pageNum);
    y = addBulletList(doc, result.activatedLegalFramework.map((f: any) => `${f.norm} [${f.status}]${f.verifiedUrl ? ` — ${f.verifiedUrl}` : ''}`), y, pageNum);
    y += 4;
  }
  
  if (result.summary) {
    y = addSectionTitle(doc, 'Resumen Ejecutivo', y, pageNum);
    y = addWrappedText(doc, result.summary, y, pageNum);
    y += 4;
  }
  
  if (result.clauses?.length) {
    y = addSectionTitle(doc, 'Elementos Identificados', y, pageNum);
    for (const c of result.clauses) {
      y = addWrappedText(doc, c.name, y, pageNum, { bold: true });
      y = addWrappedText(doc, c.content, y, pageNum, { indent: 4 });
      y = addWrappedText(doc, `Riesgo: ${c.riskLevel} · Recomendación: ${c.recommendation}`, y, pageNum, { indent: 4 });
      y += 3;
    }
    y += 4;
  }
  
  if (result.risks?.length) {
    y = addSectionTitle(doc, 'Matriz de Riesgos', y, pageNum);
    for (const r of result.risks) {
      y = addWrappedText(doc, `${r.type} [${r.severity}]`, y, pageNum, { bold: true });
      y = addWrappedText(doc, r.description, y, pageNum, { indent: 4 });
      if (r.mitigation) y = addWrappedText(doc, `Mitigación: ${r.mitigation}`, y, pageNum, { indent: 4 });
      y += 3;
    }
    y += 4;
  }
  
  if (result.recommendations?.length) {
    y = addSectionTitle(doc, 'Recomendaciones', y, pageNum);
    y = addBulletList(doc, result.recommendations, y, pageNum);
    y += 4;
  }
  
  if (result.legalReferences?.length) {
    y = addSectionTitle(doc, 'Referencias Legales', y, pageNum);
    y = addBulletList(doc, result.legalReferences.map((r: any) => `${r.reference} — ${r.context}`), y, pageNum);
    y += 4;
  }
  
  if (result.sourcesConsulted?.length) {
    y = addSectionTitle(doc, 'Fuentes Consultadas', y, pageNum);
    y = addBulletList(doc, result.sourcesConsulted.map((s: any) => `${s.data} — ${s.url} (${s.result})`), y, pageNum);
    y += 4;
  }
  
  if (result.strategicConclusion) {
    y = addSectionTitle(doc, 'Conclusión Estratégica', y, pageNum);
    y = addWrappedText(doc, result.strategicConclusion, y, pageNum);
    y += 2;
    y = addWrappedText(doc, '⚠ Orientación probabilística. No sustituye el criterio del abogado responsable.', y, pageNum, { fontSize: 8 });
  }
  
  addFooter(doc, pageNum.current);
  doc.save(`analisis-${(result.fileName || 'documento').replace(/[^a-z0-9]/gi, '-')}.pdf`);
}

// =================== PROCESS QUERY ===================
export function exportProcessQueryToPdf(radicado: string, aiAnalysis: string, processes?: any[]) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, `Consulta Procesal: ${radicado}`, 'Consulta de Procesos');
  let y = 45;
  
  y = addSectionTitle(doc, 'Número de Radicado', y, pageNum);
  y = addWrappedText(doc, radicado, y, pageNum, { bold: true, fontSize: 11 });
  y += 4;
  
  if (processes?.length) {
    y = addSectionTitle(doc, 'Procesos Encontrados', y, pageNum);
    for (const p of processes) {
      y = addWrappedText(doc, `Despacho: ${p.despacho || 'N/A'}`, y, pageNum, { bold: true });
      if (p.sujetos) y = addWrappedText(doc, `Sujetos: ${p.sujetos}`, y, pageNum, { indent: 4 });
      if (p.ponente) y = addWrappedText(doc, `Ponente: ${p.ponente}`, y, pageNum, { indent: 4 });
      if (p.tipo) y = addWrappedText(doc, `Tipo: ${p.tipo}`, y, pageNum, { indent: 4 });
      y += 3;
    }
    y += 4;
  }
  
  if (aiAnalysis) {
    y = addSectionTitle(doc, 'Análisis Legal del Proceso', y, pageNum);
    y = addWrappedText(doc, aiAnalysis, y, pageNum);
  }
  
  addFooter(doc, pageNum.current);
  doc.save(`consulta-proceso-${radicado.replace(/[^a-z0-9]/gi, '-')}.pdf`);
}

// =================== SUIN JURISCOL ===================
export function exportSuinSearchToPdf(query: string, summary: string, results: { title: string; url: string; snippet: string }[]) {
  const doc = new jsPDF();
  const pageNum = { current: 1 };
  
  addHeader(doc, 'Consulta SUIN-Juriscol', 'Módulo SUIN-Juriscol');
  let y = 45;
  
  y = addSectionTitle(doc, 'Consulta Realizada', y, pageNum);
  y = addWrappedText(doc, query, y, pageNum);
  y += 4;
  
  if (summary) {
    y = addSectionTitle(doc, 'Resumen', y, pageNum);
    y = addWrappedText(doc, summary, y, pageNum);
    y += 4;
  }
  
  if (results?.length) {
    y = addSectionTitle(doc, 'Resultados', y, pageNum);
    for (const r of results) {
      y = addWrappedText(doc, r.title, y, pageNum, { bold: true });
      y = addWrappedText(doc, r.snippet, y, pageNum, { indent: 4 });
      y = addWrappedText(doc, `URL: ${r.url}`, y, pageNum, { indent: 4, fontSize: 8 });
      y += 3;
    }
  }
  
  addFooter(doc, pageNum.current);
  doc.save(`suin-juriscol-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
