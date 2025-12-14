// ============================================================================
// Dedicated Time Tracking Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface TimeEntry {
    id: string;
    matter_id: string;
    entry_date: string;
    hours: number;
    rate: number;
    amount: number;
    description: string;
    billable: boolean;
    billed: boolean;
    matter?: { id: string; name: string; matter_number: string; client?: { name: string } };
}

interface Matter {
    id: string;
    name: string;
    matter_number: string;
    client?: { name: string };
}

export function TimePage() {
    const { openCommandBar } = useLayout();
    const { firm, user } = useAuth();
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [matters, setMatters] = useState<Matter[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'unbilled' | 'billed'>('all');

    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerMatter, setTimerMatter] = useState<string>('');
    const [timerDescription, setTimerDescription] = useState('');

    // Form state
    const [form, setForm] = useState({
        matter_id: '',
        entry_date: new Date().toISOString().split('T')[0],
        hours: '',
        rate: '350',
        description: '',
        billable: true,
    });

    useEffect(() => {
        if (!firm?.id) return;
        fetchData();
    }, [firm?.id]);

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerRunning) {
            interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timerRunning]);

    const fetchData = async () => {
        const [entriesRes, mattersRes] = await Promise.all([
            supabase
                .from('time_entries')
                .select('*, matter:matters(id, name, matter_number, client:clients(name))')
                .eq('firm_id', firm!.id)
                .order('entry_date', { ascending: false })
                .limit(100),
            supabase
                .from('matters')
                .select('id, name, matter_number, client:clients(name)')
                .eq('firm_id', firm!.id)
                .eq('status', 'active'),
        ]);

        if (entriesRes.data) setEntries(entriesRes.data as any);
        if (mattersRes.data) setMatters(mattersRes.data as any);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firm?.id || !user?.id) return;

        await supabase.from('time_entries').insert({
            firm_id: firm.id,
            matter_id: form.matter_id,
            user_id: user.id,
            entry_date: form.entry_date,
            hours: parseFloat(form.hours),
            rate: parseFloat(form.rate),
            amount: parseFloat(form.hours) * parseFloat(form.rate),
            description: form.description,
            billable: form.billable,
        });

        setForm({ matter_id: '', entry_date: new Date().toISOString().split('T')[0], hours: '', rate: '350', description: '', billable: true });
        setShowForm(false);
        fetchData();
    };

    const handleStopTimer = async () => {
        if (!firm?.id || !user?.id || !timerMatter) return;
        setTimerRunning(false);

        const hours = Math.round((timerSeconds / 3600) * 10) / 10; // Round to 0.1
        if (hours > 0) {
            await supabase.from('time_entries').insert({
                firm_id: firm.id,
                matter_id: timerMatter,
                user_id: user.id,
                entry_date: new Date().toISOString().split('T')[0],
                hours,
                rate: 350,
                amount: hours * 350,
                description: timerDescription || 'Timer entry',
                billable: true,
            });
            fetchData();
        }

        setTimerSeconds(0);
        setTimerMatter('');
        setTimerDescription('');
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const filteredEntries = entries.filter(e => {
        if (filter === 'unbilled') return !e.billed && e.billable;
        if (filter === 'billed') return e.billed;
        return true;
    });

    const totalHours = filteredEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    const totalAmount = filteredEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const unbilledAmount = entries.filter(e => !e.billed && e.billable).reduce((sum, e) => sum + Number(e.amount), 0);

    return (
        <>
            <Header
                title="Time Tracking"
                subtitle={`${totalHours.toFixed(1)} hours logged`}
                onCommandBarOpen={openCommandBar}
                actions={
                    <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                        {showForm ? 'Cancel' : 'Log Time'}
                    </button>
                }
            />

            <div className="page-body">
                {/* Timer */}
                <div className="card mb-6">
                    <div className="p-6">
                        <div className="flex items-center gap-6">
                            <div className="text-4xl font-mono font-light tabular-nums text-gray-900">
                                {formatTime(timerSeconds)}
                            </div>

                            {!timerRunning ? (
                                <div className="flex items-center gap-3 flex-1">
                                    <select
                                        value={timerMatter}
                                        onChange={(e) => setTimerMatter(e.target.value)}
                                        className="form-select max-w-xs"
                                    >
                                        <option value="">Select matter...</option>
                                        {matters.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.matter_number} - {m.name}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        value={timerDescription}
                                        onChange={(e) => setTimerDescription(e.target.value)}
                                        placeholder="What are you working on?"
                                        className="form-input flex-1"
                                    />
                                    <button
                                        onClick={() => timerMatter && setTimerRunning(true)}
                                        disabled={!timerMatter}
                                        className="btn btn-primary"
                                    >
                                        Start Timer
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex-1">
                                        <p className="font-medium">{matters.find(m => m.id === timerMatter)?.name}</p>
                                        <p className="text-sm text-gray-500">{timerDescription || 'Working...'}</p>
                                    </div>
                                    <button onClick={handleStopTimer} className="btn btn-danger">
                                        Stop & Save
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Entry Form */}
                {showForm && (
                    <div className="card mb-6">
                        <div className="card-body">
                            <form onSubmit={handleSubmit} className="grid grid-cols-6 gap-4">
                                <div className="col-span-2">
                                    <label className="form-label">Matter</label>
                                    <select
                                        value={form.matter_id}
                                        onChange={(e) => setForm(f => ({ ...f, matter_id: e.target.value }))}
                                        className="form-select"
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {matters.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.matter_number} - {m.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        value={form.entry_date}
                                        onChange={(e) => setForm(f => ({ ...f, entry_date: e.target.value }))}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Hours</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={form.hours}
                                        onChange={(e) => setForm(f => ({ ...f, hours: e.target.value }))}
                                        className="form-input"
                                        placeholder="1.5"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Rate</label>
                                    <input
                                        type="number"
                                        value={form.rate}
                                        onChange={(e) => setForm(f => ({ ...f, rate: e.target.value }))}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="flex items-end">
                                    <button type="submit" className="btn btn-primary w-full">Save</button>
                                </div>
                                <div className="col-span-5">
                                    <label className="form-label">Description</label>
                                    <input
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                        className="form-input"
                                        placeholder="Work performed..."
                                        required
                                    />
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.billable}
                                            onChange={(e) => setForm(f => ({ ...f, billable: e.target.checked }))}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                        <span className="text-sm">Billable</span>
                                    </label>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Total Hours</p>
                        <p className="text-2xl font-semibold">{totalHours.toFixed(1)}</p>
                    </div>
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Total Amount</p>
                        <p className="text-2xl font-semibold">${totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="card p-5">
                        <p className="text-sm text-gray-500">Unbilled</p>
                        <p className="text-2xl font-semibold text-orange-600">${unbilledAmount.toLocaleString()}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-4">
                    {(['all', 'unbilled', 'billed'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Entries Table */}
                <div className="card">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No time entries yet.</div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Matter</th>
                                        <th>Description</th>
                                        <th className="text-right">Hours</th>
                                        <th className="text-right">Rate</th>
                                        <th className="text-right">Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntries.map(entry => (
                                        <tr key={entry.id}>
                                            <td className="whitespace-nowrap">{new Date(entry.entry_date).toLocaleDateString()}</td>
                                            <td>
                                                <Link to={`/matters/${entry.matter_id}`} className="text-orange-600 hover:underline">
                                                    {entry.matter?.matter_number}
                                                </Link>
                                                <span className="text-gray-400 ml-1">• {entry.matter?.name}</span>
                                            </td>
                                            <td className="max-w-xs truncate">{entry.description}</td>
                                            <td className="text-right tabular-nums">{entry.hours}</td>
                                            <td className="text-right tabular-nums">${entry.rate}</td>
                                            <td className="text-right tabular-nums font-medium">${Number(entry.amount).toLocaleString()}</td>
                                            <td>
                                                {entry.billed ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Billed</span>
                                                ) : entry.billable ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">Unbilled</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Non-billable</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
