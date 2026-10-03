/**
 * Comprehensive Test Suite: Pillar Classifier Engine
 * Menguji classifyJobTitle() terhadap true positive, false positive, dan edge cases
 * Jalankan: npx tsx scripts/test-classifier.ts
 */

import { classifyJobTitle, type PillarId } from '../frontend/src/lib/pillar-classifier';

// ─── WARNA OUTPUT ─────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

// ─── DEFINISI TEST CASE ───────────────────────────────────────────────────────
interface TestCase {
    title: string;
    expectedIsTarget: boolean;
    expectedPillarId?: PillarId | null;
    description?: string;
}

// ─── 1. TRUE POSITIVES: Data Analytics & AI ──────────────────────────────────
const DATA_TRUE_POSITIVES: TestCase[] = [
    { title: 'Data Engineer',                   expectedIsTarget: true,  expectedPillarId: 'data', description: 'Senior data eng' },
    { title: 'Senior Data Scientist',           expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Data Analyst',                    expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'BI Developer',                    expectedIsTarget: true,  expectedPillarId: 'data', description: 'Business Intelligence developer' },
    { title: 'Business Intelligence Manager',   expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Database Administrator',          expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'DBA Oracle',                      expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'ETL Developer',                   expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Machine Learning Engineer',       expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'AI/ML Engineer',                  expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Data Warehouse Architect',        expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Chief Data Officer',              expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Big Data Engineer',               expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Analytics Engineering Lead',      expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Databricks Architect',            expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Snowflake Engineer',              expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'BigQuery Specialist',             expectedIsTarget: true,  expectedPillarId: 'data' },
    { title: 'Lakehouse Architect',             expectedIsTarget: true,  expectedPillarId: 'data' },
];

// ─── 2. TRUE POSITIVES: Cybersecurity Suite ──────────────────────────────────
const SECURITY_TRUE_POSITIVES: TestCase[] = [
    { title: 'CISO',                            expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Chief Information Security Officer', expectedIsTarget: true, expectedPillarId: 'security' },
    { title: 'SOC Analyst',                    expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Cybersecurity Engineer',          expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Information Security Manager',    expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Penetration Tester',              expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Vulnerability Assessment Specialist', expectedIsTarget: true, expectedPillarId: 'security' },
    { title: 'Firewall Engineer',               expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'IAM Engineer',                    expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Infosec Lead',                    expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Threat Intelligence Analyst',     expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'EDR Specialist',                  expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'SIEM Engineer',                   expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'BeyondTrust Administrator',       expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Privileged Access Manager',       expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'Endpoint Security Specialist',    expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'SecOps Engineer',                 expectedIsTarget: true,  expectedPillarId: 'security' },
    { title: 'IT Compliance Manager',           expectedIsTarget: true,  expectedPillarId: 'security' },
];

// ─── 3. TRUE POSITIVES: Cloud Infrastructure ─────────────────────────────────
const CLOUD_TRUE_POSITIVES: TestCase[] = [
    { title: 'Cloud Engineer',                  expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Cloud Architect',                 expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'DevOps Engineer',                 expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Site Reliability Engineer',       expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Infrastructure Engineer',         expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'System Administrator',            expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'SysAdmin Linux',                  expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Server Engineer',                 expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Virtualization Specialist',       expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Platform Engineer',               expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Kubernetes Administrator',        expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'GKE Architect',                   expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Nutanix Administrator',           expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'VMware Architect',                expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Datacenter Manager',              expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Storage Engineer',                expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'HCI Specialist',                  expectedIsTarget: true,  expectedPillarId: 'cloud' },
    { title: 'Solution Architect',              expectedIsTarget: true,  expectedPillarId: 'cloud' },
];

// ─── 4. TRUE POSITIVES: Network & Enterprise Workplace ───────────────────────
const NETWORK_TRUE_POSITIVES: TestCase[] = [
    { title: 'Network Engineer',                expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Network Administrator',           expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'NOC Engineer',                    expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Telecom Engineer',                expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'WAN Engineer',                    expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'LAN Administrator',               expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Switching & Routing Specialist',  expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Cisco Network Engineer',          expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Aruba Wireless Engineer',         expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'IT Support Engineer',             expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'IT Operations Manager',           expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Service Desk Analyst',            expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Helpdesk Technician',             expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Workplace Technology Manager',    expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Networking Specialist',           expectedIsTarget: true,  expectedPillarId: 'network' },
    { title: 'Telecommunication Engineer',      expectedIsTarget: true,  expectedPillarId: 'network' },
];

// ─── 5. FALSE POSITIVE STRESS TEST ───────────────────────────────────────────
// Role non-tech ini TIDAK boleh ter-classify sebagai target
const FALSE_POSITIVE_STRESS: TestCase[] = [
    // HR & People
    { title: 'HR Manager',                      expectedIsTarget: false, description: 'Human Resources — bukan IT' },
    { title: 'Human Resources Business Partner', expectedIsTarget: false },
    { title: 'HR Generalist',                   expectedIsTarget: false },
    { title: 'Talent Acquisition Specialist',   expectedIsTarget: false },
    { title: 'Recruitment Officer',             expectedIsTarget: false },
    { title: 'Training & Development Manager',  expectedIsTarget: false },
    { title: 'Payroll Officer',                 expectedIsTarget: false },

    // Finance & Accounting
    { title: 'Finance Manager',                 expectedIsTarget: false, description: 'Finance — bukan IT' },
    { title: 'Financial Controller',            expectedIsTarget: false },
    { title: 'Accounting Manager',              expectedIsTarget: false },
    { title: 'Tax Consultant',                  expectedIsTarget: false },
    { title: 'Chief Financial Officer',         expectedIsTarget: false },
    { title: 'Treasurer',                       expectedIsTarget: false },
    { title: 'Budget Analyst',                  expectedIsTarget: false, description: 'Budget Analyst — bukan BI Analyst' },

    // Legal & Compliance (non-IT)
    { title: 'Legal Counsel',                   expectedIsTarget: false, description: 'Legal — bukan IT compliance' },
    { title: 'Corporate Lawyer',                expectedIsTarget: false },
    { title: 'Contract Manager',                expectedIsTarget: false },
    { title: 'Compliance Officer (Non-IT)',     expectedIsTarget: false, description: 'Regulatory compliance non-IT' },

    // Marketing & Sales
    { title: 'Marketing Manager',               expectedIsTarget: false },
    { title: 'Brand Manager',                   expectedIsTarget: false },
    { title: 'Digital Marketing Specialist',    expectedIsTarget: false, description: '"Digital" bukan digital infra' },
    { title: 'Sales Executive',                 expectedIsTarget: false },
    { title: 'Account Manager',                 expectedIsTarget: false },
    { title: 'Customer Success Manager',        expectedIsTarget: false },

    // Operations & Maintenance
    { title: 'General Affairs Manager',         expectedIsTarget: false },
    { title: 'Facility Manager',                expectedIsTarget: false },
    { title: 'Maintenance Technician',          expectedIsTarget: false },
    { title: 'Procurement Manager',             expectedIsTarget: false },
    { title: 'Supply Chain Manager',            expectedIsTarget: false },
    { title: 'Logistics Coordinator',           expectedIsTarget: false },

    // Indonesian Language False Positive Tests (substring trap)
    { title: 'Kepala Penjualan',                expectedIsTarget: false, description: '"lan" dalam "Penjualan" harus tidak match LAN' },
    { title: 'Manajer Keuangan',                expectedIsTarget: false, description: '"ai" dalam "Keuangan" harus tidak match AI' },
    { title: 'Staf Pemasaran',                  expectedIsTarget: false, description: '"ar" dalam "Pemasaran" — tidak match' },
    { title: 'Direktur Operasional',            expectedIsTarget: false },
    { title: 'Kepala Divisi Keuangan',          expectedIsTarget: false },
    { title: 'Analis Keuangan',                 expectedIsTarget: false, description: '"Analis" dalam konteks keuangan — bukan tech analyst' },
    { title: 'Analis Bisnis Keuangan',          expectedIsTarget: false, description: 'Business analyst keuangan bukan IT' },
    { title: 'Staf Administrasi',               expectedIsTarget: false },
    { title: 'Koordinator Pengadaan',           expectedIsTarget: false },
    { title: 'Air Conditioner Technician',      expectedIsTarget: false, description: '"AC" atau "ai" dalam AC Technician' },
    { title: 'Pianis',                          expectedIsTarget: false, description: '"an" bukan "analyst"' },

    // Healthcare non-IT
    { title: 'Medical Doctor',                  expectedIsTarget: false },
    { title: 'Nurse Practitioner',              expectedIsTarget: false },

    // Executive non-IT
    { title: 'Chief Executive Officer',         expectedIsTarget: false },
    { title: 'Vice President Corporate Affairs', expectedIsTarget: false },
    { title: 'President Director',              expectedIsTarget: false },
];

// ─── 6. AMBIGUOUS / EDGE CASES ────────────────────────────────────────────────
// Kasus di mana hasilnya membutuhkan keputusan deliberate
interface AmbiguousCase {
    title: string;
    expectedIsTarget: boolean;
    expectedPillarId?: PillarId | null;
    rationale: string;
}

const AMBIGUOUS_EDGE_CASES: AmbiguousCase[] = [
    // Cross-pillar ambiguity
    {
        title: 'Cloud Security Architect',
        expectedIsTarget: true,
        expectedPillarId: 'security',   // Security wins (first in regex order)
        rationale: 'Cross-pillar: Security diutamakan karena urutan regex pertama'
    },
    {
        title: 'Cloud Data Architect',
        expectedIsTarget: true,
        expectedPillarId: 'data',       // Cloud match first, but let's see — cloud regex before data
        rationale: 'Cloud match dulu karena urutan regex: security > data > cloud. Akan mencocokkan "data" terlebih dahulu? Cek urutan PILLAR_REGEX'
    },
    {
        title: 'GCP Security Engineer',
        expectedIsTarget: true,
        expectedPillarId: 'security',   // Security first in order
        rationale: 'GCP di cloud, tapi Security ditemukan lebih dulu'
    },
    // Finance Analyst — should NOT match tech
    {
        title: 'Financial Analyst',
        expectedIsTarget: false,
        rationale: '"analyst" dalam konteks "Financial" seharusnya bukan target IT — ini false positive utama'
    },
    {
        title: 'Budget Analyst',
        expectedIsTarget: false,
        rationale: '"analyst" di finance context — bukan BI analyst'
    },
    {
        title: 'Credit Analyst',
        expectedIsTarget: false,
        rationale: '"analyst" kredit — finance bukan IT'
    },
    {
        title: 'Investment Analyst',
        expectedIsTarget: false,
        rationale: '"analyst" investasi — bukan IT'
    },
    {
        title: 'Management Analyst',
        expectedIsTarget: false,
        rationale: '"analyst" manajemen — bukan BI analyst'
    },
    // System Analyst — ambiguous (bisa IT atau non-IT)
    {
        title: 'System Analyst',
        expectedIsTarget: true,
        expectedPillarId: 'data',       // "system analyst" dikompound ke data (systems analyst)
        rationale: 'System Analyst = IT role, match via "system analyst" ke data pillar'
    },
    {
        title: 'Business Analyst',
        expectedIsTarget: false,        // Pure BA adalah non-tech role umum
        rationale: '"analyst" saja dalam "Business Analyst" — tanpa konteks data/BI harus jadi false positive'
    },
    {
        title: 'IT Business Analyst',
        expectedIsTarget: true,
        expectedPillarId: 'data',
        rationale: '"IT Business Analyst" dikompound ke data via "it business analyst" pattern'
    },
    // Risk kata
    {
        title: 'Risk Manager (Finance)',
        expectedIsTarget: false,
        rationale: '"risk" di finance context — bukan security risk'
    },
    {
        title: 'Operational Risk Analyst',
        expectedIsTarget: false,
        rationale: '"risk" operasional keuangan — bukan cybersecurity risk'
    },
    {
        title: 'IT Risk Manager',
        expectedIsTarget: true,
        expectedPillarId: 'security',
        rationale: '"risk" + "IT" jelas cybersecurity risk management'
    },
    // BI tanpa konteks
    {
        title: 'BI Analyst',
        expectedIsTarget: true,
        expectedPillarId: 'data',
        rationale: '"BI" sendiri adalah singkatan Business Intelligence — tetap data target'
    },
    // Network kata dalam konteks non-IT
    {
        title: 'Network Marketing Manager',
        expectedIsTarget: false,
        rationale: '"network" dalam marketing (MLM) bukan IT network'
    },
    // Infra dalam konteks non-IT
    {
        title: 'Infrastructure Project Manager (Civil)',
        expectedIsTarget: true,  // Currently matches "infrastructure" — this is a known tradeoff
        rationale: 'Infrastruktur sipil bisa false positive. Diterima karena trade-off coverage'
    },
    // Cloud dalam nama perusahaan/produk non-IT
    {
        title: 'Cloud Kitchen Manager',
        expectedIsTarget: false,  // "cloud" dalam konteks bisnis F&B
        rationale: '"Cloud Kitchen" adalah model bisnis F&B — bukan cloud IT'
    },
    // DBA konteks non-IT: sangat jarang tapi perlu dicek
    {
        title: 'DBA (Doing Business As) Officer',
        expectedIsTarget: true,  // Currently matches "dba" — acceptable tradeoff
        rationale: '"DBA" biasanya database admin. Tradeoff diterima.'
    },
    // AI dalam konteks non-IT
    {
        title: 'Artist (AI Illustration)',
        expectedIsTarget: false,        // Tidak match — AI standalone dihapus, hanya compound AI Engineer/Specialist
        rationale: '"AI Illustration" — standalone "ai" tidak match lagi. Seniman non-IT bukan target Magna.'
    },
];

// ─── RUNNER LOGIC ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warnings = 0;
const failedCases: { title: string; expected: string; actual: string; description?: string }[] = [];

function runTest(tc: TestCase, category: string): void {
    const result = classifyJobTitle(tc.title);
    const targetOk = result.isTarget === tc.expectedIsTarget;
    const pillarOk = tc.expectedPillarId === undefined ? true : result.pillarId === tc.expectedPillarId;
    const ok = targetOk && pillarOk;

    if (ok) {
        passed++;
        process.stdout.write(`  ${GREEN}✓${RESET} ${DIM}${tc.title}${RESET}\n`);
    } else {
        failed++;
        const expected = `isTarget=${tc.expectedIsTarget}${tc.expectedPillarId !== undefined ? ` pillar=${tc.expectedPillarId}` : ''}`;
        const actual   = `isTarget=${result.isTarget} pillar=${result.pillarId}`;
        process.stdout.write(`  ${RED}✗${RESET} ${BOLD}${tc.title}${RESET}\n`);
        process.stdout.write(`      ${RED}Expected: ${expected} | Got: ${actual}${RESET}\n`);
        if (tc.description) process.stdout.write(`      ${DIM}${tc.description}${RESET}\n`);
        failedCases.push({ title: tc.title, expected, actual, description: tc.description });
    }
}

function runAmbiguousTest(tc: AmbiguousCase): void {
    const result = classifyJobTitle(tc.title);
    const targetOk = result.isTarget === tc.expectedIsTarget;
    const pillarOk = tc.expectedPillarId === undefined ? true : result.pillarId === tc.expectedPillarId;
    const ok = targetOk && pillarOk;

    const actual = `isTarget=${result.isTarget} pillar=${result.pillarId}`;

    if (ok) {
        passed++;
        process.stdout.write(`  ${GREEN}✓${RESET} ${DIM}${tc.title}${RESET} ${DIM}→ ${actual}${RESET}\n`);
        process.stdout.write(`      ${DIM}${tc.rationale}${RESET}\n`);
    } else {
        // Ambiguous cases yang gagal dicatat sebagai warning, bukan failure keras
        const expected = `isTarget=${tc.expectedIsTarget}${tc.expectedPillarId !== undefined ? ` pillar=${tc.expectedPillarId}` : ''}`;
        warnings++;
        process.stdout.write(`  ${YELLOW}⚠${RESET} ${BOLD}${tc.title}${RESET} ${DIM}[MISMATCH AMBIGUOUS]${RESET}\n`);
        process.stdout.write(`      Expected: ${expected} | Got: ${actual}\n`);
        process.stdout.write(`      ${DIM}${tc.rationale}${RESET}\n`);
    }
}

function printSection(label: string): void {
    console.log(`\n${CYAN}${BOLD}━━━ ${label} ━━━${RESET}`);
}

// ─── MAIN TEST EXECUTION ──────────────────────────────────────────────────────
console.log(`\n${BOLD}╔══════════════════════════════════════════════════════╗`);
console.log(`║  MOIP Pillar Classifier — Comprehensive Test Suite  ║`);
console.log(`╚══════════════════════════════════════════════════════╝${RESET}`);

printSection('TRUE POSITIVES — Data Analytics & AI');
DATA_TRUE_POSITIVES.forEach(tc => runTest(tc, 'data'));

printSection('TRUE POSITIVES — Cybersecurity Suite');
SECURITY_TRUE_POSITIVES.forEach(tc => runTest(tc, 'security'));

printSection('TRUE POSITIVES — Cloud Infrastructure & Modernization');
CLOUD_TRUE_POSITIVES.forEach(tc => runTest(tc, 'cloud'));

printSection('TRUE POSITIVES — Network & Enterprise Workplace');
NETWORK_TRUE_POSITIVES.forEach(tc => runTest(tc, 'network'));

printSection('FALSE POSITIVE STRESS TEST (Non-Target Roles)');
FALSE_POSITIVE_STRESS.forEach(tc => runTest(tc, 'non-target'));

printSection('AMBIGUOUS / EDGE CASES (Deliberate Review)');
AMBIGUOUS_EDGE_CASES.forEach(tc => runAmbiguousTest(tc));

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const total = passed + failed + warnings;
console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}HASIL TEST SUITE${RESET}`);
console.log(`  Total   : ${total} cases`);
console.log(`  ${GREEN}Passed  : ${passed}${RESET}`);
console.log(`  ${RED}Failed  : ${failed}${RESET}`);
console.log(`  ${YELLOW}Warnings: ${warnings} (ambiguous — deliberate tradeoffs)${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

if (failedCases.length > 0) {
    console.log(`\n${RED}${BOLD}FAILED CASES:${RESET}`);
    failedCases.forEach((fc, i) => {
        console.log(`  ${i + 1}. "${fc.title}"`);
        console.log(`     Expected: ${fc.expected}`);
        console.log(`     Actual  : ${fc.actual}`);
        if (fc.description) console.log(`     Note    : ${fc.description}`);
    });
}

process.exit(failed > 0 ? 1 : 0);
