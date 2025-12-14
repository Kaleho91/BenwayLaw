// ============================================================================
// BenwayLaw Type Definitions
// ============================================================================

// User roles for RBAC
export type UserRole = 'admin' | 'lawyer' | 'staff';

// Client types
export type ClientType = 'individual' | 'organization';

// Matter statuses
export type MatterStatus = 'active' | 'pending' | 'closed' | 'archived';

// Billing types
export type BillingType = 'hourly' | 'flat_fee' | 'contingency';

// Invoice statuses
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid';

// Trust transaction types
export type TrustTransactionType = 'deposit' | 'withdrawal';

// Canadian provinces for tax purposes
export type CanadianProvince =
    | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

// AI event sources
export type AIEventSource = 'command_bar' | 'suggestion' | 'assistant';

// Audit log sources
export type AuditSource = 'user' | 'ai' | 'system';

// ============================================================================
// Database Entities
// ============================================================================

export interface Firm {
    id: string;
    name: string;
    province: CanadianProvince;
    settings: FirmSettings;
    created_at: string;
}

export interface FirmSettings {
    default_hourly_rate?: number;
    invoice_prefix?: string;
    trust_warning_threshold?: number;
}

export interface User {
    id: string;
    firm_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    created_at: string;
}

export interface Client {
    id: string;
    firm_id: string;
    name: string;
    client_type: ClientType;
    email: string | null;
    phone: string | null;
    address: string | null;
    portal_enabled: boolean;
    created_at: string;
}

export interface Matter {
    id: string;
    firm_id: string;
    client_id: string;
    matter_number: string;
    name: string;
    status: MatterStatus;
    billing_type: BillingType;
    responsible_user_id: string | null;
    created_at: string;
    // Joined fields
    client?: Client;
    responsible_user?: User;
}

export interface TimeEntry {
    id: string;
    firm_id: string;
    matter_id: string;
    user_id: string;
    entry_date: string;
    hours: number;
    rate: number;
    description: string;
    billable: boolean;
    billed: boolean;
    amount: number;
    created_at: string;
    // Joined fields
    matter?: Matter;
    user?: User;
}

export interface Invoice {
    id: string;
    firm_id: string;
    client_id: string;
    invoice_number: string;
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
    issued_at: string | null;
    due_at: string | null;
    created_at: string;
    // Joined fields
    client?: Client;
    line_items?: InvoiceLineItem[];
    payments?: Payment[];
}

export interface InvoiceLineItem {
    id: string;
    firm_id: string;
    invoice_id: string;
    time_entry_id: string | null;
    description: string;
    qty: number;
    rate: number;
    amount: number;
}

export interface Payment {
    id: string;
    firm_id: string;
    invoice_id: string;
    amount: number;
    paid_at: string;
    method: string;
    reference: string | null;
}

export interface TrustAccount {
    id: string;
    firm_id: string;
    matter_id: string;
    balance: number;
    created_at: string;
    // Joined fields
    matter?: Matter;
    transactions?: TrustTransaction[];
}

export interface TrustTransaction {
    id: string;
    firm_id: string;
    trust_account_id: string;
    type: TrustTransactionType;
    amount: number;
    description: string;
    tx_date: string;
    reference: string | null;
    created_by: string;
    created_at: string;
    // Joined fields
    creator?: User;
}

export interface TrustReconciliation {
    id: string;
    firm_id: string;
    reconciliation_date: string;
    bank_statement_balance: number;
    trust_ledger_balance: number;
    client_ledger_balance: number;
    is_matched: boolean;
    notes: string | null;
    created_by: string;
    created_at: string;
}

export interface TaxRule {
    id: string;
    province: CanadianProvince;
    gst_rate: number;
    pst_rate: number;
    hst_rate: number;
    effective_from: string;
    effective_to: string | null;
}

export interface AuditLog {
    id: string;
    firm_id: string;
    actor_user_id: string | null;
    source: AuditSource;
    action: string;
    entity_type: string;
    entity_id: string | null;
    payload: Record<string, unknown>;
    created_at: string;
}

export interface AIEvent {
    id: string;
    firm_id: string;
    user_id: string;
    context: AIEventContext;
    prompt: string;
    result: AIEventResult;
    executed: boolean;
    created_at: string;
}

export interface AIEventContext {
    current_route: string;
    selected_client_id?: string;
    selected_matter_id?: string;
    user_role: UserRole;
}

export interface AIEventResult {
    intent: string;
    proposed_actions: AIAction[];
    explanation: string;
    requires_confirmation: boolean;
}

export interface AIAction {
    type: string;
    entity_type: string;
    data: Record<string, unknown>;
}

export interface Task {
    id: string;
    firm_id: string;
    matter_id: string;
    title: string;
    due_at: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    assigned_to: string | null;
    created_at: string;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardMetrics {
    active_matters_count: number;
    unbilled_time_hours: number;
    unbilled_time_amount: number;
    outstanding_ar: number;
    total_trust_balance: number;
}

export interface RiskOpportunity {
    type: 'unbilled_aging' | 'trust_mismatch' | 'inactive_matter' | 'trust_unusual';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    entity_type: string;
    entity_id: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface ClientFormData {
    name: string;
    client_type: ClientType;
    email: string;
    phone: string;
    address: string;
    portal_enabled: boolean;
}

export interface MatterFormData {
    client_id: string;
    name: string;
    status: MatterStatus;
    billing_type: BillingType;
    responsible_user_id: string;
}

export interface TimeEntryFormData {
    matter_id: string;
    entry_date: string;
    hours: number;
    rate: number;
    description: string;
    billable: boolean;
}

export interface TrustTransactionFormData {
    type: TrustTransactionType;
    amount: number;
    description: string;
    tx_date: string;
    reference: string;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface AuthUser {
    id: string;
    email: string;
    firm_id: string;
    role: UserRole;
    first_name: string;
    last_name: string;
}

export interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    firm_name: string;
    province: CanadianProvince;
}

export interface LoginData {
    email: string;
    password: string;
}
