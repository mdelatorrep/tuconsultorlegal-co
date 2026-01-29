import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, Plus, Search, Phone, Mail, MapPin, 
  Users, Briefcase, TrendingUp, Calendar, Edit, Trash2,
  ChevronRight, FileText, Heart, DollarSign, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EntityForm from "./EntityForm";
import EntityDetailPage from "./EntityDetailPage";

interface Entity {
  id: string;
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
  health_score: number;
  lifetime_value: number;
  contract_type: string | null;
  contract_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  notes: string | null;
  created_at: string;
  contacts_count?: number;
  cases_count?: number;
}

interface CRMEntitiesViewProps {
  searchTerm?: string;
  onRefresh?: () => void;
  lawyerData: any;
}

const ENTITY_TYPES: Record<string, { label: string; color: string }> = {
  corporation: { label: "Empresa", color: "bg-blue-100 text-blue-800" },
  government: { label: "Gobierno", color: "bg-purple-100 text-purple-800" },
  ngo: { label: "ONG", color: "bg-green-100 text-green-800" },
  association: { label: "Asociación", color: "bg-amber-100 text-amber-800" },
  other: { label: "Otro", color: "bg-gray-100 text-gray-800" }
};

const SIZE_LABELS: Record<string, string> = {
  micro: "Micro",
  small: "Pequeña",
  medium: "Mediana",
  large: "Grande",
  enterprise: "Corporación"
};

