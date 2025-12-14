// ============================================================================
// Clients Pages
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import type { Client, ClientFormData, ClientType } from '@/types';

// ============================================================================
// Client List
// ============================================================================
export function ClientList() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!firm?.id) return;

        async function fetchClients() {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('firm_id', firm!.id)
                .order('name');

            if (!error && data) {
                setClients(data);
            }
            setLoading(false);
        }

        fetchClients();
    }, [firm?.id]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Header
                title="Clients"
                subtitle={`${clients.length} clients`}
                onCommandBarOpen={openCommandBar}
                actions={
                    <Link to="/clients/new" className="btn btn-primary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Client
                    </Link>
                }
            />

            <div className="page-body">
                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input max-w-md"
                    />
                </div>

                {/* Table */}
                <div className="card">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {search ? 'No clients match your search.' : 'No clients yet. Add your first client!'}
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Portal</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map((client) => (
                                        <tr key={client.id}>
                                            <td>
                                                <Link to={`/clients/${client.id}`} className="font-medium text-maple-600 hover:text-maple-700">
                                                    {client.name}
                                                </Link>
                                            </td>
                                            <td>
                                                <span className="capitalize">{client.client_type}</span>
                                            </td>
                                            <td>{client.email || '-'}</td>
                                            <td>{client.phone || '-'}</td>
                                            <td>
                                                {client.portal_enabled ? (
                                                    <span className="badge badge-active">Enabled</span>
                                                ) : (
                                                    <span className="badge badge-closed">Disabled</span>
                                                )}
                                            </td>
                                            <td>
                                                <Link to={`/clients/${client.id}/edit`} className="text-gray-400 hover:text-gray-600">
                                                    Edit
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
// Client Detail
// ============================================================================
export function ClientDetail() {
    const { openCommandBar } = useLayout();
    const { id } = useParams<{ id: string }>();
    const { firm } = useAuth();
    const [client, setClient] = useState<Client | null>(null);
    const [matters, setMatters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id || !firm?.id) return;

        async function fetchClient() {
            const { data } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .eq('firm_id', firm!.id)
                .single();

            if (data) setClient(data);

            const { data: mattersData } = await supabase
                .from('matters')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false });

            if (mattersData) setMatters(mattersData);

            setLoading(false);
        }

        fetchClient();
    }, [id, firm?.id]);

    if (loading) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    if (!client) {
        return <div className="p-8 text-center">Client not found.</div>;
    }

    return (
        <>
            <Header
                title={client.name}
                subtitle={client.client_type === 'organization' ? 'Organization' : 'Individual'}
                onCommandBarOpen={openCommandBar}
                actions={
                    <Link to={`/clients/${id}/edit`} className="btn btn-secondary">
                        Edit Client
                    </Link>
                }
            />

            <div className="page-body">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Client Info */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="font-semibold">Contact Information</h2>
                        </div>
                        <div className="card-body space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Email</label>
                                <p>{client.email || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Phone</label>
                                <p>{client.phone || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Address</label>
                                <p className="whitespace-pre-line">{client.address || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Portal Access</label>
                                <p>{client.portal_enabled ? 'Enabled' : 'Disabled'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Matters */}
                    <div className="lg:col-span-2 card">
                        <div className="card-header flex items-center justify-between">
                            <h2 className="font-semibold">Matters ({matters.length})</h2>
                            <Link to={`/matters/new?client=${id}`} className="btn btn-sm btn-primary">
                                New Matter
                            </Link>
                        </div>
                        {matters.length === 0 ? (
                            <div className="card-body text-center text-gray-500">
                                No matters yet for this client.
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Matter #</th>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Billing</th>
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
                                                <td>{matter.name}</td>
                                                <td>
                                                    <span className={`badge badge-${matter.status}`}>{matter.status}</span>
                                                </td>
                                                <td className="capitalize">{matter.billing_type.replace('_', ' ')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================================
// Client Form (Create/Edit)
// ============================================================================
export function ClientForm() {
    const { openCommandBar } = useLayout();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { firm } = useAuth();
    const isEditing = Boolean(id);

    const [formData, setFormData] = useState<ClientFormData>({
        name: '',
        client_type: 'individual',
        email: '',
        phone: '',
        address: '',
        portal_enabled: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id && firm?.id) {
            supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .eq('firm_id', firm.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setFormData({
                            name: data.name,
                            client_type: data.client_type,
                            email: data.email || '',
                            phone: data.phone || '',
                            address: data.address || '',
                            portal_enabled: data.portal_enabled,
                        });
                    }
                });
        }
    }, [id, firm?.id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firm?.id) return;

        setLoading(true);
        setError('');

        const payload = {
            ...formData,
            firm_id: firm.id,
        };

        let result;
        if (isEditing) {
            result = await supabase
                .from('clients')
                .update(payload)
                .eq('id', id)
                .eq('firm_id', firm.id);
        } else {
            result = await supabase
                .from('clients')
                .insert(payload)
                .select()
                .single();
        }

        if (result.error) {
            setError(result.error.message);
            setLoading(false);
        } else {
            navigate(isEditing ? `/clients/${id}` : '/clients');
        }
    };

    return (
        <>
            <Header
                title={isEditing ? 'Edit Client' : 'New Client'}
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
                                <label className="form-label">Client Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="form-input"
                                    placeholder="John Smith or ACME Corporation"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Client Type *</label>
                                <select
                                    value={formData.client_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, client_type: e.target.value as ClientType }))}
                                    className="form-select"
                                    required
                                >
                                    <option value="individual">Individual</option>
                                    <option value="organization">Organization</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="form-input"
                                        placeholder="client@example.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="form-input"
                                        placeholder="(416) 555-0100"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    className="form-textarea"
                                    rows={3}
                                    placeholder="123 Bay Street, Suite 100&#10;Toronto, ON M5H 2Y4"
                                />
                            </div>

                            <div className="form-group">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.portal_enabled}
                                        onChange={(e) => setFormData(prev => ({ ...prev, portal_enabled: e.target.checked }))}
                                        className="w-4 h-4 rounded border-gray-300 text-maple-500 focus:ring-maple-500"
                                    />
                                    <span className="text-sm">Enable client portal access</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="submit" disabled={loading} className="btn btn-primary">
                                    {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Client')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="btn btn-secondary"
                                >
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
