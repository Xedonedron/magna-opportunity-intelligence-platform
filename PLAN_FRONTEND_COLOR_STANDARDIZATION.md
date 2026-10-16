# PLAN: Standarisasi Warna Desain Frontend MOIP (Monochrome Black & White / Zinc)

> **Dokumen Transisi & Panduan Eksekusi Lintas Sesi**  
> **Target Platform**: Magna Opportunity Intelligence Platform (MOIP) — Frontend (`frontend/src/`)  
> **Prinsip Eksekusi**: Dikerjakan bertahap **per halaman / per fase** (bukan langsung 1 task masif sekaligus). Setiap selesai 1 fase, perbarui checklist `[x]` pada dokumen ini, jalankan `tsc --noEmit` & `graphify update .`, lalu commit ke `main`.

---

## 1. Konteks & Keputusan Desain (Disepakati Bersama User)

1. **Standar Warna Utama (Monochrome `zinc`)**:
   - Seluruh elemen UI non-semantik (tombol utama/CTA, permukaan kartu, border, fokus input, avatar inisial, checkbox/radio, tab navigasi, spinner/loader) menggunakan palet **Black & White / `zinc`**:
     - **Primary Button / Active State**: `bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200`
     - **Secondary / Surface / Icon Box**: `bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-800`
     - **Input Focus Ring**: `focus:ring-zinc-500/20 focus:border-zinc-400 dark:focus:border-zinc-600`
     - **Checkbox & Radio**: `border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-500`
   - **Dilarang** menggunakan `indigo-*`, `violet-*`, `purple-*`, atau `blue-*` untuk tombol aksi umum, tab, atau dekorasi halaman.

2. **Pengecualian Semantik (Tetap Dipertahankan Berwarna)**:
   - **Status Opportunity**: Tetap berwarna sesuai tahap pipeline (`New`, `KYC Running`, `Ready Meeting`, `Won`, `Lost`, dll.) mengacu tunggal pada `STATUS_STYLES` di `frontend/src/types/opportunity.ts`.
   - **Badge 4 Pilar Solusi Magna / Domain**: Badge kategori solusi seperti `[Data & AI]`, `[Security]`, `[Cloud Infra]`, `[Network]` (pada `pillar-classifier.ts` dan pilihan 8 solusi resmi di `CreateOpportunityFromStakeholdersDialog.tsx`) **tetap dibiarkan berwarna** sebagai pembeda visual kategori.
   - **Feedback Semantik**: Success (`emerald`/`green`), Warning/Primary Star (`amber`), Error/Danger (`red`/`rose`).

---

## 2. Roadmap & Status Eksekusi Per Halaman (5 Fase)

### ✅ Fase 1 — Halaman Prospecting (`/prospecting`) — STATUS: SELESAI (100%)
**Cakupan File:**
- [x] `frontend/src/app/(main)/prospecting/page.tsx`
  - Mengubah seluruh tombol utama (Cari Perusahaan, Buka Kontak, Buat Opportunity, Simpan Domain), avatar inisial perusahaan, hover dropdown kandidat, spinner loading, dan checkbox tabel dari `indigo`/`violet`/`purple` menjadi monochrome `zinc`.
  - Mempertahankan badge 4 Pilar Solusi Magna (`classifyJobTitle`) sesuai keputusan desain.
- [x] `frontend/src/components/domains/prospecting/CreditRevealModal.tsx`
  - Mengubah header ikon, checkbox opsi reveal (Email & Phone), ringkasan biaya kredit, dan tombol konfirmasi dari `blue`/`amber`/`emerald` menjadi monochrome `zinc` (dengan alert kuota kurang tetap `rose`).

---

### ✅ Fase 2 — Halaman Opportunities, Company Folders, Stakeholders & KYC (`/opportunities` & `/opportunities/[id]`) — STATUS: SELESAI (100%)
**Checklist File Fase 2:**
- [x] `frontend/src/app/(main)/opportunities/page.tsx`
- [x] `frontend/src/components/domains/opportunities/CompanyFolderView.tsx`
- [x] `frontend/src/components/domains/opportunities/CompanyAutocompleteInput.tsx`
- [x] `frontend/src/components/domains/opportunities/DuplicateCompanyConfirmModal.tsx`
- [x] `frontend/src/app/(main)/opportunities/[id]/page.tsx`
- [x] `frontend/src/app/(main)/opportunities/create/page.tsx`
- [x] `frontend/src/components/domains/opportunities/KanbanCard.tsx` & `KanbanColumn.tsx`
- [x] `frontend/src/components/domains/stakeholders/StakeholdersTab.tsx`, `StakeholderCard.tsx`, `StakeholderFormDialog.tsx`, `CreateOpportunityFromStakeholdersDialog.tsx` (Mempertahankan warna 8 solusi pilar resmi)
- [x] `frontend/src/components/domains/personas/TargetPersonaTab.tsx`
- [x] `frontend/src/components/domains/kyc/KYCReportTab.tsx`, `KYCEditForm.tsx`, `UseCaseAccordion.tsx`, `VersionSelector.tsx`

