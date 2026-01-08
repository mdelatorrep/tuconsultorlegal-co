import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail, Phone, Shield, Calendar, BadgeCheck, Key, Settings, Save, Loader2, FileText, MapPin, GraduationCap, Briefcase, AlertCircle } from 'lucide-react';
import { LawyerChangeEmailDialog } from '@/components/LawyerChangeEmailDialog';
import { LawyerChangePasswordDialog } from './LawyerChangePasswordDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LawyerAccountSettingsProps {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface LawyerProfileData {
  full_name: string;
  email: string;
  phone_number: string | null;
  document_type: string | null;
  document_number: string | null;
  professional_card_number: string | null;
  bar_number: string | null;
  specialization: string | null;
  years_of_experience: number | null;
  university: string | null;
  city: string | null;
  address: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

const SPECIALIZATIONS = [
  { value: 'civil', label: 'Derecho Civil' },
  { value: 'penal', label: 'Derecho Penal' },
  { value: 'laboral', label: 'Derecho Laboral' },
  { value: 'familia', label: 'Derecho de Familia' },
  { value: 'comercial', label: 'Derecho Comercial' },
  { value: 'administrativo', label: 'Derecho Administrativo' },
  { value: 'tributario', label: 'Derecho Tributario' },
  { value: 'constitucional', label: 'Derecho Constitucional' },
  { value: 'ambiental', label: 'Derecho Ambiental' },
  { value: 'propiedad_intelectual', label: 'Propiedad Intelectual' },
  { value: 'tecnologia', label: 'Derecho y Tecnología' },
  { value: 'general', label: 'Práctica General' },
];

