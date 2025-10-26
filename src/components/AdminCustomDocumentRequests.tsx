import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, AlertCircle, CheckCircle2, XCircle, Loader2, FileQuestion } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CustomDocumentRequest {
  id: string;
  user_email: string;
  user_name: string;
  document_type: string;
  description: string;
  urgency: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export function AdminCustomDocumentRequests() {
  const [requests, setRequests] = useState<CustomDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_document_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error("Error al cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string, notes?: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('custom_document_requests')
        .update({
          status,
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success("Estado actualizado correctamente");
      loadRequests();
      
      if (editingNotes[id]) {
        const newNotes = { ...editingNotes };
        delete newNotes[id];
        setEditingNotes(newNotes);
      }
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error("Error al actualizar el estado");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; icon: any; label: string } } = {
      pending: { variant: "default", icon: Clock, label: "Pendiente" },
      in_review: { variant: "default", icon: AlertCircle, label: "En Revisión" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completado" },
      rejected: { variant: "destructive", icon: XCircle, label: "Rechazado" },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const colors: { [key: string]: string } = {
      low: "bg-gray-100 text-gray-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    const labels: { [key: string]: string } = {
      low: "Baja",
      normal: "Normal",
      high: "Alta",
      urgent: "Urgente",
    };

    return (
      <Badge variant="outline" className={colors[urgency] || colors.normal}>
        {labels[urgency] || urgency}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileQuestion className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Solicitudes de Documentos Personalizados</h2>
          <p className="text-muted-foreground">
            Gestiona las solicitudes de documentos que los usuarios no encuentran en el catálogo
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl">{request.document_type}</CardTitle>
                    <CardDescription>
                      Solicitado por {request.user_name} ({request.user_email})
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getUrgencyBadge(request.urgency)}
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Descripción:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.description}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>
                    Creado: {format(new Date(request.created_at), "PPp", { locale: es })}
                  </span>
                  {request.reviewed_at && (
                    <span>
                      Revisado: {format(new Date(request.reviewed_at), "PPp", { locale: es })}
                    </span>
                  )}
                </div>

                {request.admin_notes && (
                  <div className="bg-muted p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-1">Notas del administrador:</h4>
                    <p className="text-sm text-muted-foreground">{request.admin_notes}</p>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Notas para el usuario (opcional)"
                    value={editingNotes[request.id] || request.admin_notes || ""}
                    onChange={(e) => setEditingNotes({
                      ...editingNotes,
                      [request.id]: e.target.value
                    })}
                    className="min-h-[80px]"
                  />

                  <div className="flex items-center gap-2">
                    <Select
                      value={request.status}
                      onValueChange={(value) => updateRequestStatus(
                        request.id,
                        value,
                        editingNotes[request.id] || request.admin_notes || undefined
                      )}
                      disabled={updatingId === request.id}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="in_review">En Revisión</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      onClick={() => updateRequestStatus(
                        request.id,
                        request.status,
                        editingNotes[request.id] || request.admin_notes || undefined
                      )}
                      disabled={updatingId === request.id}
                    >
                      {updatingId === request.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar Notas"
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
