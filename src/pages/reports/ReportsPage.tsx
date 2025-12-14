// ============================================================================
// Reports Dashboard
// ============================================================================

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export function ReportsPage() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');
    const [stats, setStats] = useState({
        revenue: 0,
        collected: 0,
        outstanding: 0,
        unbilled: 0,
        trustBalance: 0,
        activeMatters: 0,
        totalClients: 0,
        hoursLogged: 0,
        avgHourlyRate: 0,
        collectionRate: 0,
    });
    const [topClients, setTopClients] = useState<{ name: string; revenue: number }[]>([]);
    const [topMatters, setTopMatters] = useState<{ name: string; revenue: number }[]>([]);
    const [monthlyData, setMonthlyData] = useState<{ month: string; billed: number; collected: number }[]>([]);

    useEffect(() => {
        if (!firm?.id) return;
        fetchStats();
    }, [firm?.id, dateRange]);

    const fetchStats = async () => {
        setLoading(true);

        // Get date range
        const now = new Date();
        let startDate: Date;
        if (dateRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'quarter') {
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        } else {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const [invoicesRes, paymentsRes, timeRes, trustRes, mattersRes, clientsRes] = await Promise.all([
            supabase.from('invoices').select('id, total, status, client_id, created_at, clients(name)').eq('firm_id', firm!.id),
            supabase.from('payments').select('invoice_id, amount, paid_at').eq('firm_id', firm!.id),
            supabase.from('time_entries').select('hours, rate, amount, billed, billable').eq('firm_id', firm!.id),
            supabase.from('trust_accounts').select('balance').eq('firm_id', firm!.id),
            supabase.from('matters').select('id, status').eq('firm_id', firm!.id),
            supabase.from('clients').select('id', { count: 'exact', head: true }).eq('firm_id', firm!.id),
        ]);

        const invoices = invoicesRes.data || [];
        const payments = paymentsRes.data || [];
        const time = timeRes.data || [];
        const trust = trustRes.data || [];
        const matters = mattersRes.data || [];

        // Calculate totals
        const revenue = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
        const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const outstanding = revenue - collected;
        const unbilled = time.filter(t => !t.billed && t.billable).reduce((sum, t) => sum + Number(t.amount), 0);
        const trustBalance = trust.reduce((sum, t) => sum + Number(t.balance), 0);
        const hoursLogged = time.reduce((sum, t) => sum + Number(t.hours), 0);
        const avgRate = time.length > 0 ? time.reduce((sum, t) => sum + Number(t.rate), 0) / time.length : 0;

        setStats({
            revenue,
            collected,
            outstanding,
            unbilled,
            trustBalance,
            activeMatters: matters.filter(m => m.status === 'active').length,
            totalClients: clientsRes.count || 0,
            hoursLogged,
            avgHourlyRate: Math.round(avgRate),
            collectionRate: revenue > 0 ? Math.round((collected / revenue) * 100) : 0,
        });

        // Top clients by revenue
        const clientRevenue: Record<string, { name: string; revenue: number }> = {};
        invoices.forEach(inv => {
            const name = (inv.clients as any)?.name || 'Unknown';
            if (!clientRevenue[name]) clientRevenue[name] = { name, revenue: 0 };
            clientRevenue[name].revenue += Number(inv.total);
        });
        setTopClients(Object.values(clientRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

        // Monthly trend (last 6 months)
        const monthly: Record<string, { billed: number; collected: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            monthly[key] = { billed: 0, collected: 0 };
        }

        invoices.forEach(inv => {
            const d = new Date(inv.created_at);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (monthly[key]) monthly[key].billed += Number(inv.total);
        });

        payments.forEach(p => {
            const d = new Date(p.paid_at);
            const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (monthly[key]) monthly[key].collected += Number(p.amount);
        });

        setMonthlyData(Object.entries(monthly).map(([month, data]) => ({ month, ...data })));
        setLoading(false);
    };

    const StatCard = ({ label, value, prefix = '', suffix = '', highlight = false }: any) => (
        <div className="card p-5">
            <p className="text-sm text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${highlight ? 'text-orange-600' : ''}`}>
                {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
            </p>
        </div>
    );

    return (
        <>
            <Header
                title="Reports"
                subtitle="Financial analytics and insights"
                onCommandBarOpen={openCommandBar}
                actions={
                    <div className="flex gap-2">
                        {(['month', 'quarter', 'year'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-sm rounded-lg ${dateRange === range ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {range === 'month' ? 'This Month' : range === 'quarter' ? 'This Quarter' : 'This Year'}
                            </button>
                        ))}
                    </div>
                }
            />

            <div className="page-body">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading reports...</div>
                ) : (
                    <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-5 gap-4 mb-8">
                            <StatCard label="Total Revenue" value={stats.revenue} prefix="$" />
                            <StatCard label="Collected" value={stats.collected} prefix="$" />
                            <StatCard label="Outstanding A/R" value={stats.outstanding} prefix="$" highlight />
                            <StatCard label="Unbilled WIP" value={stats.unbilled} prefix="$" highlight />
                            <StatCard label="Trust Balances" value={stats.trustBalance} prefix="$" />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <StatCard label="Active Matters" value={stats.activeMatters} />
                            <StatCard label="Total Clients" value={stats.totalClients} />
                            <StatCard label="Hours Logged" value={stats.hoursLogged.toFixed(1)} />
                            <StatCard label="Collection Rate" value={stats.collectionRate} suffix="%" />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Revenue Trend */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="font-semibold">Revenue Trend (6 months)</h3>
                                </div>
                                <div className="card-body">
                                    <div className="space-y-3">
                                        {monthlyData.map(m => (
                                            <div key={m.month}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span>{m.month}</span>
                                                    <span className="font-medium">${m.billed.toLocaleString()}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                                        style={{ width: `${Math.min((m.billed / (Math.max(...monthlyData.map(x => x.billed)) || 1)) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Top Clients */}
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="font-semibold">Top Clients by Revenue</h3>
                                </div>
                                <div className="card-body">
                                    {topClients.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No invoice data yet.</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {topClients.map((client, i) => (
                                                <div key={client.name} className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-sm font-medium">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{client.name}</p>
                                                        <p className="text-sm text-gray-500">${client.revenue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
