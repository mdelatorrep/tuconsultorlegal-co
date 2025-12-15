import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Users, Search, RefreshCw, Loader2, Eye, FileText, 
  Mail, Calendar, UserCheck, UserX
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean | null;
  documents_count?: number;
}

interface UserDocument {
  id: string;
  token: string;
  document_type: string;
  status: string;
  price: number;
  created_at: string;
}

export const UsersManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    withDocuments: 0,
    newThisMonth: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Load user profiles
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Load document counts per user (by user_id OR user_email)
      const { data: docsData, error: docsError } = await supabase
        .from('document_tokens')
        .select('user_id, user_email');

      if (docsError) throw docsError;

      // Count documents per user (by id and by email)
      const docCountsById: Record<string, number> = {};
      const docCountsByEmail: Record<string, number> = {};
      
      docsData?.forEach(doc => {
        if (doc.user_id) {
          docCountsById[doc.user_id] = (docCountsById[doc.user_id] || 0) + 1;
        }
        if (doc.user_email) {
          const email = doc.user_email.toLowerCase();
          docCountsByEmail[email] = (docCountsByEmail[email] || 0) + 1;
        }
      });

      // Merge counts with users - check both id and email
      const usersWithCounts = (usersData || []).map(user => {
        const countById = docCountsById[user.id] || 0;
        const countByEmail = docCountsByEmail[user.email.toLowerCase()] || 0;
        // Use the higher count to avoid missing documents
        return {
          ...user,
          documents_count: Math.max(countById, countByEmail)
        };
      });

      setUsers(usersWithCounts);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      setStats({
        total: usersWithCounts.length,
        active: usersWithCounts.filter(u => u.onboarding_completed).length,
        withDocuments: usersWithCounts.filter(u => u.documents_count && u.documents_count > 0).length,
        newThisMonth: usersWithCounts.filter(u => new Date(u.created_at) >= startOfMonth).length
      });
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserDocuments = async (userId: string, userEmail: string) => {
    setLoadingDocuments(true);
    try {
      // Search by user_id OR user_email to catch all documents
      const { data, error } = await supabase
        .from('document_tokens')
        .select('id, token, document_type, status, price, created_at')
        .or(`user_id.eq.${userId},user_email.ilike.${userEmail}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserDocuments(data || []);
    } catch (error) {
      console.error('Error loading user documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos del usuario",
        variant: "destructive"
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleViewUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setShowDetails(true);
    await loadUserDocuments(user.id, user.email);
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Usuarios</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Activos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Con Documentos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.withDocuments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Nuevos (mes)</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.newThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuarios Finales
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadUsers}>
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Documentos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.documents_count && user.documents_count > 0 ? "default" : "secondary"}>
                        {user.documents_count || 0} docs
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.onboarding_completed ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <UserX className="w-3 h-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(user.created_at), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles del Usuario</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-sm">{selectedUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de Registro</label>
                  <p className="text-sm">
                    {format(new Date(selectedUser.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Documentos</label>
                  <p className="text-sm font-medium">{selectedUser.documents_count || 0}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Historial de Documentos</h4>
                {loadingDocuments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : userDocuments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDocuments.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-mono text-xs">{doc.token.substring(0, 10)}...</TableCell>
                          <TableCell className="max-w-[150px] truncate">{doc.document_type}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            {doc.price === 0 ? 'Gratis' : `$${doc.price.toLocaleString()}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(doc.created_at), "dd/MM/yy", { locale: es })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Este usuario no tiene documentos
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
