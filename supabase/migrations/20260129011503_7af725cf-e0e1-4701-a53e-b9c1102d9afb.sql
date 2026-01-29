-- ============================================
-- B2B ENTITIES INTEGRATION FOR CRM
-- Phase 1: Foundation Tables
-- ============================================

-- 1. CREATE crm_entities TABLE
-- Stores organization/company information for B2B relationships
CREATE TABLE public.crm_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  entity_type TEXT DEFAULT 'corporation' CHECK (entity_type IN ('corporation', 'government', 'ngo', 'association', 'other')),
  industry TEXT,
  size TEXT CHECK (size IN ('micro', 'small', 'medium', 'large', 'enterprise')),
  website TEXT,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  billing_address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
  health_score INTEGER DEFAULT 70 CHECK (health_score >= 0 AND health_score <= 100),
  lifetime_value NUMERIC(15,2) DEFAULT 0,
  contract_type TEXT CHECK (contract_type IN ('retainer', 'hourly', 'fixed', 'hybrid')),
  contract_value NUMERIC(15,2),
  contract_start DATE,
  contract_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. CREATE crm_contacts TABLE
-- People/contacts within entities
CREATE TABLE public.crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  entity_id UUID REFERENCES public.crm_entities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  department TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_billing_contact BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  notes TEXT,
  last_contact_date TIMESTAMP WITH TIME ZONE,
  communication_preference TEXT DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone', 'whatsapp', 'other')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. ADD entity_id AND primary_contact_id TO crm_cases
-- Allows cases to be linked to entities while maintaining backward compatibility
ALTER TABLE public.crm_cases 
ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.crm_entities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

-- 4. ADD contact_id TO crm_communications
-- Links communications to specific contacts within entities
ALTER TABLE public.crm_communications 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

-- 5. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_crm_entities_lawyer_id ON public.crm_entities(lawyer_id);
CREATE INDEX idx_crm_entities_status ON public.crm_entities(status);
CREATE INDEX idx_crm_entities_industry ON public.crm_entities(industry);
CREATE INDEX idx_crm_contacts_lawyer_id ON public.crm_contacts(lawyer_id);
CREATE INDEX idx_crm_contacts_entity_id ON public.crm_contacts(entity_id);
CREATE INDEX idx_crm_contacts_is_primary ON public.crm_contacts(is_primary) WHERE is_primary = true;
CREATE INDEX idx_crm_cases_entity_id ON public.crm_cases(entity_id);
CREATE INDEX idx_crm_communications_contact_id ON public.crm_communications(contact_id);

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.crm_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES FOR crm_entities
CREATE POLICY "Lawyers can view their own entities"
  ON public.crm_entities FOR SELECT
  USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can create their own entities"
  ON public.crm_entities FOR INSERT
  WITH CHECK (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can update their own entities"
  ON public.crm_entities FOR UPDATE
  USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can delete their own entities"
  ON public.crm_entities FOR DELETE
  USING (lawyer_id = auth.uid());

-- 8. RLS POLICIES FOR crm_contacts
CREATE POLICY "Lawyers can view their own contacts"
  ON public.crm_contacts FOR SELECT
  USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can create their own contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can update their own contacts"
  ON public.crm_contacts FOR UPDATE
  USING (lawyer_id = auth.uid());

CREATE POLICY "Lawyers can delete their own contacts"
  ON public.crm_contacts FOR DELETE
  USING (lawyer_id = auth.uid());

-- 9. TRIGGER FOR updated_at on crm_entities
CREATE TRIGGER update_crm_entities_updated_at
  BEFORE UPDATE ON public.crm_entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. TRIGGER FOR updated_at on crm_contacts
CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. COMMENT DOCUMENTATION
COMMENT ON TABLE public.crm_entities IS 'B2B entities/organizations for lawyers managing corporate clients';
COMMENT ON TABLE public.crm_contacts IS 'Contacts/people within B2B entities';
COMMENT ON COLUMN public.crm_cases.entity_id IS 'Optional link to B2B entity (alternative to client_id for corporate cases)';
COMMENT ON COLUMN public.crm_cases.primary_contact_id IS 'Primary contact person for this case within the entity';
COMMENT ON COLUMN public.crm_communications.contact_id IS 'Specific contact person for this communication';