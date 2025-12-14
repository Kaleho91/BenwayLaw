// ============================================================================
// MapleLaw AI Module
// Mock AI provider with pluggable interface
// ============================================================================

import type { UserRole, AIEventContext, AIEventResult, AIAction } from '@/types';
import { supabase } from './supabase';

// ============================================================================
// AI Guardrails - Actions that AI is allowed to execute
// ============================================================================
const ALLOWED_AI_ACTIONS = new Set([
    'create_client',
    'create_matter',
    'create_task',
    'draft_invoice',
    'suggest_time_entry',
    'start_timer',
]);

// Actions that require explicit confirmation
const CONFIRMATION_REQUIRED_ACTIONS = new Set([
    'draft_invoice',
    'suggest_time_entry',
]);

// FORBIDDEN actions - AI can NEVER execute these
const FORBIDDEN_AI_ACTIONS = new Set([
    'trust_deposit',
    'trust_withdrawal',
    'trust_transfer',
    'legal_advice',
    'finalize_invoice',
    'delete_client',
    'delete_matter',
]);

// ============================================================================
// Intent Classification (Mock AI)
// ============================================================================
interface ParsedIntent {
    intent: string;
    entities: Record<string, string>;
    confidence: number;
}

function parseCommand(command: string): ParsedIntent {
    const lowerCommand = command.toLowerCase().trim();

    // Create client patterns
    if (lowerCommand.match(/create\s+(a\s+)?(new\s+)?client/i) ||
        lowerCommand.match(/add\s+(a\s+)?(new\s+)?client/i)) {
        const nameMatch = command.match(/for\s+["']?([^"']+)["']?$/i) ||
            command.match(/named\s+["']?([^"']+)["']?$/i) ||
            command.match(/client\s+["']?([^"']+)["']?$/i);
        return {
            intent: 'create_client',
            entities: { name: nameMatch?.[1] || '' },
            confidence: nameMatch ? 0.9 : 0.7,
        };
    }

    // Create matter patterns
    if (lowerCommand.match(/create\s+(a\s+)?(new\s+)?matter/i) ||
        lowerCommand.match(/open\s+(a\s+)?(new\s+)?matter/i) ||
        lowerCommand.match(/open\s+(a\s+)?(new\s+)?case/i)) {
        const nameMatch = command.match(/for\s+["']?([^"']+)["']?$/i);
        return {
            intent: 'create_matter',
            entities: { name: nameMatch?.[1] || '' },
            confidence: nameMatch ? 0.85 : 0.6,
        };
    }

    // Start timer / log time patterns
    if (lowerCommand.match(/start\s+(a\s+)?timer/i) ||
        lowerCommand.match(/log\s+time/i) ||
        lowerCommand.match(/track\s+time/i)) {
        const matterMatch = command.match(/for\s+["']?([^"']+)["']?$/i) ||
            command.match(/on\s+["']?([^"']+)["']?$/i);
        return {
            intent: 'start_timer',
            entities: { matter: matterMatch?.[1] || '' },
            confidence: matterMatch ? 0.85 : 0.6,
        };
    }

    // Draft invoice patterns
    if (lowerCommand.match(/draft\s+(an?\s+)?invoice/i) ||
        lowerCommand.match(/create\s+(an?\s+)?invoice/i) ||
        lowerCommand.match(/generate\s+(an?\s+)?invoice/i)) {
        const timeframeMatch = command.match(/(this\s+month|last\s+month|unbilled)/i);
        return {
            intent: 'draft_invoice',
            entities: { timeframe: timeframeMatch?.[1] || 'unbilled' },
            confidence: 0.8,
        };
    }

    // Query patterns - matters at risk
    if (lowerCommand.match(/matters?\s+(at\s+)?risk/i) ||
        lowerCommand.match(/at\s+risk\s+matters?/i) ||
        lowerCommand.match(/risky\s+matters?/i)) {
        return {
            intent: 'query_risk',
            entities: {},
            confidence: 0.9,
        };
    }

    // Query patterns - unbilled time
    if (lowerCommand.match(/unbilled\s+time/i) ||
        lowerCommand.match(/time\s+(not\s+)?billed/i)) {
        return {
            intent: 'query_unbilled',
            entities: {},
            confidence: 0.9,
        };
    }

    // Create task patterns
    if (lowerCommand.match(/create\s+(a\s+)?task/i) ||
        lowerCommand.match(/add\s+(a\s+)?task/i) ||
        lowerCommand.match(/add\s+(a\s+)?todo/i)) {
        const titleMatch = command.match(/task\s+["']?([^"']+)["']?$/i);
        return {
            intent: 'create_task',
            entities: { title: titleMatch?.[1] || '' },
            confidence: titleMatch ? 0.85 : 0.6,
        };
    }

    // Trust-related patterns (BLOCKED)
    if (lowerCommand.match(/trust/i) &&
        (lowerCommand.match(/withdraw/i) || lowerCommand.match(/transfer/i) || lowerCommand.match(/move/i))) {
        return {
            intent: 'trust_operation_blocked',
            entities: {},
            confidence: 1.0,
        };
    }

    // Default - unknown intent
    return {
        intent: 'unknown',
        entities: {},
        confidence: 0,
    };
}

