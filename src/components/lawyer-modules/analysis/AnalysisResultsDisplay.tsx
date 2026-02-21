import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, FileText, CheckCircle, XCircle, AlertCircle, 
  Copy, Check, Download, ChevronDown, FileSignature, MessageSquare, 
  CheckSquare, BarChart, Calendar, Users, BookOpen, FileWarning,
  Sparkles, Shield, Target
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
    clauses: true,
    risks: true,
    recommendations: true,
    keyDates: false,
    parties: false,
    legalReferences: false,
    missingElements: false
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

  // Counts for stats
  const risksCount = result.risks?.length || 0;
  const clausesCount = result.clauses?.length || 0;
  const recommendationsCount = result.recommendations?.length || 0;
  const highRisksCount = result.risks?.filter(r => 
    ['critical', 'alto', 'high'].includes((r.severity || '').toLowerCase())
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header Card with Stats */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg">
                  {getCategoryIcon(result.documentCategory)}
                  <span className="sr-only">{getCategoryLabel(result.documentCategory)}</span>
                </div>
                <div>
                  <CardTitle className="text-xl">{result.fileName}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {result.documentType} • {result.timestamp.toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
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
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-4 rounded-lg border">
              {result.summary}
            </p>
          </CardContent>
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
                      <p className="font-medium text-cyan-900 dark:text-cyan-100">{ref.reference}</p>
                      <p className="text-sm text-cyan-600 dark:text-cyan-400 mt-1">{ref.context}</p>
                    </div>
                  ))}
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
