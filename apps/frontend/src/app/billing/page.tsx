'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

interface Invoice {
    id: string;
    clientId: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'written_off';
    subtotal: number;
    taxGst: number;
    taxPst: number;
    taxHst: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    clientName?: string;
}

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-purple-100 text-purple-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    written_off: 'bg-gray-100 text-gray-500',
};

export default function BillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalOutstanding, setTotalOutstanding] = useState(0);
    const limit = 20;

    useEffect(() => {
        loadInvoices();
    }, [page, statusFilter]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const query = new URLSearchParams();
            query.set('page', page.toString());
            query.set('limit', limit.toString());
            if (statusFilter) query.set('status', statusFilter);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices?${query}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load invoices');

            const data = await response.json();
            setInvoices(data.data);
            setTotal(data.total);
            setTotalOutstanding(data.totalOutstanding || 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
        }).format(amount);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA');
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <AuthenticatedLayout>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                        <p className="text-gray-600">Manage invoices and payments</p>
                    </div>
                    <Link
                        href="/billing/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                    >
                        <span>+</span>
                        <span>Create Invoice</span>
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Total Outstanding</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(totalOutstanding)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Invoices</div>
                        <div className="text-2xl font-bold text-gray-900">{total}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Filter</div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="partial">Partial Payment</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
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
                        <div className="text-gray-600">Loading invoices...</div>
                    </div>
                ) : invoices.length === 0 ? (
                    /* Empty State */
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <div className="text-4xl mb-4">📄</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                        <p className="text-gray-600 mb-6">Create your first invoice from unbilled time</p>
                        <Link
                            href="/billing/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                        >
                            <span>+</span>
                            <span>Create Invoice</span>
                        </Link>
                    </div>
                ) : (
                    /* Invoice Table */
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link
                                                href={`/billing/${invoice.id}`}
                                                className="text-sm font-medium text-gray-900 hover:text-maple-600"
                                            >
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {invoice.clientName || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {formatDate(invoice.invoiceDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {invoice.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {invoice.balanceDue > 0 ? (
                                                <span className="text-sm font-medium text-red-600">
                                                    {formatCurrency(invoice.balanceDue)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-green-600">Paid</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/billing/${invoice.id}`}
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
                                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} invoices
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
