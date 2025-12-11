'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { api, CreateClientData } from '@/lib/api';

const PROVINCES = [
    { value: 'ON', label: 'Ontario' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'AB', label: 'Alberta' },
    { value: 'QC', label: 'Quebec' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'YT', label: 'Yukon' },
];

export default function NewClientPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<CreateClientData>({
        name: '',
        clientType: 'individual',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            province: 'ON',
            postalCode: '',
        },
        notes: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const client = await api.createClient(formData);
            router.push(`/clients/${client.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create client');
            setLoading(false);
        }
    };

    const updateField = <K extends keyof CreateClientData>(
        field: K,
        value: CreateClientData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateAddress = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));
    };

    return (
        <AuthenticatedLayout>
            <div className="p-8 max-w-2xl">
                {/* Breadcrumb */}
                <nav className="mb-4 text-sm">
                    <Link href="/clients" className="text-gray-500 hover:text-gray-700">
                        Clients
                    </Link>
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-gray-900">New Client</span>
                </nav>

                <h1 className="text-2xl font-bold text-gray-900 mb-8">New Client</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>

                        <div>
                            <label htmlFor="clientType" className="block text-sm font-medium text-gray-700 mb-1">
                                Client Type
                            </label>
                            <select
                                id="clientType"
                                value={formData.clientType}
                                onChange={(e) => updateField('clientType', e.target.value as 'individual' | 'organization')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                            >
                                <option value="individual">Individual</option>
                                <option value="organization">Organization</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                {formData.clientType === 'organization' ? 'Organization Name' : 'Full Name'} *
                            </label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                placeholder={formData.clientType === 'organization' ? 'Acme Corporation' : 'John Smith'}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={(e) => updateField('email', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="client@example.com"
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="(416) 555-0123"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Address</h2>

                        <div>
                            <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">
                                Street Address
                            </label>
                            <input
                                type="text"
                                id="street"
                                value={formData.address?.street || ''}
                                onChange={(e) => updateAddress('street', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                placeholder="123 Main Street, Suite 400"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    value={formData.address?.city || ''}
                                    onChange={(e) => updateAddress('city', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="Toronto"
                                />
                            </div>
                            <div>
                                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                                    Province
                                </label>
                                <select
                                    id="province"
                                    value={formData.address?.province || 'ON'}
                                    onChange={(e) => updateAddress('province', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                >
                                    {PROVINCES.map(p => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                                    Postal Code
                                </label>
                                <input
                                    type="text"
                                    id="postalCode"
                                    value={formData.address?.postalCode || ''}
                                    onChange={(e) => updateAddress('postalCode', e.target.value.toUpperCase())}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="M5V 1A1"
                                    maxLength={7}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
                        <textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => updateField('notes', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maple-500 focus:border-maple-500 resize-none"
                            placeholder="Any additional notes about this client..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-4">
                        <Link
                            href="/clients"
                            className="px-4 py-2 text-gray-700 font-medium hover:text-gray-900"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                            className="px-6 py-2 bg-maple-600 text-white rounded-lg font-medium hover:bg-maple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating...' : 'Create Client'}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
