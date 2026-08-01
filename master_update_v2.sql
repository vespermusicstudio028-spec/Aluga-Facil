-- =================================================================
-- ALUGAFÁCIL - MASTER UPDATE V2 
-- Script criado para a evolução SaaS -> CRM Imobiliário
-- ATENÇÃO: Esse script rodará tranquilamente adicionando colunas faltantes e criando tabelas novas
-- =================================================================

-- 1. ADD NOVAS COLUNAS NA TABELA PROPERTIES (IMÓVEIS)
-- Usamos "IF NOT EXISTS" implicitamente via bloco DO caso a versão do Postgres exija cautela, 
-- mas para Supabase comandos diretos ALTER TABLE ADD COLUMN geralmente não quebram se você não os rodou antes.
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bedrooms integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS bathrooms integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS parking_spaces integer DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS area numeric(10,2) DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS iptu_value numeric(12,2) DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS condo_value numeric(12,2) DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lat numeric(10,8);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS lng numeric(11,8);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS floor_plan_url text;


-- =================================================================
-- 2. NOVA TABELA: AGENDA (EVENTS)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    type text NOT NULL, -- 'vistoria', 'visita', 'manutencao', 'renovacao'
    date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    notes text,
    status text DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento Agenda" 
ON public.events FOR ALL 
USING (auth.uid() = owner_id);

-- =================================================================
-- 3. NOVA TABELA: TICKETS DE MANUTENÇÃO (MAINTENANCE)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'open', -- 'open', 'in_progress', 'awaiting_quote', 'completed'
    priority text DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    cost_estimate numeric(12,2) DEFAULT 0,
    provider_name text,
    provider_contact text,
    photos jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento Manutencao" 
ON public.maintenance_tickets FOR ALL 
USING (auth.uid() = owner_id);

-- =================================================================
-- 4. NOVA TABELA: COFRE DE DOCUMENTOS (VAULT)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    contract_id uuid REFERENCES public.contracts(id) ON DELETE CASCADE,
    title text NOT NULL,
    category text NOT NULL, -- 'escritura', 'iptu', 'contrato', 'vistoria', 'rg', 'cpf', 'comprovante_renda', 'comprovante_residencia', 'outro'
    file_url text NOT NULL,
    file_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento Documentos" 
ON public.documents FOR ALL 
USING (auth.uid() = owner_id);

-- =================================================================
-- 5. NOVA TABELA: AVALIAÇÃO DE INQUILINOS (RATINGS)
-- =================================================================
CREATE TABLE IF NOT EXISTS public.tenant_ratings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    punctuality integer CHECK (punctuality >= 1 AND punctuality <= 5) NOT NULL,
    conservation integer CHECK (conservation >= 1 AND conservation <= 5) NOT NULL,
    communication integer CHECK (communication >= 1 AND communication <= 5) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(tenant_id) -- Garante apenas 1 avaliação oficial (atualizável) por inquilino
);

ALTER TABLE public.tenant_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento Avaliacoes" 
ON public.tenant_ratings FOR ALL 
USING (auth.uid() = owner_id);

-- GATILHO PARA ATUALIZAR STATUS DE UPDATED_AT DA MANUTENÇÃO
CREATE OR REPLACE FUNCTION update_maintenance_modified_column() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_maintenance_modtime ON public.maintenance_tickets;
CREATE TRIGGER update_maintenance_modtime 
BEFORE UPDATE ON public.maintenance_tickets 
FOR EACH ROW EXECUTE PROCEDURE update_maintenance_modified_column();
