-- 00000000000027_admin_system_tables.sql
-- Create tables for system settings, AI configuration, logs, and backups

-- AI Settings
CREATE TABLE public.ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(100) NOT NULL DEFAULT 'OpenAI',
    model VARCHAR(100) NOT NULL DEFAULT 'gpt-4-turbo',
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.7,
    max_tokens INTEGER NOT NULL DEFAULT 2000,
    api_key TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Settings
CREATE TABLE public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Events
CREATE TABLE public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- System Logs
CREATE TABLE public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(50) NOT NULL,
    service VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- System Backups
CREATE TABLE public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    size_mb NUMERIC(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'In Progress',
    triggered_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Insert default AI setting
INSERT INTO public.ai_settings (provider, model, temperature, max_tokens, is_active) 
VALUES ('OpenAI', 'gpt-4', 0.7, 2000, true);

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('general_settings', '{"siteName": "Edvix CRM", "supportEmail": "support@edvix.com", "timezone": "UTC"}', 'General Application Settings'),
('maintenance_mode', '{"active": false, "message": "System is under maintenance"}', 'Maintenance Mode Configuration');