export default function CRMEntitiesView({ searchTerm = "", onRefresh, lawyerData }: CRMEntitiesViewProps) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchEntities();
  }, [lawyerData?.id]);

  const fetchEntities = async () => {
    if (!lawyerData?.id) return;
    
    setIsLoading(true);
    try {
      // Fetch entities
      const { data: entitiesData, error } = await supabase
        .from('crm_entities')
        .select('*')
        .eq('lawyer_id', lawyerData.id)
        .order('name');

      if (error) throw error;

      // Get counts for contacts and cases per entity
      const entitiesWithCounts = await Promise.all(
        (entitiesData || []).map(async (entity) => {
          const [contactsResult, casesResult] = await Promise.all([
            supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('entity_id', entity.id),
            supabase.from('crm_cases').select('id', { count: 'exact', head: true }).eq('entity_id', entity.id)
          ]);
          
          return {
            ...entity,
            contacts_count: contactsResult.count || 0,
            cases_count: casesResult.count || 0
          };
        })
      );

      setEntities(entitiesWithCounts);
    } catch (error) {
      console.error('Error fetching entities:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las entidades",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEntity = async (entityData: Partial<Entity>) => {
    try {
      const insertData = {
        name: entityData.name!,
        lawyer_id: lawyerData.id,
        legal_name: entityData.legal_name,
        tax_id: entityData.tax_id,
        entity_type: entityData.entity_type,
        industry: entityData.industry,
        size: entityData.size,
        website: entityData.website,
        address: entityData.address,
        city: entityData.city,
        phone: entityData.phone,
        email: entityData.email,
        billing_address: entityData.billing_address,
        status: entityData.status,
        contract_type: entityData.contract_type,
        contract_value: entityData.contract_value,
        contract_start: entityData.contract_start,
        contract_end: entityData.contract_end,
        notes: entityData.notes
      };
      const { error } = await supabase
        .from('crm_entities')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Entidad creada",
        description: "La entidad se ha creado exitosamente"
      });

      setShowForm(false);
      fetchEntities();
      onRefresh?.();
    } catch (error) {
      console.error('Error creating entity:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la entidad",
        variant: "destructive"
      });
    }
  };

  const handleUpdateEntity = async (entityData: Partial<Entity>) => {
    if (!editingEntity) return;
    
    try {
      const { error } = await supabase
        .from('crm_entities')
        .update(entityData)
        .eq('id', editingEntity.id);

      if (error) throw error;

      toast({
        title: "Entidad actualizada",
        description: "Los cambios se han guardado exitosamente"
      });

      setEditingEntity(null);
      fetchEntities();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating entity:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la entidad",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEntity = async (entityId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta entidad? Esta acción no se puede deshacer.")) return;
    
    try {
      const { error } = await supabase
        .from('crm_entities')
        .delete()
        .eq('id', entityId);

      if (error) throw error;

      toast({
        title: "Entidad eliminada",
        description: "La entidad ha sido eliminada"
      });

      fetchEntities();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la entidad",
        variant: "destructive"
      });
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-100";
    if (score >= 60) return "text-amber-600 bg-amber-100";
    return "text-red-600 bg-red-100";
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "$0";
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Filter entities
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = 
      entity.name.toLowerCase().includes((searchTerm || localSearch).toLowerCase()) ||
      entity.legal_name?.toLowerCase().includes((searchTerm || localSearch).toLowerCase()) ||
      entity.tax_id?.toLowerCase().includes((searchTerm || localSearch).toLowerCase()) ||
      entity.industry?.toLowerCase().includes((searchTerm || localSearch).toLowerCase());
    
    const matchesStatus = filterStatus === "all" || entity.status === filterStatus;
    const matchesIndustry = filterIndustry === "all" || entity.industry === filterIndustry;
    
    return matchesSearch && matchesStatus && matchesIndustry;
  });

  // Get unique industries for filter
  const industries = [...new Set(entities.map(e => e.industry).filter(Boolean))];

  // Summary stats
  const stats = {
    total: entities.length,
    active: entities.filter(e => e.status === 'active').length,
    totalValue: entities.reduce((sum, e) => sum + (e.lifetime_value || 0), 0),
    avgHealth: entities.length > 0 
      ? Math.round(entities.reduce((sum, e) => sum + e.health_score, 0) / entities.length)
      : 0
  };

  if (selectedEntity) {
    return (
      <EntityDetailPage 
        entity={selectedEntity} 
        lawyerData={lawyerData}
        onBack={() => setSelectedEntity(null)}
        onUpdate={() => {
          fetchEntities();
          setSelectedEntity(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            Entidades B2B
          </h2>
          <p className="text-muted-foreground">
            Gestiona organizaciones, empresas y sus contactos
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Entidad
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
                <p className="text-sm text-blue-600">Total Entidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
                <p className="text-sm text-emerald-600">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-amber-600">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-pink-50 to-pink-100/50 border-pink-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-2xl font-bold text-pink-700">{stats.avgHealth}%</p>
                <p className="text-sm text-pink-600">Salud Promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, NIT, sector..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="prospect">Prospectos</option>
            </select>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-background"
            >
              <option value="all">Todos los sectores</option>
              {industries.map(industry => (
                <option key={industry} value={industry!}>{industry}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entities List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEntities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay entidades</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || localSearch 
                ? "No se encontraron entidades con esos criterios"
                : "Comienza agregando tu primera entidad corporativa"}
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Entidad
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEntities.map((entity) => (
            <Card 
              key={entity.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => setSelectedEntity(entity)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Entity Info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                      <Building2 className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg truncate">{entity.name}</h3>
                        <Badge className={ENTITY_TYPES[entity.entity_type]?.color || ENTITY_TYPES.other.color}>
                          {ENTITY_TYPES[entity.entity_type]?.label || entity.entity_type}
                        </Badge>
                        {entity.status === 'prospect' && (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            Prospecto
                          </Badge>
                        )}
                        {entity.status === 'inactive' && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      {entity.legal_name && (
                        <p className="text-sm text-muted-foreground truncate">{entity.legal_name}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {entity.tax_id && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            NIT: {entity.tax_id}
                          </span>
                        )}
                        {entity.industry && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {entity.industry}
                          </span>
                        )}
                        {entity.size && (
                          <span>{SIZE_LABELS[entity.size] || entity.size}</span>
                        )}
                        {entity.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {entity.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats & Health */}
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span className="font-semibold text-foreground">{entity.contacts_count}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Contactos</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          <span className="font-semibold text-foreground">{entity.cases_count}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Casos</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-emerald-600">{formatCurrency(entity.lifetime_value)}</p>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                      </div>
                    </div>

                    {/* Health Score */}
                    <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${getHealthColor(entity.health_score)}`}>
                      {entity.health_score}%
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntity(entity);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntity(entity.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Entity Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Entidad</DialogTitle>
            <DialogDescription>
              Agrega una organización o empresa como cliente B2B
            </DialogDescription>
          </DialogHeader>
          <EntityForm 
            onSubmit={handleCreateEntity} 
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Entity Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Entidad</DialogTitle>
            <DialogDescription>
              Modifica la información de {editingEntity?.name}
            </DialogDescription>
          </DialogHeader>
          {editingEntity && (
            <EntityForm 
              entity={editingEntity}
              onSubmit={handleUpdateEntity} 
              onCancel={() => setEditingEntity(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
