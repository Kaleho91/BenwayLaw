// ============================================================================
// Main Layout Component
// ============================================================================

import { Outlet } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { AICommandBar } from '@/components/features/AICommandBar';
import { AIAssistant } from '@/components/features/AIAssistant';

export function Layout() {
    const [commandBarOpen, setCommandBarOpen] = useState(false);

    // Keyboard shortcut for command bar
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandBarOpen(true);
        }
        if (e.key === 'Escape') {
            setCommandBarOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar />

            <main className="main-content">
                <Outlet context={{ openCommandBar: () => setCommandBarOpen(true) }} />
            </main>

            {/* AI Command Bar Modal */}
            {commandBarOpen && (
                <AICommandBar onClose={() => setCommandBarOpen(false)} />
            )}

            {/* Floating AI Assistant */}
            <AIAssistant />
        </div>
    );
}

// Hook to access layout context
import { useOutletContext } from 'react-router-dom';

interface LayoutContext {
    openCommandBar: () => void;
}

export function useLayout() {
    return useOutletContext<LayoutContext>();
}
