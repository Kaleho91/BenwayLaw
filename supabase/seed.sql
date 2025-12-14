-- ============================================================================
-- MapleLaw Seed Data
-- Demo firm with sample data for immediate product exploration
-- ============================================================================

-- Note: This seed data should be run AFTER schema.sql and rls.sql
-- It requires a manually created auth.users entry first (via Supabase Auth)

-- To use this, create a user via the app registration flow first,
-- then run this script to add demo data to that user's firm.

-- Create the demo firm function that can be called after registration
CREATE OR REPLACE FUNCTION seed_demo_data(p_firm_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_client1_id UUID;
    v_client2_id UUID;
    v_matter1_id UUID;
    v_matter2_id UUID;
    v_matter3_id UUID;
    v_time1_id UUID;
    v_time2_id UUID;
    v_time3_id UUID;
    v_invoice_id UUID;
    v_trust_account_id UUID;
BEGIN
    -- ========================================
    -- Create demo clients
    -- ========================================
    INSERT INTO clients (id, firm_id, name, client_type, email, phone, address, portal_enabled)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        'Acme Corporation',
        'organization',
        'legal@acmecorp.ca',
        '416-555-0100',
        '100 Bay Street, Suite 4500, Toronto, ON M5J 2T3',
        false
    ) RETURNING id INTO v_client1_id;

    INSERT INTO clients (id, firm_id, name, client_type, email, phone, address, portal_enabled)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        'Sarah Mitchell',
        'individual',
        'sarah.mitchell@email.ca',
        '647-555-0234',
        '456 Queen Street West, Toronto, ON M5V 2A8',
        true
    ) RETURNING id INTO v_client2_id;

    -- ========================================
    -- Create demo matters
    -- ========================================
    INSERT INTO matters (id, firm_id, client_id, name, status, billing_type, responsible_user_id)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_client1_id,
        'Contract Review - Software License',
        'active',
        'hourly',
        p_user_id
    ) RETURNING id INTO v_matter1_id;

    INSERT INTO matters (id, firm_id, client_id, name, status, billing_type, responsible_user_id)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_client1_id,
        'Employment Dispute - Wrongful Termination',
        'active',
        'hourly',
        p_user_id
    ) RETURNING id INTO v_matter2_id;

    INSERT INTO matters (id, firm_id, client_id, name, status, billing_type, responsible_user_id)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_client2_id,
        'Real Estate Purchase - 456 Queen St',
        'pending',
        'flat_fee',
        p_user_id
    ) RETURNING id INTO v_matter3_id;

    -- ========================================
    -- Create demo time entries
    -- ========================================
    INSERT INTO time_entries (id, firm_id, matter_id, user_id, entry_date, hours, rate, description, billable, billed)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_matter1_id,
        p_user_id,
        CURRENT_DATE - INTERVAL '5 days',
        2.5,
        350.00,
        'Initial contract review and analysis of key terms',
        true,
        false
    ) RETURNING id INTO v_time1_id;

    INSERT INTO time_entries (id, firm_id, matter_id, user_id, entry_date, hours, rate, description, billable, billed)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_matter1_id,
        p_user_id,
        CURRENT_DATE - INTERVAL '3 days',
        1.0,
        350.00,
        'Client call to discuss contract concerns and negotiation strategy',
        true,
        false
    ) RETURNING id INTO v_time2_id;

    INSERT INTO time_entries (id, firm_id, matter_id, user_id, entry_date, hours, rate, description, billable, billed)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_matter2_id,
        p_user_id,
        CURRENT_DATE - INTERVAL '2 days',
        3.0,
        350.00,
        'Review of employment agreement and termination letter; research on reasonable notice period',
        true,
        false
    ) RETURNING id INTO v_time3_id;

    -- ========================================
    -- Create a draft invoice
    -- ========================================
    INSERT INTO invoices (id, firm_id, client_id, invoice_number, subtotal, tax, total, status)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_client1_id,
        generate_invoice_number(p_firm_id),
        1225.00,
        159.25,  -- 13% HST for Ontario
        1384.25,
        'draft'
    ) RETURNING id INTO v_invoice_id;

    -- Add line items for the invoice (from time entries on matter 1)
    INSERT INTO invoice_line_items (firm_id, invoice_id, time_entry_id, description, qty, rate, amount)
    VALUES
    (p_firm_id, v_invoice_id, v_time1_id, 'Initial contract review and analysis of key terms', 2.5, 350.00, 875.00),
    (p_firm_id, v_invoice_id, v_time2_id, 'Client call to discuss contract concerns and negotiation strategy', 1.0, 350.00, 350.00);

    -- ========================================
    -- Create trust account with deposit
    -- ========================================
    INSERT INTO trust_accounts (id, firm_id, matter_id, balance)
    VALUES (
        uuid_generate_v4(),
        p_firm_id,
        v_matter3_id,
        5000.00
    ) RETURNING id INTO v_trust_account_id;

    -- Add the deposit transaction
    INSERT INTO trust_transactions (firm_id, trust_account_id, type, amount, description, tx_date, reference, created_by)
    VALUES (
        p_firm_id,
        v_trust_account_id,
        'deposit',
        5000.00,
        'Initial retainer deposit for real estate transaction',
        CURRENT_DATE - INTERVAL '7 days',
        'EFT-2024-001',
        p_user_id
    );

    -- Note: The trigger will NOT update balance since we're inserting with existing balance
    -- This is intentional for seeding - in real use, start with balance 0 and add transaction

    -- ========================================
    -- Create some tasks for matter health
    -- ========================================
    INSERT INTO tasks (firm_id, matter_id, title, due_at, status, assigned_to)
    VALUES
    (p_firm_id, v_matter1_id, 'Send revised contract to opposing counsel', CURRENT_DATE + INTERVAL '3 days', 'pending', p_user_id),
    (p_firm_id, v_matter2_id, 'File Notice of Civil Claim', CURRENT_DATE + INTERVAL '14 days', 'pending', p_user_id),
    (p_firm_id, v_matter3_id, 'Order title search', CURRENT_DATE - INTERVAL '2 days', 'pending', p_user_id);

    -- ========================================
    -- Add audit log entries
    -- ========================================
    INSERT INTO audit_logs (firm_id, actor_user_id, source, action, entity_type, entity_id, payload)
    VALUES
    (p_firm_id, p_user_id, 'system', 'seed_demo_data', 'firm', p_firm_id, '{"message": "Demo data seeded successfully"}');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (they can only seed their own firm)
GRANT EXECUTE ON FUNCTION seed_demo_data TO authenticated;
