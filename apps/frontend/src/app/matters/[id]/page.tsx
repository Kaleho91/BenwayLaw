'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api, Matter, TimeEntry, CreateTimeEntryData } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-red-100 text-red-800',
};

export default function MatterDetailPage() {
    const params = useParams();
    const matterId = params.id as string;

    const [matter, setMatter] = useState<Matter | null>(null);
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Quick time entry
    const [showTimeForm, setShowTimeForm] = useState(false);
    const [timeForm, setTimeForm] = useState<Partial<CreateTimeEntryData>>({
        matterId: matterId,
        entryDate: new Date().toISOString().split('T')[0],
        hours: 0,
        description: '',
    });
    const [savingTime, setSavingTime] = useState(false);

    useEffect(() => {
        if (matterId) {
            loadMatterData();
        }
    }, [matterId]);

    const loadMatterData = async () => {
        try {
            setLoading(true);
            const [matterData, timeData] = await Promise.all([
                api.getMatter(matterId),
                api.getTimeEntries({ matterId, limit: 50 }),
            ]);
            setMatter(matterData);
            setTimeEntries(timeData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load matter');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTimeEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timeForm.hours || !timeForm.description) return;

        try {
            setSavingTime(true);
            await api.createTimeEntry({
                matterId,
                entryDate: timeForm.entryDate || new Date().toISOString().split('T')[0],
                hours: timeForm.hours,
                description: timeForm.description,
            });
            // Reload data
            await loadMatterData();
            setShowTimeForm(false);
            setTimeForm({
                matterId,
                entryDate: new Date().toISOString().split('T')[0],
                hours: 0,
                description: '',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add time entry');
        } finally {
            setSavingTime(false);
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
                    <div className="text-gray-600">Loading matter...</div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (error || !matter) {
        return (
            <AuthenticatedLayout>
                <div className="p-8">
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                        {error || 'Matter not found'}
                    </div>
                    <Link href="/matters" className="mt-4 inline-block text-maple-600 hover:text-maple-700">
                        ← Back to Matters
                    </Link>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout>
            <div className="p-8">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/matters" className="text-gray-500 hover:text-gray-700">
                        Matters
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">{matter.matterNumber}</span>
                </nav>

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{matter.matterNumber}</h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[matter.status] || 'bg-gray-100 text-gray-800'
                                }`}>
                                {matter.status}
                            </span>
                        </div>
                        <p className="text-lg text-gray-700">{matter.name}</p>
                        <p className="text-gray-600">
                            <Link href={`/clients/${matter.clientId}`} className="hover:text-maple-600">
                                {matter.clientName}
                            </Link>
                            {matter.matterType && ` • ${matter.matterType}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/matters/${matter.id}/edit`}
                            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Edit
                        </Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Billing Type</div>
                        <div className="text-lg font-semibold text-gray-900 capitalize">
                            {matter.billingType.replace('_', ' ')}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Unbilled Hours</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {matter.unbilledHours?.toFixed(1) || '0'} hrs
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Unbilled Amount</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(matter.unbilledAmount || 0)}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="text-sm text-gray-500 mb-1">Trust Balance</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(matter.trustBalance || 0)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Matter Details */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm text-gray-500">Opened</dt>
                                <dd className="text-sm text-gray-900">
                                    {new Date(matter.openDate).toLocaleDateString()}
                                </dd>
                            </div>
                            {matter.closeDate && (
                                <div>
                                    <dt className="text-sm text-gray-500">Closed</dt>
                                    <dd className="text-sm text-gray-900">
                                        {new Date(matter.closeDate).toLocaleDateString()}
                                    </dd>
                                </div>
                            )}
                            {matter.responsibleUserName && (
                                <div>
                                    <dt className="text-sm text-gray-500">Responsible Lawyer</dt>
                                    <dd className="text-sm text-gray-900">{matter.responsibleUserName}</dd>
                                </div>
                            )}
                            {matter.description && (
                                <div>
                                    <dt className="text-sm text-gray-500">Description</dt>
                                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                                        {matter.description}
                                    </dd>
                                </div>
                            )}
                            {matter.billingType === 'flat_fee' && matter.flatFeeAmount && (
                                <div>
                                    <dt className="text-sm text-gray-500">Flat Fee Amount</dt>
                                    <dd className="text-sm text-gray-900">
                                        {formatCurrency(matter.flatFeeAmount)}
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>

                    {/* Time Entries */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Time Entries ({timeEntries.length})
                            </h2>
                            <button
                                onClick={() => setShowTimeForm(!showTimeForm)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-maple-600 text-white text-sm rounded-lg font-medium hover:bg-maple-700 transition-colors"
                            >
                                <span>+</span>
                                <span>Log Time</span>
                            </button>
                        </div>

                        {/* Quick Time Entry Form */}
                        {showTimeForm && (
                            <form onSubmit={handleAddTimeEntry} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={timeForm.entryDate}
                                            onChange={(e) => setTimeForm(prev => ({ ...prev, entryDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Hours
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="24"
                                            value={timeForm.hours}
                                            onChange={(e) => setTimeForm(prev => ({ ...prev, hours: parseFloat(e.target.value) || 0 }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                            placeholder="0.0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={timeForm.description}
                                        onChange={(e) => setTimeForm(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500 resize-none"
                                        placeholder="Describe the work performed..."
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowTimeForm(false)}
                                        className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingTime || !timeForm.hours || !timeForm.description}
                                        className="px-4 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {savingTime ? 'Saving...' : 'Add Entry'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {timeEntries.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                No time entries yet. Log your first time entry above.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-200">
                                {timeEntries.map((entry) => (
                                    <div key={entry.id} className="py-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-gray-900">
                                                        {new Date(entry.entryDate).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {entry.hours}h @ {formatCurrency(entry.rate)}/hr
                                                    </span>
                                                    {entry.billed && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                                            Billed
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600">{entry.description}</p>
                                                {entry.userName && (
                                                    <p className="text-xs text-gray-500 mt-1">{entry.userName}</p>
                                                )}
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(entry.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
