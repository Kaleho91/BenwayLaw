'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PROVINCES = [
    { code: 'ON', name: 'Ontario' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'AB', name: 'Alberta' },
    { code: 'QC', name: 'Quebec' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'PE', name: 'Prince Edward Island' },
];

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firmName: '',
        province: 'ON',
        adminFirstName: '',
        adminLastName: '',
        adminEmail: '',
        adminPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Store token
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('user', JSON.stringify(data.user));

            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <span className="text-4xl">🍁</span>
                        <span className="text-2xl font-bold text-gray-900">MapleLaw</span>
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Start your free trial
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-maple-600 hover:text-maple-500 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Firm Info */}
                        <div>
                            <label htmlFor="firmName" className="block text-sm font-medium text-gray-700">
                                Firm Name
                            </label>
                            <input
                                id="firmName"
                                name="firmName"
                                type="text"
                                required
                                value={formData.firmName}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                                placeholder="Smith & Associates LLP"
                            />
                        </div>

                        <div>
                            <label htmlFor="province" className="block text-sm font-medium text-gray-700">
                                Province
                            </label>
                            <select
                                id="province"
                                name="province"
                                value={formData.province}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                            >
                                {PROVINCES.map((p) => (
                                    <option key={p.code} value={p.code}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <input
                                    id="adminFirstName"
                                    name="adminFirstName"
                                    type="text"
                                    required
                                    value={formData.adminFirstName}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="Jane"
                                />
                            </div>
                            <div>
                                <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <input
                                    id="adminLastName"
                                    name="adminLastName"
                                    type="text"
                                    required
                                    value={formData.adminLastName}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                                    placeholder="Smith"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="adminEmail"
                                name="adminEmail"
                                type="email"
                                autoComplete="email"
                                required
                                value={formData.adminEmail}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                                placeholder="jane@smithlaw.ca"
                            />
                        </div>

                        <div>
                            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="adminPassword"
                                name="adminPassword"
                                type="password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                value={formData.adminPassword}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-maple-500 focus:border-maple-500"
                                placeholder="At least 8 characters"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-maple-600 hover:bg-maple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        By registering, you agree to our Terms of Service and Privacy Policy.
                        <br />
                        Your data is stored in Canada and protected under PIPEDA.
                    </p>
                </form>
            </div>
        </div>
    );
}