---

### ✅ Fase 3 — Halaman Dashboard & Sinkronisasi Warna Status (`/dashboard`) — STATUS: SELESAI (100%)
**Checklist File Fase 3:**
- [x] `frontend/src/app/(main)/dashboard/page.tsx`
  - Hapus duplikasi `statusStyles` lokal yang berbeda sendiri (misal `Ready Meeting` warna ungu di dashboard padahal hijau di `STATUS_STYLES`), gunakan langsung `STATUS_STYLES` dari `frontend/src/types/opportunity.ts`.
  - Ubah penggunaan `blue` pada UI kartu/tombol/link dashboard menjadi monochrome `zinc`.
- [x] `frontend/src/components/dashboard/DashboardMetrics.tsx`, `DashboardFilters.tsx`, `DashboardFilterSheet.tsx`
  - Ubah aksen filter aktif dan ikon metrik dari `blue` menjadi `zinc`.
- [x] `frontend/src/components/dashboard/StatusChart.tsx` & `PipelineFunnelChart.tsx`
  - Selaraskan hex color status pada chart dengan `STATUS_STYLES` di `types/opportunity.ts`.

---

### ✅ Fase 4 — Halaman Settings & Admin Monitoring (`/settings`) — STATUS: SELESAI (100%)
**Checklist File Fase 4:**
- [x] `frontend/src/app/(main)/settings/page.tsx`
  - Ubah 8 titik `blue`, 6 `purple`, 3 `violet` pada tab/tombol/badge non-semantik menjadi `zinc`.
- [x] `frontend/src/components/domains/admin/AITokenMonitoringTab.tsx`
  - Ubah 76 titik `indigo`, 25 `blue`, 21 `purple` (sub-tab navigasi, kartu ringkasan token, tabel audit prompt, tombol filter) menjadi monochrome `zinc`.
- [x] `frontend/src/components/domains/admin/SolutionsCatalogTab.tsx`
  - Sudah sebagian di-edit di working tree; verifikasi agar chrome UI & tombol menggunakan `zinc` sementara badge domain solusi tetap dipertahankan.
- [x] `frontend/src/components/domains/admin/UserActivityDrawer.tsx`
  - Ubah aksen drawer, avatar, dan filter dari `purple`/`violet`/`blue` menjadi `zinc`.

---

### ⏳ Fase 5 — Komponen Global, Notifications & Final Audit (`/notifications` & Shared UI) — STATUS: BELUM DIMULAI
**Checklist File Fase 5:**
- [ ] `frontend/src/app/(main)/notifications/page.tsx` & `frontend/src/components/domains/notifications/NotificationDropdown.tsx`
  - Ubah unread dot indicator, highlight baris notifikasi, dan tombol "Mark all as read" dari `blue` menjadi monochrome `zinc`.
- [ ] Final Audit seluruh `frontend/src/**/*.tsx` untuk memastikan tidak ada warna ungu/indigo/biru yang bocor di luar Status Opportunity & 4 Pilar Solusi.

---

## 3. Protokol Verifikasi Wajib di Setiap Akhir Fase

Setiap selesai 1 Fase:
1. **Typecheck Frontend** (jalankan di direktori `frontend/`):
   ```bash
   npx tsc --noEmit
   ```
2. **Update Knowledge Graph (Wajib sesuai `.agents/AGENTS.md`)**:
   ```bash
   PYTHONPATH=/srv/hermes-data/profiles/bot2/home/.local/share/uv/tools/graphifyy/lib/python3.12/site-packages /srv/hermes-data/profiles/bot2/home/.local/share/uv/python/cpython-3.12.13-linux-x86_64-gnu/bin/python3.12 /srv/hermes-data/profiles/bot2/home/.local/share/uv/tools/graphifyy/bin/graphify update .
   ```
3. **Update Checklist di `PLAN_FRONTEND_COLOR_STANDARDIZATION.md` & Commit per Fase**:
   Commit hanya file pada fase yang telah diverifikasi beserta `PLAN_FRONTEND_COLOR_STANDARDIZATION.md` dan `graphify-out/`.
