// ============================================================================
// Matters Pages
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Matter, MatterFormData, MatterStatus, BillingType, Client, User, TimeEntry, TrustAccount, TrustTransaction } from '@/types';

// ============================================================================
// Matter List
// ============================================================================
export function MatterList() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [matters, setMatters] = useState<(Matter & { client: Client })[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        if (!firm?.id) return;

        async function fetchMatters() {
            let query = supabase
                .from('matters')
                .select('*, client:clients(*)')
                .eq('firm_id', firm!.id)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data } = await query;
            if (data) setMatters(data as any);
            setLoading(false);
        }

        fetchMatters();
    }, [firm?.id, statusFilter]);

    return (
        <>
            <Header
                title="Matters"
                subtitle={`${matters.length} matters`}
                onCommandBarOpen={openCommandBar}
                actions={
                    <Link to="/matters/new" className="btn btn-primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Matter
                    </Link>
                }
            />

            <div className="page-body">
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                    {['all', 'active', 'pending', 'closed', 'archived'].map((status) => (
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
                    ) : matters.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No matters found.
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Matter #</th>
                                        <th>Name</th>
                                        <th>Client</th>
                                        <th>Status</th>
                                        <th>Billing</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matters.map((matter) => (
                                        <tr key={matter.id}>
                                            <td>
                                                <Link to={`/matters/${matter.id}`} className="font-mono text-maple-600 hover:text-maple-700">
                                                    {matter.matter_number}
                                                </Link>
                                            </td>
                                            <td className="font-medium">{matter.name}</td>
                                            <td>
                                                <Link to={`/clients/${matter.client_id}`} className="text-gray-600 hover:text-gray-900">
                                                    {matter.client?.name}
                                                </Link>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${matter.status}`}>{matter.status}</span>
                                            </td>
                                            <td className="capitalize">{matter.billing_type.replace('_', ' ')}</td>
                                            <td>
                                                <Link to={`/matters/${matter.id}`} className="text-gray-400 hover:text-gray-600">
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
// Matter Detail (Tabbed)
// ============================================================================
export function MatterDetail() {
    const { openCommandBar } = useLayout();
    const { id } = useParams<{ id: string }>();
    const { firm, user } = useAuth();
    const [matter, setMatter] = useState<Matter & { client: Client } | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !firm?.id) return;

        async function fetchMatter() {
            const { data } = await supabase
                .from('matters')
                .select('*, client:clients(*)')
                .eq('id', id)
                .eq('firm_id', firm!.id)
                .single();

            if (data) setMatter(data as any);
            setLoading(false);
        }

        fetchMatter();
    }, [id, firm?.id]);

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!matter) {
        return <div className="p-8 text-center">Matter not found.</div>;
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'time', label: 'Time Entries' },
        { id: 'invoices', label: 'Invoices' },
        { id: 'trust', label: 'Trust Account' },
        { id: 'activity', label: 'Activity' },
    ];

    return (
        <>
            <Header
                title={`${matter.matter_number} - ${matter.name}`}
                subtitle={matter.client?.name}
                onCommandBarOpen={openCommandBar}
                actions={
                    <div className="flex gap-2">
                        <Link to={`/matters/${id}/edit`} className="btn btn-secondary">Edit</Link>
                    </div>
                }
            />

            <div className="page-body">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                                ? 'border-maple-500 text-maple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && <MatterOverview matter={matter} />}
                {activeTab === 'time' && <MatterTimeEntries matterId={id!} firmId={firm!.id} userId={user!.id} />}
                {activeTab === 'invoices' && <MatterInvoices matterId={id!} clientId={matter.client_id} firmId={firm!.id} />}
                {activeTab === 'trust' && <MatterTrust matterId={id!} firmId={firm!.id} userId={user!.id} />}
                {activeTab === 'activity' && <MatterActivity matterId={id!} firmId={firm!.id} />}
            </div>
        </>
    );
}

// Tab Components
function MatterOverview({ matter }: { matter: Matter & { client: Client } }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
                <div className="card-header">
                    <h3 className="font-semibold">Matter Details</h3>
                </div>
                <div className="card-body space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Matter Number</label>
                            <p className="font-mono">{matter.matter_number}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Status</label>
                            <p><span className={`badge badge-${matter.status}`}>{matter.status}</span></p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Billing Type</label>
                            <p className="capitalize">{matter.billing_type.replace('_', ' ')}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase">Created</label>
                            <p>{new Date(matter.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="font-semibold">Client</h3>
                </div>
                <div className="card-body">
                    <Link to={`/clients/${matter.client_id}`} className="font-medium text-maple-600 hover:text-maple-700">
                        {matter.client?.name}
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{matter.client?.email}</p>
                </div>
            </div>
        </div>
    );
}

function MatterTimeEntries({ matterId, firmId, userId }: { matterId: string; firmId: string; userId: string }) {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchEntries = async () => {
        const { data } = await supabase
            .from('time_entries')
            .select('*')
            .eq('matter_id', matterId)
            .order('entry_date', { ascending: false });
        if (data) setEntries(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchEntries();
    }, [matterId]);

    const handleAddEntry = async (entry: { hours: number; rate: number; description: string; entry_date: string; billable: boolean }) => {
        await supabase.from('time_entries').insert({
            firm_id: firmId,
            matter_id: matterId,
            user_id: userId,
            ...entry,
            amount: entry.hours * entry.rate,
        });
        setShowForm(false);
        fetchEntries();
    };

    const totalUnbilled = entries.filter(e => !e.billed && e.billable).reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <div className="card">
            <div className="card-header flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Time Entries</h3>
                    <p className="text-sm text-gray-500">
                        Unbilled: {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(totalUnbilled)}
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                    {showForm ? 'Cancel' : 'Log Time'}
                </button>
            </div>

            {showForm && (
                <div className="border-b border-gray-100 p-6 bg-gray-50">
                    <TimeEntryForm onSubmit={handleAddEntry} />
                </div>
            )}

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : entries.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No time entries yet.</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Hours</th>
                                <th>Rate</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                                    <td className="max-w-xs truncate">{entry.description}</td>
                                    <td>{entry.hours}</td>
                                    <td>${entry.rate}</td>
                                    <td className="font-medium">${entry.amount}</td>
                                    <td>
                                        {entry.billed ? (
                                            <span className="badge badge-paid">Billed</span>
                                        ) : entry.billable ? (
                                            <span className="badge badge-pending">Unbilled</span>
                                        ) : (
                                            <span className="badge badge-closed">Non-billable</span>
                                        )}
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

function TimeEntryForm({ onSubmit }: { onSubmit: (entry: any) => void }) {
    const [form, setForm] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        hours: '',
        rate: '350',
        description: '',
        billable: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...form,
            hours: parseFloat(form.hours),
            rate: parseFloat(form.rate),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
                <label className="form-label">Date</label>
                <input
                    type="date"
                    value={form.entry_date}
                    onChange={(e) => setForm(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="form-input"
                    required
                />
            </div>
            <div>
                <label className="form-label">Hours</label>
                <input
                    type="number"
                    step="0.1"
                    value={form.hours}
                    onChange={(e) => setForm(prev => ({ ...prev, hours: e.target.value }))}
                    className="form-input"
                    placeholder="1.5"
                    required
                />
            </div>
            <div>
                <label className="form-label">Rate ($/hr)</label>
                <input
                    type="number"
                    value={form.rate}
                    onChange={(e) => setForm(prev => ({ ...prev, rate: e.target.value }))}
                    className="form-input"
                    required
                />
            </div>
            <div className="md:col-span-2">
                <label className="form-label">Description</label>
                <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input"
                    placeholder="Work performed..."
                    required
                />
            </div>
            <div className="md:col-span-5 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={form.billable}
                        onChange={(e) => setForm(prev => ({ ...prev, billable: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-maple-500"
                    />
                    <span className="text-sm">Billable</span>
                </label>
                <button type="submit" className="btn btn-primary">Save Entry</button>
            </div>
        </form>
    );
}

function MatterInvoices({ matterId, clientId, firmId }: { matterId: string; clientId: string; firmId: string }) {
    const [invoices, setInvoices] = useState<any[]>([]);

    useEffect(() => {
        supabase
            .from('invoices')
            .select('*, invoice_line_items!inner(time_entry_id, time_entries!inner(matter_id))')
            .eq('firm_id', firmId)
            .eq('client_id', clientId)
            .then(({ data }) => {
                // Filter to invoices that have line items for this matter
                const filtered = data?.filter(inv =>
                    inv.invoice_line_items?.some((li: any) => li.time_entries?.matter_id === matterId)
                ) || [];
                setInvoices(filtered);
            });
    }, [matterId, clientId, firmId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="font-semibold">Invoices</h3>
            </div>
            {invoices.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No invoices for this matter yet.</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Issued</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td>
                                        <Link to={`/invoices/${inv.id}`} className="text-maple-600">{inv.invoice_number}</Link>
                                    </td>
                                    <td>${inv.total}</td>
                                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                                    <td>{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function MatterTrust({ matterId, firmId, userId }: { matterId: string; firmId: string; userId: string }) {
    const [trustAccount, setTrustAccount] = useState<TrustAccount | null>(null);
    const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchTrust = async () => {
        const { data: account } = await supabase
            .from('trust_accounts')
            .select('*')
            .eq('matter_id', matterId)
            .single();

        if (account) {
            setTrustAccount(account);

            const { data: txs } = await supabase
                .from('trust_transactions')
                .select('*')
                .eq('trust_account_id', account.id)
                .order('tx_date', { ascending: false });

            if (txs) setTransactions(txs);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTrust();
    }, [matterId]);

    const handleCreateAccount = async () => {
        await supabase.from('trust_accounts').insert({
            firm_id: firmId,
            matter_id: matterId,
            balance: 0,
        });
        fetchTrust();
    };

    const handleAddTransaction = async (tx: { type: 'deposit' | 'withdrawal'; amount: number; description: string; tx_date: string; reference: string }) => {
        setError('');
        const { error } = await supabase.from('trust_transactions').insert({
            firm_id: firmId,
            trust_account_id: trustAccount!.id,
            created_by: userId,
            ...tx,
        });

        if (error) {
            setError(error.message);
        } else {
            setShowForm(false);
            fetchTrust();
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading...</div>;
    }

    if (!trustAccount) {
        return (
            <div className="card">
                <div className="card-body text-center py-12">
                    <p className="text-gray-500 mb-4">No trust account exists for this matter.</p>
                    <button onClick={handleCreateAccount} className="btn btn-primary">
                        Create Trust Account
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Trust Account</h3>
                    <p className="text-2xl font-bold trust-balance mt-1">
                        {new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(trustAccount.balance)}
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
                    {showForm ? 'Cancel' : 'New Transaction'}
                </button>
            </div>

            {error && (
                <div className="px-6 py-3 bg-danger-50 border-b border-danger-100 text-danger-600 text-sm">
                    {error}
                </div>
            )}

            {showForm && (
                <div className="border-b border-gray-100 p-6 bg-gray-50">
                    <TrustTransactionForm onSubmit={handleAddTransaction} balance={trustAccount.balance} />
                </div>
            )}

            {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No transactions yet.</div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Reference</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => (
                                <tr key={tx.id}>
                                    <td>{new Date(tx.tx_date).toLocaleDateString()}</td>
                                    <td>
                                        <span className={tx.type === 'deposit' ? 'text-trust-600' : 'text-danger-600'}>
                                            {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                        </span>
                                    </td>
                                    <td>{tx.description}</td>
                                    <td className="font-mono text-sm">{tx.reference || '-'}</td>
                                    <td className={`text-right font-medium ${tx.type === 'deposit' ? 'text-trust-600' : 'text-danger-600'}`}>
                                        {tx.type === 'deposit' ? '+' : '-'}${tx.amount}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Trust Warning */}
            <div className="p-4 bg-amber-50 border-t border-amber-100">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Trust transactions require explicit user confirmation. AI cannot execute trust movements.
                </p>
            </div>
        </div>
    );
}

function TrustTransactionForm({ onSubmit, balance }: { onSubmit: (tx: any) => void; balance: number }) {
    const [form, setForm] = useState({
        type: 'deposit' as 'deposit' | 'withdrawal',
        amount: '',
        description: '',
        tx_date: new Date().toISOString().split('T')[0],
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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Type</label>
                    <select
                        value={form.type}
                        onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="form-select"
                    >
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                    </select>
                </div>
                <div>
                    <label className="form-label">Amount</label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="form-input"
                        required
                    />
                    {form.type === 'withdrawal' && parseFloat(form.amount) > balance && (
                        <p className="form-error">Cannot exceed balance of ${balance}</p>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="form-label">Date</label>
                    <input
                        type="date"
                        value={form.tx_date}
                        onChange={(e) => setForm(prev => ({ ...prev, tx_date: e.target.value }))}
                        className="form-input"
                        required
                    />
                </div>
                <div>
                    <label className="form-label">Reference</label>
                    <input
                        type="text"
                        value={form.reference}
                        onChange={(e) => setForm(prev => ({ ...prev, reference: e.target.value }))}
                        className="form-input"
                        placeholder="Check #, EFT ref, etc."
                    />
                </div>
            </div>
            <div>
                <label className="form-label">Description</label>
                <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="form-input"
                    placeholder="Retainer deposit, disbursement, etc."
                    required
                />
            </div>
            <button type="submit" className="btn btn-primary">
                Confirm {form.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
            </button>
        </form>
    );
}

function MatterActivity({ matterId, firmId }: { matterId: string; firmId: string }) {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        supabase
            .from('audit_logs')
            .select('*')
            .eq('firm_id', firmId)
            .eq('entity_id', matterId)
            .order('created_at', { ascending: false })
            .limit(20)
            .then(({ data }) => {
                if (data) setLogs(data);
            });
    }, [matterId, firmId]);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="font-semibold">Activity Log</h3>
            </div>
            {logs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No activity recorded yet.</div>
            ) : (
                <div className="card-body">
                    <div className="space-y-4">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3">
                                <div className={`w-2 h-2 rounded-full mt-2 ${log.source === 'ai' ? 'bg-purple-500' : 'bg-gray-400'}`} />
                                <div>
                                    <p className="text-sm">
                                        <span className="font-medium">{log.action}</span>
                                        {log.source === 'ai' && <span className="ai-suggestion-badge ml-2">AI</span>}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(log.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Matter Form (Create/Edit)
// ============================================================================
export function MatterForm() {
    const { openCommandBar } = useLayout();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { firm, user } = useAuth();
    const isEditing = Boolean(id);

    const [clients, setClients] = useState<Pick<Client, 'id' | 'name'>[]>([]);
    const [users, setUsers] = useState<Pick<User, 'id' | 'first_name' | 'last_name'>[]>([]);
    const [formData, setFormData] = useState<MatterFormData>({
        client_id: searchParams.get('client') || '',
        name: '',
        status: 'active',
        billing_type: 'hourly',
        responsible_user_id: user?.id || '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!firm?.id) return;

        // Fetch clients
        supabase.from('clients').select('id, name').eq('firm_id', firm.id).then(({ data }) => {
            if (data) setClients(data);
        });

        // Fetch users
        supabase.from('users').select('id, first_name, last_name').eq('firm_id', firm.id).then(({ data }) => {
            if (data) setUsers(data);
        });

        // If editing, fetch matter
        if (id) {
            supabase.from('matters').select('*').eq('id', id).eq('firm_id', firm.id).single().then(({ data }) => {
                if (data) {
                    setFormData({
                        client_id: data.client_id,
                        name: data.name,
                        status: data.status,
                        billing_type: data.billing_type,
                        responsible_user_id: data.responsible_user_id || '',
                    });
                }
            });
        }
    }, [id, firm?.id, user?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firm?.id) return;

        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            firm_id: firm.id,
            responsible_user_id: formData.responsible_user_id || null,
        };

        let result;
        if (isEditing) {
            result = await supabase.from('matters').update(payload).eq('id', id).eq('firm_id', firm.id);
        } else {
            result = await supabase.from('matters').insert(payload).select().single();
        }

        if (result.error) {
            setError(result.error.message);
            setLoading(false);
        } else {
            navigate(isEditing ? `/matters/${id}` : '/matters');
        }
    };

    return (
        <>
            <Header
                title={isEditing ? 'Edit Matter' : 'New Matter'}
                onCommandBarOpen={openCommandBar}
            />

            <div className="page-body">
                <div className="max-w-2xl">
                    <div className="card">
                        <form onSubmit={handleSubmit} className="card-body">
                            {error && (
                                <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Client *</label>
                                <select
                                    value={formData.client_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                                    className="form-select"
                                    required
                                >
                                    <option value="">Select a client...</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Matter Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="form-input"
                                    placeholder="e.g., Contract Review - Software License"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as MatterStatus }))}
                                        className="form-select"
                                    >
                                        <option value="active">Active</option>
                                        <option value="pending">Pending</option>
                                        <option value="closed">Closed</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Billing Type</label>
                                    <select
                                        value={formData.billing_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, billing_type: e.target.value as BillingType }))}
                                        className="form-select"
                                    >
                                        <option value="hourly">Hourly</option>
                                        <option value="flat_fee">Flat Fee</option>
                                        <option value="contingency">Contingency</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Responsible Lawyer</label>
                                <select
                                    value={formData.responsible_user_id}
                                    onChange={(e) => setFormData(prev => ({ ...prev, responsible_user_id: e.target.value }))}
                                    className="form-select"
                                >
                                    <option value="">Select...</option>
                                    {users.map((u) => (
                                        <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={loading} className="btn btn-primary">
                                    {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Matter')}
                                </button>
                                <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
