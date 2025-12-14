// ============================================================================
// AI Command Bar - With Firm Intelligence & Live Search
// ============================================================================

import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface AICommandBarProps {
    onClose: () => void;
}

interface SearchResult {
    id: string;
    type: 'client' | 'matter' | 'action' | 'navigation' | 'answer';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
}

// Firm intelligence - answer questions about firm data
async function getFirmIntelligence(query: string, firmId: string): Promise<string | null> {
    const q = query.toLowerCase();

    // Revenue / billing questions
    if (q.includes('revenue') || q.includes('billed') || q.includes('earned')) {
        const { data } = await supabase
            .from('invoices')
            .select('total, status')
            .eq('firm_id', firmId)
            .in('status', ['sent', 'partial', 'paid']);

        const total = data?.reduce((sum, inv) => sum + Number(inv.total), 0) || 0;
        return `Total invoiced revenue: $${total.toLocaleString()}. You have ${data?.length || 0} invoices sent or paid.`;
    }

    // Outstanding / AR questions
    if (q.includes('outstanding') || q.includes('owed') || q.includes('unpaid') || q.includes('ar') || q.includes('receivable')) {
        const { data: invoices } = await supabase
            .from('invoices')
            .select('id, total, status')
            .eq('firm_id', firmId)
            .in('status', ['sent', 'partial']);

        if (!invoices?.length) return 'No outstanding invoices. All caught up!';

        const { data: payments } = await supabase
            .from('payments')
            .select('invoice_id, amount')
            .eq('firm_id', firmId);

        const paymentsByInvoice = payments?.reduce((acc, p) => {
            acc[p.invoice_id] = (acc[p.invoice_id] || 0) + Number(p.amount);
            return acc;
        }, {} as Record<string, number>) || {};

        const outstanding = invoices.reduce((sum, inv) => {
            return sum + Number(inv.total) - (paymentsByInvoice[inv.id] || 0);
        }, 0);

        return `Outstanding A/R: $${outstanding.toLocaleString()} across ${invoices.length} unpaid invoices.`;
    }

    // Unbilled time questions
    if (q.includes('unbilled') || q.includes('wip') || q.includes('work in progress')) {
        const { data } = await supabase
            .from('time_entries')
            .select('amount, hours')
            .eq('firm_id', firmId)
            .eq('billed', false)
            .eq('billable', true);

        const total = data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const hours = data?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;
        return `Unbilled WIP: $${total.toLocaleString()} (${hours.toFixed(1)} hours). Consider generating invoices.`;
    }

    // Trust balance questions
    if (q.includes('trust') || q.includes('retainer') || q.includes('held')) {
        const { data } = await supabase
            .from('trust_accounts')
            .select('balance')
            .eq('firm_id', firmId);

        const total = data?.reduce((sum, t) => sum + Number(t.balance), 0) || 0;
        return `Total trust funds held: $${total.toLocaleString()} across ${data?.length || 0} trust accounts.`;
    }

    // Client count
    if (q.includes('how many client') || q.includes('client count') || q.includes('total client')) {
        const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('firm_id', firmId);
        return `You have ${count || 0} clients in your firm.`;
    }

    // Matter count
    if (q.includes('how many matter') || q.includes('matter count') || q.includes('case count') || q.includes('active matter')) {
        const { data } = await supabase
            .from('matters')
            .select('status')
            .eq('firm_id', firmId);

        const active = data?.filter(m => m.status === 'active').length || 0;
        const total = data?.length || 0;
        return `You have ${active} active matters out of ${total} total matters.`;
    }

    // Top clients by revenue
    if (q.includes('top client') || q.includes('best client') || q.includes('biggest client')) {
        const { data } = await supabase
            .from('invoices')
            .select('client_id, total, clients(name)')
            .eq('firm_id', firmId);

        if (!data?.length) return 'No invoice data yet to determine top clients.';

        const byClient = data.reduce((acc, inv) => {
            const name = (inv.clients as any)?.name || 'Unknown';
            acc[name] = (acc[name] || 0) + Number(inv.total);
            return acc;
        }, {} as Record<string, number>);

        const sorted = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const list = sorted.map(([name, total], i) => `${i + 1}. ${name}: $${total.toLocaleString()}`).join('\n');
        return `Top clients by revenue:\n${list}`;
    }

    return null;
}

