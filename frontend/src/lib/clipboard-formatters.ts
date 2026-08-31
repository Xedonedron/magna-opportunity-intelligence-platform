/**
 * Utility functions to format KYC Reports and Target Persona Playbooks
 * into clean, structured Markdown strings for clipboard copying.
 */

import type { KYCReport } from "@/types/kyc";
import type { OpportunityPersona } from "@/types/persona";

/**
 * Format a KYC Report into structured Markdown.
 */
export function formatKYCToMarkdown(report: KYCReport, companyName?: string): string {
    const lines: string[] = [];
    const name = companyName || report.company_overview?.name || "Company";

    lines.push(`# Laporan Intelijen KYC - ${name}`);
    lines.push(`> Versi Laporan: v${report.version} | Status: ${report.status} | Tipe Sumber: ${report.source_type.replace(/_/g, " ")}`);
    lines.push("");

    // 1. Executive Summary
    if (report.executive_summary) {
        lines.push("## 1. Ringkasan Eksekutif (Executive Summary)");
        lines.push(report.executive_summary.trim());
        lines.push("");
    }

    // 2. Company Overview
    if (report.company_overview) {
        const co = report.company_overview;
        lines.push("## 2. Profil Perusahaan (Company Overview)");
        if (co.name) lines.push(`- **Nama Perusahaan**: ${co.name}`);
        if (co.founded) lines.push(`- **Tahun Berdiri**: ${co.founded}`);
        if (co.size) lines.push(`- **Ukuran / Jumlah Karyawan**: ${co.size}`);
        if (co.headquarters) lines.push(`- **Kantor Pusat**: ${co.headquarters}`);
        if (co.key_products && co.key_products.length > 0) {
            lines.push(`- **Produk & Layanan Utama**: ${co.key_products.join(", ")}`);
        }
        if (co.description) {
            lines.push(`- **Deskripsi Profil**: ${co.description}`);
        }
        lines.push("");
    }

    // 3. Industry Analysis
    if (report.industry_analysis) {
        lines.push("## 3. Analisis Industri (Industry Analysis)");
        lines.push(report.industry_analysis.trim());
        lines.push("");
    }

    // 4. Business Model
    if (report.business_model) {
        lines.push("## 4. Model Bisnis (Business Model)");
        lines.push(report.business_model.trim());
        lines.push("");
    }

    // 5. Company Location
    if (report.company_location) {
        lines.push("## 5. Lokasi & Jejak Operasional (Company Location)");
        lines.push(report.company_location.trim());
        lines.push("");
    }

    // 6. Competitor Analysis
    if (report.competitor_analysis && report.competitor_analysis.length > 0) {
        lines.push("## 6. Analisis Kompetitor (Competitor Analysis)");
        report.competitor_analysis.forEach((comp, idx) => {
            lines.push(`### ${idx + 1}. ${comp.name} (${comp.market_position || "Kompetitor"})`);
            if (comp.strengths && comp.strengths.length > 0) {
                lines.push("- **Keunggulan (Strengths)**:");
                comp.strengths.forEach((s) => lines.push(`  - ${s}`));
            }
            if (comp.weaknesses && comp.weaknesses.length > 0) {
                lines.push("- **Kelemahan / Celah Pasar (Weaknesses)**:");
                comp.weaknesses.forEach((w) => lines.push(`  - ${w}`));
            }
            if (comp.differentiators) {
                lines.push(`- **Faktor Pembeda (Differentiator)**: ${comp.differentiators}`);
            }
            lines.push("");
        });
    }

    // 7. Customer Need Summary & Pain Points
    if (report.customer_need_summary || (report.potential_pain_points && report.potential_pain_points.length > 0)) {
        lines.push("## 7. Rangkuman Kebutuhan Klien & Pain Points");
        if (report.customer_need_summary) {
            lines.push("### Rangkuman Kebutuhan Klien:");
            lines.push(report.customer_need_summary.trim());
            lines.push("");
        }
        if (report.potential_pain_points && report.potential_pain_points.length > 0) {
            lines.push("### Potensi Kendala & Pain Points:");
            report.potential_pain_points.forEach((point) => {
                lines.push(`- ${point}`);
            });
            lines.push("");
        }
    }

    // 8. Recommended Solutions & Use Cases
    if (report.use_cases && report.use_cases.length > 0) {
        lines.push("## 8. Rekomendasi Solusi & Use Cases");
        report.use_cases.forEach((uc, idx) => {
            lines.push(`### ${idx + 1}. ${uc.title} (Impact: ${uc.impact_level || "High"})`);
            if (uc.description) lines.push(`- **Deskripsi**: ${uc.description}`);
            if (uc.problem_solved) lines.push(`- **Masalah yang Diselesaikan**: ${uc.problem_solved}`);
            if (uc.how_it_works) lines.push(`- **Cara Kerja Solusi**: ${uc.how_it_works}`);
            if (uc.business_impact) lines.push(`- **Dampak Bisnis**: ${uc.business_impact}`);
            if (uc.google_products && uc.google_products.length > 0) {
                lines.push(`- **Produk Google Cloud**: ${uc.google_products.join(", ")}`);
            }
            if (uc.smartnet_solutions && uc.smartnet_solutions.length > 0) {
                lines.push(`- **Solusi Smartnet Magna**: ${uc.smartnet_solutions.join(", ")}`);
            }
            lines.push("");
        });
    }

    // 9. Meeting Objectives
    if (report.meeting_objectives && report.meeting_objectives.length > 0) {
        lines.push("## 9. Tujuan Pertemuan Presales (Meeting Objectives)");
        report.meeting_objectives.forEach((obj, idx) => {
            lines.push(`${idx + 1}. ${obj}`);
        });
        lines.push("");
    }

    // 10. Recommended Questions
    if (report.recommended_questions && report.recommended_questions.length > 0) {
        lines.push("## 10. Rekomendasi Pertanyaan Discovery (Recommended Questions)");
        report.recommended_questions.forEach((q, idx) => {
            lines.push(`${idx + 1}. ${q}`);
        });
        lines.push("");
    }

    // 11. Preparation Checklist
    if (report.preparation_checklist && report.preparation_checklist.length > 0) {
        lines.push("## 11. Checklist Persiapan Pertemuan (Meeting Preparation Checklist)");
        report.preparation_checklist.forEach((item) => {
            lines.push(`- [ ] ${item}`);
        });
        lines.push("");
    }

    // 12. References
    if (report.references && report.references.length > 0) {
        lines.push("## 12. Referensi & Sumber Data (References)");
        report.references.forEach((ref) => {
            const title = ref.title || ref.url;
            const type = ref.type ? ` (${ref.type})` : "";
            lines.push(`- [${title}](${ref.url})${type}`);
        });
        lines.push("");
    }

    return lines.join("\n").trim();
}

