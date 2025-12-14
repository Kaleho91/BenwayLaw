// ============================================================================
// Floating AI Assistant Widget - Smart, Contextual, Action-Oriented
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions?: { label: string; path?: string; followUp?: string }[];
}

interface FirmContext {
    unbilledAmount: number;
    unbilledHours: number;
    outstandingAR: number;
    unpaidInvoices: number;
    trustBalance: number;
    clientCount: number;
    activeMatters: number;
    totalMatters: number;
    recentTimeHours: number;
}

async function getFirmContext(firmId: string): Promise<FirmContext> {
    const [timeRes, invoicesRes, paymentsRes, trustRes, clientsRes, mattersRes] = await Promise.all([
        supabase.from('time_entries').select('hours, amount, billed, billable').eq('firm_id', firmId),
        supabase.from('invoices').select('total, status').eq('firm_id', firmId),
        supabase.from('payments').select('amount').eq('firm_id', firmId),
        supabase.from('trust_accounts').select('balance').eq('firm_id', firmId),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('firm_id', firmId),
        supabase.from('matters').select('status').eq('firm_id', firmId),
    ]);

    const time = timeRes.data || [];
    const invoices = invoicesRes.data || [];
    const payments = paymentsRes.data || [];
    const trust = trustRes.data || [];
    const matters = mattersRes.data || [];

    const unbilledTime = time.filter(t => !t.billed && t.billable);
    const invoiced = invoices.reduce((sum, i) => sum + Number(i.total), 0);
    const paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
        unbilledAmount: unbilledTime.reduce((sum, t) => sum + Number(t.amount), 0),
        unbilledHours: unbilledTime.reduce((sum, t) => sum + Number(t.hours), 0),
        outstandingAR: invoiced - paid,
        unpaidInvoices: invoices.filter(i => ['sent', 'partial'].includes(i.status)).length,
        trustBalance: trust.reduce((sum, t) => sum + Number(t.balance), 0),
        clientCount: clientsRes.count || 0,
        activeMatters: matters.filter(m => m.status === 'active').length,
        totalMatters: matters.length,
        recentTimeHours: time.reduce((sum, t) => sum + Number(t.hours), 0),
    };
}

