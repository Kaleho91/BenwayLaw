'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api, Client, Matter } from '@/lib/api';

export default function ClientDetailPage() {
    const router = useRouter();
    const params = useParams();
    const clientId = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [matters, setMatters] = useState<Matter[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (clientId) {
            loadClientData();
        }
    }, [clientId]);

    const loadClientData = async () => {
        try {
            setLoading(true);
            const [clientData, mattersData] = await Promise.all([
                api.getClient(clientId),
                api.getMatters({ clientId, limit: 50 }),
            ]);
            setClient(clientData);
            setMatters(mattersData.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load client');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
            return;
        }

        try {
            setDeleting(true);
            await api.deleteClient(clientId);
            router.push('/clients');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete client');
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <AuthenticatedLayout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-gray-600">Loading client...</div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (error || !client) {
        return (
            <AuthenticatedLayout>
                <div className="p-8">
                    <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                        {error || 'Client not found'}
                    </div>
                    <Link href="/clients" className="mt-4 inline-block text-maple-600 hover:text-maple-700">
                        ← Back to Clients
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
                    <Link href="/clients" className="text-gray-500 hover:text-gray-700">
                        Clients
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">{client.name}</span>
                </nav>

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.clientType === 'organization'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                {client.clientType === 'organization' ? 'Organization' : 'Individual'}
                            </span>
                        </div>
                        <p className="text-gray-600">
                            {client.email || 'No email'} • {client.phone || 'No phone'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/clients/${client.id}/edit`}
                            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Edit
                        </Link>
                        <button
                            onClick={handleDelete}
                            disabled={deleting || matters.length > 0}
                            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={matters.length > 0 ? 'Cannot delete client with active matters' : 'Delete client'}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Client Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Information</h2>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm text-gray-500">Email</dt>
                                <dd className="text-sm text-gray-900">{client.email || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm text-gray-500">Phone</dt>
                                <dd className="text-sm text-gray-900">{client.phone || '—'}</dd>
                            </div>
                            {client.address && (
                                <div>
                                    <dt className="text-sm text-gray-500">Address</dt>
                                    <dd className="text-sm text-gray-900">
                                        {client.address.street && <div>{client.address.street}</div>}
                                        {(client.address.city || client.address.province) && (
                                            <div>
                                                {client.address.city}{client.address.city && client.address.province && ', '}
                                                {client.address.province} {client.address.postalCode}
                                            </div>
                                        )}
                                    </dd>
                                </div>
                            )}
                            {client.notes && (
                                <div>
                                    <dt className="text-sm text-gray-500">Notes</dt>
                                    <dd className="text-sm text-gray-900 whitespace-pre-wrap">{client.notes}</dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm text-gray-500">Client Portal</dt>
                                <dd className="text-sm text-gray-900">
                                    {client.portalEnabled ? (
                                        <span className="text-green-600">Enabled</span>
                                    ) : (
                                        <span className="text-gray-500">Disabled</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Matters Section */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Matters ({matters.length})</h2>
                            <Link
                                href={`/matters/new?clientId=${client.id}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-maple-600 text-white text-sm rounded-lg font-medium hover:bg-maple-700 transition-colors"
                            >
                                <span>+</span>
                                <span>New Matter</span>
                            </Link>
                        </div>

                        {matters.length === 0 ? (
                            <div className="text-center py-8 text-gray-600">
                                No matters for this client yet
                            </div>
                        ) : (
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
                                                <p className="text-xs text-gray-500">
                                                    {matter.matterType || 'General'} • Opened {new Date(matter.openDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${matter.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    matter.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        matter.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-red-100 text-red-800'
                                                }`}>
                                                {matter.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