export function AICommandBar({ onClose }: AICommandBarProps) {
    const [input, setInput] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [aiAnswer, setAiAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { user, firm } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        inputRef.current?.focus();
        if (!firm?.id) return;

        const fetchData = async () => {
            const [clientsRes, mattersRes] = await Promise.all([
                supabase.from('clients').select('id, name').eq('firm_id', firm.id).limit(50),
                supabase.from('matters').select('id, name, matter_number, client_id, clients(name)').eq('firm_id', firm.id).limit(50),
            ]);
            if (clientsRes.data) setClients(clientsRes.data);
            if (mattersRes.data) setMatters(mattersRes.data);
        };
        fetchData();
    }, [firm?.id]);

    // Handle AI questions
    const handleAsk = async () => {
        if (!firm?.id || !input.trim()) return;
        setLoading(true);
        const answer = await getFirmIntelligence(input, firm.id);
        setAiAnswer(answer);
        setLoading(false);
    };

    const IconWrapper = ({ children }: { children: React.ReactNode }) => (
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
            {children}
        </div>
    );

    // Quick actions
    const quickActions: SearchResult[] = [
        {
            id: 'new-client',
            type: 'action',
            title: 'New Client',
            subtitle: 'Add a new client',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/clients/new'); },
        },
        {
            id: 'new-matter',
            type: 'action',
            title: 'New Matter',
            subtitle: 'Open a new case',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/matters/new'); },
        },
        {
            id: 'log-time',
            type: 'action',
            title: 'Log Time',
            subtitle: 'Record billable hours',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/time'); },
        },
        {
            id: 'new-invoice',
            type: 'action',
            title: 'Create Invoice',
            subtitle: 'Bill unbilled time',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/invoices/new'); },
        },
        {
            id: 'draft-doc',
            type: 'action',
            title: 'Draft Document',
            subtitle: 'Create from template',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/documents'); },
        },
        {
            id: 'reports',
            type: 'navigation',
            title: 'View Reports',
            subtitle: 'Analytics & insights',
            icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></IconWrapper>,
            action: () => { onClose(); navigate('/reports'); },
        },
    ];

    // Filter results
    const results = useMemo<SearchResult[]>(() => {
        const query = input.toLowerCase().trim();
        if (!query) return quickActions;

        const matched: SearchResult[] = [];

        // Check if it's a question (asking for intelligence)
        if (query.includes('?') || query.startsWith('how') || query.startsWith('what') || query.startsWith('show') || query.includes('outstanding') || query.includes('unbilled') || query.includes('revenue') || query.includes('trust')) {
            matched.push({
                id: 'ask-ai',
                type: 'answer',
                title: 'Ask MapleLaw AI',
                subtitle: 'Get insights about your firm data',
                icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></IconWrapper>,
                action: handleAsk,
            });
        }

        // Match quick actions
        quickActions.forEach((action) => {
            if (action.title.toLowerCase().includes(query) || action.subtitle?.toLowerCase().includes(query)) {
                matched.push(action);
            }
        });

        // Log time - show matters
        if (query.includes('log') || query.includes('time')) {
            matters.forEach((m) => {
                const clientName = Array.isArray(m.clients) ? m.clients[0]?.name : m.clients?.name;
                matched.push({
                    id: `log-${m.id}`,
                    type: 'matter',
                    title: `Log time: ${m.matter_number}`,
                    subtitle: m.name + (clientName ? ` • ${clientName}` : ''),
                    icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></IconWrapper>,
                    action: () => { onClose(); navigate(`/matters/${m.id}?tab=time`); },
                });
            });
        }

        // Search matters
        matters.forEach((m) => {
            const clientName = Array.isArray(m.clients) ? m.clients[0]?.name : m.clients?.name;
            const text = `${m.matter_number} ${m.name} ${clientName}`.toLowerCase();
            if (text.includes(query)) {
                matched.push({
                    id: `matter-${m.id}`,
                    type: 'matter',
                    title: `${m.matter_number} - ${m.name}`,
                    subtitle: clientName,
                    icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg></IconWrapper>,
                    action: () => { onClose(); navigate(`/matters/${m.id}`); },
                });
            }
        });

        // Search clients
        clients.forEach((c) => {
            if (c.name.toLowerCase().includes(query)) {
                matched.push({
                    id: `client-${c.id}`,
                    type: 'client',
                    title: c.name,
                    subtitle: 'Client',
                    icon: <IconWrapper><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></IconWrapper>,
                    action: () => { onClose(); navigate(`/clients/${c.id}`); },
                });
            }
        });

        // Deduplicate
        const seen = new Set<string>();
        return matched.filter(r => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
        }).slice(0, 8);
    }, [input, clients, matters, navigate, onClose]);

    // Keyboard nav
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (results[selectedIndex]) {
                    results[selectedIndex].action();
                }
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [results, selectedIndex]);

    useEffect(() => { setSelectedIndex(0); setAiAnswer(null); }, [input]);

    return (
        <div className="command-bar-overlay animate-fade-in" onClick={onClose}>
            <div className="command-bar animate-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Search */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search or ask a question..."
                        className="flex-1 text-base border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
                    />
                    {input && (
                        <button onClick={() => setInput('')} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* AI Answer */}
                {loading && (
                    <div className="px-5 py-4 border-b border-gray-100 bg-orange-50">
                        <div className="flex items-center gap-2 text-orange-600">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm">Analyzing your firm data...</span>
                        </div>
                    </div>
                )}

                {aiAnswer && !loading && (
                    <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-orange-600 mb-1">MapleLaw AI</p>
                                <p className="text-sm text-gray-700 whitespace-pre-line">{aiAnswer}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                <div className="max-h-72 overflow-y-auto">
                    {results.length === 0 ? (
                        <div className="px-5 py-8 text-center text-gray-500 text-sm">
                            No results. Try searching for clients, matters, or ask a question.
                        </div>
                    ) : (
                        <div className="py-2">
                            {results.map((r, i) => (
                                <button
                                    key={r.id}
                                    onClick={r.action}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors ${i === selectedIndex ? 'bg-gray-50' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    {r.icon}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                                        {r.subtitle && <p className="text-xs text-gray-500 truncate">{r.subtitle}</p>}
                                    </div>
                                    <span className="text-xs text-gray-400 capitalize">{r.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex gap-3">
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↑↓</kbd> Navigate</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">↵</kbd> Select</span>
                        <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">esc</kbd> Close</span>
                    </div>
                    <span className="text-gray-400">Ask: "What's my unbilled time?"</span>
                </div>
            </div>
        </div>
    );
}
