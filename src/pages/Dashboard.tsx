// ============================================================================
// Dashboard Page
// ============================================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { DashboardMetrics, RiskOpportunity } from '@/types';

export function Dashboard() {
    const { openCommandBar } = useLayout();
    const { firm, user } = useAuth();
    const [metrics, setMetrics] = useState<DashboardMetrics>({
        active_matters_count: 0,
        unbilled_time_hours: 0,
        unbilled_time_amount: 0,
        outstanding_ar: 0,
        total_trust_balance: 0,
    });
    const [risks, setRisks] = useState<RiskOpportunity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firm?.id) return;

        async function fetchDashboardData() {
            setLoading(true);

            try {
                // Fetch active matters count
                const { count: mattersCount } = await supabase
                    .from('matters')
                    .select('*', { count: 'exact', head: true })
                    .eq('firm_id', firm!.id)
                    .eq('status', 'active');

                // Fetch unbilled time
                const { data: unbilledTime } = await supabase
                    .from('time_entries')
                    .select('hours, amount')
                    .eq('firm_id', firm!.id)
                    .eq('billable', true)
                    .eq('billed', false);

                const unbilledHours = unbilledTime?.reduce((sum, t) => sum + Number(t.hours), 0) || 0;
                const unbilledAmount = unbilledTime?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

                // Fetch outstanding invoices
                const { data: outstandingInvoices } = await supabase
                    .from('invoices')
                    .select('total')
                    .eq('firm_id', firm!.id)
                    .in('status', ['sent', 'partial']);

                const outstandingAR = outstandingInvoices?.reduce((sum, i) => sum + Number(i.total), 0) || 0;

                // Fetch trust balances
                const { data: trustAccounts } = await supabase
                    .from('trust_accounts')
                    .select('balance')
                    .eq('firm_id', firm!.id);

                const totalTrust = trustAccounts?.reduce((sum, t) => sum + Number(t.balance), 0) || 0;

                setMetrics({
                    active_matters_count: mattersCount || 0,
                    unbilled_time_hours: unbilledHours,
                    unbilled_time_amount: unbilledAmount,
                    outstanding_ar: outstandingAR,
                    total_trust_balance: totalTrust,
                });

                // Generate risk items (heuristics)
                const riskItems: RiskOpportunity[] = [];

                // Check for old unbilled time
                const { data: oldUnbilled } = await supabase
                    .from('time_entries')
                    .select('id, entry_date, amount, matters(name)')
                    .eq('firm_id', firm!.id)
                    .eq('billed', false)
                    .eq('billable', true)
                    .lt('entry_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

                if (oldUnbilled && oldUnbilled.length > 0) {
                    riskItems.push({
                        type: 'unbilled_aging',
                        severity: 'high',
                        title: 'Unbilled Time Over 30 Days',
                        description: `${oldUnbilled.length} time entries are more than 30 days old and not yet billed.`,
                        entity_type: 'time_entry',
                        entity_id: oldUnbilled[0].id,
                    });
                }

                // Check for inactive matters
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const { data: inactiveMatters } = await supabase
                    .from('matters')
                    .select('id, name')
                    .eq('firm_id', firm!.id)
                    .eq('status', 'active')
                    .lt('created_at', thirtyDaysAgo);

                // Simple heuristic: matters without recent time entries
                if (inactiveMatters && inactiveMatters.length > 0) {
                    for (const matter of inactiveMatters.slice(0, 3)) {
                        const { count } = await supabase
                            .from('time_entries')
                            .select('*', { count: 'exact', head: true })
                            .eq('matter_id', matter.id)
                            .gt('entry_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

                        if (count === 0) {
                            riskItems.push({
                                type: 'inactive_matter',
                                severity: 'medium',
                                title: `No Recent Activity: ${matter.name}`,
                                description: 'This active matter has no time entries in the last 14 days.',
                                entity_type: 'matter',
                                entity_id: matter.id,
                            });
                        }
                    }
                }

                setRisks(riskItems.slice(0, 5));
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, [firm?.id]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount);

    return (
        <>
            <Header
                title={`Good ${getGreeting()}, ${user?.first_name || 'there'}!`}
                subtitle={`Here's what's happening at ${firm?.name || 'your firm'}`}
                onCommandBarOpen={openCommandBar}
            />

            <div className="page-body">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                        label="Active Matters"
                        value={metrics.active_matters_count.toString()}
                        icon="📋"
                        color="blue"
                        loading={loading}
                    />
                    <MetricCard
                        label="Unbilled Time"
                        value={formatCurrency(metrics.unbilled_time_amount)}
                        subtext={`${metrics.unbilled_time_hours.toFixed(1)} hours`}
                        icon="⏱️"
                        color="orange"
                        loading={loading}
                    />
                    <MetricCard
                        label="Outstanding A/R"
                        value={formatCurrency(metrics.outstanding_ar)}
                        icon="💰"
                        color="purple"
                        loading={loading}
                    />
                    <MetricCard
                        label="Trust Balances"
                        value={formatCurrency(metrics.total_trust_balance)}
                        icon="🔒"
                        color="green"
                        loading={loading}
                    />
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="lg:col-span-2">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="font-semibold text-gray-900">Quick Actions</h2>
                            </div>
                            <div className="card-body">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <QuickActionCard
                                        title="New Client"
                                        description="Add a new client to your firm"
                                        icon="👤"
                                        href="/clients/new"
                                    />
                                    <QuickActionCard
                                        title="New Matter"
                                        description="Open a new case or matter"
                                        icon="📁"
                                        href="/matters/new"
                                    />
                                    <QuickActionCard
                                        title="Log Time"
                                        description="Record billable time"
                                        icon="⏱️"
                                        href="/matters"
                                    />
                                </div>

                                {/* AI Command hint */}
                                <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">🤖</span>
                                        <div>
                                            <h3 className="font-medium text-purple-900">Try the AI Command Bar</h3>
                                            <p className="text-sm text-purple-700 mt-1">
                                                Press <kbd className="px-1.5 py-0.5 bg-purple-200 rounded text-xs">⌘K</kbd> and try saying
                                                "Create a client for Acme Inc." or "What matters are at risk?"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Risk & Opportunities */}
                    <div className="card">
                        <div className="card-header flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Risks & Opportunities</h2>
                            <span className="ai-suggestion-badge">AI Insights</span>
                        </div>
                        <div className="card-body">
                            {loading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-lg" />
                                    ))}
                                </div>
                            ) : risks.length > 0 ? (
                                <div className="space-y-3">
                                    {risks.map((risk, i) => (
                                        <div key={i} className={`risk-item ${risk.severity}`}>
                                            <div>
                                                <p className="font-medium text-sm">{risk.title}</p>
                                                <p className="text-xs text-gray-600 mt-1">{risk.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-4xl">✨</span>
                                    <p className="mt-2">Looking good! No issues detected.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

// Helper Components
function MetricCard({
    label,
    value,
    subtext,
    icon,
    color,
    loading
}: {
    label: string;
    value: string;
    subtext?: string;
    icon: string;
    color: string;
    loading: boolean;
}) {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-maple-50 text-maple-600',
        purple: 'bg-purple-50 text-purple-600',
        green: 'bg-trust-50 text-trust-600',
    };

    return (
        <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${colorClasses[color as keyof typeof colorClasses]}`}>
                    {icon}
                </span>
            </div>
            {loading ? (
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-16" />
                </div>
            ) : (
                <>
                    <p className="stat-value">{value}</p>
                    <p className="stat-label">{subtext || label}</p>
                </>
            )}
        </div>
    );
}

function QuickActionCard({
    title,
    description,
    icon,
    href
}: {
    title: string;
    description: string;
    icon: string;
    href: string;
}) {
    return (
        <Link
            to={href}
            className="block p-4 border border-gray-200 rounded-lg hover:border-maple-300 hover:bg-maple-50 transition-colors"
        >
            <span className="text-2xl">{icon}</span>
            <h3 className="font-medium mt-2">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
        </Link>
    );
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}
