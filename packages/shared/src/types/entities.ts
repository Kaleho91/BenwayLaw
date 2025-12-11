import type {
    UserRole,
    ClientType,
    MatterStatus,
    BillingType,
    TaxTreatment,
    TrustTransactionType,
    InvoiceStatus,
    PaymentMethod,
    PaymentSource,
    LineItemType,
    TaskPriority,
    TaskStatus,
    CanadianProvince,
} from './enums.js';

// Base entity with common fields
export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt?: Date;
}

// Tenant-scoped entity
export interface TenantEntity extends BaseEntity {
    firmId: string;
}

// Firm (Tenant)
export interface Firm extends BaseEntity {
    name: string;
    slug: string;
    province: CanadianProvince;
    settings: FirmSettings;
}

export interface FirmSettings {
    defaultHourlyRate?: number;
    invoiceDueDays?: number;
    trustAccountRequired?: boolean;
    billingIncrement?: number; // minutes (6, 10, 15)
}

// User
export interface User extends TenantEntity {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    hourlyRate: number;
    isActive: boolean;
}

export interface UserWithPassword extends User {
    passwordHash: string;
}

// Address (embedded)
export interface Address {
    street?: string;
    city?: string;
    province?: CanadianProvince;
    postalCode?: string;
    country?: string;
}

// Client
export interface Client extends TenantEntity {
    clientType: ClientType;
    name: string;
    email?: string;
    phone?: string;
    address?: Address;
    notes?: string;
    portalEnabled: boolean;
}

// Matter
export interface Matter extends TenantEntity {
    clientId: string;
    responsibleUserId?: string;
    matterNumber: string;
    name: string;
    description?: string;
    matterType?: string;
    status: MatterStatus;
    billingType: BillingType;
    flatFeeAmount?: number;
    openDate: Date;
    closeDate?: Date;
}

// Time Entry
export interface TimeEntry extends TenantEntity {
    matterId: string;
    userId: string;
    entryDate: Date;
    hours: number;
    rate: number;
    description: string;
    billable: boolean;
    billed: boolean;
    invoiceId?: string;
}

// Expense
export interface Expense extends TenantEntity {
    matterId: string;
    expenseDate: Date;
    amount: number;
    description: string;
    billable: boolean;
    billed: boolean;
    taxTreatment: TaxTreatment;
    invoiceId?: string;
}

// Trust Account
export interface TrustAccount extends TenantEntity {
    accountName: string;
    bankName?: string;
    accountNumberLast4?: string;
    currency: string;
    currentBalance: number;
}

// Trust Transaction
export interface TrustTransaction extends TenantEntity {
    trustAccountId: string;
    matterId?: string;
    clientId: string;
    transactionType: TrustTransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    referenceNumber?: string;
    relatedInvoiceId?: string;
    transactionDate: Date;
    createdByUserId?: string;
}

// Invoice
export interface Invoice extends TenantEntity {
    clientId: string;
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate: Date;
    status: InvoiceStatus;
    subtotal: number;
    taxGst: number;
    taxPst: number;
    taxHst: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
}

// Invoice Line Item
export interface InvoiceLineItem extends BaseEntity {
    invoiceId: string;
    lineType: LineItemType;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    timeEntryId?: string;
    expenseId?: string;
    sortOrder: number;
}

// Payment
export interface Payment extends TenantEntity {
    invoiceId: string;
    paymentDate: Date;
    amount: number;
    paymentMethod: PaymentMethod;
    paymentSource: PaymentSource;
    trustTransactionId?: string;
    notes?: string;
}

// Document
export interface Document extends TenantEntity {
    matterId?: string;
    clientId?: string;
    filename: string;
    storageKey: string;
    mimeType?: string;
    sizeBytes?: number;
    version: number;
    uploadedByUserId?: string;
    sharedWithClient: boolean;
}

// Task
export interface Task extends TenantEntity {
    matterId?: string;
    assignedUserId?: string;
    title: string;
    description?: string;
    dueDate?: Date;
    priority: TaskPriority;
    status: TaskStatus;
}

// Audit Log (for PIPEDA compliance)
export interface AuditLog {
    id: string;
    firmId: string;
    userId?: string;
    entityType: string;
    entityId?: string;
    operation: 'create' | 'read' | 'update' | 'delete';
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
