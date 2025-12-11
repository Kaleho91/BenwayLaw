'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api, Matter } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
};

export default function MattersPage() {
    const [matters, setMatters] = useState<Matter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 20;

    useEffect(() => {
        loadMatters();
    }, [page, statusFilter]);

    const loadMatters = async () => {
        try {
            setLoading(true);
            const response = await api.getMatters({
                page,
                limit,
                status: statusFilter || undefined,
                search: search || undefined,
            });
            setMatters(response.data);
            setTotal(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load matters');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        loadMatters();
    };

    const totalPages = Math.ceil(total / limit);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    return (
        <AuthenticatedLayout>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Matters</h1>
                        <p className="text-gray-600">Manage your legal matters and cases</p>
                    </div>
                    <Link
                        href="/matters/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                    >
                        <span>+</span>
                        <span>New Matter</span>
                    </Link>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by matter number, name, or client..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Search
                        </button>
                    </form>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="closed">Closed</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600">Loading matters...</div>
                    </div>
                ) : matters.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <div className="text-4xl mb-4">📁</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No matters yet</h3>
                        <p className="text-gray-600 mb-6">Create your first matter to get started</p>
                        <Link
                            href="/matters/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                        >
                            <span>+</span>
                            <span>New Matter</span>
                        </Link>
                    </div>
                ) : (
                    /* Matter Table */
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Matter
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Billing
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unbilled
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {matters.map((matter) => (
                                    <tr key={matter.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/matters/${matter.id}`}
                                                className="block"
                                            >
                                                <p className="text-sm font-medium text-gray-900 hover:text-maple-600">
                                                    {matter.matterNumber}
                                                </p>
                                                <p className="text-sm text-gray-500">{matter.name}</p>
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {matter.clientName || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[matter.status] || 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {matter.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                                            {matter.billingType.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {matter.unbilledAmount ? (
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(matter.unbilledAmount)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/matters/${matter.id}`}
                                                className="text-sm text-maple-600 hover:text-maple-700 font-medium"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                                <p className="text-sm text-gray-600">
                                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} matters
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
