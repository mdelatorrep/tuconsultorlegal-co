import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CustomDocumentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomDocumentRequestDialog({ open, onOpenChange }: CustomDocumentRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    documentType: "",
    description: "",
    urgency: "normal",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.documentType.trim() || !formData.description.trim()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (formData.documentType.length > 200) {
      toast.error("El tipo de documento debe tener menos de 200 caracteres");
      return;
    }

    if (formData.description.length > 1000) {
      toast.error("La descripción debe tener menos de 1000 caracteres");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('custom_document_requests')
        .insert({
          user_id: user?.id || null,
          user_email: user?.email || 'anonimo@praxishub.co',
          user_name: user?.user_metadata?.full_name || 'Usuario Anónimo',
          document_type: formData.documentType.trim(),
          description: formData.description.trim(),
          urgency: formData.urgency,
          status: 'pending',
        });

      if (error) throw error;

      // Enviar email de confirmación al usuario
      const userEmail = user?.email || 'anonimo@praxishub.co';
      const userName = user?.user_metadata?.full_name || 'Usuario';
      
      const urgencyLabels: Record<string, string> = {
        low: 'Baja',
        normal: 'Normal',
        high: 'Alta',
        urgent: 'Urgente'
      };
      
      const urgencyClasses: Record<string, string> = {
        low: 'urgency-normal',
        normal: 'urgency-normal',
        high: 'urgency-urgent',
        urgent: 'urgency-very-urgent'
      };

      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: userEmail,
            subject: 'Tu solicitud de documento ha sido recibida',
            html: '', // El edge function usará la plantilla
            template_key: 'custom_document_request_user',
            recipient_type: 'user',
            variables: {
              user_name: userName,
              document_type: formData.documentType.trim(),
              urgency: urgencyLabels[formData.urgency] || 'Normal',
              urgency_class: urgencyClasses[formData.urgency] || 'urgency-normal',
              description_preview: formData.description.trim().substring(0, 300) + (formData.description.length > 300 ? '...' : ''),
              site_url: 'https://praxishub.co',
              current_year: new Date().getFullYear().toString()
            }
          }
        });
        console.log('Custom document request confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // No bloqueamos el flujo si falla el email
      }

      toast.success("Solicitud enviada exitosamente", {
        description: "Nos pondremos en contacto contigo pronto"
      });

      setFormData({
        documentType: "",
        description: "",
        urgency: "normal",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("Error al enviar la solicitud", {
        description: "Por favor intenta de nuevo"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Solicitar Documento Personalizado</DialogTitle>
          <DialogDescription>
            ¿No encuentras el documento que necesitas? Cuéntanos qué necesitas y te ayudaremos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="documentType">
              Tipo de Documento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="documentType"
              placeholder="Ej: Contrato de compraventa, Poder notarial, etc."
              value={formData.documentType}
              onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Descripción Detallada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe qué necesitas, para qué lo necesitas y cualquier detalle relevante..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[120px]"
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/1000 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgencia</Label>
            <Select
              value={formData.urgency}
              onValueChange={(value) => setFormData({ ...formData, urgency: value })}
            >
              <SelectTrigger id="urgency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja - No tengo prisa</SelectItem>
                <SelectItem value="normal">Normal - En unos días</SelectItem>
                <SelectItem value="high">Alta - Lo necesito pronto</SelectItem>
                <SelectItem value="urgent">Urgente - Lo necesito ya</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Solicitud"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
