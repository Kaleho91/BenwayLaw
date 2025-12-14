// ============================================================================
// Document Drafting Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useLayout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Template {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
}

const TEMPLATES: Template[] = [
    {
        id: 'engagement-letter',
        name: 'Engagement Letter',
        category: 'Client Intake',
        description: 'Standard client engagement letter outlining scope, fees, and terms',
        content: `[FIRM_NAME]
[DATE]

[CLIENT_NAME]
[CLIENT_ADDRESS]

RE: Engagement Letter

Dear [CLIENT_NAME],

Thank you for selecting [FIRM_NAME] to represent you in connection with [MATTER_DESCRIPTION].

SCOPE OF SERVICES
We will provide legal services in connection with [MATTER_DESCRIPTION]. Our representation does not extend to matters beyond the scope described above unless we agree otherwise in writing.

FEES AND BILLING
Our hourly rates for this matter are as follows:
- Partner: $[PARTNER_RATE]/hour
- Associate: $[ASSOCIATE_RATE]/hour
- Paralegal: $[PARALEGAL_RATE]/hour

We will bill monthly for services rendered. Payment is due within 30 days of invoice date.

RETAINER
We require an initial retainer of $[RETAINER_AMOUNT] to be held in our trust account. This retainer will be applied against our final invoice.

TERMINATION
Either party may terminate this engagement at any time with written notice.

Please sign below to acknowledge your agreement to these terms.

Sincerely,

[LAWYER_NAME]
[FIRM_NAME]

AGREED AND ACCEPTED:

_________________________
[CLIENT_NAME]
Date: ___________________`,
    },
    {
        id: 'demand-letter',
        name: 'Demand Letter',
        category: 'Litigation',
        description: 'Formal demand letter for outstanding amounts or actions',
        content: `[FIRM_NAME]
[DATE]

VIA [DELIVERY_METHOD]

[RECIPIENT_NAME]
[RECIPIENT_ADDRESS]

RE: Demand for [SUBJECT]

Dear [RECIPIENT_NAME],

We represent [CLIENT_NAME] in connection with [MATTER_DESCRIPTION].

BACKGROUND
[BACKGROUND_FACTS]

DEMAND
On behalf of our client, we hereby demand that you:

1. [DEMAND_ITEM_1]
2. [DEMAND_ITEM_2]

This demand must be satisfied within [DAYS] days of the date of this letter.

CONSEQUENCES OF NON-COMPLIANCE
If you fail to comply with this demand, our client is prepared to pursue all available legal remedies, including but not limited to commencing legal proceedings against you without further notice. Such proceedings may result in a judgment against you for the amounts demanded, plus interest, costs, and legal fees.

We strongly encourage you to take this matter seriously and respond promptly.

Yours truly,

[LAWYER_NAME]
[FIRM_NAME]`,
    },
    {
        id: 'retainer-agreement',
        name: 'Retainer Agreement',
        category: 'Client Intake',
        description: 'Detailed retainer agreement with comprehensive terms',
        content: `RETAINER AGREEMENT

THIS AGREEMENT made as of [DATE]

BETWEEN:
    [CLIENT_NAME] (the "Client")
AND:
    [FIRM_NAME] (the "Firm")

1. ENGAGEMENT
The Firm agrees to represent the Client in connection with [MATTER_DESCRIPTION] (the "Matter").

2. LEGAL FEES
The Client agrees to pay the Firm for legal services at the following hourly rates:
[FEE_SCHEDULE]

3. DISBURSEMENTS
The Client agrees to reimburse the Firm for all reasonable disbursements incurred, including but not limited to court filing fees, photocopying, long distance charges, courier costs, and expert fees.

4. RETAINER
The Client shall pay an initial retainer of $[RETAINER_AMOUNT] upon execution of this Agreement. This amount will be deposited into the Firm's trust account and applied against fees and disbursements as they are incurred.

5. BILLING
The Firm will issue monthly accounts for services rendered and disbursements incurred. Accounts are payable within 30 days.

6. TRUST ACCOUNT
All funds received from or on behalf of the Client will be deposited to the Firm's trust account in accordance with the rules of the Law Society.

7. TERMINATION
Either party may terminate this Agreement upon written notice. Upon termination, the Client shall pay all outstanding fees and disbursements.

EXECUTED as of the date first above written.

_________________________
[CLIENT_NAME]

_________________________
[FIRM_NAME]
Per: [LAWYER_NAME]`,
    },
    {
        id: 'reporting-letter',
        name: 'Client Reporting Letter',
        category: 'Communication',
        description: 'Status update letter to keep clients informed',
        content: `[FIRM_NAME]
[DATE]

[CLIENT_NAME]
[CLIENT_ADDRESS]

RE: [MATTER_DESCRIPTION]
    Our File: [MATTER_NUMBER]

Dear [CLIENT_NAME],

We are writing to provide you with an update on the status of your matter.

RECENT DEVELOPMENTS
[RECENT_DEVELOPMENTS]

NEXT STEPS
[NEXT_STEPS]

OUTSTANDING ITEMS
[OUTSTANDING_ITEMS]

TIMELINE
[EXPECTED_TIMELINE]

FEES TO DATE
Total fees and disbursements to date: $[AMOUNT_TO_DATE]
Outstanding balance: $[OUTSTANDING_BALANCE]
Trust balance: $[TRUST_BALANCE]

Please do not hesitate to contact us if you have any questions.

Yours truly,

[LAWYER_NAME]
[FIRM_NAME]`,
    },
    {
        id: 'consent-form',
        name: 'Consent to Act',
        category: 'Client Intake',
        description: 'Written consent for representation',
        content: `CONSENT TO ACT

I, [CLIENT_NAME], hereby authorize and consent to [FIRM_NAME] acting as my legal counsel in connection with [MATTER_DESCRIPTION].

I understand that:

1. The scope of the engagement is limited to the matter described above.

2. I am responsible for payment of all legal fees and disbursements in accordance with the retainer agreement.

3. I must provide truthful and complete information to my lawyers.

4. I will cooperate with my lawyers and respond to their requests in a timely manner.

5. Settlement decisions and other major decisions regarding my matter require my consent.

Dated: [DATE]

_________________________
[CLIENT_NAME]

Witness:
_________________________
Name: [WITNESS_NAME]`,
    },
];

