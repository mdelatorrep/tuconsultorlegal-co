import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { User, Users, Shield, ArrowRight, Check } from 'lucide-react';

interface UserTypeSelectorProps {
  onSelectType: (type: 'user' | 'business' | 'lawyer') => void;
  onBack: () => void;
}

export default function UserTypeSelector({ onSelectType, onBack }: UserTypeSelectorProps) {
  const userTypes = [
    {
      type: 'user' as const,
      icon: User,
      title: 'Personas',
      subtitle: 'Servicios legales individuales',
      description: 'Accede a documentos legales, consultas gratuitas y seguimiento personalizado',
      features: ['Documentos legales básicos', 'Consulta gratuita', 'Seguimiento en línea'],
      color: 'primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/20',
      textColor: 'text-primary'
    },
    {
      type: 'business' as const,
      icon: Users,
      title: 'Empresas',
      subtitle: 'Soluciones corporativas',
      description: 'Herramientas especializadas para necesidades empresariales y comerciales',
      features: ['Contratos empresariales', 'Múltiples usuarios', 'Soporte prioritario'],
      color: 'success',
      bgColor: 'bg-success/5',
      borderColor: 'border-success/30',
      textColor: 'text-success'
    },
    {
      type: 'lawyer' as const,
      icon: Shield,
      title: 'Abogados',
      subtitle: 'Portal profesional',
      description: 'Plataforma completa para profesionales del derecho con herramientas avanzadas',
      features: ['Dashboard completo', 'CRM integrado', 'Análisis con IA'],
      color: 'warning',
      bgColor: 'bg-warning/5',
      borderColor: 'border-warning/30',
      textColor: 'text-warning'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-hero">
      <div className="w-full max-w-5xl">
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6 hover:bg-white/10"
          >
            ← Volver al inicio
          </Button>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Accede a Tu Consultor Legal
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Elige tu perfil para acceder a servicios legales personalizados y herramientas especializadas
            </p>
            
            {/* Quick Benefits */}
            <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Registro rápido</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Acceso inmediato</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Soporte especializado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced User Type Cards */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-12">
          {userTypes.map((userType, index) => {
            const IconComponent = userType.icon;
            const isRecommended = userType.type === 'user'; // Highlight personal users
            
            return (
              <Card 
                key={userType.type}
                className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:scale-105 relative overflow-hidden ${userType.borderColor} ${userType.bgColor} ${
                  isRecommended ? 'ring-2 ring-primary/50 shadow-lg' : ''
                }`}
                onClick={() => onSelectType(userType.type)}
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  animation: 'fade-in 0.6s ease-out forwards'
                }}
              >
                {isRecommended && (
                  <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                    Más Popular
                  </div>
                )}
                
                <CardHeader className="text-center pb-6 relative">
                  <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${userType.bgColor} ring-4 ring-white/50 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`w-10 h-10 ${userType.textColor}`} />
                  </div>
                  <CardTitle className={`text-2xl font-bold ${userType.textColor} mb-2`}>
                    {userType.title}
                  </CardTitle>
                  <CardDescription className="text-base font-medium text-foreground/80">
                    {userType.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 px-6 pb-8">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {userType.description}
                  </p>

                  <div className="space-y-3">
                    {userType.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-success flex-shrink-0" />
                        <span className="text-foreground/90">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <Button 
                      className={`w-full group-hover:shadow-lg transition-all duration-300 text-base font-medium ${
                        isRecommended ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 
                        userType.color === 'success' ? 'bg-success hover:bg-success-dark text-success-foreground' : 
                        'border-2 border-warning text-warning hover:bg-warning hover:text-warning-foreground'
                      }`}
                      size="lg"
                      variant={isRecommended ? 'default' : userType.color === 'success' ? 'success' : 'outline'}
                    >
                      {isRecommended ? 'Comenzar Ahora' : 'Acceder'}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Enhanced Call-to-Action Section */}
        <div className="text-center space-y-6">
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card/50 p-4 rounded-lg border border-border/50">
              <h3 className="font-semibold text-primary mb-2">¿Eres nuevo?</h3>
              <p className="text-sm text-muted-foreground">
                Regístrate y accede a documentos legales en minutos
              </p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg border border-border/50">
              <h3 className="font-semibold text-success mb-2">¿Ya tienes cuenta?</h3>
              <p className="text-sm text-muted-foreground">
                Inicia sesión para continuar donde lo dejaste
              </p>
            </div>
            <div className="bg-card/50 p-4 rounded-lg border border-border/50">
              <h3 className="font-semibold text-warning mb-2">¿Eres abogado?</h3>
              <p className="text-sm text-muted-foreground">
                Accede a herramientas profesionales avanzadas
              </p>
            </div>
          </div>
          
          <div className="bg-card/30 backdrop-blur-sm p-6 rounded-xl border border-border/30">
            <p className="text-muted-foreground mb-4 text-lg">
              ¿No estás seguro cuál elegir?
            </p>
            <button 
              onClick={() => onSelectType('user')}
              className="text-primary hover:underline font-semibold text-lg transition-colors"
            >
              Comienza como persona → es gratis y puedes cambiar después
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}