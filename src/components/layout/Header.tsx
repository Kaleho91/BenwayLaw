// ============================================================================
// Header Component
// ============================================================================

import { useState } from 'react';

interface HeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    onCommandBarOpen?: () => void;
}

export function Header({ title, subtitle, actions, onCommandBarOpen }: HeaderProps) {
    return (
        <header className="page-header">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title">{title}</h1>
                    {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
                </div>

                <div className="flex items-center gap-4">
                    {/* Command Bar trigger */}
                    <button
                        onClick={onCommandBarOpen}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 text-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>AI Command</span>
                        <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs bg-gray-200 rounded">⌘K</kbd>
                    </button>

                    {actions}
                </div>
            </div>
        </header>
    );
}

// Quick Add Button Component
export function QuickAddButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="btn btn-primary"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Quick Add</span>
        </button>
    );
}
