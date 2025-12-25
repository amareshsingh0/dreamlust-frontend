-- DMCA Takedown System Tables

-- DMCA Claims Table
CREATE TABLE IF NOT EXISTS dmca_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    claimant_name VARCHAR(200) NOT NULL,
    claimant_email VARCHAR(255) NOT NULL,
    claimant_address TEXT NOT NULL,
    claimant_phone VARCHAR(50),
    copyrighted_work TEXT NOT NULL,
    infringement_description TEXT NOT NULL,
    good_faith_statement BOOLEAN NOT NULL DEFAULT true,
    accuracy_statement BOOLEAN NOT NULL DEFAULT true,
    authorized_statement BOOLEAN NOT NULL DEFAULT true,
    signature VARCHAR(200) NOT NULL,
    signature_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dmca_claims_content_id ON dmca_claims(content_id);
CREATE INDEX idx_dmca_claims_status ON dmca_claims(status);
CREATE INDEX idx_dmca_claims_created_at ON dmca_claims(created_at);

-- DMCA Counter-Notices Table
CREATE TABLE IF NOT EXISTS dmca_counter_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dmca_claim_id UUID NOT NULL REFERENCES dmca_claims(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255) NOT NULL,
    identification_of_content TEXT NOT NULL,
    statement_of_good_faith TEXT NOT NULL,
    consent_to_jurisdiction BOOLEAN NOT NULL DEFAULT true,
    signature VARCHAR(200) NOT NULL,
    signature_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dmca_counter_notices_claim_id ON dmca_counter_notices(dmca_claim_id);
CREATE INDEX idx_dmca_counter_notices_status ON dmca_counter_notices(status);
CREATE INDEX idx_dmca_counter_notices_created_at ON dmca_counter_notices(created_at);

-- Cookie Consent Table
CREATE TABLE IF NOT EXISTS cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    necessary BOOLEAN NOT NULL DEFAULT true,
    functional BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT false,
    marketing BOOLEAN NOT NULL DEFAULT false,
    consent_given_at TIMESTAMP NOT NULL DEFAULT NOW(),
    consent_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cookie_consents_user_id ON cookie_consents(user_id);
CREATE INDEX idx_cookie_consents_session_id ON cookie_consents(session_id);
CREATE INDEX idx_cookie_consents_created_at ON cookie_consents(created_at);

-- Data Export Requests (GDPR/CCPA)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'export' or 'deletion'
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    export_url TEXT,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX idx_data_export_requests_created_at ON data_export_requests(created_at);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    records_deleted INTEGER NOT NULL DEFAULT 0,
    retention_days INTEGER NOT NULL,
    executed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    execution_time_ms INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'success'
);

CREATE INDEX idx_data_retention_logs_executed_at ON data_retention_logs(executed_at);
CREATE INDEX idx_data_retention_logs_table_name ON data_retention_logs(table_name);
