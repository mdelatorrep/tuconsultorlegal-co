import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldX,
  ShieldQuestion,
  Loader2,
  Users,
  Search,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

interface LawyerVerificationAdminProps {
  adminId: string;
}

interface LawyerProfile {
  id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  bar_number: string | null;
  verification_date: string | null;
  created_at: string;
}

interface VerificationRecord {
  id: string;
  lawyer_id: string;
  verification_type: string;
  status: string;
  professional_name: string | null;
  bar_number: string | null;
  created_at: string;
  api_cost: number;
}

interface ApiUsageStats {
  totalCalls: number;
  totalCost: number;
  callsToday: number;
  callsThisMonth: number;
}

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
];

export default function LawyerVerificationAdmin({ adminId }: LawyerVerificationAdminProps) {
  const [activeTab, setActiveTab] = useState('lawyers');
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [usageStats, setUsageStats] = useState<ApiUsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'verified' | 'unverified'>('all');
  
  // Verification form
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerProfile | null>(null);
  const [documentType, setDocumentType] = useState('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    loadLawyers();
    loadVerifications();
    loadUsageStats();
  }, []);

  const loadLawyers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lawyer_profiles')
        .select('id, full_name, email, is_verified, bar_number, verification_date, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLawyers((data || []) as LawyerProfile[]);
    } catch (error) {
      console.error('Error loading lawyers:', error);
      toast.error('Error al cargar abogados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVerifications = async () => {
    try {
      const { data, error } = await supabase
        .from('lawyer_verifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setVerifications((data || []) as VerificationRecord[]);
    } catch (error) {
      console.error('Error loading verifications:', error);
    }
  };

  const loadUsageStats = async () => {
    try {
      const { data, error } = await supabase
        .from('verifik_api_usage')
        .select('api_cost, created_at');

      if (error) throw error;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats: ApiUsageStats = {
        totalCalls: data?.length || 0,
        totalCost: data?.reduce((sum, item) => sum + (item.api_cost || 0), 0) || 0,
        callsToday: data?.filter(item => new Date(item.created_at) >= startOfDay).length || 0,
        callsThisMonth: data?.filter(item => new Date(item.created_at) >= startOfMonth).length || 0,
      };

      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const handleVerifyLawyer = async () => {
    if (!selectedLawyer || !documentNumber.trim()) {
      toast.error('Seleccione un abogado e ingrese el número de documento');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await supabase.functions.invoke('verifik-lawyer-verification', {
        body: {
          documentType,
          documentNumber: documentNumber.trim(),
          lawyerId: selectedLawyer.id,
        },
      });

      if (response.error) throw response.error;

      if (response.data.status === 'verified') {
        toast.success(`${selectedLawyer.full_name} verificado exitosamente`);
      } else if (response.data.status === 'expired') {
        toast.warning('La tarjeta profesional no está vigente');
      } else {
        toast.info('No se encontró información del abogado');
      }

      loadLawyers();
      loadVerifications();
      loadUsageStats();
      setSelectedLawyer(null);
      setDocumentNumber('');
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Error al verificar el abogado');
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredLawyers = lawyers.filter((lawyer) => {
    const matchesSearch = 
      lawyer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lawyer.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'verified' && lawyer.is_verified) ||
      (filterStatus === 'unverified' && !lawyer.is_verified);

    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'not_found':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Verificado</Badge>;
      case 'expired':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">No Vigente</Badge>;
      case 'not_found':
        return <Badge variant="destructive">No Encontrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Verificación de Abogados
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la verificación de abogados con Verifik
          </p>
        </div>
        <Button variant="outline" onClick={() => { loadLawyers(); loadVerifications(); loadUsageStats(); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {usageStats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usageStats.totalCalls}</p>
                  <p className="text-xs text-muted-foreground">Total Consultas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${usageStats.totalCost.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Costo Total API</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usageStats.callsToday}</p>
                  <p className="text-xs text-muted-foreground">Consultas Hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {lawyers.filter(l => l.is_verified).length}/{lawyers.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Verificados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lawyers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Abogados
          </TabsTrigger>
          <TabsTrigger value="verify" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Verificar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* Lawyers Tab */}
        <TabsContent value="lawyers" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Lista de Abogados</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-9 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="verified">Verificados</SelectItem>
                      <SelectItem value="unverified">Sin Verificar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tarjeta Prof.</TableHead>
                      <TableHead>Fecha Verificación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLawyers.map((lawyer) => (
                      <TableRow key={lawyer.id}>
                        <TableCell className="font-medium">{lawyer.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{lawyer.email}</TableCell>
                        <TableCell>
                          {lawyer.is_verified ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verificado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <ShieldQuestion className="h-3 w-3 mr-1" />
                              Sin Verificar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{lawyer.bar_number || '-'}</TableCell>
                        <TableCell>
                          {lawyer.verification_date 
                            ? new Date(lawyer.verification_date).toLocaleDateString('es-CO')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLawyer(lawyer);
                              setActiveTab('verify');
                            }}
                          >
                            {lawyer.is_verified ? 'Re-verificar' : 'Verificar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Tab */}
        <TabsContent value="verify" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verificar Abogado</CardTitle>
              <CardDescription>
                Consulta el estado de un abogado en la Rama Judicial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedLawyer ? (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{selectedLawyer.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedLawyer.email}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLawyer(null)}>
                        Cambiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <Label>Seleccionar Abogado</Label>
                  <Select 
                    value={selectedLawyer?.id || ''} 
                    onValueChange={(id) => setSelectedLawyer(lawyers.find(l => l.id === id) || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un abogado" />
                    </SelectTrigger>
                    <SelectContent>
                      {lawyers.map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>
                          {lawyer.full_name} - {lawyer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Documento</Label>
                  <Input
                    placeholder="Ingrese el número"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleVerifyLawyer}
                disabled={isVerifying || !selectedLawyer || !documentNumber.trim()}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verificar con Verifik
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial de Verificaciones</CardTitle>
              <CardDescription>
                Registro de todas las verificaciones realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tarjeta Prof.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Costo API</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {verifications.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {new Date(record.created_at).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {record.verification_type === 'professional_status' 
                            ? 'Verificación' 
                            : 'Certificado'}
                        </TableCell>
                        <TableCell>{record.professional_name || '-'}</TableCell>
                        <TableCell>{record.bar_number || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
                          </div>
                        </TableCell>
                        <TableCell>${record.api_cost?.toFixed(2) || '0.00'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}