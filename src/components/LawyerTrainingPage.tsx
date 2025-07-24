import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Brain, 
  BookOpen, 
  Target, 
  CheckCircle, 
  PlayCircle,
  FileText,
  Lightbulb,
  Users,
  Zap,
  MessageSquare,
  Award,
  Video,
  Download,
  ChevronRight
} from "lucide-react";
import AILegalTrainingSystem from "./AILegalTrainingSystem";

interface LawyerTrainingPageProps {
  onBack: () => void;
  lawyerData: any;
}

export default function LawyerTrainingPage({ onBack, lawyerData }: LawyerTrainingPageProps) {
  const [currentView, setCurrentView] = useState<'overview' | 'training'>('overview');

  const startCertification = () => {
    setCurrentView('training');
  };

  if (currentView === 'training') {
    return (
      <AILegalTrainingSystem
        lawyerId={lawyerData?.id || ''}
        lawyerData={lawyerData}
        onBack={() => setCurrentView('overview')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={onBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Brain className="w-6 h-6" />
            Centro de Formación IA Legal
          </h1>
          <p className="text-muted-foreground">
            Programa de Certificación IA Lawyer Fundamentals
          </p>
        </div>
      </div>

      {/* Welcome Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Bienvenido al Programa de Certificación
          </CardTitle>
          <CardDescription className="text-base">
            Domina la Inteligencia Artificial aplicada al ejercicio legal con nuestro programa 
            especializado de 5 módulos con validación por IA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">¿Qué aprenderás?</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Fundamentos de IA aplicados al derecho
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Técnicas avanzadas de prompt engineering legal
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Automatización de documentos y procesos
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Ética y responsabilidad en IA legal
                </li>
                <li className="flex items-start gap-2">
                  <Target className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  Implementación práctica en firmas legales
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Características del Programa</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-sm">Validación por agente de IA especializado</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Feedback inmediato y personalizado</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span className="text-sm">Ejercicios prácticos reales</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Certificación digital verificable</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h4 className="font-semibold">¡Comienza tu certificación ahora!</h4>
                <p className="text-sm text-muted-foreground">
                  Duración estimada: 5-7 horas • Válido por: Permanente
                </p>
              </div>
              <Button onClick={startCertification} size="lg" className="w-full sm:w-auto">
                <PlayCircle className="w-4 h-4 mr-2" />
                Iniciar Certificación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Estructura del Programa
          </CardTitle>
          <CardDescription>
            5 módulos especializados con validación automática por IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {[
              {
                id: "foundations-ai-law",
                title: "1. Fundamentos de IA en el Derecho",
                description: "Conceptos esenciales y aplicaciones prácticas",
                duration: "45 min",
                difficulty: "Básico",
                icon: Brain,
                color: "text-blue-500"
              },
              {
                id: "prompt-engineering-legal",
                title: "2. Ingeniería de Prompts para Abogados",
                description: "Técnicas avanzadas para crear instrucciones efectivas",
                duration: "60 min",
                difficulty: "Intermedio",
                icon: MessageSquare,
                color: "text-green-500"
              },
              {
                id: "document-automation",
                title: "3. Automatización de Documentos Legales",
                description: "Implementación práctica de sistemas automáticos",
                duration: "75 min",
                difficulty: "Avanzado",
                icon: FileText,
                color: "text-purple-500"
              },
              {
                id: "ai-legal-ethics",
                title: "4. Ética y Responsabilidad en IA Legal",
                description: "Marco ético y legal para uso responsable de IA",
                duration: "50 min",
                difficulty: "Intermedio",
                icon: Target,
                color: "text-orange-500"
              },
              {
                id: "advanced-implementation",
                title: "5. Implementación Avanzada y ROI",
                description: "Estrategias de implementación escalable",
                duration: "80 min",
                difficulty: "Avanzado",
                icon: Zap,
                color: "text-red-500"
              }
            ].map((module) => {
              const IconComponent = module.icon;
              return (
                <div key={module.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg bg-muted ${module.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{module.title}</h4>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">{module.difficulty}</Badge>
                      <Badge variant="secondary" className="text-xs">{module.duration}</Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Validation System */}
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Brain className="w-5 h-5" />
            Sistema de Validación por IA Especializada
          </CardTitle>
          <CardDescription className="text-green-700">
            Evaluación automática e inteligente de tu progreso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-800">Cómo Funciona</h4>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                  <span>Completas el contenido teórico del módulo</span>
                </li>
                <li className="flex gap-2">
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                  <span>Respondes preguntas de evaluación específicas</span>
                </li>
                <li className="flex gap-2">
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                  <span>IA analiza tus respuestas con criterios profesionales</span>
                </li>
                <li className="flex gap-2">
                  <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                  <span>Recibes feedback detallado y puntuación</span>
                </li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-green-800">Criterios de Evaluación</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Precisión técnica (30%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Aplicabilidad práctica (25%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Completitud de respuesta (20%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Pensamiento crítico (15%)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Claridad comunicativa (10%)</span>
                </li>
              </ul>
              
              <div className="mt-4 p-3 bg-green-100 rounded border border-green-200">
                <p className="text-xs text-green-800">
                  <strong>Puntuación mínima:</strong> 70/100 para aprobar cada módulo
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <div className="text-center py-8">
        <h3 className="text-xl font-bold mb-2">¿Listo para transformar tu práctica legal?</h3>
        <p className="text-muted-foreground mb-6">
          Únete a la nueva generación de abogados que dominan la IA
        </p>
        <Button onClick={startCertification} size="lg" className="bg-primary hover:bg-primary/90">
          <Award className="w-5 h-5 mr-2" />
          Comenzar Certificación Ahora
        </Button>
      </div>
    </div>
  );
}