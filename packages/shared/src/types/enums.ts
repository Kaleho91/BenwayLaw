// User roles within a firm
export type UserRole = 'admin' | 'lawyer' | 'staff';

// Client types
export type ClientType = 'individual' | 'organization';

// Matter statuses
export type MatterStatus = 'active' | 'pending' | 'closed' | 'archived';

// Billing arrangements
export type BillingType = 'hourly' | 'flat_fee' | 'contingency' | 'mixed';

// Tax treatment for expenses
export type TaxTreatment = 'taxable' | 'exempt' | 'zero_rated';

// Trust transaction types
export type TrustTransactionType =
    | 'deposit'
    | 'transfer_to_fees'
    | 'refund'
    | 'interest'
    | 'bank_charge';

// Invoice statuses
export type InvoiceStatus =
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'partial'
    | 'paid'
    | 'overdue'
    | 'written_off';

// Payment methods
export type PaymentMethod = 'bank_transfer' | 'credit_card' | 'cheque' | 'cash' | 'trust_transfer';

// Payment source
export type PaymentSource = 'external' | 'trust';

// Invoice line item types
export type LineItemType = 'time' | 'expense' | 'flat_fee' | 'custom';

// Task priority
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// Task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Audit operations
export type AuditOperation = 'create' | 'read' | 'update' | 'delete';

// Canadian provinces (for tax calculation and law society rules)
export type CanadianProvince =
    | 'ON' // Ontario
    | 'BC' // British Columbia
    | 'AB' // Alberta
    | 'QC' // Quebec
    | 'MB' // Manitoba
    | 'SK' // Saskatchewan
    | 'NS' // Nova Scotia
    | 'NB' // New Brunswick
    | 'NL' // Newfoundland and Labrador
    | 'PE' // Prince Edward Island
    | 'NT' // Northwest Territories
    | 'YT' // Yukon
    | 'NU'; // Nunavut
