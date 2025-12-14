-- ============================================================================
-- MapleLaw Row-Level Security Policies (Supabase Compatible)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper function in PUBLIC schema (not auth)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_firm_id()
RETURNS UUID AS $$
    SELECT firm_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- FIRMS Policies
-- ============================================================================
CREATE POLICY "Users can view their own firm"
    ON firms FOR SELECT
    USING (id = public.get_user_firm_id());

CREATE POLICY "Admins can update their firm"
    ON firms FOR UPDATE
    USING (id = public.get_user_firm_id() AND public.get_user_role() = 'admin');

-- ============================================================================
-- USERS Policies
-- ============================================================================
CREATE POLICY "Users can view users in their firm"
    ON users FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins can insert users in their firm"
    ON users FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Users can update themselves"
    ON users FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins can update any user in their firm"
    ON users FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() = 'admin');

-- Allow first user to insert themselves (during registration)
CREATE POLICY "Allow user to insert themselves during registration"
    ON users FOR INSERT
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- CLIENTS Policies
-- ============================================================================
CREATE POLICY "Users can view clients in their firm"
    ON clients FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create clients"
    ON clients FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins and lawyers can update clients"
    ON clients FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins can delete clients"
    ON clients FOR DELETE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() = 'admin');

-- ============================================================================
-- MATTERS Policies
-- ============================================================================
CREATE POLICY "Users can view matters in their firm"
    ON matters FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create matters"
    ON matters FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins and lawyers can update matters"
    ON matters FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins can delete matters"
    ON matters FOR DELETE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() = 'admin');

-- ============================================================================
-- TIME ENTRIES Policies
-- ============================================================================
CREATE POLICY "Users can view time entries in their firm"
    ON time_entries FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "All users can create time entries"
    ON time_entries FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id());

CREATE POLICY "Users can update their own time entries"
    ON time_entries FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND (user_id = auth.uid() OR public.get_user_role() IN ('admin', 'lawyer')));

CREATE POLICY "Users can delete their own unbilled time entries"
    ON time_entries FOR DELETE
    USING (firm_id = public.get_user_firm_id() AND user_id = auth.uid() AND billed = FALSE);

-- ============================================================================
-- INVOICES Policies
-- ============================================================================
CREATE POLICY "Users can view invoices in their firm"
    ON invoices FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create invoices"
    ON invoices FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins and lawyers can update invoices"
    ON invoices FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- INVOICE LINE ITEMS Policies
-- ============================================================================
CREATE POLICY "Users can view invoice line items in their firm"
    ON invoice_line_items FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can manage invoice line items"
    ON invoice_line_items FOR ALL
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- PAYMENTS Policies
-- ============================================================================
CREATE POLICY "Users can view payments in their firm"
    ON payments FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create payments"
    ON payments FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- TRUST ACCOUNTS Policies
-- ============================================================================
CREATE POLICY "Users can view trust accounts in their firm"
    ON trust_accounts FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create trust accounts"
    ON trust_accounts FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- TRUST TRANSACTIONS Policies (STRICT - admins and lawyers only)
-- ============================================================================
CREATE POLICY "Users can view trust transactions in their firm"
    ON trust_transactions FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "Admins and lawyers can create trust transactions"
    ON trust_transactions FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- TRUST RECONCILIATIONS Policies
-- ============================================================================
CREATE POLICY "Admins and lawyers can view reconciliations"
    ON trust_reconciliations FOR SELECT
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

CREATE POLICY "Admins and lawyers can create reconciliations"
    ON trust_reconciliations FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));

-- ============================================================================
-- AUDIT LOGS Policies
-- ============================================================================
CREATE POLICY "Users can view audit logs in their firm"
    ON audit_logs FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "All users can create audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id());

-- ============================================================================
-- AI EVENTS Policies
-- ============================================================================
CREATE POLICY "Users can view AI events in their firm"
    ON ai_events FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "All users can create AI events"
    ON ai_events FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id());

-- ============================================================================
-- TASKS Policies
-- ============================================================================
CREATE POLICY "Users can view tasks in their firm"
    ON tasks FOR SELECT
    USING (firm_id = public.get_user_firm_id());

CREATE POLICY "All users can create tasks"
    ON tasks FOR INSERT
    WITH CHECK (firm_id = public.get_user_firm_id());

CREATE POLICY "Users can update their assigned tasks"
    ON tasks FOR UPDATE
    USING (firm_id = public.get_user_firm_id() AND (assigned_to = auth.uid() OR public.get_user_role() IN ('admin', 'lawyer')));

CREATE POLICY "Admins and lawyers can delete tasks"
    ON tasks FOR DELETE
    USING (firm_id = public.get_user_firm_id() AND public.get_user_role() IN ('admin', 'lawyer'));
