/**
 * MapleLaw API Client
 * Centralized API communication with auth token handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
    message: string;
    statusCode: number;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        requiresAuth: boolean = true
    ): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            const token = this.getToken();
            if (!token) {
                throw new Error('Not authenticated');
            }
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}/api${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (response.status === 401) {
            // Token expired, redirect to login
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            }
            throw new Error('Session expired');
        }

        if (!response.ok) {
            const error: ApiError = await response.json().catch(() => ({
                message: 'An error occurred',
                statusCode: response.status,
            }));
            throw new Error(error.message);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    // Auth
    async login(email: string, password: string) {
        return this.request<{
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
        }>('POST', '/auth/login', { email, password }, false);
    }

    async register(data: {
        firmName: string;
        adminEmail: string;
        adminPassword: string;
        adminFirstName: string;
        adminLastName: string;
        province?: string;
    }) {
        return this.request<{
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
        }>('POST', '/auth/register', data, false);
    }

    // Clients
    async getClients(params?: { page?: number; limit?: number; search?: string }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.search) query.set('search', params.search);
        const queryString = query.toString();
        return this.request<{
            data: Client[];
            total: number;
            page: number;
            limit: number;
        }>('GET', `/clients${queryString ? `?${queryString}` : ''}`);
    }

    async getClient(id: string) {
        return this.request<Client>('GET', `/clients/${id}`);
    }

    async createClient(data: CreateClientData) {
        return this.request<Client>('POST', '/clients', data);
    }

    async updateClient(id: string, data: Partial<CreateClientData>) {
        return this.request<Client>('PUT', `/clients/${id}`, data);
    }

    async deleteClient(id: string) {
        return this.request<void>('DELETE', `/clients/${id}`);
    }

    // Matters
    async getMatters(params?: {
        page?: number;
        limit?: number;
        clientId?: string;
        status?: string;
        search?: string;
    }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.clientId) query.set('clientId', params.clientId);
        if (params?.status) query.set('status', params.status);
        if (params?.search) query.set('search', params.search);
        const queryString = query.toString();
        return this.request<{
            data: Matter[];
            total: number;
            page: number;
            limit: number;
        }>('GET', `/matters${queryString ? `?${queryString}` : ''}`);
    }

    async getMatter(id: string) {
        return this.request<Matter>('GET', `/matters/${id}`);
    }

    async getNextMatterNumber() {
        return this.request<{ matterNumber: string }>('GET', '/matters/next-number');
    }

    async createMatter(data: CreateMatterData) {
        return this.request<Matter>('POST', '/matters', data);
    }

    async updateMatter(id: string, data: Partial<CreateMatterData>) {
        return this.request<Matter>('PUT', `/matters/${id}`, data);
    }

    async archiveMatter(id: string) {
        return this.request<Matter>('PATCH', `/matters/${id}/archive`);
    }

    // Time Entries
    async getTimeEntries(params?: {
        page?: number;
        limit?: number;
        matterId?: string;
        startDate?: string;
        endDate?: string;
        billed?: boolean;
    }) {
        const query = new URLSearchParams();
        if (params?.page) query.set('page', params.page.toString());
        if (params?.limit) query.set('limit', params.limit.toString());
        if (params?.matterId) query.set('matterId', params.matterId);
        if (params?.startDate) query.set('startDate', params.startDate);
        if (params?.endDate) query.set('endDate', params.endDate);
        if (params?.billed !== undefined) query.set('billed', params.billed.toString());
        const queryString = query.toString();
        return this.request<{
            data: TimeEntry[];
            total: number;
            page: number;
            limit: number;
            totalHours?: number;
            totalAmount?: number;
        }>('GET', `/time-entries${queryString ? `?${queryString}` : ''}`);
    }

    async createTimeEntry(data: CreateTimeEntryData) {
        return this.request<TimeEntry>('POST', '/time-entries', data);
    }

    async updateTimeEntry(id: string, data: Partial<CreateTimeEntryData>) {
        return this.request<TimeEntry>('PUT', `/time-entries/${id}`, data);
    }

    async deleteTimeEntry(id: string) {
        return this.request<void>('DELETE', `/time-entries/${id}`);
    }

    // Dashboard stats
    async getDashboardStats() {
        // This would be a dedicated endpoint in a real app
        // For now, we'll aggregate from existing endpoints
        const [matters, timeEntries] = await Promise.all([
            this.getMatters({ status: 'active', limit: 100 }),
            this.getTimeEntries({ billed: false, limit: 100 }),
        ]);

        return {
            activeMatters: matters.total,
            unbilledHours: timeEntries.totalHours || 0,
            unbilledAmount: timeEntries.totalAmount || 0,
        };
    }
}

// Types
export interface Client {
    id: string;
    firmId: string;
    name: string;
    clientType: 'individual' | 'organization';
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        province?: string;
        postalCode?: string;
    };
    notes?: string;
    portalEnabled: boolean;
    createdAt: string;
    updatedAt: string;
    matterCount?: number;
}

export interface CreateClientData {
    name: string;
    clientType: 'individual' | 'organization';
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

export interface Matter {
    id: string;
    firmId: string;
    clientId: string;
    responsibleUserId?: string;
    matterNumber: string;
    name: string;
    description?: string;
    matterType?: string;
    status: 'active' | 'pending' | 'closed' | 'archived';
    billingType: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';
    flatFeeAmount?: number;
    openDate: string;
    closeDate?: string;
    createdAt: string;
    updatedAt: string;
    clientName?: string;
    responsibleUserName?: string;
    unbilledHours?: number;
    unbilledAmount?: number;
    trustBalance?: number;
}

export interface CreateMatterData {
    clientId: string;
    matterNumber: string;
    name: string;
    description?: string;
    matterType?: string;
    status?: 'active' | 'pending' | 'closed' | 'archived';
    billingType?: 'hourly' | 'flat_fee' | 'contingency' | 'mixed';
    flatFeeAmount?: number;
    responsibleUserId?: string;
    openDate?: string;
}

export interface TimeEntry {
    id: string;
    firmId: string;
    matterId: string;
    userId: string;
    entryDate: string;
    hours: number;
    rate: number;
    description: string;
    billable: boolean;
    billed: boolean;
    invoiceId?: string;
    amount: number;
    createdAt: string;
    updatedAt: string;
    matterName?: string;
    matterNumber?: string;
    userName?: string;
    clientName?: string;
}

export interface CreateTimeEntryData {
    matterId: string;
    entryDate: string;
    hours: number;
    description: string;
    rate?: number;
    billable?: boolean;
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
