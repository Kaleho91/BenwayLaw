'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
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

export default function PortalInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            const token = localStorage.getItem('portalToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/portal/invoices`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load invoices');

            const data = await response.json();
            setInvoices(data);
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
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading your invoices...</div>
            </div>
        );
    }

    // Calculate totals
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                <p className="text-gray-600">View and pay your invoices</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Outstanding Balance Card */}
            {totalOutstanding > 0 && (
                <div className="bg-gradient-to-r from-maple-600 to-maple-700 rounded-xl p-6 mb-6 text-white">
                    <div className="text-sm opacity-80 mb-1">Total Outstanding</div>
                    <div className="text-3xl font-bold">{formatCurrency(totalOutstanding)}</div>
                </div>
            )}

            {invoices.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="text-4xl mb-4">📄</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No invoices yet</h3>
                    <p className="text-gray-600">Your invoices will appear here.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Invoice
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
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div>{formatDate(invoice.invoiceDate)}</div>
                                        <div className="text-xs text-gray-400">
                                            Due: {formatDate(invoice.dueDate)}
                                        </div>
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
                                            href={`/portal/invoices/${invoice.id}`}
                                            className="text-sm text-maple-600 hover:text-maple-700 font-medium"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