/**
 * Format an Opportunity Persona Playbook into structured Markdown.
 */
export function formatPersonaToMarkdown(
    persona: OpportunityPersona,
    companyName?: string
): string {
    const lines: string[] = [];
    const contextPrefix = companyName ? ` untuk ${companyName}` : "";

    lines.push(`# Meeting Persona Intelligence Playbook${contextPrefix}`);
    lines.push(`> Target Stakeholder: **${persona.seniority}** (${persona.department})`);
    lines.push("");

    // 1. Focus Areas
    if (persona.focus_areas && persona.focus_areas.length > 0) {
        lines.push(`## 1. Prioritas Utama / Focus Areas (${persona.seniority})`);
        persona.focus_areas.forEach((fa, idx) => {
            lines.push(`### ${idx + 1}. ${fa.title}`);
            lines.push(fa.description);
            lines.push("");
        });
    }

    // 2. Value Props
    if (persona.value_props && persona.value_props.length > 0) {
        lines.push(`## 2. Value Proposition Pitch Points (${persona.department})`);
        persona.value_props.forEach((vp) => {
            lines.push(`- ${vp}`);
        });
        lines.push("");
    }

    // 3. Recommended Questions
    if (persona.questions && persona.questions.length > 0) {
        lines.push("## 3. Rekomendasi Pertanyaan Discovery (Discovery Questions)");
        persona.questions.forEach((q, idx) => {
            lines.push(`${idx + 1}. **[${q.category}]** "${q.question}"`);
            lines.push(`   - *Target Insight / Tujuan*: ${q.purpose}`);
        });
        lines.push("");
    }

    // 4. Objection Handling
    if (persona.objection_handling && persona.objection_handling.length > 0) {
        lines.push("## 4. Strategi Penanganan Keberatan (Objection Handling)");
        persona.objection_handling.forEach((obj, idx) => {
            lines.push(`### Keberatan ${idx + 1}: "${obj.objection}"`);
            lines.push(`- **Rekomendasi Respon**: ${obj.response}`);
            lines.push("");
        });
    }

    return lines.join("\n").trim();
}
