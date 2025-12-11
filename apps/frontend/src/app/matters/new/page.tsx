'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api, CreateMatterData, Client } from '@/lib/api';

const BILLING_TYPES = [
    { value: 'hourly', label: 'Hourly Billing' },
    { value: 'flat_fee', label: 'Flat Fee' },
    { value: 'contingency', label: 'Contingency' },
    { value: 'mixed', label: 'Mixed' },
];

const MATTER_TYPES = [
    'Employment Dispute',
    'Wrongful Dismissal',
    'Discrimination',
    'Workplace Harassment',
    'Employment Contract',
    'Non-Compete Agreement',
    'Severance Negotiation',
    'Human Rights',
    'Other',
];

export default function NewMatterPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedClientId = searchParams.get('clientId');

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [matterNumber, setMatterNumber] = useState('');
    const [formData, setFormData] = useState<CreateMatterData>({
        clientId: preselectedClientId || '',
        matterNumber: '',
        name: '',
        description: '',
        matterType: '',
        status: 'active',
        billingType: 'hourly',
        openDate: new Date().toISOString().split('T')[0],
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [clientsResponse, nextNumberResponse] = await Promise.all([
                api.getClients({ limit: 100 }),
                api.getNextMatterNumber(),
            ]);
            setClients(clientsResponse.data);
            setMatterNumber(nextNumberResponse.matterNumber);
            setFormData(prev => ({
                ...prev,
                matterNumber: nextNumberResponse.matterNumber,
            }));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoadingClients(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const matter = await api.createMatter(formData);
            router.push(`/matters/${matter.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create matter');
            setLoading(false);
        }
    };

    const updateField = <K extends keyof CreateMatterData>(
        field: K,
        value: CreateMatterData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <AuthenticatedLayout>
            <div className="p-8 max-w-2xl">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/matters" className="text-gray-500 hover:text-gray-700">
                        Matters
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">New Matter</span>
                </nav>

                <h1 className="text-2xl font-bold text-gray-900 mb-8">New Matter</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Client Selection */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Client</h2>

                        {loadingClients ? (
                            <div className="text-gray-600">Loading clients...</div>
                        ) : (
                            <div>
                                <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Client *
                                </label>
                                <select
                                    id="clientId"
                                    value={formData.clientId}
                                    onChange={(e) => updateField('clientId', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                >
                                    <option value="">Choose a client...</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-2 text-sm text-gray-500">
                                    Don&apos;t see the client?{' '}
                                    <Link href="/clients/new" className="text-maple-600 hover:text-maple-700">
                                        Create a new client
                                    </Link>
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Matter Details */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Matter Details</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="matterNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                    Matter Number *
                                </label>
                                <input
                                    type="text"
                                    id="matterNumber"
                                    value={formData.matterNumber}
                                    onChange={(e) => updateField('matterNumber', e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder={matterNumber}
                                />
                            </div>
                            <div>
                                <label htmlFor="matterType" className="block text-sm font-medium text-gray-700 mb-1">
                                    Matter Type
                                </label>
                                <select
                                    id="matterType"
                                    value={formData.matterType}
                                    onChange={(e) => updateField('matterType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                >
                                    <option value="">Select type...</option>
                                    {MATTER_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Matter Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                placeholder="Smith v. Acme Corp - Wrongful Dismissal"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500 resize-none"
                                placeholder="Brief description of the matter..."
                            />
                        </div>

                        <div>
                            <label htmlFor="openDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Open Date
                            </label>
                            <input
                                type="date"
                                id="openDate"
                                value={formData.openDate}
                                onChange={(e) => updateField('openDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            />
                        </div>
                    </div>

                    {/* Billing */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Billing</h2>

                        <div>
                            <label htmlFor="billingType" className="block text-sm font-medium text-gray-700 mb-1">
                                Billing Type
                            </label>
                            <select
                                id="billingType"
                                value={formData.billingType}
                                onChange={(e) => updateField('billingType', e.target.value as CreateMatterData['billingType'])}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            >
                                {BILLING_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {formData.billingType === 'flat_fee' && (
                            <div>
                                <label htmlFor="flatFeeAmount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Flat Fee Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        id="flatFeeAmount"
                                        value={formData.flatFeeAmount || ''}
                                        onChange={(e) => updateField('flatFeeAmount', parseFloat(e.target.value) || undefined)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Link
                            href="/matters"
                            className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || !formData.clientId || !formData.matterNumber || !formData.name}
                            className="px-6 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Matter'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
