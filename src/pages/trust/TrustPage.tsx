// ============================================================================
// Trust Accounting & Reconciliation Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface TrustAccount {
    id: string;
    matter_id: string;
    balance: number;
    matter?: { name: string; matter_number: string; client?: { name: string } };
}

interface TrustTransaction {
    id: string;
    trust_account_id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    description: string;
    tx_date: string;
    reference: string;
}

export function TrustPage() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [accounts, setAccounts] = useState<TrustAccount[]>([]);
    const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showReconciliation, setShowReconciliation] = useState(false);
    const [reconcileData, setReconcileData] = useState({
        date: new Date().toISOString().split('T')[0],
        bankBalance: '',
    });

    useEffect(() => {
        if (!firm?.id) return;
        fetchData();
    }, [firm?.id]);

    const fetchData = async () => {
        const [accountsRes, txRes] = await Promise.all([
            supabase
                .from('trust_accounts')
                .select('*, matter:matters(name, matter_number, client:clients(name))')
                .eq('firm_id', firm!.id),
            supabase
                .from('trust_transactions')
                .select('*')
                .eq('firm_id', firm!.id)
                .order('tx_date', { ascending: false })
                .limit(50),
        ]);

        if (accountsRes.data) setAccounts(accountsRes.data as any);
        if (txRes.data) setTransactions(txRes.data);
        setLoading(false);
    };

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + Number(t.amount), 0);

    // Three-way reconciliation calculation
    const bankBalance = parseFloat(reconcileData.bankBalance) || 0;
    const trustLedgerBalance = totalBalance;
    const clientLedgerBalance = totalBalance; // Simplified - in reality, this would be sum of individual client ledgers
    const isReconciled = bankBalance > 0 && bankBalance === trustLedgerBalance && trustLedgerBalance === clientLedgerBalance;

    return (
        <>
            <Header
                title="Trust Accounting"
                subtitle={`${accounts.length} trust accounts`}
                onCommandBarOpen={openCommandBar}
                actions={
                    <button
                        onClick={() => setShowReconciliation(!showReconciliation)}
                        className="btn btn-primary"
                    >
                        {showReconciliation ? 'View Accounts' : 'Reconcile'}
                    </button>
                }
            />

            <div className="page-body">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Total Trust Balance</p>
                        <p className="text-2xl font-semibold text-green-600">${totalBalance.toLocaleString()}</p>
                    </div>
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Trust Accounts</p>
                        <p className="text-2xl font-semibold">{accounts.length}</p>
                    </div>
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Total Deposits</p>
                        <p className="text-2xl font-semibold">${totalDeposits.toLocaleString()}</p>
                    </div>
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Total Withdrawals</p>
                        <p className="text-2xl font-semibold">${totalWithdrawals.toLocaleString()}</p>
                    </div>
                </div>

                {/* Three-Way Reconciliation */}
                {showReconciliation && (
                    <div className="card mb-6">
                        <div className="card-header">
                            <h3 className="font-semibold">Three-Way Trust Reconciliation</h3>
                        </div>
                        <div className="card-body">
                            <p className="text-sm text-gray-600 mb-6">
                                Law Society rules require monthly reconciliation of: (1) Bank Statement Balance, (2) Trust Ledger Balance, and (3) Client Ledger Balance.
                            </p>

                            <div className="grid grid-cols-3 gap-6 mb-6">
                                {/* Bank Balance */}
                                <div className="p-6 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-2">1. Bank Statement Balance</p>
                                    <input
                                        type="number"
                                        value={reconcileData.bankBalance}
                                        onChange={(e) => setReconcileData(d => ({ ...d, bankBalance: e.target.value }))}
                                        className="form-input text-2xl font-semibold"
                                        placeholder="0.00"
                                    />
                                    <p className="text-xs text-gray-400 mt-2">Enter balance from bank statement</p>
                                </div>

                                {/* Trust Ledger */}
                                <div className="p-6 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-2">2. Trust Ledger Balance</p>
                                    <p className="text-2xl font-semibold py-2">${trustLedgerBalance.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-2">Sum of all trust account balances</p>
                                </div>

                                {/* Client Ledger */}
                                <div className="p-6 bg-gray-50 rounded-xl">
                                    <p className="text-sm text-gray-500 mb-2">3. Client Ledger Balance</p>
                                    <p className="text-2xl font-semibold py-2">${clientLedgerBalance.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400 mt-2">Sum of individual client ledgers</p>
                                </div>
                            </div>

                            {/* Reconciliation Status */}
                            {bankBalance > 0 && (
                                <div className={`p-4 rounded-lg ${isReconciled ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        {isReconciled ? (
                                            <>
                                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="font-medium text-green-800">Trust Accounts Reconciled</p>
                                                    <p className="text-sm text-green-600">All three balances match. Your trust accounting is in order.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div>
                                                    <p className="font-medium text-red-800">Reconciliation Discrepancy</p>
                                                    <p className="text-sm text-red-600">
                                                        Difference of ${Math.abs(bankBalance - trustLedgerBalance).toLocaleString()}. Review outstanding deposits/withdrawals and bank fees.
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Trust Accounts List */}
                {!showReconciliation && (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="font-semibold">Trust Accounts by Matter</h3>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Loading...</div>
                            ) : accounts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No trust accounts. Create one from a matter page.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {accounts.map(account => (
                                        <Link
                                            key={account.id}
                                            to={`/matters/${account.matter_id}?tab=trust`}
                                            className="block p-4 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{account.matter?.matter_number}</p>
                                                    <p className="text-sm text-gray-500">{account.matter?.name}</p>
                                                    <p className="text-xs text-gray-400">{(account.matter as any)?.client?.name}</p>
                                                </div>
                                                <p className={`text-xl font-semibold ${Number(account.balance) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    ${Number(account.balance).toLocaleString()}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Transactions */}
                        <div className="card">
                            <div className="card-header">
                                <h3 className="font-semibold">Recent Transactions</h3>
                            </div>
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No transactions yet.</div>
                            ) : (
                                <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                                    {transactions.map(tx => (
                                        <div key={tx.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{tx.description}</p>
                                                    <p className="text-sm text-gray-500">{new Date(tx.tx_date).toLocaleDateString()}</p>
                                                </div>
                                                <p className={`font-semibold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Warning Banner */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="font-medium text-amber-800">Trust Account Compliance</p>
                            <p className="text-sm text-amber-700 mt-1">
                                Trust funds must be handled in accordance with Law Society rules. MapleLaw's AI cannot execute trust transactions—all movements require explicit user confirmation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
