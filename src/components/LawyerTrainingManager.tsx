import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { 
  GraduationCap, 
  Award, 
  Plus, 
  Search, 
  Trophy, 
  CheckCircle, 
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Target,
  BookOpen
} from "lucide-react";
import CertificationBadge from "./CertificationBadge";

interface LawyerProgress {
  id: string;
  lawyer_id: string;
  course_name: string;
  modules_completed: any; // JSON array from Supabase
  total_modules: number;
  completion_percentage: number;
  started_at: string;
  completed_at?: string;
  is_certified: boolean;
  certificate_id?: string;
  lawyer_info: {
    full_name: string;
    email: string;
  };
}

interface Certificate {
  id: string;
  certificate_name: string;
  certificate_code: string;
  issued_date: string;
  verification_url: string;
  linkedin_share_url: string;
  lawyer_info: {
    full_name: string;
    email: string;
  };
}

export default function LawyerTrainingManager() {
  const [trainingProgress, setTrainingProgress] = useState<LawyerProgress[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showAddProgress, setShowAddProgress] = useState(false);
  const [newProgress, setNewProgress] = useState({
    lawyer_id: '',
    completion_percentage: 0,
    modules_completed: [] as string[]
  });

  const modules = [
    'Introducción a la IA Legal',
    'Herramientas de IA para Abogados',
    'Automatización de Documentos',
    'Análisis Predictivo Legal',
    'Ética en IA Legal',
    'Implementación Práctica',
    'Casos de Uso Avanzados',
    'Integración con Sistemas Legales',
    'Mejores Prácticas',
    'Evaluación Final'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadTrainingProgress(),
        loadCertificates(),
        loadLawyers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingProgress = async () => {
    const { data, error } = await supabase
      .from('lawyer_training_progress')
      .select(`
        *,
        lawyer_info:lawyer_tokens!lawyer_training_progress_lawyer_id_fkey(
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setTrainingProgress(data || []);
  };

  const loadCertificates = async () => {
    const { data, error } = await supabase
      .from('lawyer_certificates')
      .select(`
        *,
        lawyer_info:lawyer_tokens!lawyer_certificates_lawyer_id_fkey(
          full_name,
          email
        )
      `)
      .eq('is_active', true)
      .order('issued_date', { ascending: false });

    if (error) throw error;
    setCertificates(data || []);
  };

  const loadLawyers = async () => {
    const { data, error } = await supabase.functions.invoke('get-lawyers-admin');
    if (error) throw error;
    setLawyers(data || []);
  };

  const updateProgress = async (progressId: string, percentage: number, modules: string[]) => {
    try {
      const is_certified = percentage >= 100;
      const completed_at = is_certified ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('lawyer_training_progress')
        .update({
          completion_percentage: percentage,
          modules_completed: modules,
          is_certified,
          completed_at
        })
        .eq('id', progressId);

      if (error) throw error;

      toast.success(
        is_certified 
          ? '¡Certificación completada! Se ha emitido el badge automáticamente.' 
          : 'Progreso actualizado exitosamente'
      );
      
      await loadData();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Error al actualizar el progreso');
    }
  };

  const createNewProgress = async () => {
    try {
      const { error } = await supabase
        .from('lawyer_training_progress')
        .insert({
          lawyer_id: newProgress.lawyer_id,
          completion_percentage: newProgress.completion_percentage,
          modules_completed: newProgress.modules_completed
        });

      if (error) throw error;

      toast.success('Progreso de formación creado exitosamente');
      setShowAddProgress(false);
      setNewProgress({
        lawyer_id: '',
        completion_percentage: 0,
        modules_completed: []
      });
      await loadData();
    } catch (error) {
      console.error('Error creating progress:', error);
      toast.error('Error al crear el progreso');
    }
  };

  const filteredProgress = trainingProgress.filter(progress =>
    progress.lawyer_info?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    progress.lawyer_info?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalLawyers: trainingProgress.length,
    certified: trainingProgress.filter(p => p.is_certified).length,
    inProgress: trainingProgress.filter(p => !p.is_certified && p.completion_percentage > 0).length,
    averageCompletion: trainingProgress.length > 0 
      ? Math.round(trainingProgress.reduce((sum, p) => sum + p.completion_percentage, 0) / trainingProgress.length)
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Cargando formación de abogados...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            Formación IA Lawyer Fundamentals
          </h2>
          <p className="text-muted-foreground">
            Gestiona el progreso y certificaciones de los abogados
          </p>
        </div>
        <Dialog open={showAddProgress} onOpenChange={setShowAddProgress}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Progreso
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Progreso de Formación</DialogTitle>
              <DialogDescription>
                Crear un nuevo registro de progreso para un abogado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Abogado</Label>
                <Select value={newProgress.lawyer_id} onValueChange={(value) => 
                  setNewProgress(prev => ({ ...prev, lawyer_id: value }))
                }>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar abogado" />
                  </SelectTrigger>
                  <SelectContent>
                    {lawyers.map((lawyer) => (
                      <SelectItem key={lawyer.id} value={lawyer.id}>
                        {lawyer.name} ({lawyer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Porcentaje de Completación</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newProgress.completion_percentage}
                  onChange={(e) => setNewProgress(prev => ({ 
                    ...prev, 
                    completion_percentage: Number(e.target.value) 
                  }))}
                />
              </div>
              <Button onClick={createNewProgress} className="w-full">
                Crear Progreso
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Abogados</p>
                <p className="text-2xl font-bold">{stats.totalLawyers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Certificados</p>
                <p className="text-2xl font-bold text-success">{stats.certified}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Progreso</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Promedio</p>
                <p className="text-2xl font-bold">{stats.averageCompletion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Progress List */}
      <div className="space-y-4">
        {filteredProgress.map((progress) => (
          <Card key={progress.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{progress.lawyer_info?.full_name}</h3>
                  <p className="text-muted-foreground">{progress.lawyer_info?.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Iniciado: {new Date(progress.started_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={progress.is_certified ? 'default' : 'secondary'}>
                    {progress.is_certified ? (
                      <>
                        <Trophy className="w-3 h-3 mr-1" />
                        Certificado
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3 h-3 mr-1" />
                        En Progreso
                      </>
                    )}
                  </Badge>
                  {progress.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completado: {new Date(progress.completed_at).toLocaleDateString('es-ES')}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progreso General</span>
                    <span className="text-sm text-muted-foreground">
                      {progress.completion_percentage}%
                    </span>
                  </div>
                  <Progress value={progress.completion_percentage} className="h-2" />
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">
                    Módulos Completados ({progress.modules_completed?.length || 0}/{progress.total_modules})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {modules.map((module, index) => {
                      const isCompleted = progress.modules_completed?.includes(module);
                      return (
                        <div
                          key={index}
                          className={`text-xs p-2 rounded border ${
                            isCompleted 
                              ? 'bg-success/10 border-success text-success' 
                              : 'bg-muted border-muted-foreground/20'
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isCompleted && <CheckCircle className="w-3 h-3" />}
                            <span className="truncate">{module}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!progress.is_certified && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateProgress(progress.id, 100, modules)}
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      Marcar como Completado
                    </Button>
                  </div>
                )}

                {progress.certificate_id && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      <Award className="w-4 h-4 inline mr-1" />
                      Código de certificación: <code className="bg-muted px-1 rounded">{progress.certificate_id}</code>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProgress.length === 0 && (
        <div className="text-center py-8">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay registros de formación</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Comienza agregando el progreso de un abogado'}
          </p>
        </div>
      )}

      {/* Certificates Section */}
      {certificates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certificaciones Emitidas ({certificates.length})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="cursor-pointer" onClick={() => setSelectedCertificate(cert)}>
                <CertificationBadge
                  certificate={{
                    ...cert,
                    lawyer_name: cert.lawyer_info?.full_name
                  }}
                  showShareOptions={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificate Detail Dialog */}
      <Dialog open={!!selectedCertificate} onOpenChange={() => setSelectedCertificate(null)}>
        <DialogContent className="max-w-md">
          {selectedCertificate && (
            <CertificationBadge
              certificate={{
                ...selectedCertificate,
                lawyer_name: selectedCertificate.lawyer_info?.full_name
              }}
              showShareOptions={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}