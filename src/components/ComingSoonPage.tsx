import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  Rocket,
  Mail,
  CheckCircle2,
  Sparkles,
  Users,
  Shield,
  Zap,
  ArrowLeft,
  Bell,
  Clock,
  Star
} from 'lucide-react';

interface ComingSoonPageProps {
  onBack: () => void;
  type?: 'business' | 'general';
  title?: string;
  description?: string;
}

export default function ComingSoonPage({ 
  onBack, 
  type = 'business',
  title = 'Portal Empresarial',
  description = 'Próximamente'
}: ComingSoonPageProps) {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !companyName) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      // Guardar en contact_messages con un tipo especial para lista de espera
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: companyName,
          email: email,
          message: `Interesado en Portal Empresarial - Lista de Espera`,
          consultation_type: 'Portal Empresarial - Lista de Espera',
          status: 'pending'
        });

      if (error) throw error;

      setRegistered(true);
      toast.success('¡Registrado exitosamente! Te contactaremos pronto.');
      setEmail('');
      setCompanyName('');
    } catch (error) {
      console.error('Error subscribing to waitlist:', error);
      toast.error('Error al registrar. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Gestión de Equipos',
      description: 'Administra usuarios y permisos de tu equipo legal'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Seguridad Avanzada',
      description: 'Protección de datos de nivel empresarial'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Automatización',
      description: 'Flujos de trabajo automatizados para tu empresa'
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: 'Soporte Premium',
      description: 'Atención prioritaria para tu organización'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Back Button */}
      <div className="container mx-auto px-4 pt-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 hover:gap-3 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Button>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Icon Animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-2xl">
                <Building2 className="w-16 h-16 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full border border-accent/20">
              <Rocket className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Próximamente</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {title}
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Estamos construyendo algo increíble para empresas como la tuya. 
              Únete a nuestra lista de espera y sé el primero en acceder.
            </p>
          </motion.div>

          {/* Countdown or Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-2 text-muted-foreground"
          >
            <Clock className="w-5 h-5 animate-pulse text-accent" />
            <span className="text-sm">Lanzamiento estimado: Q2 2025</span>
          </motion.div>

          {/* Waitlist Form */}
          {!registered ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="max-w-md mx-auto"
            >
              <Card className="shadow-2xl border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-primary" />
                    <h3 className="text-lg font-semibold">Únete a la Lista de Espera</h3>
                    <p className="text-sm text-muted-foreground">
                      Recibe acceso prioritario y beneficios exclusivos
                    </p>
                  </div>

                  <form onSubmit={handleSubscribe} className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Nombre de tu empresa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-12"
                      required
                    />
                    <Input
                      type="email"
                      placeholder="Email corporativo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      required
                    />
                    <Button
                      type="submit"
                      className="w-full h-12 gap-2"
                      disabled={loading}
                      size="lg"
                    >
                      {loading ? (
                        'Registrando...'
                      ) : (
                        <>
                          <Mail className="w-5 h-5" />
                          Unirme a la Lista
                        </>
                      )}
                    </Button>
                  </form>

                  <p className="text-xs text-center text-muted-foreground">
                    Al registrarte, aceptas recibir actualizaciones sobre el lanzamiento
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
              className="max-w-md mx-auto"
            >
              <Card className="shadow-2xl border-success/20 bg-success/5">
                <CardContent className="p-8 text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-success" />
                  <h3 className="text-2xl font-bold text-success">¡Registro Exitoso!</h3>
                  <p className="text-muted-foreground">
                    Te hemos agregado a nuestra lista de espera. Te contactaremos con novedades y 
                    acceso prioritario cuando estemos listos para lanzar.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <span>Revisa tu email para confirmar</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Features Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-16"
          >
            <h3 className="text-2xl font-bold mb-8">¿Qué incluirá?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-all hover:border-primary/30">
                    <CardContent className="p-6 text-center space-y-3">
                      <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          {feature.icon}
                        </div>
                      </div>
                      <h4 className="font-semibold">{feature.title}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-16 border-t"
          >
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Seguridad Garantizada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Soporte 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Sin Compromiso</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