export function DocumentsPage() {
    const { openCommandBar } = useLayout();
    const { firm } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [matters, setMatters] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedMatter, setSelectedMatter] = useState('');
    const [generatedDoc, setGeneratedDoc] = useState('');
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (!firm?.id) return;
        Promise.all([
            supabase.from('clients').select('id, name, email, address').eq('firm_id', firm.id),
            supabase.from('matters').select('id, name, matter_number, client_id').eq('firm_id', firm.id),
        ]).then(([c, m]) => {
            if (c.data) setClients(c.data);
            if (m.data) setMatters(m.data);
        });
    }, [firm?.id]);

    const handleGenerate = () => {
        if (!selectedTemplate) return;

        let doc = selectedTemplate.content;
        const client = clients.find(c => c.id === selectedClient);
        const matter = matters.find(m => m.id === selectedMatter);

        // Replace placeholders
        doc = doc.replace(/\[FIRM_NAME\]/g, firm?.name || 'Your Firm');
        doc = doc.replace(/\[DATE\]/g, new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }));
        doc = doc.replace(/\[CLIENT_NAME\]/g, client?.name || '[CLIENT_NAME]');
        doc = doc.replace(/\[CLIENT_ADDRESS\]/g, client?.address || '[CLIENT_ADDRESS]');
        doc = doc.replace(/\[MATTER_DESCRIPTION\]/g, matter?.name || '[MATTER_DESCRIPTION]');
        doc = doc.replace(/\[MATTER_NUMBER\]/g, matter?.matter_number || '[MATTER_NUMBER]');
        doc = doc.replace(/\[LAWYER_NAME\]/g, '[LAWYER_NAME]');

        setGeneratedDoc(doc);
    };

    const categories = [...new Set(TEMPLATES.map(t => t.category))];
    const filteredTemplates = filter ? TEMPLATES.filter(t => t.category === filter) : TEMPLATES;

    return (
        <>
            <Header
                title="Documents"
                subtitle="Draft legal documents from templates"
                onCommandBarOpen={openCommandBar}
            />

            <div className="page-body">
                <div className="grid grid-cols-3 gap-6">
                    {/* Template Selection */}
                    <div className="col-span-1 space-y-4">
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setFilter('')}
                                className={`px-3 py-1 text-sm rounded-lg ${!filter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                All
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-3 py-1 text-sm rounded-lg ${filter === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-2">
                            {filteredTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => { setSelectedTemplate(template); setGeneratedDoc(''); }}
                                    className={`w-full p-4 text-left rounded-lg border transition-colors ${selectedTemplate?.id === template.id
                                            ? 'border-orange-500 bg-orange-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                >
                                    <p className="font-medium">{template.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Document Editor */}
                    <div className="col-span-2">
                        {!selectedTemplate ? (
                            <div className="card p-12 text-center text-gray-500">
                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>Select a template to get started</p>
                            </div>
                        ) : (
                            <div className="card">
                                <div className="card-header flex items-center justify-between">
                                    <h3 className="font-semibold">{selectedTemplate.name}</h3>
                                    <div className="flex gap-2">
                                        <select
                                            value={selectedClient}
                                            onChange={(e) => setSelectedClient(e.target.value)}
                                            className="form-select text-sm py-1"
                                        >
                                            <option value="">Select client...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={selectedMatter}
                                            onChange={(e) => setSelectedMatter(e.target.value)}
                                            className="form-select text-sm py-1"
                                        >
                                            <option value="">Select matter...</option>
                                            {matters.filter(m => !selectedClient || m.client_id === selectedClient).map(m => (
                                                <option key={m.id} value={m.id}>{m.matter_number} - {m.name}</option>
                                            ))}
                                        </select>
                                        <button onClick={handleGenerate} className="btn btn-primary btn-sm">
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <textarea
                                        value={generatedDoc || selectedTemplate.content}
                                        onChange={(e) => setGeneratedDoc(e.target.value)}
                                        className="w-full h-[600px] font-mono text-sm border border-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Document content..."
                                    />
                                </div>
                                {generatedDoc && (
                                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                                        <button
                                            onClick={() => navigator.clipboard.writeText(generatedDoc)}
                                            className="btn btn-secondary"
                                        >
                                            Copy to Clipboard
                                        </button>
                                        <button
                                            onClick={() => {
                                                const blob = new Blob([generatedDoc], { type: 'text/plain' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `${selectedTemplate.name.replace(/\s+/g, '_')}.txt`;
                                                a.click();
                                            }}
                                            className="btn btn-primary"
                                        >
                                            Download
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
