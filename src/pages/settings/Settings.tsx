// ============================================================================
// Settings Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getProvinceOptions, getTaxDescription } from '@/lib/tax';
import type { User, CanadianProvince } from '@/types';

export function Settings() {
    const { openCommandBar } = useLayout();
    const { firm, user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('firm');

    const tabs = [
        { id: 'firm', label: 'Firm Settings' },
        { id: 'users', label: 'Team Members' },
        { id: 'billing', label: 'Billing & Taxes' },
    ];

    return (
        <>
            <Header
                title="Settings"
                onCommandBarOpen={openCommandBar}
            />

            <div className="page-body">
                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
                                ? 'border-maple-500 text-maple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'firm' && <FirmSettings />}
                {activeTab === 'users' && <TeamSettings />}
                {activeTab === 'billing' && <BillingSettings />}
            </div>
        </>
    );
}

function FirmSettings() {
    const { firm } = useAuth();
    const [formData, setFormData] = useState({ name: firm?.name || '', province: firm?.province || 'ON' });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const provinces = getProvinceOptions();

    const handleSave = async () => {
        if (!firm?.id) return;
        setSaving(true);

        await supabase
            .from('firms')
            .update({
                name: formData.name,
                province: formData.province,
            })
            .eq('id', firm.id);

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-2xl">
            <div className="card">
                <div className="card-header">
                    <h2 className="font-semibold">Firm Information</h2>
                </div>
                <div className="card-body space-y-4">
                    <div className="form-group">
                        <label className="form-label">Firm Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Province</label>
                        <select
                            value={formData.province}
                            onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value as CanadianProvince }))}
                            className="form-select"
                        >
                            {provinces.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <p className="form-hint">
                            Tax rate: {getTaxDescription(formData.province as CanadianProvince)}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {saved && <span className="text-trust-600 text-sm">✓ Saved</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamSettings() {
    const { firm, user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!firm?.id) return;

        supabase
            .from('users')
            .select('*')
            .eq('firm_id', firm.id)
            .order('created_at')
            .then(({ data }) => {
                if (data) setUsers(data);
                setLoading(false);
            });
    }, [firm?.id]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (user?.role !== 'admin') return;

        await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);

        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
    };

    return (
        <div className="max-w-4xl">
            <div className="card">
                <div className="card-header flex items-center justify-between">
                    <h2 className="font-semibold">Team Members ({users.length})</h2>
                    {/* Add user functionality would go here */}
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id}>
                                        <td className="font-medium">
                                            {u.first_name} {u.last_name}
                                            {u.id === user?.id && <span className="text-gray-400 ml-2">(you)</span>}
                                        </td>
                                        <td>{u.email}</td>
                                        <td>
                                            {user?.role === 'admin' && u.id !== user?.id ? (
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    className="form-select py-1 text-sm"
                                                >
                                                    <option value="admin">Admin</option>
                                                    <option value="lawyer">Lawyer</option>
                                                    <option value="staff">Staff</option>
                                                </select>
                                            ) : (
                                                <span className="capitalize">{u.role}</span>
                                            )}
                                        </td>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Role descriptions */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">Role Permissions</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="font-medium text-maple-600">Admin</p>
                        <p className="text-gray-500">Full access. Manage users, settings, and all data.</p>
                    </div>
                    <div>
                        <p className="font-medium text-maple-600">Lawyer</p>
                        <p className="text-gray-500">Manage clients, matters, invoices. Cannot change settings or users.</p>
                    </div>
                    <div>
                        <p className="font-medium text-maple-600">Staff</p>
                        <p className="text-gray-500">View data, log time. Cannot finalize invoices or manage trust.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function BillingSettings() {
    const { firm } = useAuth();
    const [settings, setSettings] = useState({
        default_hourly_rate: firm?.settings?.default_hourly_rate || 350,
        invoice_prefix: firm?.settings?.invoice_prefix || 'INV-',
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!firm?.id) return;
        setSaving(true);

        await supabase
            .from('firms')
            .update({
                settings: {
                    ...firm.settings,
                    default_hourly_rate: settings.default_hourly_rate,
                    invoice_prefix: settings.invoice_prefix,
                },
            })
            .eq('id', firm.id);

        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div className="card">
                <div className="card-header">
                    <h2 className="font-semibold">Billing Defaults</h2>
                </div>
                <div className="card-body space-y-4">
                    <div className="form-group">
                        <label className="form-label">Default Hourly Rate (CAD)</label>
                        <input
                            type="number"
                            value={settings.default_hourly_rate}
                            onChange={(e) => setSettings(prev => ({ ...prev, default_hourly_rate: Number(e.target.value) }))}
                            className="form-input max-w-xs"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Invoice Number Prefix</label>
                        <input
                            type="text"
                            value={settings.invoice_prefix}
                            onChange={(e) => setSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                            className="form-input max-w-xs"
                            placeholder="INV-"
                        />
                        <p className="form-hint">Example: {settings.invoice_prefix}00001</p>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        {saved && <span className="text-trust-600 text-sm">✓ Saved</span>}
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h2 className="font-semibold">Tax Configuration</h2>
                </div>
                <div className="card-body">
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🇨🇦</span>
                            <div>
                                <p className="font-medium">
                                    {firm?.province ? getProvinceOptions().find(p => p.value === firm.province)?.label : 'Ontario'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {getTaxDescription((firm?.province || 'ON') as CanadianProvince)}
                                </p>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                        Tax rates are automatically applied based on your firm's province.
                        Change your province in Firm Settings to update tax rates.
                    </p>
                </div>
            </div>
        </div>
    );
}
