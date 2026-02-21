import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, FileText, CheckCircle, XCircle, AlertCircle, 
  Copy, Check, Download, ChevronDown, FileSignature, MessageSquare, 
  CheckSquare, BarChart, Calendar, Users, BookOpen, FileWarning,
  Sparkles, Shield, Target, Globe, Search, Scale, ExternalLink,
  Gavel, AlertOctagon
} from 'lucide-react';
import { toast } from "sonner";
import { AnalysisResult, getCategoryLabel, getElementLabel } from './analysisNormalizer';

interface AnalysisResultsDisplayProps {
  result: AnalysisResult;
  onExport: () => void;
}

export default function AnalysisResultsDisplay({ result, onExport }: AnalysisResultsDisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    jurisdiction: true,
    legalFramework: false,
    clauses: true,
    risks: true,
    recommendations: true,
    keyDates: false,
    parties: false,
    legalReferences: false,
    missingElements: false,
    sourcesConsulted: false,
    pendingVerifications: true,
    strategicConclusion: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text: string, sectionName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionName);
      toast.success(`${sectionName} copiado al portapapeles`);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Error al copiar al portapapeles');
    }
  };

  const getCategoryIcon = (category?: string) => {
    const icons: Record<string, React.ReactNode> = {
      contrato: <FileSignature className="w-5 h-5" />,
      actuacion_procesal: <Gavel className="w-5 h-5" />,
      providencia_judicial: <Scale className="w-5 h-5" />,
      mecanismo_constitucional: <Shield className="w-5 h-5" />,
      acto_administrativo: <FileText className="w-5 h-5" />,
      documento_notarial: <FileSignature className="w-5 h-5" />,
      respuesta_legal: <MessageSquare className="w-5 h-5" />,
      escrito_juridico: <CheckSquare className="w-5 h-5" />,
      informe: <BarChart className="w-5 h-5" />,
      correspondencia: <FileText className="w-5 h-5" />,
      anexo: <FileText className="w-5 h-5" />,
      otro: <FileText className="w-5 h-5" />
    };
    return icons[category || 'otro'] || icons['otro'];
  };

  const getRiskBadgeStyles = (level: string) => {
    const normalizedLevel = (level || '').toLowerCase();
    switch (normalizedLevel) {
      case 'critical':
      case 'alto':
      case 'high':
        return { bg: 'bg-red-100 dark:bg-red-950', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', badgeClass: 'bg-red-500 hover:bg-red-500' };
      case 'medium':
      case 'medio':
        return { bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', badgeClass: 'bg-orange-500 hover:bg-orange-500' };
      case 'low':
      case 'bajo':
        return { bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', badgeClass: 'bg-green-500 hover:bg-green-500' };
      default:
        return { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', badgeClass: 'bg-muted-foreground hover:bg-muted-foreground' };
    }
  };

  const getRiskLabel = (level: string) => {
    const normalizedLevel = (level || '').toLowerCase();
    switch (normalizedLevel) {
      case 'critical':
      case 'alto':
      case 'high':
        return 'Alto Riesgo';
      case 'medium':
      case 'medio':
        return 'Riesgo Medio';
      case 'low':
      case 'bajo':
        return 'Riesgo Bajo';
      default:
        return level || 'Sin clasificar';
    }
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    const styles = {
      alta: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      baja: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return styles[confidence as keyof typeof styles] || 'bg-muted text-muted-foreground';
  };

  const getVerificationStatusBadge = (status: string) => {
    switch (status) {
      case 'vigente': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'modificada': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'derogada': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'no_verificada': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSourceResultBadge = (result: string) => {
    switch (result) {
      case 'verificado': return { class: 'bg-green-500 hover:bg-green-500', label: '✓ Verificado' };
      case 'no_encontrado': return { class: 'bg-red-500 hover:bg-red-500', label: '✗ No encontrado' };
      case 'parcial': return { class: 'bg-yellow-500 hover:bg-yellow-500', label: '~ Parcial' };
      default: return { class: 'bg-muted-foreground', label: result };
    }
  };

  // Counts for stats
  const risksCount = result.risks?.length || 0;
  const clausesCount = result.clauses?.length || 0;
  const recommendationsCount = result.recommendations?.length || 0;
  const highRisksCount = result.risks?.filter(r => 
    ['critical', 'alto', 'high'].includes((r.severity || '').toLowerCase())
  ).length || 0;
  const pendingCount = result.pendingVerifications?.length || 0;
  const sourcesCount = result.sourcesConsulted?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header Card with Stats */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg text-white">
                  {getCategoryIcon(result.documentCategory)}
                  <span className="sr-only">{getCategoryLabel(result.documentCategory)}</span>
                </div>
                <div>
                  <CardTitle className="text-xl">{result.fileName}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {result.documentType}
                    {result.documentSubtype && ` — ${result.documentSubtype}`}
                    {' • '}
                    {result.timestamp.toLocaleString('es-ES', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                {getCategoryLabel(result.documentCategory)}
              </Badge>
              {result.detectionConfidence && (
                <Badge className={getConfidenceBadge(result.detectionConfidence)}>
                  Confianza: {result.detectionConfidence}
                </Badge>
              )}
              {result.webSearchUsed && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  <Globe className="w-3 h-3 mr-1" />
                  Web Search
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  <Search className="w-3 h-3 mr-1" />
                  {pendingCount} verificación{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>

          {/* Stats Grid */}
          <CardContent className="pt-0 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{clausesCount}</p>
                    <p className="text-xs text-muted-foreground">{getElementLabel(result.documentCategory)}s</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{risksCount}</p>
                    <p className="text-xs text-muted-foreground">Riesgos</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{highRisksCount}</p>
                    <p className="text-xs text-muted-foreground">Alto Riesgo</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/60 dark:bg-card/60 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{recommendationsCount}</p>
                    <p className="text-xs text-muted-foreground">Recomendaciones</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Jurisdiction & Applicable Statute */}
      {(result.jurisdiction || result.applicableStatute) && (
        <Card>
          <Collapsible open={openSections.jurisdiction} onOpenChange={() => toggleSection('jurisdiction')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-violet-600" />
                    Jurisdicción y Estatuto Procesal
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.jurisdiction ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.jurisdiction && (
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/50 rounded-lg border border-violet-200 dark:border-violet-800">
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">Jurisdicción</p>
                      <p className="font-semibold text-violet-900 dark:text-violet-100 mt-1">{result.jurisdiction}</p>
                    </div>
                  )}
                  {result.applicableStatute && (
                    <div className="p-4 bg-violet-50 dark:bg-violet-950/50 rounded-lg border border-violet-200 dark:border-violet-800">
                      <p className="text-xs font-medium text-violet-600 dark:text-violet-400 uppercase tracking-wider">Estatuto Procesal</p>
                      <p className="font-semibold text-violet-900 dark:text-violet-100 mt-1">{result.applicableStatute}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Activated Legal Framework */}
      {result.activatedLegalFramework && result.activatedLegalFramework.length > 0 && (
        <Card>
          <Collapsible open={openSections.legalFramework} onOpenChange={() => toggleSection('legalFramework')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-teal-600" />
                    Marco Normativo Activado
                    <Badge variant="secondary" className="ml-2">{result.activatedLegalFramework.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.legalFramework ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.activatedLegalFramework.map((fw, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800">
                      <div className="flex items-center gap-3">
                        <p className="font-medium text-teal-900 dark:text-teal-100">{fw.norm}</p>
                        {fw.verifiedUrl && (
                          <a href={fw.verifiedUrl} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:text-teal-800">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <Badge className={getVerificationStatusBadge(fw.status)}>
                        {fw.status === 'vigente' ? '✓ Vigente' : fw.status === 'modificada' ? '⚠ Modificada' : fw.status === 'derogada' ? '✗ Derogada' : '? No verificada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Summary Section */}
      {result.summary && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-500" />
                Resumen Ejecutivo
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(result.summary!, 'Resumen')}
              >
                {copiedSection === 'Resumen' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg border whitespace-pre-line">
              {result.summary}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Verifications Section — shown prominently */}
      {result.pendingVerifications && result.pendingVerifications.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-800">
          <Collapsible open={openSections.pendingVerifications} onOpenChange={() => toggleSection('pendingVerifications')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-800 dark:text-amber-200">Verificaciones Pendientes</span>
                    <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">{result.pendingVerifications.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.pendingVerifications ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {result.pendingVerifications.map((pv, index) => (
                    <div key={index} className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <Search className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-900 dark:text-amber-100">🔍 {pv.data}</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Verificar en: <span className="font-medium">{pv.source}</span>
                          </p>
                          {pv.url && (
                            <a href={pv.url} target="_blank" rel="noopener noreferrer" 
                              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 mt-1 underline">
                              <ExternalLink className="w-3 h-3" />
                              {pv.url}
                            </a>
                          )}
                          {pv.impact && (
                            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 italic">
                              ⚠️ Impacto: {pv.impact}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Risks Section */}
      {result.risks && result.risks.length > 0 && (
        <Card>
          <Collapsible open={openSections.risks} onOpenChange={() => toggleSection('risks')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Riesgos Identificados
                    <Badge variant="secondary" className="ml-2">{risksCount}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          result.risks!.map((r, i) => 
                            `${i + 1}. ${r.type} [${r.severity}]\n${r.description}${r.mitigation ? `\nMitigación: ${r.mitigation}` : ''}`
                          ).join('\n\n'),
                          'Riesgos'
                        );
                      }}
                    >
                      {copiedSection === 'Riesgos' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.risks ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {result.risks.map((risk, index) => {
                    const styles = getRiskBadgeStyles(risk.severity);
                    return (
                      <div 
                        key={index} 
                        className={`flex items-start gap-3 p-4 rounded-lg border ${styles.bg} ${styles.border}`}
                      >
                        <Badge className={`${styles.badgeClass} text-white shrink-0`}>
                          {getRiskLabel(risk.severity)}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold ${styles.text}`}>{risk.type}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{risk.description}</p>
                          {risk.mitigation && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                              <p className="text-sm">
                                <span className="font-medium text-green-700 dark:text-green-300">💡 Mitigación:</span>{' '}
                                <span className="text-green-600 dark:text-green-400">{risk.mitigation}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Clauses Section */}
      {result.clauses && result.clauses.length > 0 && (
        <Card>
          <Collapsible open={openSections.clauses} onOpenChange={() => toggleSection('clauses')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    {getElementLabel(result.documentCategory)}s Identificados
                    <Badge variant="secondary" className="ml-2">{clausesCount}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          result.clauses!.map((c, i) => 
                            `${i + 1}. ${c.name}\n${c.content}\nRiesgo: ${c.riskLevel}\nRecomendación: ${c.recommendation}`
                          ).join('\n\n'),
                          'Elementos'
                        );
                      }}
                    >
                      {copiedSection === 'Elementos' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.clauses ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {result.clauses.map((clause, index) => {
                    const styles = getRiskBadgeStyles(clause.riskLevel);
                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border-l-4 ${styles.bg} ${styles.border}`}
                        style={{ borderLeftColor: clause.riskLevel.toLowerCase().includes('alto') || clause.riskLevel.toLowerCase().includes('high') ? 'rgb(239 68 68)' : clause.riskLevel.toLowerCase().includes('medio') || clause.riskLevel.toLowerCase().includes('medium') ? 'rgb(249 115 22)' : 'rgb(34 197 94)' }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 className="font-semibold text-foreground">{clause.name}</h4>
                          <Badge className={`${styles.badgeClass} text-white shrink-0`}>
                            {getRiskLabel(clause.riskLevel)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{clause.content}</p>
                        {clause.recommendation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm">
                              <span className="font-medium text-blue-700 dark:text-blue-300">💡 Recomendación:</span>{' '}
                              <span className="text-blue-600 dark:text-blue-400">{clause.recommendation}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Recommendations Section */}
      {result.recommendations && result.recommendations.length > 0 && (
        <Card>
          <Collapsible open={openSections.recommendations} onOpenChange={() => toggleSection('recommendations')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Recomendaciones
                    <Badge variant="secondary" className="ml-2">{recommendationsCount}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          result.recommendations!.map((r, i) => `${i + 1}. ${r}`).join('\n'),
                          'Recomendaciones'
                        );
                      }}
                    >
                      {copiedSection === 'Recomendaciones' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.recommendations ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-green-800 dark:text-green-200">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Strategic Conclusion */}
      {result.strategicConclusion && (
        <Card className="border-indigo-300 dark:border-indigo-800">
          <Collapsible open={openSections.strategicConclusion} onOpenChange={() => toggleSection('strategicConclusion')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" />
                    <span className="text-indigo-800 dark:text-indigo-200">Conclusión Estratégica</span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(result.strategicConclusion!, 'Conclusión');
                      }}
                    >
                      {copiedSection === 'Conclusión' ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <ChevronDown className={`h-5 w-5 transition-transform ${openSections.strategicConclusion ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 leading-relaxed whitespace-pre-line">
                    {result.strategicConclusion}
                  </p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-3 italic">
                    ⚠️ Orientación probabilística. No sustituye el criterio del abogado responsable.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Key Dates Section */}
      {result.keyDates && result.keyDates.length > 0 && (
        <Card>
          <Collapsible open={openSections.keyDates} onOpenChange={() => toggleSection('keyDates')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    Fechas Clave
                    <Badge variant="secondary" className="ml-2">{result.keyDates.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.keyDates ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.keyDates.map((date, index) => {
                    const styles = getRiskBadgeStyles(date.importance);
                    return (
                      <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${styles.bg} ${styles.border} border`}>
                        <div>
                          <p className="font-medium">{date.date}</p>
                          <p className="text-sm text-muted-foreground">{date.description}</p>
                        </div>
                        <Badge className={`${styles.badgeClass} text-white`}>
                          {getRiskLabel(date.importance)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Parties Section */}
      {result.parties && result.parties.length > 0 && (
        <Card>
          <Collapsible open={openSections.parties} onOpenChange={() => toggleSection('parties')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    Partes Involucradas
                    <Badge variant="secondary" className="ml-2">{result.parties.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.parties ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.parties.map((party, index) => (
                    <div key={index} className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="font-semibold text-indigo-900 dark:text-indigo-100">{party.name}</p>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">{party.role}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Legal References Section */}
      {result.legalReferences && result.legalReferences.length > 0 && (
        <Card>
          <Collapsible open={openSections.legalReferences} onOpenChange={() => toggleSection('legalReferences')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-cyan-600" />
                    Referencias Legales
                    <Badge variant="secondary" className="ml-2">{result.legalReferences.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.legalReferences ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.legalReferences.map((ref, index) => (
                    <div key={index} className="p-4 bg-cyan-50 dark:bg-cyan-950/50 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-cyan-900 dark:text-cyan-100">{ref.reference}</p>
                        {ref.verified !== undefined && (
                          <Badge className={ref.verified ? 'bg-green-500 hover:bg-green-500 text-white' : 'bg-gray-400 hover:bg-gray-400 text-white'}>
                            {ref.verified ? '✓' : '?'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">{ref.context}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Sources Consulted Section */}
      {result.sourcesConsulted && result.sourcesConsulted.length > 0 && (
        <Card>
          <Collapsible open={openSections.sourcesConsulted} onOpenChange={() => toggleSection('sourcesConsulted')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5 text-sky-600" />
                    Fuentes Consultadas
                    <Badge variant="secondary" className="ml-2">{sourcesCount}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.sourcesConsulted ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.sourcesConsulted.map((source, index) => {
                    const badge = getSourceResultBadge(source.result);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sky-900 dark:text-sky-100 text-sm">{source.data}</p>
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" 
                              className="text-xs text-sky-600 hover:text-sky-800 truncate block">
                              {source.url}
                            </a>
                          )}
                          {source.consultDate && (
                            <p className="text-xs text-sky-500 mt-0.5">Consultado: {source.consultDate}</p>
                          )}
                        </div>
                        <Badge className={`${badge.class} text-white shrink-0 ml-3`}>
                          {badge.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Missing Elements Section */}
      {result.missingElements && result.missingElements.length > 0 && (
        <Card>
          <Collapsible open={openSections.missingElements} onOpenChange={() => toggleSection('missingElements')}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-yellow-600" />
                    Elementos Faltantes
                    <Badge variant="secondary" className="ml-2">{result.missingElements.length}</Badge>
                  </CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openSections.missingElements ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {result.missingElements.map((elem, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 bg-yellow-50 dark:bg-yellow-950/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-yellow-800 dark:text-yellow-200">{elem}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}
