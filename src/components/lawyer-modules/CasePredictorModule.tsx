import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Scale, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  FileText,
  Sparkles,
  Loader2,
  History,
  Target,
  Shield,
  Coins
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCredits } from '@/hooks/useCredits';
import { ToolCostIndicator } from '@/components/credits/ToolCostIndicator';

interface PredictionResult {
  successProbability: number;
  timeEstimate: { min: number; max: number; unit: string };
  confidenceLevel: string;
  riskFactors: Array<{ factor: string; impact: string; mitigation: string }>;
  recommendedArguments: Array<{ argument: string; strength: string; precedent?: string }>;
  similarCases: Array<{ description: string; outcome: string; relevance: number }>;
  analysis: string;
}

interface CasePredictorModuleProps {
  lawyerId: string;
}

export function CasePredictorModule({ lawyerId }: CasePredictorModuleProps) {
  const [caseType, setCaseType] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [courtType, setCourtType] = useState('');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  const { consumeCredits, hasEnoughCredits, getToolCost } = useCredits(lawyerId);

  const caseTypes = [
    { value: 'civil_contractual', label: 'Civil - Contractual' },
    { value: 'civil_extracontractual', label: 'Civil - Extracontractual' },
    { value: 'laboral_ordinario', label: 'Laboral Ordinario' },
    { value: 'laboral_especial', label: 'Laboral Especial' },
    { value: 'penal', label: 'Penal' },
    { value: 'administrativo', label: 'Contencioso Administrativo' },
    { value: 'familia', label: 'Familia' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'constitucional', label: 'Constitucional (Tutela)' }
  ];

  const jurisdictions = [
    { value: 'bogota', label: 'Bogotá D.C.' },
    { value: 'medellin', label: 'Medellín' },
    { value: 'cali', label: 'Cali' },
    { value: 'barranquilla', label: 'Barranquilla' },
    { value: 'cartagena', label: 'Cartagena' },
    { value: 'bucaramanga', label: 'Bucaramanga' },
    { value: 'otro', label: 'Otra ciudad' }
  ];

  const courtTypes = [
    { value: 'municipal', label: 'Juzgado Municipal' },
    { value: 'circuito', label: 'Juzgado del Circuito' },
    { value: 'tribunal', label: 'Tribunal Superior' },
    { value: 'corte_suprema', label: 'Corte Suprema de Justicia' },
    { value: 'consejo_estado', label: 'Consejo de Estado' },
    { value: 'corte_constitucional', label: 'Corte Constitucional' }
  ];

  const runPrediction = async () => {
    if (!caseType || !caseDescription.trim()) {
      toast.error('Por favor completa el tipo de caso y la descripción');
      return;
    }

    // Check credits before proceeding
    if (!hasEnoughCredits('case_predictor')) {
      toast.error(`Créditos insuficientes. Necesitas ${getToolCost('case_predictor')} créditos para usar el Predictor de Casos.`);
      return;
    }

    try {
      setLoading(true);
      
      // Consume credits first
      const creditResult = await consumeCredits('case_predictor', { caseType, jurisdiction });
      if (!creditResult.success) {
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('case-outcome-predictor', {
        body: {
          caseType,
          caseDescription,
          jurisdiction,
          courtType,
          lawyerId
        }
      });

      if (error) throw error;

      setPrediction(data);
      
      // Save to history
      await supabase.from('case_predictions').insert({
        lawyer_id: lawyerId,
        case_type: caseType,
        case_description: caseDescription,
        jurisdiction,
        court_type: courtType,
        prediction_result: data,
        risk_factors: data.riskFactors,
        recommended_arguments: data.recommendedArguments,
        ai_analysis: data.analysis
      });

      toast.success('Predicción completada');
    } catch (error) {
      console.error('Error running prediction:', error);
      toast.error('Error al generar la predicción');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('case_predictions')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 70) return 'text-green-500';
    if (probability >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case 'high': return <Badge className="bg-green-500">Alta</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Media</Badge>;
      default: return <Badge className="bg-red-500">Baja</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Predictor de Resultados de Casos
          </h2>
          <p className="text-muted-foreground">
            Análisis predictivo basado en IA para estimar resultados judiciales
          </p>
        </div>
        <ToolCostIndicator toolType="case_predictor" lawyerId={lawyerId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Caso</CardTitle>
            <CardDescription>
              Proporciona los detalles del caso para generar la predicción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Caso</Label>
                <Select value={caseType} onValueChange={setCaseType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {caseTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Jurisdicción</Label>
                <Select value={jurisdiction} onValueChange={setJurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    {jurisdictions.map(j => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Despacho</Label>
              <Select value={courtType} onValueChange={setCourtType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar despacho" />
                </SelectTrigger>
                <SelectContent>
                  {courtTypes.map(court => (
                    <SelectItem key={court.value} value={court.value}>
                      {court.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción del Caso</Label>
              <Textarea
                value={caseDescription}
                onChange={e => setCaseDescription(e.target.value)}
                placeholder="Describe los hechos relevantes, pretensiones, pruebas disponibles y cualquier otro detalle importante del caso..."
                className="min-h-[200px]"
              />
            </div>

            <Button 
              className="w-full h-12" 
              size="lg"
              onClick={runPrediction}
              disabled={loading || !caseType || !caseDescription.trim() || !hasEnoughCredits('case_predictor')}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  <span>Generar Predicción</span>
                  <span className="ml-3 flex items-center gap-1 bg-primary-foreground/20 px-2 py-0.5 rounded-lg text-sm">
                    <Coins className="h-4 w-4" />
                    {getToolCost('case_predictor')}
                  </span>
                </>
              )}
            </Button>
            
            {!hasEnoughCredits('case_predictor') && (
              <p className="text-sm text-destructive text-center">
                Créditos insuficientes para usar esta herramienta
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {prediction ? (
            <Tabs defaultValue="summary">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="summary">Resumen</TabsTrigger>
                <TabsTrigger value="risks">Riesgos</TabsTrigger>
                <TabsTrigger value="arguments">Argumentos</TabsTrigger>
                <TabsTrigger value="similar">Similares</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                {/* Success Probability */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center mb-4">
                      <p className="text-sm text-muted-foreground mb-2">Probabilidad de Éxito</p>
                      <p className={`text-5xl font-bold ${getSuccessColor(prediction.successProbability)}`}>
                        {prediction.successProbability}%
                      </p>
                      <Badge variant="outline" className="mt-2">
                        Confianza: {prediction.confidenceLevel}
                      </Badge>
                    </div>
                    <Progress value={prediction.successProbability} className="h-3" />
                  </CardContent>
                </Card>

                {/* Time Estimate */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tiempo Estimado de Resolución</p>
                        <p className="text-xl font-bold">
                          {prediction.timeEstimate.min} - {prediction.timeEstimate.max} {prediction.timeEstimate.unit}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Analysis */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Análisis General
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {prediction.analysis}
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risks">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Factores de Riesgo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {prediction.riskFactors.map((risk, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium">{risk.factor}</p>
                              <Badge variant={risk.impact === 'high' ? 'destructive' : 'outline'}>
                                {risk.impact === 'high' ? 'Alto' : risk.impact === 'medium' ? 'Medio' : 'Bajo'}
                              </Badge>
                            </div>
                            <div className="p-3 bg-muted/50 rounded text-sm">
                              <p className="font-medium text-xs text-muted-foreground mb-1">Mitigación sugerida:</p>
                              {risk.mitigation}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="arguments">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Argumentos Recomendados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {prediction.recommendedArguments.map((arg, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <p className="font-medium flex-1">{arg.argument}</p>
                              {getStrengthBadge(arg.strength)}
                            </div>
                            {arg.precedent && (
                              <p className="text-sm text-muted-foreground mt-2">
                                📚 Precedente: {arg.precedent}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="similar">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-blue-500" />
                      Casos Similares
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {prediction.similarCases.map((caso, index) => (
                          <div key={index} className="p-4 border rounded-lg">
                            <p className="text-sm mb-2">{caso.description}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant={caso.outcome === 'favorable' ? 'default' : 'destructive'}>
                                {caso.outcome === 'favorable' ? '✓ Favorable' : '✗ Desfavorable'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Relevancia: {Math.round(caso.relevance * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center p-8">
                <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">Predictor de Casos</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Completa la información del caso y haz clic en "Generar Predicción" 
                  para obtener un análisis predictivo basado en IA.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}