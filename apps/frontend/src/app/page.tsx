import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🍁</span>
                            <span className="text-xl font-bold text-gray-900">MapleLaw</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link
                                href="/auth/login"
                                className="text-gray-600 hover:text-gray-900 font-medium"
                            >
                                Log in
                            </Link>
                            <Link
                                href="/auth/register"
                                className="bg-maple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-maple-700 transition-colors"
                            >
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                    <div className="text-center">
                        <h1 className="text-5xl font-bold text-gray-900 mb-6">
                            Legal Practice Management
                            <br />
                            <span className="text-maple-600">Built for Canadian Lawyers</span>
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                            Manage clients, matters, time, billing, and trust accounts — all with
                            Ontario LSO compliance built in. Your data stays in Canada.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/auth/register"
                                className="bg-maple-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-maple-700 transition-colors"
                            >
                                Start Your Free Trial
                            </Link>
                            <Link
                                href="#features"
                                className="bg-white text-gray-700 px-8 py-3 rounded-lg font-semibold text-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                                See Features
                            </Link>
                        </div>
                    </div>

                    {/* Feature Grid */}
                    <div id="features" className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon="👥"
                            title="Client & Matter Management"
                            description="Organize clients, matters, and contacts. Track every case from intake to close."
                        />
                        <FeatureCard
                            icon="⏱️"
                            title="Time Tracking"
                            description="Built-in timers, manual entry, and automatic billing increments. Never miss billable time."
                        />
                        <FeatureCard
                            icon="📄"
                            title="Invoicing with Canadian Tax"
                            description="Generate invoices with correct HST, GST, or PST calculated automatically by province."
                        />
                        <FeatureCard
                            icon="🏦"
                            title="Trust Accounting (LSO Compliant)"
                            description="Three-way reconciliation, client ledgers, and overdraw protection. Ready for audits."
                        />
                        <FeatureCard
                            icon="📁"
                            title="Document Management"
                            description="Upload, organize, and share documents. Version history and client portal access."
                        />
                        <FeatureCard
                            icon="🔒"
                            title="Canadian Data Residency"
                            description="All data stored in AWS Canada (Toronto). PIPEDA and Quebec Law 25 compliant."
                        />
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center gap-2 mb-4 md:mb-0">
                            <span className="text-2xl">🍁</span>
                            <span className="text-lg font-bold text-white">MapleLaw</span>
                        </div>
                        <p className="text-sm">
                            © {new Date().getFullYear()} MapleLaw. Built for Canadian lawyers.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({
    icon,
    title,
    description
}: {
    icon: string;
    title: string;
    description: string;
}) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600">{description}</p>
        </div>
    );
}
