-- ============================================================================
-- MapleLaw Database Schema
-- Canada-first AI-native legal practice management
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FIRMS (Multi-tenancy root)
-- ============================================================================
CREATE TABLE firms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    province TEXT NOT NULL DEFAULT 'ON',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'lawyer', 'staff')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_firm_id ON users(firm_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- ============================================================================
-- CLIENTS
-- ============================================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_type TEXT NOT NULL DEFAULT 'individual' CHECK (client_type IN ('individual', 'organization')),
    email TEXT,
    phone TEXT,
    address TEXT,
    portal_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_firm_id ON clients(firm_id);

-- ============================================================================
-- MATTERS (Cases)
-- ============================================================================
CREATE TABLE matters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    matter_number TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'closed', 'archived')),
    billing_type TEXT NOT NULL DEFAULT 'hourly' CHECK (billing_type IN ('hourly', 'flat_fee', 'contingency')),
    responsible_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matters_firm_id ON matters(firm_id);
CREATE INDEX idx_matters_client_id ON matters(client_id);
CREATE UNIQUE INDEX idx_matters_number_firm ON matters(firm_id, matter_number);

-- ============================================================================
-- MATTER NUMBER SEQUENCE (per firm per year)
-- ============================================================================
CREATE TABLE matter_number_sequences (
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (firm_id, year)
);

