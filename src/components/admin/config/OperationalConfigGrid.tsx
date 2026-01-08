import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw } from "lucide-react";

interface ConfigField {
  key: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'select' | 'json';
  options?: { value: string; label: string }[];
  defaultValue?: string;
  description?: string;
  suffix?: string;
}

interface ConfigGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  fields: ConfigField[];
}

interface OperationalConfigGridProps {
  groups: ConfigGroup[];
  getConfigValue: (key: string, defaultValue: string) => string;
  onSave: (key: string, value: string) => Promise<void>;
}

export default function OperationalConfigGrid({
  groups,
  getConfigValue,
  onSave
}: OperationalConfigGridProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Initialize values from config
  useEffect(() => {
    const initial: Record<string, string> = {};
    groups.forEach(group => {
      group.fields.forEach(field => {
        initial[field.key] = getConfigValue(field.key, field.defaultValue || '');
      });
    });
    setValues(initial);
  }, [groups, getConfigValue]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = async (key: string) => {
    setSaving(key);
    try {
      await onSave(key, values[key]);
      setDirty(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      toast({ title: "Configuración guardada" });
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleBooleanChange = async (key: string, checked: boolean) => {
    const value = checked ? 'true' : 'false';
    setValues(prev => ({ ...prev, [key]: value }));
    setSaving(key);
    try {
      await onSave(key, value);
      toast({ title: "Configuración guardada" });
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleSelectChange = async (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setSaving(key);
    try {
      await onSave(key, value);
      toast({ title: "Configuración guardada" });
    } catch (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const renderField = (field: ConfigField) => {
    const value = values[field.key] || '';
    const isSaving = saving === field.key;
    const isDirty = dirty.has(field.key);

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-2">
            <div className="flex-1">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Switch
              checked={value === 'true'}
              onCheckedChange={(checked) => handleBooleanChange(field.key, checked)}
              disabled={isSaving}
            />
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <Select 
              value={value} 
              onValueChange={(v) => handleSelectChange(field.key, v)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={value}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-24 h-8 text-right"
              />
              {field.suffix && (
                <span className="text-xs text-muted-foreground">{field.suffix}</span>
              )}
              {isDirty && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={() => handleSave(field.key)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 min-w-0">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="w-48 h-8"
              />
              {isDirty && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-7 w-7"
                  onClick={() => handleSave(field.key)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <Card key={group.id} className="overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/30">
            <CardTitle className="text-sm flex items-center gap-2">
              {group.icon}
              {group.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 divide-y divide-border/50">
            {group.fields.map((field) => (
              <div key={field.key}>
                {renderField(field)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
