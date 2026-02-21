import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Phone, Plus, Edit, Trash2, 
  Star, Receipt, Shield, MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ContactForm from "./ContactForm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_primary: boolean;
  is_billing_contact: boolean;
  is_decision_maker: boolean;
  status: string;
  last_contact_date: string | null;
  communication_preference: string;
  notes: string | null;
}

interface EntityContactsListProps {
  contacts: Contact[];
  entityId: string;
  lawyerData: any;
  onAddContact: () => void;
  onRefresh: () => void;
}

const COMM_PREFS: Record<string, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  phone: { label: "Teléfono", icon: Phone },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  other: { label: "Otro", icon: MessageSquare }
};

export default function EntityContactsList({ 
  contacts, 
  entityId, 
  lawyerData, 
  onAddContact,
  onRefresh 
}: EntityContactsListProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const handleUpdateContact = async (contactData: any) => {
    if (!editingContact) return;
    
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update(contactData)
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: "Contacto actualizado",
        description: "Los cambios se han guardado"
      });

      setEditingContact(null);
      onRefresh();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive"
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("¿Eliminar este contacto?")) return;
    
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Contacto eliminado",
        description: "El contacto ha sido eliminado"
      });

      onRefresh();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el contacto",
        variant: "destructive"
      });
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    try {
      // First, unset all primary contacts for this entity
      await supabase
        .from('crm_contacts')
        .update({ is_primary: false })
        .eq('entity_id', entityId);

      // Then set the selected one as primary
      const { error } = await supabase
        .from('crm_contacts')
        .update({ is_primary: true })
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: "Contacto principal actualizado",
        description: "El contacto ha sido marcado como principal"
      });

      onRefresh();
    } catch (error) {
      console.error('Error setting primary contact:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto principal",
        variant: "destructive"
      });
    }
  };

  if (contacts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sin contactos</h3>
          <p className="text-muted-foreground mb-4">
            Agrega personas de contacto de esta organización
          </p>
          <Button onClick={onAddContact}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Contacto
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Contactos ({contacts.length})</h3>
        <Button size="sm" onClick={onAddContact}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      <div className="grid gap-4">
        {contacts.map((contact) => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Contact Info */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                    contact.is_primary 
                      ? 'bg-gradient-to-br from-primary to-primary/80' 
                      : 'bg-gradient-to-br from-muted-foreground/60 to-muted-foreground/40'
                  }`}>
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{contact.name}</h4>
                      {contact.is_primary && (
                        <Badge className="bg-primary/10 text-primary">
                          <Star className="h-3 w-3 mr-1" />
                          Principal
                        </Badge>
                      )}
                      {contact.is_billing_contact && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <Receipt className="h-3 w-3 mr-1" />
                          Facturación
                        </Badge>
                      )}
                      {contact.is_decision_maker && (
                        <Badge variant="outline" className="bg-accent text-accent-foreground">
                          <Shield className="h-3 w-3 mr-1" />
                          Decisor
                        </Badge>
                      )}
                      {contact.status === 'inactive' && (
                        <Badge variant="outline" className="bg-gray-50 text-gray-600">
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {(contact.role || contact.department) && (
                      <p className="text-sm text-muted-foreground">
                        {contact.role}{contact.role && contact.department ? ' • ' : ''}{contact.department}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm">
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                    {contact.last_contact_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Último contacto: {format(new Date(contact.last_contact_date), "dd MMM yyyy", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!contact.is_primary && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:text-primary/80"
                      onClick={() => handleSetPrimary(contact.id)}
                      title="Marcar como principal"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingContact(contact)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteContact(contact.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Contacto</DialogTitle>
            <DialogDescription>
              Modifica la información de {editingContact?.name}
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <ContactForm 
              contact={editingContact}
              onSubmit={handleUpdateContact}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
