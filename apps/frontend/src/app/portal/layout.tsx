'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface PortalClient {
    id: string;
    name: string;
    email: string;
    firmId: string;
    firmName: string;
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [client, setClient] = useState<PortalClient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('portalToken');
        const clientData = localStorage.getItem('portalClient');

        if (!token || !clientData) {
            router.push('/portal/login');
            return;
        }

        try {
            setClient(JSON.parse(clientData));
        } catch {
            router.push('/portal/login');
        }
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalClient');
        router.push('/portal/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-gray-600">Loading...</div>
            </div>
        );
    }

    const navItems = [
        { href: '/portal/matters', label: 'My Matters', icon: '📁' },
        { href: '/portal/invoices', label: 'Invoices', icon: '📄' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🍁</span>
                            <div>
                                <div className="text-lg font-bold text-gray-900">Client Portal</div>
                                {client?.firmName && (
                                    <div className="text-xs text-gray-500">{client.firmName}</div>
                                )}
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex items-center gap-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${pathname === item.href
                                            ? 'text-maple-600'
                                            : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </nav>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">{client?.name}</div>
                                <div className="text-xs text-gray-500">{client?.email}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white mt-auto">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-gray-500">
                        Secure client portal powered by MapleLaw
                    </p>
                </div>
            </footer>
        </div>
    );
}
