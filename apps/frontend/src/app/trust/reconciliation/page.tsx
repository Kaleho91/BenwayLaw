'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

interface TrustAccount {
    id: string;
    accountName: string;
    currentBalance: number;
}

interface ReconciliationResult {
    trustAccountId: string;
    accountName: string;
    bankBalance: number;
    ledgerBalance: number;
    clientTotalBalance: number;
    isBalanced: boolean;
    difference: number;
    clientBalances: {
        clientId: string;
        clientName: string;
        balance: number;
    }[];
}

export default function TrustReconciliationPage() {
    const [accounts, setAccounts] = useState<TrustAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    const [bankBalance, setBankBalance] = useState<string>('');
    const [reconciliation, setReconciliation] = useState<ReconciliationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/accounts`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to load accounts');

            const data = await response.json();
            setAccounts(data);
            if (data.length > 0) {
                setSelectedAccount(data[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount || !bankBalance) return;

        try {
            setCalculating(true);
            setError('');

            const token = localStorage.getItem('accessToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/trust/reconciliation/${selectedAccount}?bankBalance=${bankBalance}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) throw new Error('Failed to perform reconciliation');

            const data = await response.json();
            setReconciliation(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to perform reconciliation');
        } finally {
            setCalculating(false);
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
            <div className="p-8 max-w-4xl">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/trust" className="text-gray-500 hover:text-gray-700">
                        Trust
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">Three-Way Reconciliation</span>
                </nav>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Three-Way Reconciliation</h1>
                    <p className="text-gray-600">
                        LSO-required verification that bank balance, ledger balance, and client totals match
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Reconciliation Form */}
                <form onSubmit={handleReconcile} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Bank Statement Balance</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
                                Trust Account
                            </label>
                            <select
                                id="account"
                                value={selectedAccount}
                                onChange={(e) => {
                                    setSelectedAccount(e.target.value);
                                    setReconciliation(null);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            >
                                {accounts.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.accountName}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="bankBalance" className="block text-sm font-medium text-gray-700 mb-1">
                                Bank Statement Balance
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    id="bankBalance"
                                    step="0.01"
                                    value={bankBalance}
                                    onChange={(e) => setBankBalance(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="Enter balance from bank statement"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <button
                            type="submit"
                            disabled={calculating || !selectedAccount || !bankBalance}
                            className="px-6 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {calculating ? 'Calculating...' : 'Perform Reconciliation'}
                        </button>
                    </div>
                </form>

                {/* Reconciliation Results */}
                {reconciliation && (
                    <div className="space-y-6">
                        {/* Status Banner */}
                        <div className={`p-6 rounded-xl border-2 ${reconciliation.isBalanced
                                ? 'bg-green-50 border-green-300'
                                : 'bg-red-50 border-red-300'
                            }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${reconciliation.isBalanced
                                        ? 'bg-green-100'
                                        : 'bg-red-100'
                                    }`}>
                                    {reconciliation.isBalanced ? '✓' : '⚠'}
                                </div>
                                <div>
                                    <h3 className={`text-xl font-bold ${reconciliation.isBalanced ? 'text-green-900' : 'text-red-900'
                                        }`}>
                                        {reconciliation.isBalanced ? 'Balanced!' : 'Out of Balance'}
                                    </h3>
                                    <p className={`${reconciliation.isBalanced ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                        {reconciliation.isBalanced
                                            ? 'All three balances match. Trust account is properly reconciled.'
                                            : `Discrepancy of ${formatCurrency(reconciliation.difference)} detected. Review required.`
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Three-Way Comparison */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Comparison</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-4 rounded-lg border-2 ${reconciliation.isBalanced ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                    }`}>
                                    <div className="text-sm text-gray-500 mb-1">1. Bank Balance</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(reconciliation.bankBalance)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">From bank statement</div>
                                </div>
                                <div className={`p-4 rounded-lg border-2 ${reconciliation.isBalanced ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                    }`}>
                                    <div className="text-sm text-gray-500 mb-1">2. Ledger Balance</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(reconciliation.ledgerBalance)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Sum of all transactions</div>
                                </div>
                                <div className={`p-4 rounded-lg border-2 ${reconciliation.isBalanced ? 'border-green-200 bg-green-50' : 'border-gray-200'
                                    }`}>
                                    <div className="text-sm text-gray-500 mb-1">3. Client Total</div>
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(reconciliation.clientTotalBalance)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">Sum of client sub-ledgers</div>
                                </div>
                            </div>
                        </div>

                        {/* Client Balances Breakdown */}
                        {reconciliation.clientBalances.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-200 p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Trust Balances</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Client</th>
                                                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {reconciliation.clientBalances.map((client) => (
                                                <tr key={client.clientId}>
                                                    <td className="py-3 text-sm text-gray-900">{client.clientName}</td>
                                                    <td className="py-3 text-sm text-right font-medium text-gray-900">
                                                        {formatCurrency(client.balance)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-gray-300">
                                                <td className="py-3 text-sm font-bold text-gray-900">Total</td>
                                                <td className="py-3 text-sm text-right font-bold text-gray-900">
                                                    {formatCurrency(reconciliation.clientTotalBalance)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Print/Export */}
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Print Report
                            </button>
                        </div>
                    </div>
                )}

                {/* If no reconciliation yet */}
                {!reconciliation && !calculating && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">📋</span>
                            <div>
                                <h3 className="font-semibold text-blue-900">How Three-Way Reconciliation Works</h3>
                                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                                    <li>Enter the balance from your trust account bank statement</li>
                                    <li>System calculates the ledger balance from all recorded transactions</li>
                                    <li>System totals all individual client trust sub-ledgers</li>
                                    <li>All three amounts must match for the account to be balanced</li>
                                </ol>
                                <p className="text-sm text-blue-700 mt-3">
                                    This verification is required by the Law Society of Ontario on a monthly basis.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
