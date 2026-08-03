-- master_update_v3.sql
-- Feature Flags and SaaS Architecture Extension

-- 1. Create Plans Table
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    price NUMERIC NOT NULL,
    active BOOLEAN DEFAULT true
);

-- 2. Create Plan Features Table
CREATE TABLE IF NOT EXISTS public.saas_plan_features (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    UNIQUE(plan_id, feature)
);

-- 3. Create Plan Limits Table
CREATE TABLE IF NOT EXISTS public.saas_plan_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    max_limit INTEGER NOT NULL, -- -1 means unlimited
    UNIQUE(plan_id, feature)
);

-- 4. Subscriptions table
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    plan_id UUID REFERENCES public.saas_plans(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Plans
INSERT INTO public.saas_plans (name, price) VALUES 
('trial', 0),
('basic', 49.90),
('professional', 99.90),
('premium', 199.90)
ON CONFLICT (name) DO NOTHING;

-- Seed Trial Features and Limits
DO $$
DECLARE
    p_trial UUID;
    p_basic UUID;
    p_pro UUID;
    p_prem UUID;
BEGIN
    SELECT id INTO p_trial FROM public.saas_plans WHERE name = 'trial';
    SELECT id INTO p_basic FROM public.saas_plans WHERE name = 'basic';
    SELECT id INTO p_pro FROM public.saas_plans WHERE name = 'professional';
    SELECT id INTO p_prem FROM public.saas_plans WHERE name = 'premium';

    -- Clear old mappings to start fresh
    DELETE FROM public.saas_plan_features;
    DELETE FROM public.saas_plan_limits;

    --------------------
    -- TRIAL
    --------------------
    INSERT INTO public.saas_plan_features (plan_id, feature) VALUES 
    (p_trial, 'REPORTS_BASIC');
    
    INSERT INTO public.saas_plan_limits (plan_id, feature, max_limit) VALUES 
    (p_trial, 'PROPERTY_LIMIT', 1),
    (p_trial, 'TENANT_LIMIT', 1),
    (p_trial, 'CONTRACT_LIMIT', 1),
    (p_trial, 'DOCUMENT_LIMIT', 5),
    (p_trial, 'USER_LIMIT', 1);

    --------------------
    -- BASIC
    --------------------
    INSERT INTO public.saas_plan_features (plan_id, feature) VALUES 
    (p_basic, 'REPORTS_BASIC'),
    (p_basic, 'AGENDA'),
    (p_basic, 'HELPDESK'),
    (p_basic, 'DOCUMENT_VAULT');

    INSERT INTO public.saas_plan_limits (plan_id, feature, max_limit) VALUES 
    (p_basic, 'PROPERTY_LIMIT', 2),
    (p_basic, 'TENANT_LIMIT', 2),
    (p_basic, 'CONTRACT_LIMIT', 5),
    (p_basic, 'DOCUMENT_LIMIT', 15),
    (p_basic, 'USER_LIMIT', 1);

    --------------------
    -- PROFESSIONAL
    --------------------
    INSERT INTO public.saas_plan_features (plan_id, feature) VALUES 
    (p_pro, 'REPORTS_BASIC'),
    (p_pro, 'AGENDA'),
    (p_pro, 'HELPDESK'),
    (p_pro, 'DOCUMENT_VAULT'),
    (p_pro, 'CONTRACTS'),
    (p_pro, 'CONTRACTS_PDF'),
    (p_pro, 'REPORTS_ADVANCED'),
    (p_pro, 'FINANCIAL'),
    (p_pro, 'PUBLIC_PROPERTY_PAGE'),
    (p_pro, 'TENANT_RATING'),
    (p_pro, 'WHATSAPP'),
    (p_pro, 'MARKETPLACE');

    INSERT INTO public.saas_plan_limits (plan_id, feature, max_limit) VALUES 
    (p_pro, 'PROPERTY_LIMIT', -1), -- unlimited
    (p_pro, 'TENANT_LIMIT', -1),
    (p_pro, 'CONTRACT_LIMIT', -1),
    (p_pro, 'DOCUMENT_LIMIT', -1),
    (p_pro, 'USER_LIMIT', 3);

    --------------------
    -- PREMIUM
    --------------------
    INSERT INTO public.saas_plan_features (plan_id, feature) VALUES 
    (p_prem, 'REPORTS_BASIC'),
    (p_prem, 'AGENDA'),
    (p_prem, 'HELPDESK'),
    (p_prem, 'DOCUMENT_VAULT'),
    (p_prem, 'CONTRACTS'),
    (p_prem, 'CONTRACTS_PDF'),
    (p_prem, 'REPORTS_ADVANCED'),
    (p_prem, 'FINANCIAL'),
    (p_prem, 'PUBLIC_PROPERTY_PAGE'),
    (p_prem, 'TENANT_RATING'),
    (p_prem, 'WHATSAPP'),
    (p_prem, 'MARKETPLACE'),
    (p_prem, 'DIGITAL_SIGNATURE'),
    (p_prem, 'BANK_RECONCILIATION'),
    (p_prem, 'ARGUS'),
    (p_prem, 'BACKUP'),
    (p_prem, 'NOTIFICATIONS'),
    (p_prem, 'PIX'),
    (p_prem, 'API_ACCESS'),
    (p_prem, 'EXPORT_DATA'),
    (p_prem, 'MULTI_USER'),
    (p_prem, 'CUSTOM_BRANDING');

    INSERT INTO public.saas_plan_limits (plan_id, feature, max_limit) VALUES 
    (p_prem, 'PROPERTY_LIMIT', -1),
    (p_prem, 'TENANT_LIMIT', -1),
    (p_prem, 'CONTRACT_LIMIT', -1),
    (p_prem, 'DOCUMENT_LIMIT', -1),
    (p_prem, 'USER_LIMIT', -1);
END $$;

-- 5. Helper RPC Functions
CREATE OR REPLACE FUNCTION public.has_feature(uid UUID, feat TEXT) RETURNS BOOLEAN AS $$
DECLARE
    v_plan_id UUID;
    v_has BOOLEAN;
BEGIN
    SELECT plan_id INTO v_plan_id FROM public.saas_subscriptions WHERE user_id = uid AND status = 'active';
    IF v_plan_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT enabled INTO v_has FROM public.saas_plan_features WHERE plan_id = v_plan_id AND feature = feat;
    RETURN COALESCE(v_has, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_limit(uid UUID, feat TEXT) RETURNS INTEGER AS $$
DECLARE
    v_plan_id UUID;
    v_limit INTEGER;
BEGIN
    SELECT plan_id INTO v_plan_id FROM public.saas_subscriptions WHERE user_id = uid AND status = 'active';
    IF v_plan_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT max_limit INTO v_limit FROM public.saas_plan_limits WHERE plan_id = v_plan_id AND feature = feat;
    RETURN COALESCE(v_limit, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MIGRATION: move existing profiles to saas_subscriptions
INSERT INTO public.saas_subscriptions (user_id, plan_id, status, expires_at)
SELECT 
    p.id as user_id,
    pl.id as plan_id,
    p.status,
    p.plan_expires_at
FROM public.profiles p
LEFT JOIN public.saas_plans pl ON p.plan::text = pl.name
ON CONFLICT (user_id) DO UPDATE 
SET plan_id = EXCLUDED.plan_id, status = EXCLUDED.status, expires_at = EXCLUDED.expires_at;
