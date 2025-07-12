
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, Send, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'dompurify';

export default function LawyerTokenRequestForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    lawFirm: '',
    specialization: '',
    yearsOfExperience: '',
    reasonForRequest: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.reasonForRequest) {
      setErrorMessage('Por favor completa todos los campos obligatorios');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage('Por favor ingresa un email válido');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      console.log('Submitting lawyer token request...', formData);
      
      const { data, error } = await supabase.functions.invoke('request-lawyer-token', {
        body: {
          fullName: DOMPurify.sanitize(formData.fullName.trim()),
          email: DOMPurify.sanitize(formData.email.trim().toLowerCase()),
          phoneNumber: DOMPurify.sanitize(formData.phoneNumber.trim()),
          lawFirm: DOMPurify.sanitize(formData.lawFirm.trim()),
          specialization: DOMPurify.sanitize(formData.specialization.trim()),
          yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
          reasonForRequest: DOMPurify.sanitize(formData.reasonForRequest.trim())
        }
      });

      console.log('Response from edge function:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        setErrorMessage('Error de conexión con el servidor. Intenta nuevamente en unos momentos.');
        return;
      }

      if (data?.success) {
        setSubmitted(true);
        toast({
          title: "Solicitud enviada",
          description: data.message || "Tu solicitud ha sido enviada exitosamente.",
        });
      } else {
        console.error('Unexpected response:', data);
        setErrorMessage(data?.error || 'Error inesperado. Intenta nuevamente.');
      }
    } catch (error) {
      console.error('Request submission error:', error);
      setErrorMessage('Error de conexión. Verifica tu conexión a internet e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">Solicitud Enviada</CardTitle>
            <CardDescription>
              Tu solicitud de token ha sido enviada exitosamente. Recibirás una respuesta por email una vez que sea revisada por el administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  fullName: '',
                  email: '',
                  phoneNumber: '',
                  lawFirm: '',
                  specialization: '',
                  yearsOfExperience: '',
                  reasonForRequest: ''
                });
              }}
              variant="outline" 
              className="w-full"
            >
              Enviar otra solicitud
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Scale className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Solicitud de Acceso - Abogados</CardTitle>
          <CardDescription>
            Completa este formulario para solicitar acceso al sistema. Un administrador revisará tu solicitud y te proporcionará un token de acceso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Tu nombre completo"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Profesional *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="tu.email@bufete.com"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Teléfono</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+52 55 1234 5678"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lawFirm">Bufete/Firma</Label>
                <Input
                  id="lawFirm"
                  value={formData.lawFirm}
                  onChange={(e) => handleInputChange('lawFirm', e.target.value)}
                  placeholder="Nombre del bufete o firma"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">Especialización</Label>
                <Input
                  id="specialization"
                  value={formData.specialization}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  placeholder="Derecho civil, penal, corporativo, etc."
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Años de Experiencia</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                  placeholder="5"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reasonForRequest">Motivo de la Solicitud *</Label>
              <Textarea
                id="reasonForRequest"
                value={formData.reasonForRequest}
                onChange={(e) => handleInputChange('reasonForRequest', e.target.value)}
                placeholder="Explica por qué necesitas acceso al sistema y cómo planeas utilizarlo..."
                required
                disabled={isSubmitting}
                rows={4}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Enviando solicitud...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Solicitud
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              * Campos obligatorios. La información será revisada por un administrador antes de aprobar el acceso.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
