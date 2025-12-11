'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    taxGst: number;
    taxPst: number;
    taxHst: number;
    total: number;
    amountPaid: number;
    balanceDue: number;
    notes?: string;
    lineItems: {
        id: string;
        description: string;
        quantity: number;
        rate: number;
        amount: number;
    }[];
}

export default function PortalInvoiceDetailPage() {
    const params = useParams();
    const invoiceId = params.id as string;
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (invoiceId) {
            loadInvoice();
        }
    }, [invoiceId]);

    const loadInvoice = async () => {
        try {
            const token = localStorage.getItem('portalToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/portal/invoices/${invoiceId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load invoice');

            const data = await response.json();
            setInvoice(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invoice');
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
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading invoice...</div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                {error || 'Invoice not found'}
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            {/* Back Link */}
            <Link
                href="/portal/invoices"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
            >
                ← Back to Invoices
            </Link>

            {/* Invoice */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">🍁</span>
                                <span className="text-xl font-bold text-gray-900">Invoice</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Invoice Date</p>
                            <p className="font-medium text-gray-900">{formatDate(invoice.invoiceDate)}</p>
                            <p className="text-sm text-gray-500 mt-2">Due Date</p>
                            <p className="font-medium text-gray-900">{formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Description
                                </th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Qty/Hours
                                </th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Rate
                                </th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                                    Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoice.lineItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{item.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                                        {formatCurrency(item.rate)}
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
                        {invoice.taxHst > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">HST (13%)</span>
                                <span className="text-gray-900">{formatCurrency(invoice.taxHst)}</span>
                            </div>
                        )}
                        {invoice.taxGst > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">GST (5%)</span>
                                <span className="text-gray-900">{formatCurrency(invoice.taxGst)}</span>
                            </div>
                        )}
                        {invoice.taxPst > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">PST</span>
                                <span className="text-gray-900">{formatCurrency(invoice.taxPst)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900">{formatCurrency(invoice.total)}</span>
                        </div>
                        {invoice.amountPaid > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Paid</span>
                                <span className="text-green-600">-{formatCurrency(invoice.amountPaid)}</span>
                            </div>
                        )}
                        {invoice.balanceDue > 0 && (
                            <div className="flex justify-between text-lg font-bold pt-2">
                                <span className="text-red-600">Balance Due</span>
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

            {/* Payment Options (placeholder) */}
            {invoice.balanceDue > 0 && (
                <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-2">Payment Options</h3>
                    <p className="text-sm text-blue-700">
                        Contact your law firm for payment instructions. Online payments coming soon.
                    </p>
                </div>
            )}
        </div>
    );
}
