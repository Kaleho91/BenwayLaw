'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

interface Invoice {
    id: string;
    clientId: string;
    matterId?: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    taxGst: number;
    taxPst: number;
    taxHst: number;
    taxQst: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
    clientName?: string;
    matterName?: string;
    lineItems: {
        id: string;
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        timeEntryId?: string;
    }[];
    taxBreakdown?: {
        taxType: string;
        rate: number;
        amount: number;
    }[];
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

export default function InvoiceDetailPage() {
    const params = useParams();
    const invoiceId = params.id as string;

    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sendingInvoice, setSendingInvoice] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [recordingPayment, setRecordingPayment] = useState(false);

    useEffect(() => {
        if (invoiceId) {
            loadInvoice();
        }
    }, [invoiceId]);

    const loadInvoice = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${invoiceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load invoice');

            const data = await response.json();
            setInvoice(data);
            setPaymentAmount(data.balanceDue);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoice');
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvoice = async () => {
        if (!confirm('Send this invoice to the client?')) return;

        try {
            setSendingInvoice(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${invoiceId}/send`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to send invoice');

            await loadInvoice();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invoice');
        } finally {
            setSendingInvoice(false);
        }
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentAmount || paymentAmount <= 0) return;

        try {
            setRecordingPayment(true);
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/invoices/${invoiceId}/payments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        amount: paymentAmount,
                        paymentDate: new Date().toISOString(),
                        paymentMethod: 'other',
                    }),
                }
            );

            if (!response.ok) throw new Error('Failed to record payment');

            setShowPaymentForm(false);
            await loadInvoice();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to record payment');
        } finally {
            setRecordingPayment(false);
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
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <AuthenticatedLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-gray-600">Loading invoice...</div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (error || !invoice) {
        return (
            <AuthenticatedLayout>
                <div className="p-8">
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                        {error || 'Invoice not found'}
                    </div>
                    <Link href="/billing" className="mt-4 inline-block text-maple-600 hover:text-maple-700">
                        ← Back to Billing
                    </Link>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="p-8 max-w-4xl">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/billing" className="text-gray-500 hover:text-gray-700">
                        Billing
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">{invoice.invoiceNumber}</span>
                </nav>

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[invoice.status] || 'bg-gray-100 text-gray-800'
                                }`}>
                                {invoice.status.replace('_', ' ')}
                            </span>
                        </div>
                        <p className="text-gray-600">
                            {invoice.clientName}
                            {invoice.matterName && ` • ${invoice.matterName}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {invoice.status === 'draft' && (
                            <button
                                onClick={handleSendInvoice}
                                disabled={sendingInvoice}
                                className="px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors disabled:opacity-50"
                            >
                                {sendingInvoice ? 'Sending...' : 'Send Invoice'}
                            </button>
                        )}
                        {invoice.balanceDue > 0 && invoice.status !== 'draft' && (
                            <button
                                onClick={() => setShowPaymentForm(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                                Record Payment
                            </button>
                        )}
                    </div>
                </div>

                {/* Payment Form Modal */}
                {showPaymentForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 w-full max-w-md">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
                            <form onSubmit={handleRecordPayment}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Amount
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={invoice.balanceDue}
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                        />
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Balance due: {formatCurrency(invoice.balanceDue)}
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowPaymentForm(false)}
                                        className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={recordingPayment || paymentAmount <= 0}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {recordingPayment ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Invoice Content */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Invoice Header */}
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">🍁</span>
                                    <span className="text-xl font-bold text-gray-900">MapleLaw</span>
                                </div>
                                <p className="text-sm text-gray-600">Your Law Firm Name</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Invoice Date</p>
                                <p className="font-medium text-gray-900">{formatDate(invoice.invoiceDate)}</p>
                                <p className="text-sm text-gray-500 mt-2">Due Date</p>
                                <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="p-6 border-b border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Bill To</p>
                        <p className="font-medium text-gray-900">{invoice.clientName}</p>
                        {invoice.matterName && (
                            <p className="text-sm text-gray-600">Re: {invoice.matterName}</p>
                        )}
                    </div>

                    {/* Line Items */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Description
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Qty/Hours
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rate
                                    </th>
                                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoice.lineItems.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                            {item.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                            {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="p-6 bg-gray-50 border-t border-gray-200">
                        <div className="max-w-xs ml-auto space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            {invoice.taxBreakdown?.map((tax, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-600">{tax.taxType} ({tax.rate}%)</span>
                                    <span className="text-gray-900">{formatCurrency(tax.amount)}</span>
                                </div>
                            ))}
                            {!invoice.taxBreakdown && (
                                <>
                                    {invoice.taxHst > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">HST</span>
                                            <span className="text-gray-900">{formatCurrency(invoice.taxHst)}</span>
                                        </div>
                                    )}
                                    {invoice.taxGst > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">GST</span>
                                            <span className="text-gray-900">{formatCurrency(invoice.taxGst)}</span>
                                        </div>
                                    )}
                                    {invoice.taxPst > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">PST</span>
                                            <span className="text-gray-900">{formatCurrency(invoice.taxPst)}</span>
                                        </div>
                                    )}
                                    {invoice.taxQst > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">QST</span>
                                            <span className="text-gray-900">{formatCurrency(invoice.taxQst)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                                <span className="text-gray-900">Total</span>
                                <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
                            </div>
                            {invoice.amountPaid > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Amount Paid</span>
                                    <span className="text-green-600">-{formatCurrency(invoice.amountPaid)}</span>
                                </div>
                            )}
                            {invoice.balanceDue > 0 && (
                                <div className="flex justify-between text-lg font-bold">
                                    <span className="text-gray-900">Balance Due</span>
                                    <span className="text-red-600">{formatCurrency(invoice.balanceDue)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <div className="p-6 border-t border-gray-200">
                            <p className="text-sm text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