async function getSmartResponse(
    question: string,
    ctx: FirmContext,
    firmName: string
): Promise<{ content: string; actions: { label: string; path?: string; followUp?: string }[] }> {
    const q = question.toLowerCase();
    const fmt = (n: number) => `$${n.toLocaleString()}`;

    // Unbilled time / WIP
    if (q.includes('unbilled') || q.includes('wip') || q.includes('work in progress')) {
        if (ctx.unbilledAmount > 0) {
            return {
                content: `You have **${fmt(ctx.unbilledAmount)}** in unbilled work-in-progress across **${ctx.unbilledHours.toFixed(1)} hours**.\n\nThis represents revenue you've earned but haven't invoiced yet. I'd recommend generating invoices soon to maintain healthy cash flow.`,
                actions: [
                    { label: '📄 Generate Invoice', path: '/invoices/new' },
                    { followUp: 'Which clients have the most unbilled time?' },
                    { followUp: 'What\'s my outstanding A/R?' },
                ],
            };
        } else {
            return {
                content: `Great news! You have **no unbilled time** right now. All billable work has been invoiced. 🎉\n\nFocus on collections or logging more time.`,
                actions: [
                    { label: '⏱️ Log Time', path: '/time' },
                    { followUp: 'What\'s my collection status?' },
                ],
            };
        }
    }

    // Outstanding AR / collections
    if (q.includes('outstanding') || q.includes('owed') || q.includes('ar') || q.includes('receivable') || q.includes('collection')) {
        if (ctx.outstandingAR > 0) {
            return {
                content: `Your outstanding A/R is **${fmt(ctx.outstandingAR)}** across **${ctx.unpaidInvoices} unpaid invoices**.\n\nConsider following up on older invoices. Late payments impact your cash flow and can indicate client relationship issues.`,
                actions: [
                    { label: '💰 View Invoices', path: '/invoices' },
                    { followUp: 'Which invoices are overdue?' },
                    { followUp: 'What\'s my total revenue?' },
                ],
            };
        } else {
            return {
                content: `Excellent! You have **no outstanding receivables**. All invoices are paid! 🎉`,
                actions: [
                    { label: '📊 View Reports', path: '/reports' },
                    { followUp: 'How much have I billed this year?' },
                ],
            };
        }
    }

    // Trust balance
    if (q.includes('trust') || q.includes('retainer')) {
        return {
            content: `Your total trust balance is **${fmt(ctx.trustBalance)}** held across your trust accounts.\n\nRemember: Trust funds are fiduciary. Always ensure proper reconciliation and never commingle with operating funds.`,
            actions: [
                { label: '🔒 View Trust Accounts', path: '/trust' },
                { followUp: 'Show me my trust reconciliation' },
                { followUp: 'What\'s my unbilled time?' },
            ],
        };
    }

    // Clients
    if (q.includes('client') && (q.includes('how many') || q.includes('count') || q.includes('total'))) {
        return {
            content: `You have **${ctx.clientCount} clients** registered in ${firmName}.\n\nBuilding your client base is key to growth. Make sure to keep in regular contact with existing clients.`,
            actions: [
                { label: '👥 View Clients', path: '/clients' },
                { label: '➕ Add New Client', path: '/clients/new' },
                { followUp: 'Which clients generate the most revenue?' },
            ],
        };
    }

    // Matters / cases
    if (q.includes('matter') || q.includes('case') || q.includes('active')) {
        return {
            content: `You have **${ctx.activeMatters} active matters** out of ${ctx.totalMatters} total.\n\nActive matters are where you're currently doing billable work. Make sure none are stalled or missing time entries.`,
            actions: [
                { label: '📁 View Matters', path: '/matters' },
                { label: '➕ Open New Matter', path: '/matters/new' },
                { followUp: 'Which matters have the most unbilled time?' },
                { followUp: 'Are any matters at risk?' },
            ],
        };
    }

    // Revenue
    if (q.includes('revenue') || q.includes('billed') || q.includes('earned') || q.includes('made')) {
        return {
            content: `Looking at your billing activity, I can help you understand your revenue streams.\n\nFor detailed analytics including trends, top clients, and collection rates, check the Reports dashboard.`,
            actions: [
                { label: '📊 View Reports', path: '/reports' },
                { followUp: 'What\'s my outstanding A/R?' },
                { followUp: 'Who are my top clients?' },
            ],
        };
    }

    // Time / hours
    if (q.includes('time') || q.includes('hours') || q.includes('logged')) {
        return {
            content: `You've logged a total of **${ctx.recentTimeHours.toFixed(1)} hours** across all time entries.\n\nRegular time tracking is essential for accurate billing. Use the timer feature to capture time in real-time.`,
            actions: [
                { label: '⏱️ Time Tracking', path: '/time' },
                { followUp: 'What\'s my unbilled time?' },
                { followUp: 'How do I generate an invoice?' },
            ],
        };
    }

    // Invoice / billing
    if (q.includes('invoice') || q.includes('bill')) {
        return {
            content: `I can help with invoicing! To create an invoice, you'll select unbilled time entries from a client's matters and generate a professional invoice with Canadian tax calculations.\n\nYou have **${fmt(ctx.unbilledAmount)}** ready to invoice.`,
            actions: [
                { label: '📄 Generate Invoice', path: '/invoices/new' },
                { label: '💰 View All Invoices', path: '/invoices' },
                { followUp: 'What\'s my outstanding A/R?' },
            ],
        };
    }

    // Documents
    if (q.includes('document') || q.includes('draft') || q.includes('template') || q.includes('letter')) {
        return {
            content: `I can help you draft legal documents! We have templates for:\n• Engagement Letters\n• Demand Letters\n• Retainer Agreements\n• Reporting Letters\n• Consent Forms\n\nJust select a template and client/matter to auto-fill the details.`,
            actions: [
                { label: '📝 Draft Document', path: '/documents' },
                { followUp: 'How do I add a new client?' },
            ],
        };
    }

    // Greeting / help
    if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('help')) {
        return {
            content: `Hello! I'm your MapleLaw AI assistant for **${firmName}**. Here's a quick overview:\n\n• **Unbilled WIP:** ${fmt(ctx.unbilledAmount)}\n• **Outstanding A/R:** ${fmt(ctx.outstandingAR)}\n• **Active Matters:** ${ctx.activeMatters}\n• **Trust Balance:** ${fmt(ctx.trustBalance)}\n\nWhat would you like to explore?`,
            actions: [
                { followUp: 'What should I focus on today?' },
                { followUp: 'Show me my unbilled time' },
                { followUp: 'Any matters at risk?' },
            ],
        };
    }

    // Focus / priority / what to do
    if (q.includes('focus') || q.includes('priority') || q.includes('should') || q.includes('today')) {
        const priorities: string[] = [];
        if (ctx.unbilledAmount > 1000) priorities.push(`• Invoice your **${fmt(ctx.unbilledAmount)}** in unbilled time`);
        if (ctx.outstandingAR > 0) priorities.push(`• Follow up on **${fmt(ctx.outstandingAR)}** in outstanding A/R`);
        if (ctx.activeMatters === 0) priorities.push('• Open new matters or reactivate stalled ones');

        return {
            content: priorities.length > 0
                ? `Based on your firm data, here's what I'd focus on:\n\n${priorities.join('\n')}\n\nKeep your cash flow healthy by staying on top of billing and collections.`
                : `Your firm is in great shape! No urgent items. Consider business development or documenting your processes.`,
            actions: [
                ctx.unbilledAmount > 0 ? { label: '📄 Generate Invoice', path: '/invoices/new' } : null,
                ctx.outstandingAR > 0 ? { label: '💰 View Invoices', path: '/invoices' } : null,
                { followUp: 'Show me my reports' },
            ].filter(Boolean) as any,
        };
    }

    // Default
    return {
        content: `I can answer questions about your firm's data. Try asking about:\n\n• Unbilled time & WIP\n• Outstanding A/R\n• Trust balances\n• Client & matter counts\n• Revenue and billing\n\nWhat would you like to know?`,
        actions: [
            { followUp: 'What\'s my unbilled time?' },
            { followUp: 'What should I focus on today?' },
            { followUp: 'How many active matters do I have?' },
        ],
    };
}

