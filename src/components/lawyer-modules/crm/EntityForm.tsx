import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Save, X } from "lucide-react";

interface EntityFormProps {
  entity?: {
    id?: string;
    name: string;
    legal_name: string | null;
    tax_id: string | null;
    entity_type: string;
    industry: string | null;
    size: string | null;
    website: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    billing_address: string | null;
    status: string;
    contract_type: string | null;
    contract_value: number | null;
    contract_start: string | null;
    contract_end: string | null;
    notes: string | null;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const INDUSTRIES = [
  "Financiero",
  "Salud",
  "Tecnología",
  "Manufactura",
  "Retail",
  "Construcción",
  "Educación",
  "Telecomunicaciones",
  "Energía",
  "Agroindustria",
  "Transporte",
  "Inmobiliario",
  "Entretenimiento",
  "Gobierno",
  "Legal",
  "Consultoría",
  "Otro"
];

export default function EntityForm({ entity, onSubmit, onCancel }: EntityFormProps) {
  const [formData, setFormData] = useState({
    name: entity?.name || "",
    legal_name: entity?.legal_name || "",
    tax_id: entity?.tax_id || "",
    entity_type: entity?.entity_type || "corporation",
    industry: entity?.industry || "",
    size: entity?.size || "",
    website: entity?.website || "",
    address: entity?.address || "",
    city: entity?.city || "",
    phone: entity?.phone || "",
    email: entity?.email || "",
    billing_address: entity?.billing_address || "",
    status: entity?.status || "active",
    contract_type: entity?.contract_type || "",
    contract_value: entity?.contract_value?.toString() || "",
    contract_start: entity?.contract_start || "",
    contract_end: entity?.contract_end || "",
    notes: entity?.notes || ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
        legal_name: formData.legal_name || null,
        tax_id: formData.tax_id || null,
        industry: formData.industry || null,
        size: formData.size || null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        phone: formData.phone || null,
        email: formData.email || null,
        billing_address: formData.billing_address || null,
        contract_type: formData.contract_type || null,
        contract_start: formData.contract_start || null,
        contract_end: formData.contract_end || null,
        notes: formData.notes || null
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          Información Básica
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Comercial *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ej: Bancolombia"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal_name">Razón Social</Label>
            <Input
              id="legal_name"
              value={formData.legal_name}
              onChange={(e) => handleChange("legal_name", e.target.value)}
              placeholder="Ej: Bancolombia S.A."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tax_id">NIT / RUT</Label>
            <Input
              id="tax_id"
              value={formData.tax_id}
              onChange={(e) => handleChange("tax_id", e.target.value)}
              placeholder="Ej: 890903938-8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity_type">Tipo de Entidad</Label>
            <Select value={formData.entity_type} onValueChange={(v) => handleChange("entity_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corporation">Empresa</SelectItem>
                <SelectItem value="government">Gobierno</SelectItem>
                <SelectItem value="ngo">ONG</SelectItem>
                <SelectItem value="association">Asociación</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="inactive">Inactiva</SelectItem>
                <SelectItem value="prospect">Prospecto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">Sector / Industria</Label>
            <Select value={formData.industry} onValueChange={(v) => handleChange("industry", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar sector" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="size">Tamaño</Label>
            <Select value={formData.size} onValueChange={(v) => handleChange("size", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tamaño" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="micro">Microempresa</SelectItem>
                <SelectItem value="small">Pequeña</SelectItem>
                <SelectItem value="medium">Mediana</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
                <SelectItem value="enterprise">Corporación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Información de Contacto</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Corporativo</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="contacto@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono Principal</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+57 1 234 5678"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://www.empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Bogotá, Colombia"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Dirección Principal</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Calle 123 # 45-67, Oficina 801"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_address">Dirección de Facturación</Label>
          <Input
            id="billing_address"
            value={formData.billing_address}
            onChange={(e) => handleChange("billing_address", e.target.value)}
            placeholder="Dejar vacío si es igual a la dirección principal"
          />
        </div>
      </div>

      {/* Contract Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Contrato Marco (Opcional)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_type">Tipo de Contrato</Label>
            <Select value={formData.contract_type} onValueChange={(v) => handleChange("contract_type", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retainer">Retainer (Iguala)</SelectItem>
                <SelectItem value="hourly">Por Hora</SelectItem>
                <SelectItem value="fixed">Precio Fijo</SelectItem>
                <SelectItem value="hybrid">Híbrido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_value">Valor del Contrato (COP)</Label>
            <Input
              id="contract_value"
              type="number"
              value={formData.contract_value}
              onChange={(e) => handleChange("contract_value", e.target.value)}
              placeholder="10000000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_start">Fecha de Inicio</Label>
            <Input
              id="contract_start"
              type="date"
              value={formData.contract_start}
              onChange={(e) => handleChange("contract_start", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contract_end">Fecha de Fin</Label>
            <Input
              id="contract_end"
              type="date"
              value={formData.contract_end}
              onChange={(e) => handleChange("contract_end", e.target.value)}
            />
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
          placeholder="Notas adicionales sobre la entidad..."
          rows={3}
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
          {entity ? "Guardar Cambios" : "Crear Entidad"}
        </Button>
      </div>
    </form>
  );
}
