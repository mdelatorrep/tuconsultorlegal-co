import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Save, 
  Plus, 
  Trash2, 
  Eye,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Upload,
  X,
  Sparkles
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LawyerPublicProfile {
  id?: string;
  slug: string;
  profile_photo: string;
  specialties: string[];
  years_of_experience: number;
  bio: string;
  services: Array<{
    name: string;
    description: string;
  }>;
  testimonials: Array<{
    client_name: string;
    client_role: string;
    comment: string;
  }>;
  is_published: boolean;
}

interface Props {
  lawyerId: string;
  lawyerName: string;
}

export default function LawyerPublicProfileEditor({ lawyerId, lawyerName }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [improvingBio, setImprovingBio] = useState(false);
  const [improvingSpecialties, setImprovingSpecialties] = useState(false);
  const [improvingService, setImprovingService] = useState<number | null>(null);
  const [profile, setProfile] = useState<LawyerPublicProfile>({
    slug: "",
    profile_photo: "",
    specialties: [],
    years_of_experience: 0,
    bio: "",
    services: [],
    testimonials: [],
    is_published: false
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, [lawyerId]);

  useEffect(() => {
    if (profile.slug) {
      setProfileUrl(`${window.location.origin}/#perfil/${profile.slug}`);
    }
  }, [profile.slug]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('lawyer_public_profiles')
        .select('*')
        .eq('lawyer_id', lawyerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data as any);
      } else {
        // Generate default slug from lawyer name
        const defaultSlug = lawyerName
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        setProfile(prev => ({ ...prev, slug: defaultSlug }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar tu perfil público",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.slug) {
      toast({
        title: "Slug requerido",
        description: "Debes definir un identificador único (slug) para tu perfil",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const profileData = {
        lawyer_id: lawyerId,
        slug: profile.slug,
        profile_photo: profile.profile_photo || null,
        specialties: profile.specialties,
        years_of_experience: profile.years_of_experience,
        bio: profile.bio || null,
        services: profile.services,
        testimonials: profile.testimonials,
        is_published: profile.is_published
      };

      const { error } = await supabase
        .from('lawyer_public_profiles')
        .upsert(profileData, {
          onConflict: 'lawyer_id'
        });

      if (error) throw error;

      toast({
        title: "Perfil guardado",
        description: "Tu perfil público ha sido actualizado exitosamente",
      });

      fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar tu perfil",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !profile.specialties.includes(newSpecialty.trim())) {
      setProfile({
        ...profile,
        specialties: [...profile.specialties, newSpecialty.trim()]
      });
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (index: number) => {
    setProfile({
      ...profile,
      specialties: profile.specialties.filter((_, i) => i !== index)
    });
  };

  const addService = () => {
    setProfile({
      ...profile,
      services: [...profile.services, { name: "", description: "" }]
    });
  };

  const updateService = (index: number, field: 'name' | 'description', value: string) => {
    const newServices = [...profile.services];
    newServices[index][field] = value;
    setProfile({ ...profile, services: newServices });
  };

  const removeService = (index: number) => {
    setProfile({
      ...profile,
      services: profile.services.filter((_, i) => i !== index)
    });
  };

  const addTestimonial = () => {
    setProfile({
      ...profile,
      testimonials: [...profile.testimonials, { client_name: "", client_role: "", comment: "" }]
    });
  };

  const updateTestimonial = (index: number, field: 'client_name' | 'client_role' | 'comment', value: string) => {
    const newTestimonials = [...profile.testimonials];
    newTestimonials[index][field] = value;
    setProfile({ ...profile, testimonials: newTestimonials });
  };

  const removeTestimonial = (index: number) => {
    setProfile({
      ...profile,
      testimonials: profile.testimonials.filter((_, i) => i !== index)
    });
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "URL copiada",
      description: "La URL de tu perfil ha sido copiada al portapapeles",
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Archivo inválido",
        description: "Por favor selecciona una imagen válida",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "La imagen debe ser menor a 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingPhoto(true);

    try {
      // Delete old photo if exists
      if (profile.profile_photo) {
        const oldPath = profile.profile_photo.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('lawyer-profiles')
            .remove([`${lawyerId}/${oldPath}`]);
        }
      }

      // Upload new photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${lawyerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('lawyer-profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('lawyer-profiles')
        .getPublicUrl(filePath);

      setProfile({ ...profile, profile_photo: publicUrl });

      toast({
        title: "Foto subida",
        description: "Tu foto de perfil ha sido actualizada",
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo subir la foto",
        variant: "destructive"
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = async () => {
    if (!profile.profile_photo) return;

    try {
      const oldPath = profile.profile_photo.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('lawyer-profiles')
          .remove([`${lawyerId}/${oldPath}`]);
      }

      setProfile({ ...profile, profile_photo: "" });

      toast({
        title: "Foto eliminada",
        description: "Tu foto de perfil ha sido eliminada",
      });
    } catch (error: any) {
      console.error('Error removing photo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la foto",
        variant: "destructive"
      });
    }
  };

  const improveBioWithAI = async () => {
    setImprovingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-lawyer-profile', {
        body: {
          type: 'bio',
          input: profile.bio,
          context: {
            specialties: profile.specialties,
            yearsOfExperience: profile.years_of_experience
          }
        }
      });

      if (error) throw error;

      if (data?.improvedText) {
        setProfile({ ...profile, bio: data.improvedText });
        toast({
          title: "Biografía mejorada",
          description: "Tu biografía ha sido mejorada con IA",
        });
      }
    } catch (error: any) {
      console.error('Error improving bio:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo mejorar la biografía",
        variant: "destructive"
      });
    } finally {
      setImprovingBio(false);
    }
  };

  const improveSpecialtiesWithAI = async () => {
    setImprovingSpecialties(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-lawyer-profile', {
        body: {
          type: 'specialties',
          input: profile.specialties
        }
      });

      if (error) throw error;

      if (data?.improvedText) {
        // Parse comma-separated specialties
        const newSpecialties = data.improvedText
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s && !profile.specialties.includes(s));
        
        if (newSpecialties.length > 0) {
          setProfile({
            ...profile,
            specialties: [...profile.specialties, ...newSpecialties]
          });
          toast({
            title: "Especialidades sugeridas",
            description: `Se agregaron ${newSpecialties.length} nuevas especialidades`,
          });
        } else {
          toast({
            title: "Sin cambios",
            description: "No se encontraron nuevas especialidades para agregar",
          });
        }
      }
    } catch (error: any) {
      console.error('Error improving specialties:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron sugerir especialidades",
        variant: "destructive"
      });
    } finally {
      setImprovingSpecialties(false);
    }
  };

  const improveServiceWithAI = async (index: number) => {
    const service = profile.services[index];
    if (!service.name) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa el nombre del servicio primero",
        variant: "destructive"
      });
      return;
    }

    setImprovingService(index);
    try {
      const { data, error } = await supabase.functions.invoke('improve-lawyer-profile', {
        body: {
          type: 'service',
          input: service.name,
          context: {
            specialties: profile.specialties
          }
        }
      });

      if (error) throw error;

      if (data?.improvedText) {
        const newServices = [...profile.services];
        newServices[index].description = data.improvedText;
        setProfile({ ...profile, services: newServices });
        toast({
          title: "Descripción generada",
          description: "La descripción del servicio ha sido mejorada con IA",
        });
      }
    } catch (error: any) {
      console.error('Error improving service:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo mejorar la descripción",
        variant: "destructive"
      });
    } finally {
      setImprovingService(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mi Perfil Público</CardTitle>
              <CardDescription>
                Configura tu página profesional para compartir con clientes potenciales
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="published">Publicado</Label>
              <Switch
                id="published"
                checked={profile.is_published}
                onCheckedChange={(checked) => setProfile({ ...profile, is_published: checked })}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile URL */}
      {profile.slug && (
        <Alert className="bg-blue-50 border-blue-200">
          <LinkIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm font-mono text-blue-900">{profileUrl}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyProfileUrl}>
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-1" />
                  Ver perfil
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="slug">Identificador único (slug) *</Label>
            <Input
              id="slug"
              value={profile.slug}
              onChange={(e) => setProfile({ ...profile, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="juan-perez-abogado"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este será parte de tu URL: {window.location.origin}/#perfil/{profile.slug || 'tu-nombre'}
            </p>
          </div>

          <div>
            <Label htmlFor="profile_photo">Foto de perfil</Label>
            <div className="space-y-3">
              {profile.profile_photo && (
                <div className="relative inline-block">
                  <img 
                    src={profile.profile_photo} 
                    alt="Foto de perfil" 
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={removePhoto}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {profile.profile_photo ? "Cambiar foto" : "Subir foto"}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Imagen JPG, PNG o WEBP. Máximo 5MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="years">Años de experiencia</Label>
            <Input
              id="years"
              type="number"
              value={profile.years_of_experience}
              onChange={(e) => setProfile({ ...profile, years_of_experience: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Especialidades</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={improveSpecialtiesWithAI}
                disabled={improvingSpecialties}
              >
                {improvingSpecialties ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Sugiriendo...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Sugerir con IA
                  </>
                )}
              </Button>
            </div>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="Ej: Derecho laboral"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
              />
              <Button onClick={addSpecialty} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((specialty, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {specialty}
                  <button onClick={() => removeSpecialty(index)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="bio">Biografía</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={improveBioWithAI}
                disabled={improvingBio}
              >
                {improvingBio ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Mejorando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Mejorar con IA
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Cuéntanos sobre ti, tu enfoque y qué te hace diferente..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Servicios Ofrecidos</CardTitle>
            <Button onClick={addService} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar servicio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.services.map((service, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">Servicio {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={service.name}
                onChange={(e) => updateService(index, 'name', e.target.value)}
                placeholder="Nombre del servicio"
              />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Descripción</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => improveServiceWithAI(index)}
                    disabled={improvingService === index}
                  >
                    {improvingService === index ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 mr-1" />
                        Generar con IA
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={service.description}
                  onChange={(e) => updateService(index, 'description', e.target.value)}
                  placeholder="Descripción breve"
                  rows={2}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Testimonials */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Testimonios</CardTitle>
            <Button onClick={addTestimonial} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Agregar testimonio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.testimonials.map((testimonial, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">Testimonio {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTestimonial(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Input
                value={testimonial.client_name}
                onChange={(e) => updateTestimonial(index, 'client_name', e.target.value)}
                placeholder="Nombre del cliente"
              />
              <Input
                value={testimonial.client_role}
                onChange={(e) => updateTestimonial(index, 'client_role', e.target.value)}
                placeholder="Cargo o empresa"
              />
              <Textarea
                value={testimonial.comment}
                onChange={(e) => updateTestimonial(index, 'comment', e.target.value)}
                placeholder="Comentario del cliente"
                rows={3}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar perfil
            </>
          )}
        </Button>
      </div>
    </div>
  );
}