'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Matter {
    id: string;
    matterNumber: string;
    name: string;
    matterType: string;
    status: string;
    openDate: string;
    description?: string;
}

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
    archived: 'bg-gray-100 text-gray-500',
};

export default function PortalMattersPage() {
    const [matters, setMatters] = useState<Matter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadMatters();
    }, []);

    const loadMatters = async () => {
        try {
            const token = localStorage.getItem('portalToken');
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/portal/matters`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to load matters');

            const data = await response.json();
            setMatters(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load matters');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-gray-600">Loading your matters...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">My Matters</h1>
                <p className="text-gray-600">View your legal matters and case information</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {matters.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <div className="text-4xl mb-4">📁</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No matters found</h3>
                    <p className="text-gray-600">Your legal matters will appear here.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {matters.map((matter) => (
                        <Link
                            key={matter.id}
                            href={`/portal/matters/${matter.id}`}
                            className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-maple-300 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {matter.name}
                                        </h2>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[matter.status] || 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {matter.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-500 mb-2">
                                        {matter.matterNumber} • {matter.matterType}
                                    </div>
                                    {matter.description && (
                                        <p className="text-sm text-gray-600 line-clamp-2">
                                            {matter.description}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-500">Opened</div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatDate(matter.openDate)}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