export function LawyerAccountSettings({ user }: LawyerAccountSettingsProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<LawyerProfileData>({
    full_name: '',
    email: '',
    phone_number: null,
    document_type: null,
    document_number: null,
    professional_card_number: null,
    bar_number: null,
    specialization: null,
    years_of_experience: null,
    university: null,
    city: null,
    address: null,
    secondary_email: null,
    secondary_phone: null,
    is_verified: null,
    created_at: null,
  });

  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('lawyer_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone_number: data.phone_number,
          document_type: data.document_type,
          document_number: data.document_number,
          professional_card_number: data.professional_card_number,
          bar_number: data.bar_number,
          specialization: data.specialization,
          years_of_experience: data.years_of_experience,
          university: data.university,
          city: data.city,
          address: data.address,
          secondary_email: data.secondary_email,
          secondary_phone: data.secondary_phone,
          is_verified: data.is_verified,
          created_at: data.created_at,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el perfil",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from('lawyer_profiles')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number || null,
          document_type: formData.document_type || null,
          document_number: formData.document_number || null,
          professional_card_number: formData.professional_card_number || null,
          bar_number: formData.bar_number || null,
          specialization: formData.specialization || null,
          years_of_experience: formData.years_of_experience || null,
          university: formData.university || null,
          city: formData.city || null,
          address: formData.address || null,
          secondary_email: formData.secondary_email || null,
          secondary_phone: formData.secondary_phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil actualizado",
        description: "Los cambios se guardaron correctamente"
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el perfil",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof LawyerProfileData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const memberSince = formData.created_at 
    ? format(new Date(formData.created_at), "d 'de' MMMM, yyyy", { locale: es })
    : 'No disponible';

  // Verificación fields check
  const hasVerificationFields = formData.document_type && formData.document_number && formData.professional_card_number;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configuración de Cuenta</h1>
            <p className="text-muted-foreground text-sm">Administra tu información personal y seguridad</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar cambios
        </Button>
      </div>

      {/* Alerta de verificación pendiente */}
      {!formData.is_verified && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Verificación pendiente</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {hasVerificationFields 
                  ? 'Tu información está siendo verificada. Te notificaremos cuando se complete.'
                  : 'Completa los datos de verificación (documento, tarjeta profesional) para verificar tu cuenta.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Datos de Verificación (Obligatorios) */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Datos de Verificación
              <Badge variant="outline" className="ml-2 text-xs">Requerido</Badge>
            </CardTitle>
            <CardDescription>
              Información necesaria para verificar tu identidad profesional
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="document_type">Tipo de documento *</Label>
                <Select
                  value={formData.document_type || ''}
                  onValueChange={(value) => updateField('document_type', value)}
                >
                  <SelectTrigger id="document_type">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document_number">Número de documento *</Label>
                <Input
                  id="document_number"
                  placeholder="Ej: 1234567890"
                  value={formData.document_number || ''}
                  onChange={(e) => updateField('document_number', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="professional_card">Tarjeta profesional *</Label>
                <Input
                  id="professional_card"
                  placeholder="Ej: 123456"
                  value={formData.professional_card_number || ''}
                  onChange={(e) => updateField('professional_card_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bar_number">Número de colegiado</Label>
                <Input
                  id="bar_number"
                  placeholder="Si aplica"
                  value={formData.bar_number || ''}
                  onChange={(e) => updateField('bar_number', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Tu información de perfil registrada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone_number">Teléfono principal</Label>
                <Input
                  id="phone_number"
                  placeholder="Ej: +57 300 123 4567"
                  value={formData.phone_number || ''}
                  onChange={(e) => updateField('phone_number', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_phone">Teléfono secundario</Label>
                <Input
                  id="secondary_phone"
                  placeholder="Opcional"
                  value={formData.secondary_phone || ''}
                  onChange={(e) => updateField('secondary_phone', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_email">Correo secundario</Label>
              <Input
                id="secondary_email"
                type="email"
                placeholder="correo@alternativo.com"
                value={formData.secondary_email || ''}
                onChange={(e) => updateField('secondary_email', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Información Profesional */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Información Profesional
            </CardTitle>
            <CardDescription>
              Detalles de tu práctica profesional (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="specialization">Especialización</Label>
                <Select
                  value={formData.specialization || ''}
                  onValueChange={(value) => updateField('specialization', value)}
                >
                  <SelectTrigger id="specialization">
                    <SelectValue placeholder="Seleccionar área..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALIZATIONS.map(spec => (
                      <SelectItem key={spec.value} value={spec.value}>
                        {spec.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years_of_experience">Años de experiencia</Label>
                <Input
                  id="years_of_experience"
                  type="number"
                  min="0"
                  max="60"
                  placeholder="Ej: 5"
                  value={formData.years_of_experience ?? ''}
                  onChange={(e) => updateField('years_of_experience', e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="university" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Universidad
              </Label>
              <Input
                id="university"
                placeholder="Donde obtuviste tu título"
                value={formData.university || ''}
                onChange={(e) => updateField('university', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Ubicación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Ubicación
            </CardTitle>
            <CardDescription>
              Información de tu lugar de trabajo (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                placeholder="Ej: Bogotá"
                value={formData.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección de oficina</Label>
              <Input
                id="address"
                placeholder="Dirección completa"
                value={formData.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seguridad y Acceso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Seguridad y Acceso
          </CardTitle>
          <CardDescription>
            Gestiona tus credenciales de acceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Estado de cuenta */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Estado de cuenta</p>
                <p className="font-medium">
                  {formData.is_verified ? 'Cuenta verificada' : 'Pendiente de verificación'}
                </p>
              </div>
              <Badge variant={formData.is_verified ? "default" : "secondary"}>
                {formData.is_verified ? 'Verificado' : 'Pendiente'}
              </Badge>
            </div>

            {/* Cambiar correo */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Correo electrónico</p>
                <p className="font-medium text-sm truncate max-w-[180px]">{formData.email}</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEmailDialog(true)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Cambiar
              </Button>
            </div>

            {/* Cambiar contraseña */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">Contraseña</p>
                <p className="font-medium">••••••••••</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                Cambiar
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Miembro desde: {memberSince}</span>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LawyerChangeEmailDialog 
        open={showEmailDialog} 
        onOpenChange={setShowEmailDialog} 
      />
      <LawyerChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </div>
  );
}
