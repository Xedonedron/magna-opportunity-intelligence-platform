/**
 * Pillar Classifier Engine for MOIP Prospecting
 * Classifies job titles into Magna's 4 core solution pillars using smart regex word-boundary matching.
 * Solusi riil terpetakan langsung ke: backend/app/core/solutions_catalog.py
 */

export type PillarId = 'data' | 'security' | 'cloud' | 'network';

export interface PillarMetadata {
    id: PillarId;
    title: string;
    shortLabel: string;
    badgeLabel: string;
    badgeClass: string;
    outlineClass: string;
    textColor: string;
}

export interface JobTitleClassification {
    title: string;
    isTarget: boolean;
    pillarId: PillarId | null;
    pillarLabel: string | null;
    badgeLabel: string | null;
    badgeClass: string;
    outlineClass: string;
    textColor: string;
}

export const MAGNA_PILLARS: Record<PillarId, PillarMetadata> = {
    security: {
        id: 'security',
        title: 'Cybersecurity Suite',
        shortLabel: 'Security',
        badgeLabel: '[Security]',
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        outlineClass: 'border-rose-400 dark:border-rose-600',
        textColor: 'text-rose-600 dark:text-rose-400',
    },
    data: {
        id: 'data',
        title: 'Data Analytics & AI',
        shortLabel: 'Data & AI',
        badgeLabel: '[Data & AI]',
        badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        outlineClass: 'border-purple-400 dark:border-purple-600',
        textColor: 'text-purple-600 dark:text-purple-400',
    },
    cloud: {
        id: 'cloud',
        title: 'Cloud Infrastructure & Modernization',
        shortLabel: 'Cloud Infra',
        badgeLabel: '[Cloud Infra]',
        badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        outlineClass: 'border-sky-400 dark:border-sky-600',
        textColor: 'text-sky-600 dark:text-sky-400',
    },
    network: {
        id: 'network',
        title: 'Network & Enterprise Workplace',
        shortLabel: 'Network',
        badgeLabel: '[Network]',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        outlineClass: 'border-emerald-400 dark:border-emerald-600',
        textColor: 'text-emerald-600 dark:text-emerald-400',
    },
};

// Regex patterns with word boundaries (\b...\b) to prevent false positives (e.g., "lan" in "penjualan")
//
// DESIGN RULES:
// 1. "analyst" alone is ambiguous — only match when paired with a tech context keyword
//    (data, bi, soc, threat, security, it, infosec, etc.)
// 2. "risk" alone is ambiguous — only match when paired with IT/security context
//    Use lookahead-free approach: include compound forms like "it risk", "cyber risk",
//    "security risk" explicitly. Pure "risk" omitted.
// 3. "compliance" alone matches legal/finance compliance — only match as "it compliance"
//    or when already in a security context title.
// 4. "network" in "network marketing" or similar — word boundary already handles it;
//    keep as-is since "Network Marketing Manager" contains "network" but we accept
//    this edge case as acceptable tradeoff for coverage.
// 5. "cloud" in "cloud kitchen" — similar tradeoff accepted; cloud kitchen is rare
//    in B2B IT prospecting context.
// 6. "sre" alone needs full-word match and is rare standalone — add "site reliability".
// 7. "cybersecurity" as one word needs to be in regex (not just "cyber").
// 8. "service desk" must be matched before "analyst" can steal the pillar.
const PILLAR_REGEX: { id: PillarId; regex: RegExp }[] = [
    // 1. Cybersecurity Suite (High Priority matching)
    // "compliance" only matches with "it" prefix to avoid legal/regulatory false positives
    // "risk" only in compound IT/security context ("it risk", "cyber risk", "security risk")
    // "analyst" covered only via "soc analyst" or security-branded compound (e.g., threat intelligence analyst)
    {
        id: 'security',
        regex: /\b(cybersecurity|ciso|soc|cyber(?![\s\-]?kitchen)|infosec|information security|it compliance|iam|threat|firewall|vulnerability|penetration|secops|privileged access|endpoint security|beyondtrust|edr|siem|it risk|cyber risk|security risk|security engineer|security architect|security manager|security analyst|security specialist|security officer)\b/i,
    },
    // 2. Data Analytics & AI
    // "analyst" is only matched via specific tech compounds:
    //   - data analyst, bi analyst, soc analyst (already security), it analyst, systems analyst
    //   - generic "analyst" alone is EXCLUDED to prevent: Financial Analyst, Budget Analyst, etc.
    // "bi" standalone still matches (Business Intelligence abbreviation — acceptable)
    // "ai" standalone still matches (intentional — AI Engineer, AI Specialist)
    {
        id: 'data',
        regex: /\b(data(?!\s+(center|storage|center))|analytics|data analyst|bi analyst|bi developer|bi engineer|it analyst|it business analyst|systems analyst|system analyst|business intelligence|data scientist|data engineer|database|dba|machine learning|ml engineer|big data|data architect|etl|lakehouse|data warehouse|databricks|snowflake|bigquery|ai engineer|ai specialist|ai architect|ai developer|ml specialist)\b/i,
    },
    // 3. Cloud Infrastructure & Modernization
    // "sre" → add "site reliability" as well for full title match
    // "server" retained (server engineer, server admin is clear IT)
    {
        id: 'cloud',
        regex: /\b(cloud(?!\s+kitchen)|infrastructure|infra|devops|sre|site reliability|sysadmin|system administrator|virtualization|server|datacenter|data center|storage|platform engineer|solution architect|hci|gke|kubernetes|nutanix|vmware)\b/i,
    },
    // 4. Network & Enterprise Workplace
    // "service desk" listed first in regex ensures it can match without analyst confusion
    {
        id: 'network',
        regex: /\b(network(?!\s+marketing)|networking|noc|telecom|telecommunication|wan|lan|switching|routing|workplace|workspace|it support|it operations|service desk|helpdesk|cisco|aruba)\b/i,
    },
];

/**
 * Classifies a raw job title into one of Magna's solution pillars.
 * If no match, returns isTarget: false with normal styling attributes.
 */
export function classifyJobTitle(title: string): JobTitleClassification {
    const trimmed = (title || '').trim();
    if (!trimmed) {
        return {
            title: '',
            isTarget: false,
            pillarId: null,
            pillarLabel: null,
            badgeLabel: null,
            badgeClass: '',
            outlineClass: '',
            textColor: 'text-zinc-700 dark:text-zinc-300',
        };
    }

    for (const item of PILLAR_REGEX) {
        if (item.regex.test(trimmed)) {
            const meta = MAGNA_PILLARS[item.id];
            return {
                title: trimmed,
                isTarget: true,
                pillarId: item.id,
                pillarLabel: meta.shortLabel,
                badgeLabel: meta.badgeLabel,
                badgeClass: meta.badgeClass,
                outlineClass: meta.outlineClass,
                textColor: meta.textColor,
            };
        }
    }

    // Non-target: Regular normal formatting
    return {
        title: trimmed,
        isTarget: false,
        pillarId: null,
        pillarLabel: null,
        badgeLabel: null,
        badgeClass: '',
        outlineClass: '',
        textColor: 'text-zinc-700 dark:text-zinc-300',
    };
}
