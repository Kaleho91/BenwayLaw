// ============================================================================
// Invoices Pages
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { calculateTax, getTaxDescription } from '@/lib/tax';
import { checkInvoiceForWarnings } from '@/lib/ai';
import type { Invoice, Client, InvoiceLineItem, Payment, TimeEntry, CanadianProvince } from '@/types';

// ============================================================================
// Invoice List
// ============================================================================
export function InvoiceList() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [invoices, setInvoices] = useState<(Invoice & { client: Client })[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        if (!firm?.id) return;

        async function fetchInvoices() {
            let query = supabase
                .from('invoices')
                .select('*, client:clients(*)')
                .eq('firm_id', firm!.id)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data } = await query;
            if (data) setInvoices(data as any);
            setLoading(false);
        }

        fetchInvoices();
    }, [firm?.id, statusFilter]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

    return (
        <>
            <Header
                title="Invoices"
                subtitle={`${invoices.length} invoices`}
                onCommandBarOpen={openCommandBar}
                actions={
                    <Link to="/invoices/new" className="btn btn-primary">
                        New Invoice
                    </Link>
                }
            />

            <div className="page-body">
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    {['all', 'draft', 'sent', 'partial', 'paid'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                ? 'bg-maple-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="card">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : invoices.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No invoices found. Generate one from a matter's time entries.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Client</th>
                                        <th>Subtotal</th>
                                        <th>Tax</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                        <th>Issued</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td>
                                                <Link to={`/invoices/${invoice.id}`} className="font-mono text-maple-600 hover:text-maple-700">
                                                    {invoice.invoice_number}
                                                </Link>
                                            </td>
                                            <td>
                                                <Link to={`/clients/${invoice.client_id}`} className="text-gray-600 hover:text-gray-900">
                                                    {invoice.client?.name}
                                                </Link>
                                            </td>
                                            <td>{formatCurrency(invoice.subtotal)}</td>
                                            <td>{formatCurrency(invoice.tax)}</td>
                                            <td className="font-medium">{formatCurrency(invoice.total)}</td>
                                            <td>
                                                <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
                                            </td>
                                            <td>{invoice.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : '-'}</td>
                                            <td>
                                                <Link to={`/invoices/${invoice.id}`} className="text-gray-400 hover:text-gray-600">
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
            </div>
        </>
    );
}

// ============================================================================
// Invoice Detail
// ============================================================================
export function InvoiceDetail() {
    const { openCommandBar } = useLayout();
    const { id } = useParams<{ id: string }>();
    const { firm } = useAuth();
    const [invoice, setInvoice] = useState<Invoice & { client: Client } | null>(null);
    const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [warnings, setWarnings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);

    const fetchInvoice = async () => {
        if (!id || !firm?.id) return;

        const { data } = await supabase
            .from('invoices')
            .select('*, client:clients(*)')
            .eq('id', id)
            .eq('firm_id', firm.id)
            .single();

        if (data) {
            setInvoice(data as any);

            // Fetch line items
            const { data: items } = await supabase
                .from('invoice_line_items')
                .select('*')
                .eq('invoice_id', id);
            if (items) {
                setLineItems(items);

                // Check for AI warnings
                const aiWarnings = checkInvoiceForWarnings(
                    items.map(i => ({ description: i.description, hours: i.qty, amount: i.amount }))
                );
                setWarnings(aiWarnings);
            }

            // Fetch payments
            const { data: pays } = await supabase
                .from('payments')
                .select('*')
                .eq('invoice_id', id)
                .order('paid_at', { ascending: false });
            if (pays) setPayments(pays);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchInvoice();
    }, [id, firm?.id]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balanceDue = invoice ? Number(invoice.total) - totalPaid : 0;

    const handleRecordPayment = async (payment: { amount: number; paid_at: string; method: string; reference: string }) => {
        if (!invoice || !firm?.id) return;

        await supabase.from('payments').insert({
            firm_id: firm.id,
            invoice_id: invoice.id,
            ...payment,
        });

        // Update invoice status
        const newStatus = payment.amount >= balanceDue ? 'paid' : 'partial';
        await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);

        setShowPaymentForm(false);
        fetchInvoice();
    };

    const handleSendInvoice = async () => {
        if (!invoice) return;
        await supabase.from('invoices').update({
            status: 'sent',
            issued_at: new Date().toISOString().split('T')[0],
            due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }).eq('id', invoice.id);
        fetchInvoice();
    };

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!invoice) {
        return <div className="p-8 text-center">Invoice not found.</div>;
    }

    return (
        <>
            <Header
                title={`Invoice ${invoice.invoice_number}`}
                subtitle={invoice.client?.name}
                onCommandBarOpen={openCommandBar}
                actions={
                    <div className="flex gap-2">
                        {invoice.status === 'draft' && (
                            <button onClick={handleSendInvoice} className="btn btn-primary">
                                Mark as Sent
                            </button>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'partial') && (
                            <button onClick={() => setShowPaymentForm(true)} className="btn btn-primary">
                                Record Payment
                            </button>
                        )}
                    </div>
                }
            />

            <div className="page-body">
                {/* AI Warnings */}
                {warnings.length > 0 && (
                    <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="ai-suggestion-badge">AI Review</span>
                            <span className="text-amber-700 font-medium">Potential Issues Detected</span>
                        </div>
                        <ul className="text-sm text-amber-700 space-y-1">
                            {warnings.map((w, i) => (
                                <li key={i}>• {w.message}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invoice Summary */}
                    <div className="lg:col-span-2 card">
                        <div className="card-header flex items-center justify-between">
                            <h2 className="font-semibold">Line Items</h2>
                            <span className={`badge badge-${invoice.status}`}>{invoice.status}</span>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Description</th>
                                        <th className="text-right">Qty/Hours</th>
                                        <th className="text-right">Rate</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.description}</td>
                                            <td className="text-right">{item.qty}</td>
                                            <td className="text-right">{formatCurrency(item.rate)}</td>
                                            <td className="text-right font-medium">{formatCurrency(item.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="text-right font-medium">Subtotal</td>
                                        <td className="text-right">{formatCurrency(invoice.subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={3} className="text-right font-medium">
                                            Tax ({getTaxDescription(firm!.province as CanadianProvince)})
                                        </td>
                                        <td className="text-right">{formatCurrency(invoice.tax)}</td>
                                    </tr>
                                    <tr className="bg-gray-50">
                                        <td colSpan={3} className="text-right font-bold text-lg">Total</td>
                                        <td className="text-right font-bold text-lg">{formatCurrency(invoice.total)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="space-y-6">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="font-semibold">Payment Summary</h2>
                            </div>
                            <div className="card-body space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total</span>
                                    <span className="font-medium">{formatCurrency(invoice.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Paid</span>
                                    <span className="font-medium text-trust-600">{formatCurrency(totalPaid)}</span>
                                </div>
                                <hr />
                                <div className="flex justify-between">
                                    <span className="font-semibold">Balance Due</span>
                                    <span className={`font-bold text-lg ${balanceDue > 0 ? 'text-danger-600' : 'text-trust-600'}`}>
                                        {formatCurrency(balanceDue)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Payments */}
                        <div className="card">
                            <div className="card-header">
                                <h2 className="font-semibold">Payments ({payments.length})</h2>
                            </div>
                            {payments.length === 0 ? (
                                <div className="card-body text-center text-gray-500">
                                    No payments recorded.
                                </div>
                            ) : (
                                <div className="card-body space-y-3">
                                    {payments.map((p) => (
                                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <div>
                                                <p className="font-medium">{formatCurrency(p.amount)}</p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(p.paid_at).toLocaleDateString()} • {p.method}
                                                </p>
                                            </div>
                                            {p.reference && (
                                                <span className="text-xs font-mono text-gray-400">{p.reference}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment Form Modal */}
                {showPaymentForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-semibold mb-4">Record Payment</h3>
                            <PaymentForm
                                balanceDue={balanceDue}
                                onSubmit={handleRecordPayment}
                                onCancel={() => setShowPaymentForm(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function PaymentForm({
    balanceDue,
    onSubmit,
    onCancel
}: {
    balanceDue: number;
    onSubmit: (p: any) => void;
    onCancel: () => void;
}) {
    const [form, setForm] = useState({
        amount: balanceDue.toFixed(2),
        paid_at: new Date().toISOString().split('T')[0],
        method: 'check',
        reference: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            amount: parseFloat(form.amount),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="form-input"
                    required
                />
            </div>
            <div className="form-group">
                <label className="form-label">Date</label>
                <input
                    type="date"
                    value={form.paid_at}
                    onChange={(e) => setForm(prev => ({ ...prev, paid_at: e.target.value }))}
                    className="form-input"
                    required
                />
            </div>
            <div className="form-group">
                <label className="form-label">Method</label>
                <select
                    value={form.method}
                    onChange={(e) => setForm(prev => ({ ...prev, method: e.target.value }))}
                    className="form-select"
                >
                    <option value="check">Check</option>
                    <option value="eft">EFT / Wire</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div className="form-group">
                <label className="form-label">Reference #</label>
                <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                    className="form-input"
                    placeholder="Check #, confirmation #, etc."
                />
            </div>
            <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">Record Payment</button>
                <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
            </div>
        </form>
    );
}

// ============================================================================
// Invoice Generator (Create invoice from unbilled time)
// ============================================================================
export function InvoiceGenerator() {
    const { openCommandBar } = useLayout();
    const { firm, user } = useAuth();
    const [clients, setClients] = useState<(Client & { unbilled_amount: number })[]>([]);
    const [selectedClient, setSelectedClient] = useState<string>('');
    const [unbilledEntries, setUnbilledEntries] = useState<TimeEntry[]>([]);
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!firm?.id) return;

        async function fetchClients() {
            const { data: clientsData } = await supabase
                .from('clients')
                .select('*')
                .eq('firm_id', firm!.id);

            if (clientsData) {
                // For each client, get unbilled amount
                const clientsWithUnbilled = await Promise.all(
                    clientsData.map(async (client) => {
                        const { data: entries } = await supabase
                            .from('time_entries')
                            .select('amount, matters!inner(client_id)')
                            .eq('firm_id', firm!.id)
                            .eq('billed', false)
                            .eq('billable', true)
                            .eq('matters.client_id', client.id);

                        const unbilled = entries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
                        return { ...client, unbilled_amount: unbilled };
                    })
                );

                setClients(clientsWithUnbilled.filter(c => c.unbilled_amount > 0));
            }
            setLoading(false);
        }

        fetchClients();
    }, [firm?.id]);

    useEffect(() => {
        if (!selectedClient || !firm?.id) {
            setUnbilledEntries([]);
            return;
        }

        async function fetchEntries() {
            const { data } = await supabase
                .from('time_entries')
                .select('*, matters!inner(client_id, name, matter_number)')
                .eq('firm_id', firm!.id)
                .eq('billed', false)
                .eq('billable', true)
                .eq('matters.client_id', selectedClient)
                .order('entry_date', { ascending: false });

            if (data) {
                setUnbilledEntries(data as any);
                setSelectedEntries(new Set(data.map(e => e.id)));
            }
        }

        fetchEntries();
    }, [selectedClient, firm?.id]);

    const handleToggleEntry = (id: string) => {
        setSelectedEntries(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedEntries.size === unbilledEntries.length) {
            setSelectedEntries(new Set());
        } else {
            setSelectedEntries(new Set(unbilledEntries.map(e => e.id)));
        }
    };

    const selectedTotal = unbilledEntries
        .filter(e => selectedEntries.has(e.id))
        .reduce((sum, e) => sum + Number(e.amount), 0);

    const handleGenerateInvoice = async () => {
        if (selectedEntries.size === 0 || !firm?.id) return;

        setGenerating(true);

        try {
            // Calculate tax
            const taxBreakdown = calculateTax(selectedTotal, firm.province as CanadianProvince);

            // Generate invoice number
            const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', { p_firm_id: firm.id });

            // Create invoice
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    firm_id: firm.id,
                    client_id: selectedClient,
                    invoice_number: invoiceNumber || `INV-${Date.now()}`,
                    subtotal: taxBreakdown.subtotal,
                    tax: taxBreakdown.total_tax,
                    total: taxBreakdown.total,
                    status: 'draft',
                })
                .select()
                .single();

            if (invoiceError || !invoice) throw invoiceError;

            // Create line items
            const lineItems = unbilledEntries
                .filter(e => selectedEntries.has(e.id))
                .map(e => ({
                    firm_id: firm.id,
                    invoice_id: invoice.id,
                    time_entry_id: e.id,
                    description: e.description,
                    qty: e.hours,
                    rate: e.rate,
                    amount: e.amount,
                }));

            await supabase.from('invoice_line_items').insert(lineItems);

            // Mark time entries as billed
            await supabase
                .from('time_entries')
                .update({ billed: true })
                .in('id', Array.from(selectedEntries));

            // Navigate to invoice
            window.location.href = `/invoices/${invoice.id}`;
        } catch (error) {
            console.error('Error generating invoice:', error);
            alert('Failed to generate invoice. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

    return (
        <>
            <Header
                title="Generate Invoice"
                subtitle="Create an invoice from unbilled time entries"
                onCommandBarOpen={openCommandBar}
            />

            <div className="page-body">
                <div className="max-w-4xl">
                    {/* Client Selection */}
                    <div className="card mb-6">
                        <div className="card-body">
                            <div className="form-group mb-0">
                                <label className="form-label">Select Client</label>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="">Choose a client with unbilled time...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({formatCurrency(c.unbilled_amount)} unbilled)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Time Entries */}
                    {selectedClient && (
                        <div className="card">
                            <div className="card-header flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold">Unbilled Time Entries</h2>
                                    <p className="text-sm text-gray-500">
                                        {selectedEntries.size} selected • {formatCurrency(selectedTotal)}
                                    </p>
                                </div>
                                <button onClick={handleSelectAll} className="btn btn-sm btn-secondary">
                                    {selectedEntries.size === unbilledEntries.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            {unbilledEntries.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No unbilled time entries.</div>
                            ) : (
                                <>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th className="w-10"></th>
                                                    <th>Date</th>
                                                    <th>Matter</th>
                                                    <th>Description</th>
                                                    <th className="text-right">Hours</th>
                                                    <th className="text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {unbilledEntries.map((entry: any) => (
                                                    <tr key={entry.id} className={selectedEntries.has(entry.id) ? 'bg-maple-50' : ''}>
                                                        <td>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedEntries.has(entry.id)}
                                                                onChange={() => handleToggleEntry(entry.id)}
                                                                className="w-4 h-4 rounded border-gray-300 text-maple-500"
                                                            />
                                                        </td>
                                                        <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                                                        <td className="font-mono text-sm">{entry.matters?.matter_number}</td>
                                                        <td className="max-w-xs truncate">{entry.description}</td>
                                                        <td className="text-right">{entry.hours}</td>
                                                        <td className="text-right font-medium">{formatCurrency(entry.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Generate Button */}
                                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">Subtotal: {formatCurrency(selectedTotal)}</p>
                                            <p className="text-sm text-gray-500">
                                                + {getTaxDescription(firm!.province as CanadianProvince)} tax
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleGenerateInvoice}
                                            disabled={selectedEntries.size === 0 || generating}
                                            className="btn btn-primary btn-lg"
                                        >
                                            {generating ? 'Generating...' : 'Generate Invoice'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
