'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

interface TrustAccount {
    id: string;
    accountName: string;
    bankName?: string;
    accountNumberLast4?: string;
    currency: string;
    currentBalance: number;
}

interface TrustTransaction {
    id: string;
    trustAccountId: string;
    clientId: string;
    matterId?: string;
    transactionType: 'deposit' | 'transfer_to_fees' | 'refund' | 'interest' | 'bank_charge';
    amount: number;
    balanceAfter: number;
    description?: string;
    referenceNumber?: string;
    transactionDate: string;
    clientName?: string;
    matterName?: string;
    accountName?: string;
}

const TRANSACTION_COLORS: Record<string, string> = {
    deposit: 'bg-green-100 text-green-800',
    transfer_to_fees: 'bg-blue-100 text-blue-800',
    refund: 'bg-orange-100 text-orange-800',
    interest: 'bg-purple-100 text-purple-800',
    bank_charge: 'bg-red-100 text-red-800',
};

export default function TrustPage() {
    const [accounts, setAccounts] = useState<TrustAccount[]>([]);
    const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [totalBalance, setTotalBalance] = useState(0);

    useEffect(() => {
        loadAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            loadTransactions();
        }
    }, [selectedAccount]);

    const loadAccounts = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/accounts`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load trust accounts');

            const data = await response.json();
            setAccounts(data);
            setTotalBalance(data.reduce((sum: number, a: TrustAccount) => sum + a.currentBalance, 0));
            if (data.length > 0 && !selectedAccount) {
                setSelectedAccount(data[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/transactions?accountId=${selectedAccount}&limit=50`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load transactions');

            const data = await response.json();
            setTransactions(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
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

    const getTransactionLabel = (type: string) => {
        switch (type) {
            case 'deposit': return 'Deposit';
            case 'transfer_to_fees': return 'Transfer to Fees';
            case 'refund': return 'Refund';
            case 'interest': return 'Interest';
            case 'bank_charge': return 'Bank Charge';
            default: return type;
        }
    };

    const isCredit = (type: string) => {
        return type === 'deposit' || type === 'interest';
    };

    return (
        <AuthenticatedLayout>
            <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Trust Accounting</h1>
                        <p className="text-gray-600">Manage client trust funds (LSO compliant)</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/trust/reconciliation"
                            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Three-Way Reconciliation
                        </Link>
                        <Link
                            href="/trust/deposit"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                        >
                            <span>+</span>
                            <span>Record Deposit</span>
                        </Link>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Total Trust Balance</div>
                        <div className="text-2xl font-bold text-gray-900">
                            {formatCurrency(totalBalance)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Trust Accounts</div>
                        <div className="text-2xl font-bold text-gray-900">{accounts.length}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
                        <div className="text-sm text-gray-500 mb-1">Select Account</div>
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                        >
                            <option value="">All Accounts</option>
                            {accounts.map((account) => (
                                <option key={account.id} value={account.id}>
                                    {account.accountName} ({formatCurrency(account.currentBalance)})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-gray-600">Loading trust data...</div>
                    </div>
                ) : accounts.length === 0 ? (
                    /* Empty State - No Accounts */
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                        <div className="text-4xl mb-4">🏦</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No trust accounts yet</h3>
                        <p className="text-gray-600 mb-6">Create a trust account to start managing client funds</p>
                        <Link
                            href="/trust/accounts/new"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors"
                        >
                            <span>+</span>
                            <span>Create Trust Account</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Accounts List */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trust Accounts</h2>
                            <div className="space-y-3">
                                {accounts.map((account) => (
                                    <button
                                        key={account.id}
                                        onClick={() => setSelectedAccount(account.id)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedAccount === account.id
                                            ? 'border-maple-300 bg-maple-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium text-gray-900">{account.accountName}</p>
                                                {account.bankName && (
                                                    <p className="text-xs text-gray-500">{account.bankName}</p>
                                                )}
                                            </div>
                                            <p className="font-semibold text-gray-900">
                                                {formatCurrency(account.currentBalance)}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <Link
                                    href="/trust/accounts/new"
                                    className="text-sm text-maple-600 hover:text-maple-700 font-medium"
                                >
                                    + Add Account
                                </Link>
                            </div>
                        </div>

                        {/* Transaction Ledger */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Transaction Ledger</h2>
                                <div className="flex gap-2">
                                    <Link
                                        href={`/trust/deposit?accountId=${selectedAccount}`}
                                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                                    >
                                        + Deposit
                                    </Link>
                                    <span className="text-gray-300">|</span>
                                    <Link
                                        href={`/trust/transfer?accountId=${selectedAccount}`}
                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Transfer to Fees
                                    </Link>
                                    <span className="text-gray-300">|</span>
                                    <Link
                                        href={`/trust/refund?accountId=${selectedAccount}`}
                                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                                    >
                                        Refund
                                    </Link>
                                </div>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="text-center py-8 text-gray-600">
                                    No transactions yet for this account
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Client</th>
                                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Description</th>
                                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Debit</th>
                                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Credit</th>
                                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {transactions.map((tx) => (
                                                <tr key={tx.id} className="hover:bg-gray-50">
                                                    <td className="py-3 text-sm text-gray-600">
                                                        {formatDate(tx.transactionDate)}
                                                    </td>
                                                    <td className="py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TRANSACTION_COLORS[tx.transactionType] || 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {getTransactionLabel(tx.transactionType)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-900">
                                                        {tx.clientName || '—'}
                                                    </td>
                                                    <td className="py-3 text-sm text-gray-600 max-w-[200px] truncate">
                                                        {tx.description || '—'}
                                                    </td>
                                                    <td className="py-3 text-sm text-right text-red-600">
                                                        {!isCredit(tx.transactionType) && formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="py-3 text-sm text-right text-green-600">
                                                        {isCredit(tx.transactionType) && formatCurrency(tx.amount)}
                                                    </td>
                                                    <td className="py-3 text-sm text-right font-medium text-gray-900">
                                                        {formatCurrency(tx.balanceAfter)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* LSO Compliance Note */}
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚖️</span>
                        <div>
                            <h3 className="font-semibold text-blue-900">LSO Trust Accounting Compliance</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                This system prevents negative trust balances and provides three-way reconciliation
                                as required by the Law Society of Ontario. All transactions are auditable.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
