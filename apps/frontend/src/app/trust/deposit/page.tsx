'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

interface TrustAccount {
    id: string;
    accountName: string;
    currentBalance: number;
}

interface Client {
    id: string;
    name: string;
}

interface Matter {
    id: string;
    name: string;
    matterNumber: string;
}

export default function TrustDepositPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preselectedAccountId = searchParams.get('accountId');

    const [accounts, setAccounts] = useState<TrustAccount[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [matters, setMatters] = useState<Matter[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        trustAccountId: preselectedAccountId || '',
        clientId: '',
        matterId: '',
        amount: '',
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        referenceNumber: '',
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (formData.clientId) {
            loadMatters(formData.clientId);
        } else {
            setMatters([]);
            setFormData(prev => ({ ...prev, matterId: '' }));
        }
    }, [formData.clientId]);

    const loadInitialData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const [accountsRes, clientsRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/accounts`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/clients?limit=100`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            if (!accountsRes.ok || !clientsRes.ok) throw new Error('Failed to load data');

            const [accountsData, clientsData] = await Promise.all([
                accountsRes.json(),
                clientsRes.json(),
            ]);

            setAccounts(accountsData);
            setClients(clientsData.data);

            if (accountsData.length > 0 && !formData.trustAccountId) {
                setFormData(prev => ({ ...prev, trustAccountId: accountsData[0].id }));
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadMatters = async (clientId: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/matters?clientId=${clientId}&limit=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to load matters');

            const data = await response.json();
            setMatters(data.data);
        } catch (err) {
            console.error('Failed to load matters:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.trustAccountId || !formData.clientId || !formData.amount) return;

        try {
            setSubmitting(true);
            setError('');

            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/transactions/deposit`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        trustAccountId: formData.trustAccountId,
                        clientId: formData.clientId,
                        matterId: formData.matterId || undefined,
                        amount: parseFloat(formData.amount),
                        transactionDate: formData.transactionDate,
                        description: formData.description || 'Trust deposit',
                        referenceNumber: formData.referenceNumber || undefined,
                    }),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to record deposit');
            }

            router.push('/trust');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record deposit');
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    if (loading) {
        return (
            <AuthenticatedLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-gray-600">Loading...</div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="p-8 max-w-2xl">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/trust" className="text-gray-500 hover:text-gray-700">
                        Trust
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">Record Deposit</span>
                </nav>

                <h1 className="text-2xl font-bold text-gray-900 mb-8">Record Trust Deposit</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Account & Client */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Deposit Details</h2>

                        <div>
                            <label htmlFor="trustAccountId" className="block text-sm font-medium text-gray-700 mb-1">
                                Trust Account *
                            </label>
                            <select
                                id="trustAccountId"
                                value={formData.trustAccountId}
                                onChange={(e) => setFormData(prev => ({ ...prev, trustAccountId: e.target.value }))}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            >
                                <option value="">Select account...</option>
                                {accounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.accountName} ({formatCurrency(account.currentBalance)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 mb-1">
                                Client *
                            </label>
                            <select
                                id="clientId"
                                value={formData.clientId}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value, matterId: '' }))}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            >
                                <option value="">Select client...</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                        </div>

                        {matters.length > 0 && (
                            <div>
                                <label htmlFor="matterId" className="block text-sm font-medium text-gray-700 mb-1">
                                    Matter (Optional)
                                </label>
                                <select
                                    id="matterId"
                                    value={formData.matterId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, matterId: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                >
                                    <option value="">General (not matter-specific)</option>
                                    {matters.map(matter => (
                                        <option key={matter.id} value={matter.id}>
                                            {matter.matterNumber} - {matter.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Amount & Date */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Amount</h2>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                                    Deposit Amount *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        id="amount"
                                        step="0.01"
                                        min="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                        required
                                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="transactionDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction Date *
                                </label>
                                <input
                                    type="date"
                                    id="transactionDate"
                                    value={formData.transactionDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                                Reference Number (Cheque #, etc.)
                            </label>
                            <input
                                type="text"
                                id="referenceNumber"
                                value={formData.referenceNumber}
                                onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                placeholder="e.g., CHQ-12345"
                            />
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500 resize-none"
                                placeholder="e.g., Retainer deposit"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Link
                            href="/trust"
                            className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting || !formData.trustAccountId || !formData.clientId || !formData.amount}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Recording...' : 'Record Deposit'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