export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [ctx, setCtx] = useState<FirmContext | null>(null);
    const { firm } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load context on open
    useEffect(() => {
        if (isOpen && firm?.id && !ctx) {
            getFirmContext(firm.id).then(setCtx);
        }
    }, [isOpen, firm?.id]);

    // Initial greeting when opened
    useEffect(() => {
        if (isOpen && ctx && messages.length === 0) {
            setMessages([{
                id: '1',
                role: 'assistant',
                content: `Hi! I'm your MapleLaw AI assistant. Here's a quick snapshot of **${firm?.name}**:\n\n• **Unbilled WIP:** $${ctx.unbilledAmount.toLocaleString()}\n• **Outstanding A/R:** $${ctx.outstandingAR.toLocaleString()}\n• **Active Matters:** ${ctx.activeMatters}\n\nWhat would you like to know?`,
                actions: [
                    { followUp: 'What should I focus on today?' },
                    { followUp: 'Show me my unbilled time' },
                    { followUp: 'Generate an invoice' },
                ],
            }]);
        }
    }, [isOpen, ctx, firm?.name]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    const handleSend = async (text?: string) => {
        const query = text || input.trim();
        if (!query || !firm?.id || !ctx) return;

        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: query };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        // Refresh context for freshest data
        const freshCtx = await getFirmContext(firm.id);
        setCtx(freshCtx);

        const response = await getSmartResponse(query, freshCtx, firm.name);
        const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.content,
            actions: response.actions,
        };
        setMessages(prev => [...prev, aiMessage]);
        setLoading(false);
    };

    const handleAction = (action: { label?: string; path?: string; followUp?: string }) => {
        if (action.path) {
            navigate(action.path);
            setIsOpen(false);
        } else if (action.followUp) {
            handleSend(action.followUp);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center z-50"
            >
                {isOpen ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slide-up">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L10 6L6 5L8 9L4 10L8 12L6 16L10 14L12 20L14 14L18 16L16 12L20 10L16 9L18 5L14 6L12 2Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-white font-semibold">MapleLaw AI</p>
                                <p className="text-white/70 text-xs">Your intelligent legal assistant</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((msg) => (
                            <div key={msg.id}>
                                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-br-md'
                                                : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                                            }`}
                                        dangerouslySetInnerHTML={{
                                            __html: msg.content
                                                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\n/g, '<br/>')
                                        }}
                                    />
                                </div>
                                {/* Action buttons */}
                                {msg.actions && msg.actions.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2 pl-2">
                                        {msg.actions.map((action, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleAction(action)}
                                                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${action.path
                                                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {action.label || action.followUp}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim()}
                                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:shadow-md transition-all disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
