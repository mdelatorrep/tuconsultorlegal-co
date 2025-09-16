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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-muted/30">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4"
          >
            ← Volver al inicio
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Selecciona tu tipo de acceso
          </h1>
          <p className="text-muted-foreground text-lg">
            Elige la opción que mejor se adapte a tus necesidades
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {userTypes.map((userType) => {
            const IconComponent = userType.icon;
            return (
              <Card 
                key={userType.type}
                className={`group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${userType.borderColor} ${userType.bgColor}`}
                onClick={() => onSelectType(userType.type)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${userType.bgColor}`}>
                    <IconComponent className={`w-8 h-8 ${userType.textColor}`} />
                  </div>
                  <CardTitle className={`text-xl ${userType.textColor}`}>
                    {userType.title}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium">
                    {userType.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {userType.description}
                  </p>

                  <div className="space-y-2">
                    {userType.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-success" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    className={`w-full group-hover:shadow-md transition-all duration-300`}
                    variant={userType.color === 'primary' ? 'default' : userType.color === 'success' ? 'success' : 'outline'}
                  >
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8 p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">
            ¿No estás seguro? Puedes{' '}
            <button 
              onClick={() => onSelectType('user')}
              className="text-primary hover:underline font-medium"
            >
              comenzar como persona
            </button>
            {' '}y cambiar más tarde
          </p>
        </div>
      </div>
    </div>
  );
}