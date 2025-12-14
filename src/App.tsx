// ============================================================================
// App Router
// ============================================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';

// Auth Pages
import { LoginPage, RegisterPage } from '@/pages/auth/AuthPages';

// Main Pages
import { Dashboard } from '@/pages/Dashboard';
import { ClientList, ClientDetail, ClientForm } from '@/pages/clients/ClientPages';
import { MatterList, MatterDetail, MatterForm } from '@/pages/matters/MatterPages';
import { InvoiceList, InvoiceDetail, InvoiceGenerator } from '@/pages/invoices/InvoicePages';
import { TimePage } from '@/pages/time/TimePage';
import { TrustPage } from '@/pages/trust/TrustPage';
import { DocumentsPage } from '@/pages/documents/DocumentsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { Settings } from '@/pages/settings/Settings';

// Loading spinner component
function LoadingScreen({ dark = false }: { dark?: boolean }) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="text-center">
                <div className={`w-10 h-10 mx-auto rounded-xl ${dark ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-orange-400 to-red-500'} flex items-center justify-center animate-pulse`}>
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 7v10c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z" />
                    </svg>
                </div>
                {!dark && <p className="text-gray-500 mt-4 text-sm">Loading...</p>}
            </div>
        </div>
    );
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return <>{children}</>;
}

// Public Route wrapper (redirects if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen dark />;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            {/* Auth Routes */}
            <Route path="/auth/login" element={
                <PublicRoute>
                    <LoginPage />
                </PublicRoute>
            } />
            <Route path="/auth/register" element={
                <PublicRoute>
                    <RegisterPage />
                </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Clients */}
                <Route path="clients" element={<ClientList />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />

                {/* Matters */}
                <Route path="matters" element={<MatterList />} />
                <Route path="matters/new" element={<MatterForm />} />
                <Route path="matters/:id" element={<MatterDetail />} />
                <Route path="matters/:id/edit" element={<MatterForm />} />

                {/* Time */}
                <Route path="time" element={<TimePage />} />

                {/* Invoices */}
                <Route path="invoices" element={<InvoiceList />} />
                <Route path="invoices/new" element={<InvoiceGenerator />} />
                <Route path="invoices/:id" element={<InvoiceDetail />} />

                {/* Trust */}
                <Route path="trust" element={<TrustPage />} />

                {/* Documents */}
                <Route path="documents" element={<DocumentsPage />} />

                {/* Reports */}
                <Route path="reports" element={<ReportsPage />} />

                {/* Settings */}
                <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
