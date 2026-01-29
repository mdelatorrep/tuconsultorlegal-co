import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Save, X } from "lucide-react";

interface ContactFormProps {
  contact?: {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    department: string | null;
    is_primary: boolean;
    is_billing_contact: boolean;
    is_decision_maker: boolean;
    communication_preference: string;
    status: string;
    notes: string | null;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const DEPARTMENTS = [
  "Legal",
  "Finanzas",
  "Recursos Humanos",
  "Operaciones",
  "Comercial",
  "Administración",
  "Gerencia General",
  "Tecnología",
  "Marketing",
  "Compras",
  "Otro"
];

const ROLES = [
  "Gerente Legal",
  "Director Legal",
  "Abogado Interno",
  "Gerente General",
  "CEO",
  "CFO",
  "Director Financiero",
  "Contador",
  "Asistente Legal",
  "Asistente Administrativo",
  "Coordinador",
  "Analista",
  "Representante Legal",
  "Presidente",
  "Vicepresidente",
  "Otro"
];

export default function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: contact?.name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    role: contact?.role || "",
    department: contact?.department || "",
    is_primary: contact?.is_primary || false,
    is_billing_contact: contact?.is_billing_contact || false,
    is_decision_maker: contact?.is_decision_maker || false,
    communication_preference: contact?.communication_preference || "email",
    status: contact?.status || "active",
    notes: contact?.notes || ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role || null,
        department: formData.department || null,
        notes: formData.notes || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <User className="h-5 w-5 text-blue-600" />
          Información del Contacto
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="María García López"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Select value={formData.role} onValueChange={(v) => handleChange("role", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Select value={formData.department} onValueChange={(v) => handleChange("department", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar departamento" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="maria.garcia@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+57 300 123 4567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="communication_preference">Preferencia de Comunicación</Label>
          <Select value={formData.communication_preference} onValueChange={(v) => handleChange("communication_preference", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar preferencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Teléfono</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="other">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Roles */}
      <div className="space-y-4">
        <Label>Roles del Contacto</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_primary"
              checked={formData.is_primary}
              onCheckedChange={(checked) => handleChange("is_primary", !!checked)}
            />
            <Label htmlFor="is_primary" className="text-sm font-normal cursor-pointer">
              Contacto Principal
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_billing_contact"
              checked={formData.is_billing_contact}
              onCheckedChange={(checked) => handleChange("is_billing_contact", !!checked)}
            />
            <Label htmlFor="is_billing_contact" className="text-sm font-normal cursor-pointer">
              Recibe Facturas
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_decision_maker"
              checked={formData.is_decision_maker}
              onCheckedChange={(checked) => handleChange("is_decision_maker", !!checked)}
            />
            <Label htmlFor="is_decision_maker" className="text-sm font-normal cursor-pointer">
              Toma Decisiones
            </Label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Notas sobre el contacto..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {contact ? "Guardar Cambios" : "Agregar Contacto"}
        </Button>
      </div>
    </form>
  );
}
