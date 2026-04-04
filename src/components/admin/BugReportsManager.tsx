import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Bug, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BugReport {
  id: string;
  lawyer_id: string;
  category: string;
  affected_tool: string | null;
  description: string;
  screenshot_url: string | null;
  status: string;
  priority: string;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  lawyer_name?: string;
  lawyer_email?: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  in_review: "En revisión",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const STATUS_COLORS: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  new: "destructive",
  in_review: "default",
  resolved: "secondary",
  closed: "outline",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
  urgent: "Urgente",
};

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Error",
  performance: "Rendimiento",
  data: "Datos",
  suggestion: "Sugerencia",
  other: "Otro",
};

export const BugReportsManager = () => {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase.from("bug_reports").select("*").order("created_at", { ascending: false });
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Fetch lawyer names
      const lawyerIds = [...new Set((data || []).map((r) => r.lawyer_id))];
      let lawyerMap: Record<string, { full_name: string; email: string }> = {};
      if (lawyerIds.length > 0) {
        const { data: lawyers } = await supabase
          .from("lawyer_profiles")
          .select("id, full_name, email")
          .in("id", lawyerIds);
        if (lawyers) {
          lawyers.forEach((l) => {
            lawyerMap[l.id] = { full_name: l.full_name, email: l.email };
          });
        }
      }

      setReports(
        (data || []).map((r) => ({
          ...r,
          lawyer_name: lawyerMap[r.lawyer_id]?.full_name || "Desconocido",
          lawyer_email: lawyerMap[r.lawyer_id]?.email || "",
        }))
      );
    } catch (err: any) {
      console.error("Error fetching bug reports:", err);
      toast({ title: "Error", description: "No se pudieron cargar los reportes.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const handleUpdateReport = async (id: string, updates: Record<string, any>) => {
    setUpdating(true);
    try {
      const { error } = await supabase.from("bug_reports").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "✅ Reporte actualizado" });
      fetchReports();
      if (selectedReport?.id === id) {
        setSelectedReport({ ...selectedReport, ...updates });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const newCount = reports.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Reportes de Problemas
              {newCount > 0 && <Badge variant="destructive">{newCount} nuevos</Badge>}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="new">Nuevos</SelectItem>
                  <SelectItem value="in_review">En revisión</SelectItem>
                  <SelectItem value="resolved">Resueltos</SelectItem>
                  <SelectItem value="closed">Cerrados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchReports} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay reportes{filterStatus !== "all" ? " con ese filtro" : ""}.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Abogado</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Herramienta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.id} className={r.status === "new" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{r.lawyer_name}</div>
                        <div className="text-xs text-muted-foreground">{r.lawyer_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{CATEGORY_LABELS[r.category] || r.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.affected_tool || "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(val) =>
                            handleUpdateReport(r.id, {
                              status: val,
                              ...(val === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <Badge variant={STATUS_COLORS[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.priority}
                          onValueChange={(val) => handleUpdateReport(r.id, { priority: val })}
                        >
                          <SelectTrigger className="h-7 w-24 text-xs">
                            <SelectValue>{PRIORITY_LABELS[r.priority]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(r); setAdminNotes(r.admin_notes || ""); }}>
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(o) => !o && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle del reporte</DialogTitle>
            <DialogDescription>
              {selectedReport && `${CATEGORY_LABELS[selectedReport.category]} — ${selectedReport.affected_tool || "Sin herramienta"}`}
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Abogado</Label>
                <p className="text-sm">{selectedReport.lawyer_name} ({selectedReport.lawyer_email})</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Descripción</Label>
                <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              <div className="space-y-2">
                <Label>Notas del administrador</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Agregar notas internas..."
                  rows={3}
                />
                <Button
                  size="sm"
                  disabled={updating}
                  onClick={() => handleUpdateReport(selectedReport.id, { admin_notes: adminNotes })}
                >
                  Guardar notas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
