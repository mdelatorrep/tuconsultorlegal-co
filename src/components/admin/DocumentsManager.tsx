import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  FileText, Search, Filter, Eye, RefreshCw, Loader2, 
  Clock, CheckCircle, AlertCircle, DollarSign, Download
} from "lucide-react";

interface DocumentToken {
  id: string;
  token: string;
  document_type: string;
  status: string;
  price: number;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
  updated_at: string;
  sla_status: string | null;
  sla_deadline: string | null;
  reviewed_by_lawyer_name: string | null;
}

export const DocumentsManager = () => {
  const [documents, setDocuments] = useState<DocumentToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDocument, setSelectedDocument] = useState<DocumentToken | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inReview: 0,
    paid: 0,
    downloaded: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_tokens')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      setDocuments(data || []);
      
      // Calculate stats
      const docs = data || [];
      setStats({
        total: docs.length,
        pending: docs.filter(d => d.status === 'solicitado').length,
        inReview: docs.filter(d => d.status === 'en_revision_abogado' || d.status === 'revision_usuario').length,
        paid: docs.filter(d => d.status === 'pagado').length,
        downloaded: docs.filter(d => d.status === 'descargado').length,
        totalRevenue: docs
          .filter(d => d.status === 'pagado' || d.status === 'descargado')
          .reduce((sum, d) => sum + (d.price || 0), 0)
      });
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'solicitado': { label: 'Solicitado', variant: 'outline' },
      'en_revision_abogado': { label: 'En Revisión', variant: 'secondary' },
      'revision_usuario': { label: 'Rev. Usuario', variant: 'default' },
      'pagado': { label: 'Pagado', variant: 'default' },
      'descargado': { label: 'Descargado', variant: 'default' }
    };
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSLABadge = (slaStatus: string | null) => {
    if (!slaStatus) return null;
    const config: Record<string, { label: string; className: string }> = {
      'on_time': { label: 'A tiempo', className: 'bg-green-100 text-green-800' },
      'at_risk': { label: 'En riesgo', className: 'bg-yellow-100 text-yellow-800' },
      'overdue': { label: 'Vencido', className: 'bg-red-100 text-red-800' },
      'completed_on_time': { label: 'Completado', className: 'bg-green-100 text-green-800' },
      'completed_late': { label: 'Completado tarde', className: 'bg-orange-100 text-orange-800' }
    };
    const c = config[slaStatus] || { label: slaStatus, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.user_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.user_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Pendientes</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">En Revisión</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.inReview}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Pagados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Descargados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.downloaded}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Ingresos</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Generados
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por token, email, tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="solicitado">Solicitados</SelectItem>
                  <SelectItem value="en_revision_abogado">En Revisión</SelectItem>
                  <SelectItem value="revision_usuario">Rev. Usuario</SelectItem>
                  <SelectItem value="pagado">Pagados</SelectItem>
                  <SelectItem value="descargado">Descargados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadDocuments}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Tipo Documento</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-xs">{doc.token.substring(0, 12)}...</TableCell>
                    <TableCell className="max-w-[200px] truncate">{doc.document_type}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{doc.user_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground">{doc.user_email || 'Sin email'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{getSLABadge(doc.sla_status)}</TableCell>
                    <TableCell>
                      {doc.price === 0 ? (
                        <Badge variant="secondary">Gratis</Badge>
                      ) : (
                        <span className="font-medium">${doc.price.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowDetails(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron documentos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Document Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Documento</DialogTitle>
            <DialogDescription>
              Token: {selectedDocument?.token}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                  <p className="text-sm">{selectedDocument.document_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedDocument.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Usuario</label>
                  <p className="text-sm">{selectedDocument.user_name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{selectedDocument.user_email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Precio</label>
                  <p className="text-sm font-medium">
                    {selectedDocument.price === 0 ? 'Gratis' : `$${selectedDocument.price.toLocaleString()} COP`}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado SLA</label>
                  <div className="mt-1">{getSLABadge(selectedDocument.sla_status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Deadline SLA</label>
                  <p className="text-sm">
                    {selectedDocument.sla_deadline 
                      ? format(new Date(selectedDocument.sla_deadline), "dd/MM/yyyy HH:mm", { locale: es })
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Revisado por</label>
                  <p className="text-sm">{selectedDocument.reviewed_by_lawyer_name || 'Pendiente'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha Creación</label>
                  <p className="text-sm">
                    {format(new Date(selectedDocument.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
