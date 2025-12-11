// API Response wrappers
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: ApiMeta;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string[]>;
}

export interface ApiMeta {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
}

// Pagination request
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// Auth DTOs
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    expiresIn: number;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        firmId: string;
        firmName: string;
    };
}

export interface RegisterFirmRequest {
    firmName: string;
    province: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName: string;
    adminLastName: string;
}

// Create/Update DTOs
export interface CreateClientRequest {
    clientType: 'individual' | 'organization';
    name: string;
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        province?: string;
        postalCode?: string;
    };
    notes?: string;
}

export interface CreateMatterRequest {
    clientId: string;
    responsibleUserId?: string;
    name: string;
    description?: string;
    matterType?: string;
    billingType: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';
    flatFeeAmount?: number;
}

export interface CreateTimeEntryRequest {
    matterId: string;
    entryDate: string; // ISO date
    hours: number;
    rate?: number; // Uses user's rate if not specified
    description: string;
    billable?: boolean;
}

export interface CreateExpenseRequest {
    matterId: string;
    expenseDate: string;
    amount: number;
    description: string;
    billable?: boolean;
    taxTreatment?: 'taxable' | 'exempt' | 'zero_rated';
}

export interface CreateInvoiceRequest {
    clientId: string;
    matterIds?: string[];
    dueDate?: string;
    notes?: string;
    timeEntryIds?: string[];
    expenseIds?: string[];
}

export interface CreateTrustDepositRequest {
    trustAccountId: string;
    clientId: string;
    matterId?: string;
    amount: number;
    description?: string;
    referenceNumber?: string;
    transactionDate: string;
}

export interface PayInvoiceFromTrustRequest {
    invoiceId: string;
    trustAccountId: string;
    amount: number;
    transactionDate: string;
}

export interface CreatePaymentRequest {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: 'bank_transfer' | 'credit_card' | 'cheque' | 'cash';
    notes?: string;
}