// ============================================================================
// AI Command Handler
// ============================================================================
export interface AICommandInput {
    command: string;
    context: AIEventContext;
    firmId: string;
    userId: string;
}

export interface AICommandOutput {
    success: boolean;
    result: AIEventResult;
    eventId: string | null;
}

export async function processAICommand(input: AICommandInput): Promise<AICommandOutput> {
    const parsed = parseCommand(input.command);

    // Build the result
    let result: AIEventResult;

    // Handle blocked trust operations
    if (parsed.intent === 'trust_operation_blocked') {
        result = {
            intent: 'blocked',
            proposed_actions: [],
            explanation: '⚠️ **Trust operations cannot be executed by AI.**\n\nFor security and compliance reasons, all trust account transactions (deposits, withdrawals, transfers) must be performed manually by an authorized user.\n\nThe AI can help you:\n- View trust account balances\n- Identify reconciliation discrepancies\n- Draft transaction documentation\n\nBut the actual movement of funds requires human confirmation.',
            requires_confirmation: false,
        };
    }
    // Handle unknown intents
    else if (parsed.intent === 'unknown' || parsed.confidence < 0.5) {
        result = {
            intent: 'clarify',
            proposed_actions: [],
            explanation: `I'm not sure what you'd like me to do. Here are some things I can help with:\n\n• **"Create a client for [name]"** - Add a new client\n• **"Create a matter for [client/description]"** - Open a new case\n• **"Start a timer for [matter]"** - Begin tracking time\n• **"Draft an invoice for unbilled time"** - Prepare an invoice\n• **"What matters are at risk?"** - Show matters needing attention\n• **"Create a task [description]"** - Add a task to a matter`,
            requires_confirmation: false,
        };
    }
    // Handle query intents (no action needed)
    else if (parsed.intent.startsWith('query_')) {
        result = buildQueryResult(parsed, input.context);
    }
    // Handle action intents
    else {
        result = buildActionResult(parsed, input.context);
    }

    // Log the AI event
    const { data: eventData, error } = await supabase
        .from('ai_events')
        .insert({
            firm_id: input.firmId,
            user_id: input.userId,
            context: input.context,
            prompt: input.command,
            result: result,
            executed: false,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Failed to log AI event:', error);
    }

    return {
        success: true,
        result,
        eventId: eventData?.id || null,
    };
}

function buildQueryResult(parsed: ParsedIntent, context: AIEventContext): AIEventResult {
    switch (parsed.intent) {
        case 'query_risk':
            return {
                intent: 'query',
                proposed_actions: [],
                explanation: 'I\'ll analyze your matters for potential risks. This includes:\n\n• Matters with no activity in the last 30 days\n• Overdue tasks\n• Trust accounts with unusual activity\n• High unbilled work-in-progress\n\n*Navigating to Risk & Opportunities panel...*',
                requires_confirmation: false,
            };

        case 'query_unbilled':
            return {
                intent: 'query',
                proposed_actions: [],
                explanation: 'Fetching your unbilled time summary...\n\n*View the Dashboard for a complete breakdown by matter and client.*',
                requires_confirmation: false,
            };

        default:
            return {
                intent: 'query',
                proposed_actions: [],
                explanation: 'Processing your query...',
                requires_confirmation: false,
            };
    }
}

function buildActionResult(parsed: ParsedIntent, context: AIEventContext): AIEventResult {
    const actions: AIAction[] = [];
    let explanation = '';
    let requiresConfirmation = false;

    switch (parsed.intent) {
        case 'create_client':
            actions.push({
                type: 'create',
                entity_type: 'client',
                data: { name: parsed.entities.name || 'New Client' },
            });
            explanation = parsed.entities.name
                ? `Ready to create a new client: **${parsed.entities.name}**\n\nI'll open the client form so you can add contact details.`
                : 'I\'ll open the new client form for you.';
            break;

        case 'create_matter':
            actions.push({
                type: 'create',
                entity_type: 'matter',
                data: { name: parsed.entities.name || 'New Matter' },
            });
            explanation = parsed.entities.name
                ? `Ready to open a new matter: **${parsed.entities.name}**\n\nI'll open the matter form so you can select the client and set billing type.`
                : 'I\'ll open the new matter form for you.';
            break;

        case 'start_timer':
            actions.push({
                type: 'create',
                entity_type: 'time_entry',
                data: { matter_name: parsed.entities.matter || '' },
            });
            explanation = parsed.entities.matter
                ? `Ready to start tracking time on **${parsed.entities.matter}**.\n\nI'll open the time entry form with this matter selected.`
                : context.selected_matter_id
                    ? 'Ready to start tracking time on the current matter.'
                    : 'Which matter would you like to track time for?';
            break;

        case 'draft_invoice':
            requiresConfirmation = true;
            actions.push({
                type: 'create',
                entity_type: 'invoice',
                data: { timeframe: parsed.entities.timeframe },
            });
            explanation = `📋 **Invoice Draft Request**\n\nI'll gather all unbilled time entries and prepare a draft invoice.\n\n**Before I proceed, please confirm:**\n- Which client to invoice\n- The date range for unbilled time\n\n⚠️ *The invoice will be created as a draft. You must review and finalize it manually.*`;
            break;

        case 'create_task':
            actions.push({
                type: 'create',
                entity_type: 'task',
                data: { title: parsed.entities.title || '' },
            });
            explanation = parsed.entities.title
                ? `Ready to create task: **${parsed.entities.title}**`
                : 'I\'ll open the task form for you.';
            if (!context.selected_matter_id) {
                explanation += '\n\n*Please select a matter to add the task to.*';
            }
            break;
    }

    return {
        intent: parsed.intent,
        proposed_actions: actions,
        explanation,
        requires_confirmation: requiresConfirmation,
    };
}

// ============================================================================
// Execute AI Action (with guardrails)
// ============================================================================
export async function executeAIAction(
    action: AIAction,
    eventId: string,
    firmId: string,
    userId: string
): Promise<{ success: boolean; message: string; data?: unknown }> {
    const actionKey = `${action.type}_${action.entity_type}`;

    // Check if action is allowed
    if (FORBIDDEN_AI_ACTIONS.has(actionKey) || FORBIDDEN_AI_ACTIONS.has(action.entity_type)) {
        return {
            success: false,
            message: 'This action cannot be executed by AI for security reasons.',
        };
    }

    // Log the execution attempt
    await supabase.from('audit_logs').insert({
        firm_id: firmId,
        actor_user_id: userId,
        source: 'ai',
        action: `ai_execute_${actionKey}`,
        entity_type: action.entity_type,
        payload: { ai_event_id: eventId, action_data: action.data },
    });

    // Mark the event as executed
    await supabase
        .from('ai_events')
        .update({ executed: true })
        .eq('id', eventId);

    return {
        success: true,
        message: `Action queued: ${action.type} ${action.entity_type}`,
        data: action.data,
    };
}

// ============================================================================
// AI Suggestions (Proactive)
// ============================================================================
export interface TimeSuggestion {
    type: 'time_suggestion';
    matter_id: string;
    matter_name: string;
    suggested_hours: number;
    suggested_description: string;
    reason: string;
}

export interface InvoiceWarning {
    type: 'invoice_warning';
    invoice_id: string;
    warning_type: 'large_block' | 'vague_description' | 'amount_spike';
    message: string;
    severity: 'low' | 'medium' | 'high';
}

export interface MatterHealthScore {
    matter_id: string;
    score: number; // 0-100
    factors: {
        days_since_activity: number;
        overdue_tasks: number;
        unbilled_amount: number;
        upcoming_deadlines: number;
    };
    recommendations: string[];
}

// Mock function to generate time suggestions
export function generateTimeSuggestions(): TimeSuggestion[] {
    // In a real implementation, this would analyze calendar events,
    // recent activity, and patterns to suggest time entries
    return [];
}

// Mock function to check invoice for issues
export function checkInvoiceForWarnings(
    lineItems: { description: string; hours: number; amount: number }[]
): InvoiceWarning[] {
    const warnings: InvoiceWarning[] = [];

    for (const item of lineItems) {
        // Check for vague descriptions
        const vaguePatterns = [
            /^work$/i,
            /^research$/i,
            /^meeting$/i,
            /^call$/i,
            /^review$/i,
            /^misc/i,
            /^various/i,
        ];

        if (vaguePatterns.some(p => p.test(item.description.trim()))) {
            warnings.push({
                type: 'invoice_warning',
                invoice_id: '',
                warning_type: 'vague_description',
                message: `The description "${item.description}" may be too vague. Consider adding more detail.`,
                severity: 'medium',
            });
        }

        // Check for large block billing
        if (item.hours >= 8) {
            warnings.push({
                type: 'invoice_warning',
                invoice_id: '',
                warning_type: 'large_block',
                message: `Block billing of ${item.hours} hours may be questioned. Consider breaking into smaller entries.`,
                severity: 'medium',
            });
        }
    }

    return warnings;
}

// Mock function to calculate matter health score
export function calculateMatterHealth(
    daysSinceActivity: number,
    overdueTasks: number,
    unbilledAmount: number,
    upcomingDeadlines: number
): MatterHealthScore {
    let score = 100;
    const recommendations: string[] = [];

    // Penalize for inactivity
    if (daysSinceActivity > 30) {
        score -= 30;
        recommendations.push('No activity in over 30 days. Consider following up with the client.');
    } else if (daysSinceActivity > 14) {
        score -= 15;
        recommendations.push('No recent activity. Review matter status.');
    }

    // Penalize for overdue tasks
    if (overdueTasks > 0) {
        score -= overdueTasks * 10;
        recommendations.push(`${overdueTasks} overdue task(s) need attention.`);
    }

    // Penalize for high unbilled WIP
    if (unbilledAmount > 10000) {
        score -= 20;
        recommendations.push('High unbilled work-in-progress. Consider invoicing soon.');
    } else if (unbilledAmount > 5000) {
        score -= 10;
        recommendations.push('Review unbilled time for invoicing.');
    }

    // Boost for upcoming deadlines (shows active matter)
    if (upcomingDeadlines > 0) {
        recommendations.push(`${upcomingDeadlines} upcoming deadline(s) in the next 14 days.`);
    }

    return {
        matter_id: '',
        score: Math.max(0, score),
        factors: {
            days_since_activity: daysSinceActivity,
            overdue_tasks: overdueTasks,
            unbilled_amount: unbilledAmount,
            upcoming_deadlines: upcomingDeadlines,
        },
        recommendations,
    };
}
