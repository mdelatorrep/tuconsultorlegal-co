import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const CATEGORIES = [
  { value: "bug", label: "Error en herramienta" },
  { value: "performance", label: "Problema de rendimiento" },
  { value: "data", label: "Datos incorrectos" },
  { value: "suggestion", label: "Sugerencia" },
  { value: "other", label: "Otro" },
];

const TOOLS = [
  "Consulta Jurídica",
  "Normativa (SUIN)",
  "Buscar Procesos",
  "Seguimiento Procesos",
  "Análisis de Documentos",
  "Redacción Asistida",
  "Estrategia Legal",
  "Análisis de Riesgos",
  "Clientes y Casos",
  "Agenda",
  "Asistentes Legales",
  "Portal de Clientes",
  "Créditos",
  "Blog",
];

interface BugReportButtonProps {
  lawyerId: string;
}

const BugReportButton = ({ lawyerId }: BugReportButtonProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("");
  const [affectedTool, setAffectedTool] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!category || !description || description.trim().length < 10) {
      toast({ title: "Campos requeridos", description: "Selecciona categoría y escribe al menos 10 caracteres.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("bug_reports").insert({
        lawyer_id: lawyerId,
        category,
        affected_tool: affectedTool || null,
        description: description.trim(),
      });

      if (error) throw error;

      toast({ title: "✅ Reporte enviado", description: "Tu reporte fue recibido. Lo revisaremos pronto." });
      setOpen(false);
      setCategory("");
      setAffectedTool("");
      setDescription("");
    } catch (err: any) {
      console.error("Bug report error:", err);
      toast({ title: "Error", description: "No se pudo enviar el reporte. Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 left-4 z-50 h-10 w-10 rounded-full shadow-md border-muted-foreground/20 bg-background/90 backdrop-blur hover:bg-accent"
              onClick={() => setOpen(true)}
            >
              <Bug className="h-4 w-4 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Reportar problema</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reportar problema</DialogTitle>
            <DialogDescription>Describe el problema que encontraste. Lo revisaremos lo antes posible.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Herramienta afectada (opcional)</Label>
              <Select value={affectedTool} onValueChange={setAffectedTool}>
                <SelectTrigger><SelectValue placeholder="Seleccionar herramienta..." /></SelectTrigger>
                <SelectContent>
                  {TOOLS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripción del problema *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué pasó, qué esperabas y qué viste en su lugar..."
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{description.length}/2000</p>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar reporte"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BugReportButton;
