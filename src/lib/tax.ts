// ============================================================================
// Canadian Tax Calculations
// ============================================================================

import type { CanadianProvince } from '@/types';

// Tax rates by province (as of 2024)
// HST provinces have combined HST, others have GST + PST
const TAX_RATES: Record<CanadianProvince, { gst: number; pst: number; hst: number }> = {
    // HST Provinces
    ON: { gst: 0, pst: 0, hst: 0.13 },     // Ontario 13% HST
    NB: { gst: 0, pst: 0, hst: 0.15 },     // New Brunswick 15% HST
    NL: { gst: 0, pst: 0, hst: 0.15 },     // Newfoundland 15% HST
    NS: { gst: 0, pst: 0, hst: 0.15 },     // Nova Scotia 15% HST
    PE: { gst: 0, pst: 0, hst: 0.15 },     // Prince Edward Island 15% HST

    // GST + PST Provinces
    BC: { gst: 0.05, pst: 0.07, hst: 0 },  // British Columbia 5% GST + 7% PST
    MB: { gst: 0.05, pst: 0.07, hst: 0 },  // Manitoba 5% GST + 7% PST (RST)
    SK: { gst: 0.05, pst: 0.06, hst: 0 },  // Saskatchewan 5% GST + 6% PST

    // GST + QST (Quebec)
    QC: { gst: 0.05, pst: 0.09975, hst: 0 }, // Quebec 5% GST + 9.975% QST

    // GST Only (No PST)
    AB: { gst: 0.05, pst: 0, hst: 0 },     // Alberta 5% GST only
    NT: { gst: 0.05, pst: 0, hst: 0 },     // Northwest Territories 5% GST
    NU: { gst: 0.05, pst: 0, hst: 0 },     // Nunavut 5% GST
    YT: { gst: 0.05, pst: 0, hst: 0 },     // Yukon 5% GST
};

export interface TaxBreakdown {
    subtotal: number;
    gst: number;
    pst: number;
    hst: number;
    total_tax: number;
    total: number;
}

/**
 * Calculate tax breakdown for a given subtotal and province
 */
export function calculateTax(subtotal: number, province: CanadianProvince): TaxBreakdown {
    const rates = TAX_RATES[province];

    // For HST provinces, only HST applies
    if (rates.hst > 0) {
        const hst = Math.round(subtotal * rates.hst * 100) / 100;
        return {
            subtotal,
            gst: 0,
            pst: 0,
            hst,
            total_tax: hst,
            total: subtotal + hst,
        };
    }

    // For GST/PST provinces
    const gst = Math.round(subtotal * rates.gst * 100) / 100;
    const pst = Math.round(subtotal * rates.pst * 100) / 100;
    const total_tax = gst + pst;

    return {
        subtotal,
        gst,
        pst,
        hst: 0,
        total_tax,
        total: subtotal + total_tax,
    };
}

/**
 * Get tax rate info for a province
 */
export function getTaxRates(province: CanadianProvince) {
    return TAX_RATES[province];
}

/**
 * Get a human-readable tax description for a province
 */
export function getTaxDescription(province: CanadianProvince): string {
    const rates = TAX_RATES[province];

    if (rates.hst > 0) {
        return `HST ${(rates.hst * 100).toFixed(0)}%`;
    }

    const parts: string[] = [];
    if (rates.gst > 0) {
        parts.push(`GST ${(rates.gst * 100).toFixed(0)}%`);
    }
    if (rates.pst > 0) {
        const pstLabel = province === 'QC' ? 'QST' : 'PST';
        parts.push(`${pstLabel} ${(rates.pst * 100).toFixed(2).replace(/\.00$/, '')}%`);
    }

    return parts.join(' + ');
}

/**
 * Province display names
 */
export const PROVINCE_NAMES: Record<CanadianProvince, string> = {
    AB: 'Alberta',
    BC: 'British Columbia',
    MB: 'Manitoba',
    NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia',
    NT: 'Northwest Territories',
    NU: 'Nunavut',
    ON: 'Ontario',
    PE: 'Prince Edward Island',
    QC: 'Quebec',
    SK: 'Saskatchewan',
    YT: 'Yukon',
};

/**
 * Get all provinces as options for select inputs
 */
export function getProvinceOptions() {
    return Object.entries(PROVINCE_NAMES).map(([code, name]) => ({
        value: code as CanadianProvince,
        label: name,
    }));
}
