'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api } from '@/lib/api';

interface DashboardStats {
    activeMatters: number;
    unbilledHours: number;
    unbilledAmount: number;
    outstandingAR: number;
    trustBalance: number;
    recentActivity: {
        type: 'matter' | 'client' | 'time';
        title: string;
        subtitle: string;
        date: string;
    }[];
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        activeMatters: 0,
        unbilledHours: 0,
        unbilledAmount: 0,
        outstandingAR: 0,
        trustBalance: 0,
        recentActivity: [],
    });
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ firstName: string; lastName: string; firmName: string } | null>(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Load data from multiple endpoints
            const [mattersResponse, timeResponse] = await Promise.all([
                api.getMatters({ status: 'active', limit: 100 }),
                api.getTimeEntries({ billed: false, limit: 100 }),
            ]);

            setStats({
                activeMatters: mattersResponse.total,
                unbilledHours: timeResponse.totalHours || 0,
                unbilledAmount: timeResponse.totalAmount || 0,
                outstandingAR: 0, // Would come from invoices endpoint
                trustBalance: 0, // Would come from trust endpoint
                recentActivity: [], // Would come from activity/audit log endpoint
            });
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
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

    return (
        <AuthenticatedLayout>
            <div className="p-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Welcome back{user ? `, ${user.firstName}` : ''}!
                    </h1>
                    <p className="text-gray-600">
                        Here&apos;s what&apos;s happening at {user?.firmName || 'your firm'}
                    </p>
                </div>

                {/* Stats Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            label="Active Matters"
                            value={stats.activeMatters.toString()}
                            change={`${stats.activeMatters} open cases`}
                            icon="📁"
                            href="/matters?status=active"
                        />
                        <StatCard
                            label="Unbilled Time"
                            value={formatCurrency(stats.unbilledAmount)}
                            change={`${stats.unbilledHours.toFixed(1)} hours`}
                            icon="⏱️"
                            href="/billing"
                        />
                        <StatCard
                            label="Outstanding AR"
                            value={formatCurrency(stats.outstandingAR)}
                            change="0 invoices"
                            icon="📄"
                            href="/billing"
                        />
                        <StatCard
                            label="Trust Balance"
                            value={formatCurrency(stats.trustBalance)}
                            change="All reconciled"
                            icon="🏦"
                            href="/trust"
                        />
                    </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <QuickAction icon="👤" label="New Client" href="/clients/new" />
                        <QuickAction icon="📁" label="New Matter" href="/matters/new" />
                        <QuickAction icon="⏱️" label="Log Time" href="/matters" description="Select a matter" />
                        <QuickAction icon="📄" label="Create Invoice" href="/billing/new" />
                    </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Matters */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Recent Matters</h2>
                            <Link href="/matters" className="text-sm text-maple-600 hover:text-maple-700 font-medium">
                                View all →
                            </Link>
                        </div>
                        <RecentMattersWidget />
                    </div>

                    {/* Getting Started */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
                        <div className="space-y-4">
                            <GettingStartedItem
                                step={1}
                                title="Add your first client"
                                description="Create a client profile to get started"
                                href="/clients/new"
                            />
                            <GettingStartedItem
                                step={2}
                                title="Open a matter"
                                description="Create a legal matter for your client"
                                href="/matters/new"
                            />
                            <GettingStartedItem
                                step={3}
                                title="Log your time"
                                description="Track billable hours on your matters"
                                href="/matters"
                            />
                            <GettingStartedItem
                                step={4}
                                title="Set up trust account"
                                description="Configure trust accounting for compliance"
                                href="/trust"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({
    label,
    value,
    change,
    icon,
    href,
}: {
    label: string;
    value: string;
    change: string;
    icon: string;
    href: string;
}) {
    return (
        <Link href={href} className="block bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{icon}</span>
                <span className="text-xs text-gray-500">{change}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{label}</p>
        </Link>
    );
}

function QuickAction({
    icon,
    label,
    href,
    description,
}: {
    icon: string;
    label: string;
    href: string;
    description?: string;
}) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-maple-300 hover:bg-maple-50 transition-colors"
        >
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            {description && (
                <span className="text-xs text-gray-500">{description}</span>
            )}
        </Link>
    );
}

function RecentMattersWidget() {
    const [matters, setMatters] = useState<{ id: string; matterNumber: string; name: string; clientName: string; status: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentMatters();
    }, []);

    const loadRecentMatters = async () => {
        try {
            const response = await api.getMatters({ limit: 5 });
            setMatters(response.data.map(m => ({
                id: m.id,
                matterNumber: m.matterNumber,
                name: m.name,
                clientName: m.clientName || 'Unknown',
                status: m.status,
            })));
        } catch (err) {
            console.error('Failed to load recent matters:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (matters.length === 0) {
        return (
            <div className="text-center py-8 text-gray-600">
                <p className="mb-4">No matters yet</p>
                <Link
                    href="/matters/new"
                    className="text-maple-600 hover:text-maple-700 font-medium"
                >
                    Create your first matter →
                </Link>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-200">
            {matters.map((matter) => (
                <Link
                    key={matter.id}
                    href={`/matters/${matter.id}`}
                    className="block py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">
                                {matter.matterNumber} - {matter.name}
                            </p>
                            <p className="text-xs text-gray-500">{matter.clientName}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${matter.status === 'active' ? 'bg-green-100 text-green-800' :
                                matter.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {matter.status}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}

function GettingStartedItem({
    step,
    title,
    description,
    href,
}: {
    step: number;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors -mx-3"
        >
            <div className="w-8 h-8 bg-maple-100 rounded-full flex items-center justify-center text-maple-700 font-medium text-sm flex-shrink-0">
                {step}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
        </Link>
    );
}