-- Function to generate matter numbers (YYYY-NNN format)
CREATE OR REPLACE FUNCTION generate_matter_number(p_firm_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_number INTEGER;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Upsert the sequence and get next number
    INSERT INTO matter_number_sequences (firm_id, year, last_number)
    VALUES (p_firm_id, v_year, 1)
    ON CONFLICT (firm_id, year) 
    DO UPDATE SET last_number = matter_number_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    RETURN v_year || '-' || LPAD(v_next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate matter number on insert
CREATE OR REPLACE FUNCTION set_matter_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.matter_number IS NULL OR NEW.matter_number = '' THEN
        NEW.matter_number := generate_matter_number(NEW.firm_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_matter_number
    BEFORE INSERT ON matters
    FOR EACH ROW
    EXECUTE FUNCTION set_matter_number();

-- ============================================================================
-- TIME ENTRIES
-- ============================================================================
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours NUMERIC(5,2) NOT NULL CHECK (hours > 0),
    rate NUMERIC(10,2) NOT NULL CHECK (rate >= 0),
    description TEXT NOT NULL,
    billable BOOLEAN DEFAULT TRUE,
    billed BOOLEAN DEFAULT FALSE,
    amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_firm_id ON time_entries(firm_id);
CREATE INDEX idx_time_entries_matter_id ON time_entries(matter_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_billed ON time_entries(firm_id, billed) WHERE billable = TRUE;

-- Trigger to compute amount
CREATE OR REPLACE FUNCTION compute_time_entry_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount := ROUND(NEW.hours * NEW.rate, 2);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_amount
    BEFORE INSERT OR UPDATE ON time_entries
    FOR EACH ROW
    EXECUTE FUNCTION compute_time_entry_amount();

-- ============================================================================
-- INVOICES
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
    tax NUMERIC(10,2) NOT NULL DEFAULT 0,
    total NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'paid')),
    issued_at DATE,
    due_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_firm_id ON invoices(firm_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE UNIQUE INDEX idx_invoices_number_firm ON invoices(firm_id, invoice_number);

-- Invoice number sequence
CREATE TABLE invoice_number_sequences (
    firm_id UUID PRIMARY KEY REFERENCES firms(id) ON DELETE CASCADE,
    last_number INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION generate_invoice_number(p_firm_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_next_number INTEGER;
    v_prefix TEXT;
BEGIN
    -- Get prefix from firm settings or use default
    SELECT COALESCE(settings->>'invoice_prefix', 'INV-') INTO v_prefix
    FROM firms WHERE id = p_firm_id;
    
    INSERT INTO invoice_number_sequences (firm_id, last_number)
    VALUES (p_firm_id, 1)
    ON CONFLICT (firm_id) 
    DO UPDATE SET last_number = invoice_number_sequences.last_number + 1
    RETURNING last_number INTO v_next_number;
    
    RETURN v_prefix || LPAD(v_next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INVOICE LINE ITEMS
-- ============================================================================
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    qty NUMERIC(10,2) NOT NULL DEFAULT 1,
    rate NUMERIC(10,2) NOT NULL DEFAULT 0,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
    method TEXT NOT NULL DEFAULT 'check',
    reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);

-- ============================================================================
-- TRUST ACCOUNTS (one per matter, IOLTA-style)
-- ============================================================================
CREATE TABLE trust_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(matter_id)
);

CREATE INDEX idx_trust_accounts_firm_id ON trust_accounts(firm_id);

-- ============================================================================
-- TRUST TRANSACTIONS
-- ============================================================================
CREATE TABLE trust_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    trust_account_id UUID NOT NULL REFERENCES trust_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trust_transactions_account ON trust_transactions(trust_account_id);

-- Function to update trust account balance and enforce no negative
CREATE OR REPLACE FUNCTION update_trust_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_current_balance NUMERIC(10,2);
    v_new_balance NUMERIC(10,2);
BEGIN
    SELECT balance INTO v_current_balance
    FROM trust_accounts WHERE id = NEW.trust_account_id;
    
    IF NEW.type = 'deposit' THEN
        v_new_balance := v_current_balance + NEW.amount;
    ELSE
        v_new_balance := v_current_balance - NEW.amount;
    END IF;
    
    -- Enforce no negative balance
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Trust account balance cannot go negative. Current balance: %, Withdrawal: %', 
            v_current_balance, NEW.amount;
    END IF;
    
    UPDATE trust_accounts SET balance = v_new_balance WHERE id = NEW.trust_account_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_balance
    AFTER INSERT ON trust_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_trust_balance();

-- ============================================================================
-- TRUST RECONCILIATIONS (Three-way reconciliation)
-- ============================================================================
CREATE TABLE trust_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    bank_statement_balance NUMERIC(10,2) NOT NULL,
    trust_ledger_balance NUMERIC(10,2) NOT NULL,
    client_ledger_balance NUMERIC(10,2) NOT NULL,
    is_matched BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trust_reconciliations_firm ON trust_reconciliations(firm_id);

-- ============================================================================
-- TAX RULES (Canadian provinces)
-- ============================================================================
CREATE TABLE tax_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    province TEXT NOT NULL,
    gst_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    pst_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    hst_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE
);

CREATE INDEX idx_tax_rules_province ON tax_rules(province);

-- Insert default Canadian tax rules
INSERT INTO tax_rules (province, gst_rate, pst_rate, hst_rate, effective_from) VALUES
('ON', 0, 0, 0.13, '2010-07-01'),      -- Ontario HST 13%
('BC', 0.05, 0.07, 0, '2013-04-01'),   -- BC GST 5% + PST 7%
('AB', 0.05, 0, 0, '1991-01-01'),      -- Alberta GST only 5%
('SK', 0.05, 0.06, 0, '2017-03-23'),   -- Saskatchewan GST 5% + PST 6%
('MB', 0.05, 0.07, 0, '2019-07-01'),   -- Manitoba GST 5% + RST 7%
('QC', 0.05, 0.09975, 0, '2013-01-01'), -- Quebec GST 5% + QST 9.975%
('NB', 0, 0, 0.15, '2016-07-01'),      -- New Brunswick HST 15%
('NS', 0, 0, 0.15, '2010-07-01'),      -- Nova Scotia HST 15%
('NL', 0, 0, 0.15, '2016-07-01'),      -- Newfoundland HST 15%
('PE', 0, 0, 0.15, '2016-10-01'),      -- PEI HST 15%
('NT', 0.05, 0, 0, '1991-01-01'),      -- NWT GST only 5%
('NU', 0.05, 0, 0, '1999-04-01'),      -- Nunavut GST only 5%
('YT', 0.05, 0, 0, '1991-01-01');      -- Yukon GST only 5%

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id),
    source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai', 'system')),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_firm ON audit_logs(firm_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- AI EVENTS (Command bar logging)
-- ============================================================================
CREATE TABLE ai_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    context JSONB NOT NULL DEFAULT '{}',
    prompt TEXT NOT NULL,
    result JSONB NOT NULL DEFAULT '{}',
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_events_firm ON ai_events(firm_id);
CREATE INDEX idx_ai_events_user ON ai_events(user_id);

-- ============================================================================
-- TASKS (for matter health scoring)
-- ============================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_at DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_matter ON tasks(matter_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
