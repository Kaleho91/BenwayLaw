import type { CanadianProvince } from '../types/enums.js';

/**
 * Canadian tax rates by province
 * Updated for 2024 rates
 */
export interface TaxRates {
    gst: number; // Federal GST (5%)
    pst: number; // Provincial Sales Tax
    hst: number; // Harmonized Sales Tax (replaces GST+PST in some provinces)
    qst: number; // Quebec Sales Tax
}

const TAX_RATES: Record<CanadianProvince, TaxRates> = {
    // HST provinces
    ON: { gst: 0, pst: 0, hst: 0.13, qst: 0 }, // Ontario 13%
    NB: { gst: 0, pst: 0, hst: 0.15, qst: 0 }, // New Brunswick 15%
    NL: { gst: 0, pst: 0, hst: 0.15, qst: 0 }, // Newfoundland 15%
    NS: { gst: 0, pst: 0, hst: 0.15, qst: 0 }, // Nova Scotia 15%
    PE: { gst: 0, pst: 0, hst: 0.15, qst: 0 }, // PEI 15%

    // GST + PST provinces
    BC: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 }, // BC 5% + 7%
    MB: { gst: 0.05, pst: 0.07, hst: 0, qst: 0 }, // Manitoba 5% + 7%
    SK: { gst: 0.05, pst: 0.06, hst: 0, qst: 0 }, // Saskatchewan 5% + 6%

    // Quebec (GST + QST)
    QC: { gst: 0.05, pst: 0, hst: 0, qst: 0.09975 }, // Quebec 5% + 9.975%

    // GST only (no provincial tax)
    AB: { gst: 0.05, pst: 0, hst: 0, qst: 0 }, // Alberta 5%
    NT: { gst: 0.05, pst: 0, hst: 0, qst: 0 }, // Northwest Territories 5%
    NU: { gst: 0.05, pst: 0, hst: 0, qst: 0 }, // Nunavut 5%
    YT: { gst: 0.05, pst: 0, hst: 0, qst: 0 }, // Yukon 5%
};

/**
 * Get tax rates for a Canadian province
 */
export function getTaxRates(province: CanadianProvince): TaxRates {
    return TAX_RATES[province];
}

/**
 * Calculate taxes for an amount based on province
 */
export interface TaxCalculation {
    subtotal: number;
    gst: number;
    pst: number;
    hst: number;
    qst: number;
    total: number;
}

export function calculateTaxes(subtotal: number, province: CanadianProvince): TaxCalculation {
    const rates = getTaxRates(province);

    // Round to 2 decimal places
    const round = (n: number) => Math.round(n * 100) / 100;

    const gst = round(subtotal * rates.gst);
    const pst = round(subtotal * rates.pst);
    const hst = round(subtotal * rates.hst);
    // QST in Quebec is calculated on the subtotal only (not on GST)
    const qst = round(subtotal * rates.qst);

    const total = round(subtotal + gst + pst + hst + qst);

    return {
        subtotal: round(subtotal),
        gst,
        pst,
        hst,
        qst,
        total,
    };
}

/**
 * Format tax breakdown for display based on province
 * Returns only the relevant taxes for that province
 */
export function formatTaxBreakdown(
    calc: TaxCalculation,
    province: CanadianProvince,
): { label: string; amount: number }[] {
    const result: { label: string; amount: number }[] = [];

    if (calc.hst > 0) {
        result.push({ label: 'HST (13%)', amount: calc.hst });
    }
    if (calc.gst > 0) {
        result.push({ label: 'GST (5%)', amount: calc.gst });
    }
    if (calc.pst > 0) {
        const pstRate = province === 'BC' ? '7%' : province === 'MB' ? '7%' : '6%';
        result.push({ label: `PST (${pstRate})`, amount: calc.pst });
    }
    if (calc.qst > 0) {
        result.push({ label: 'QST (9.975%)', amount: calc.qst });
    }

    return result;
}

/**
 * Format currency in CAD
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
    }).format(amount);
}
