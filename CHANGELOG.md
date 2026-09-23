# Changelog

Semua perubahan penting pada proyek **MOIP (Magna Opportunity Intelligence Platform)** didokumentasikan di berkas ini.

Format berkas ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/) dan mematuhi prinsip [Semantic Versioning (SemVer)](https://semver.org/spec/v2.0.0.html).

---

## [1.7.0] - 2026-09-23

### Summary
Rilis fitur mayor untuk penyatuan **Framework Knowledge Solusi & Playbook Presales Resmi** ke dalam *Single Source of Truth* database PostgreSQL `master_solutions` (total 72 solusi aktif), modernisasi skema database dengan 5 kolom metadata presales kaya, implementasi *Two-Stage Hybrid Semantic Router* (Stage 1 Presales Intent Slots + Stage 2 Deterministic Scorer & FSI Reservation), serta perombakan antarmuka visual UI Settings Katalog Solusi.

### Added
- **Unified Master Solutions Database Model (`master_solutions`)**:
  - Menambahkan 5 kolom metadata presales baru pada model `MasterSolution`:
    - `solution_domain` (VARCHAR(100)): Kategori kapabilitas solusi teknis (contoh: `privileged_access_management`, `endpoint_security`, `location_geospatial`, `enterprise_workplace`).
    - `regulatory_compliance` (JSONB): Tagging kepatuhan regulasi wajib (`ojk`, `bi`, `uu_pdp`, `pci_dss`, `iso27001`).
    - `target_environment` (VARCHAR(50)): Lingkungan arsitektur sasaran (`on_premise`, `cloud`, `hybrid`).
    - `probing_questions` (JSONB): Bank pertanyaan discovery teknis yang siap diajukan engineer ke klien.
    - `battlecard_ammo` (JSONB): Amunisi presales terstruktur (`key_differentiators`, `objection_handling`, `market_stats`).
- **Alembic Migration `z6u7n8i9j0k1`**:
  - Migrasi skema database `z6u7n8i9j0k1_add_presales_metadata_to_master_solutions.py` yang terhubung secara resmi ke `down_revision = 'y5t6m7h8i9j0'`.
- **Two-Stage Hybrid Semantic Router Engine**:
  - **Stage 1 (LLM Slot Extraction)**: Module 3 KYC mengekstrak `presales_slots` terstruktur (`solution_domains`, `regulatory_compliance`, `target_environment`).
  - **Stage 2 (Deterministic Scoring Engine)**: `route_presales_solutions` di `solutions_catalog.py` menghitung skor relevansi deterministik:
    - Exact Brand Match: +15 poin
    - Domain Match: +10 poin
    - Regulatory Compliance Match: +8 poin / tag
    - Environment Match: +5 poin
    - Legacy Keyword/Industry Fallback: +2-6 poin
    - **FSI Banking Reservation Rule**: Khusus sektor perbankan/regulasi OJK & BI, otomatis mengalokasikan slot prioritas untuk solusi *Privileged Access Management (PAM)* dan *Endpoint Detection & Response (EDR)*.
  - **Battlecard Context Injection**: Hasil pencocokan menyuntikkan bank pertanyaan probing dan amunisi battlecard ke prompt Module 4 (Use Cases) dan Module 5 (Engagement Strategy).
- **Interactive UI Settings Overhaul (`SolutionsCatalogTab.tsx`)**:
  - Visualisasi badge domain solusi dengan styling modern.
  - Tag kepatuhan regulasi berkode warna khusus (OJK, BI, UU PDP, PCI-DSS, ISO27001).
  - Badge target arsitektur (`on_premise`, `cloud`, `hybrid`).
  - Accordion interaktif untuk *Bank Pertanyaan Presales* dan *Amunisi Battlecard*.
  - Modal Create/Edit penuh untuk mengelola 5 metadata presales secara mandiri oleh Administrator.
- **Non-Destructive Catalog Synchronization (`POST /api/admin/solutions/sync`)**:
  - Menggabungkan 46 solusi marketing (lengkap dengan tautan web resmi `magnaglobal.id`) dan 26 playbook presales internal (tanpa tautan publik mati) menjadi 72 solusi aktif tanpa menghapus data secara destruktif (*zero orphan deletion*).
- **Automated Test Suites**:
  - `backend/tests/test_master_solutions_sync.py`: Pengujian model DB, schema Pydantic, dan endpoint sinkronisasi.
  - `backend/tests/test_presales_semantic_router.py`: Pengujian router semantik presales (11 skenario pengujian).

### Changed
- **Pembersihan & Unifikasi Konteks Penamaan**:
  - Mengganti seluruh terminologi catatan terpisah/personal di frontend dan backend menjadi satu standar enterprise resmi: **"Katalog Solusi & Playbook Presales Resmi"**.

---

## [1.6.0] - 2026-09-22

### Summary
Rilis fitur minor yang mendekomposisi intelijen perusahaan dari intelijen deal spesifik mengacu pada *Isti's Playbook*, serta menutup celah isolasi (*scope leak*) pada Stage 2 semantic router.

### Added
- **Isti's Playbook Grounding Reference**: Menambahkan dokumentasi referensi playbook enterprise sales dan brainstorming framework (`reference/Isti's Playbook.md`, `reference/brainstorming-Isti's-playbook.md`).
- **Decoupled Sectional Regression Tests**: Menambahkan test suite `test_sectional_runner_decoupled.py` dan `test_solutions_catalog_semantic.py` untuk menguji arsitektur terpisah dan routing semantik secara otomatis.

### Changed
- **Decoupled Company Intelligence Architecture**: Memisahkan eksekusi KYC menjadi dua domain independen:
  - **Company Intelligence (Module 1-2)**: Analisis profil perusahaan, lanskap industri, dan macro challenges di tingkat akun (dijalankan satu kali dan dapat digunakan bersama antar-deal).
  - **Opportunity Deal Intelligence (Module 3-6)**: Analisis scope teknis, semantic solution matching, sales playbook, ROI, dan discovery questions khusus untuk setiap deal individual.

### Fixed
- **Stage 2 Semantic Router Scope Leak**: Mengisolasi solusi produk agar solusi tingkat perusahaan tidak bocor (*leak*) ke dalam scope penawaran deal yang tidak relevan.
- **Source URL Population**: Memastikan atribut `source_url` selalu terisi dengan fallback yang valid saat mapping katalog solusi hasil routing semantik.

---

## [1.5.1] - 2026-09-21

### Summary
Rilis patch perbaikan dan penghalusan UX untuk judul tab browser dinamis, validasi playbook personas, dan proteksi penghapusan folder.

### Added
- **Dynamic Context-Aware Browser Tab Titles**: Tab browser kini secara otomatis menyesuaikan judul halaman berdasarkan konteks aktif (nama perusahaan, nama deal opportunity, atau halaman sistem aktif).
- **Folder Deletion Tooltip Guidance**: Menambahkan hover tooltip edukatif pada tombol delete folder yang disabled, menjelaskan bahwa folder yang masih berisi deals tidak dapat dihapus secara langsung.

### Fixed
- **Persona Playbook Schema Completeness**: Memperketat validasi skema keluaran LLM pada pembuatan playbook personas dan menambahkan mekanisme auto-retry jika respons LLM terpotong atau tidak lengkap.

---

## [1.5.0] - 2026-09-19

### Summary
Rilis fitur minor untuk deduplikasi entitas perusahaan 100% deterministik, direktori stakeholder kontak perusahaan, drawer intelijen profil, dan isolasi koneksi Celery.

### Added
- **100% Deterministic Company Deduplication (Sub-Inisiatif 4.5)**: Menggantikan heuristik pencocokan *fuzzy* dengan kaskade pencocokan deterministik berbasis Domain Web dan Nama Legalitas PT/CV.
- **Interactive Deduplication Resolver & Move Deal**: Antarmuka visual untuk me-resolve duplikasi perusahaan dan memindahkan opportunity antar-folder akun perusahaan.
- **Company Stakeholder & Contacts Directory**: Direktori kontak internal/eksternal per perusahaan yang terintegrasi dengan drawer pencarian kontak instan (`/api/companies/{id}/contacts`).
- **Company KYC Intelligence Drawer**: Drawer ringkasan cepat untuk membaca dossier intelijen akun perusahaan secara langsung dari tampilan folder tanpa harus membuka deal individu.

### Fixed
- **Celery Worker DB Pool Isolation**: Mengisolasi connection pool database PostgreSQL pada worker initialization (`celery.py`) untuk mencegah kebocoran koneksi (*idle connection leak*) saat background tasks berjalan serentak.
- **TypeScript Build Fixes**: Memperbaiki deklarasi tipe TypeScript pada tampilan laporan KYC dan company folder view.

---

## [1.4.0] - 2026-09-18

### Summary
Rilis arsitektur dan fitur minor yang mentransformasi model data flat opportunity menjadi hierarki folder akun perusahaan (Company Account Hierarchy) serta mengotomatisasi CI/CD VPS.

### Added
- **Company Folder Hierarchy (Additive Unflattening)**:
  - Model basis data baru `companies` dan relasi one-to-many ke `opportunities`.
  - Migrasi Alembic unflattening untuk mengelompokkan data historis yang tersebar ke dalam folder akun perusahaan induk.
  - Endpoint REST API baru untuk manajemen perusahaan (`/api/companies`).
- **Zero-Redundant KYC Reuse**: Menggunakan kembali profil intelijen perusahaan yang sudah di-generate untuk deal-deal baru di bawah akun yang sama, menghemat token AI dan waktu loading.
- **Automated VPS Deployment CI/CD**:
  - Script otomatisasi deployment backend di VPS (`scripts/deploy.sh` & backup/restore protocols).
  - GitHub Actions Workflow (`.github/workflows/deploy.yml`) untuk sinkronisasi otomatis ke server.

### Changed
- **Folder View Frontend**: Antarmuka navigasi deals yang kini dikelompokkan dalam card folder akun perusahaan, lengkap dengan status deal aktif dan agregasi nilai pipeline.
- **Creation Flow Standardization**: Standardisasi alur pembuatan deal dengan auto-create folder perusahaan jika entitas belum pernah terdaftar.

### Fixed
- **Resilient KYC Parsing & In-Place Retry**: Menambahkan penanganan graceful parsing dan auto-retry in-place untuk kegagalan transien saat pemanggilan LLM.

---

## [1.3.2] - 2026-09-17

### Summary
Rilis patch untuk optimasi navigasi responsif pada perangkat mobile.

### Added
- **Sticky Subnavigation Tabs for Mobile**: Tab navigasi sub-menu pada halaman detail opportunity kini bersifat sticky di layar mobile, memudahkan perpindahan antara tab Overview, KYC Report, Brainstorming Chat, dan Meetings saat menggulir dossier panjang.

---

## [1.3.1] - 2026-09-16

### Summary
Rilis patch untuk memperkuat ketahanan skema *structured output* dan merapikan visual dashboard.

### Fixed
- **Module 1 Schema Self-Healing**: Mengatasi inkonsistensi struktur data keluaran model AI yang kadang mengembalikan nested dictionary atau plain string pada atribut profil Module 1.
- **Prompt Hardening**: Memperketat instruksi system prompt untuk mencegah deviasi format JSON.
- **Dashboard Top 5 Aggregation**: Membatasi chart distribusi solusi menjadi Top 5 untuk visual yang lebih bersih dan proporsional.
- **Clean References Display**: Menghilangkan tanda kurung kosong atau trailing parentheses pada tampilan daftar referensi sumber web KYC.

---

## [1.3.0] - 2026-09-15

### Summary
Rilis fitur minor berupa sistem Dark Mode 4-tier menyeluruh dan perombakan responsivitas antarmuka mobile.

### Added
- **Full-Spectrum Dark Mode**:
  - Menerapkan sistem elevasi warna dark mode 4-tingkat (`surface-1` hingga `surface-4`) dengan kontras optimal dan perlindungan silau.
  - Kompatibilitas dark mode menyeluruh di halaman Dashboard, Opportunity Detail, Settings, dan Modals.
- **Comprehensive Mobile Responsiveness**:
  - Penyesuaian layout pada Top Navigation, Sidebar drawer mobile, Kanban pipeline view, dan dialog interaktif.

### Changed
- **Chart Visual Harmonization**: Penyelarasan palet warna dan styling tipografi antara Solution Distribution Chart dan Status Funnel Chart.

---

## [1.2.0] - 2026-09-14

### Summary
Rilis fitur minor untuk sistem notifikasi in-app proaktif dan validasi input data grounding AI.

### Added
- **Smart Notification System**:
  - Engine pendeteksi event sistem (misal: penyelesaian KYC report, penugasan presales, update status).
  - Komponen toast interaktif menggunakan Sonner dengan counter unread badge dan kemampuan deep-linking langsung ke tab terkait.
- **Mandatory Grounding Inputs**: Memvalidasi website dan industri perusahaan sebagai field wajib saat pembuatan opportunity baru untuk menjamin kualitas hasil penelusuran AI.

### Changed
- **KYC Version History UX**: Mengaktifkan text word-wrap pada judul dan focus notes riwayat versi KYC, serta memperbarui styling badge Smartnet Solutions dengan aksen indigo/violet.

---

## [1.1.1] - 2026-09-12

### Summary
Rilis patch untuk pencocokan solusi semantik dua tingkat, penambahan studi kasus Compro, dan kategorisasi pertanyaan discovery.

### Added
- **Two-Tier Semantic Solution Matching**: Router semantik cerdas dengan fallback aman untuk solusi profil perusahaan yang tidak memiliki tautan URL publik.
- **Compro Enterprise Case Studies**: Menambahkan 5 kartu studi kasus enterprise dari Company Profile Smartnet Magna Global ke dalam basis pengetahuan AI.
- **Categorized Discovery Questions**: Memisahkan pertanyaan discovery rekomendasi KYC menjadi dua kategori terpisah: *Business Discovery Questions* dan *Technical Discovery Questions*.

### Changed
- **Dashboard Funnel Simplification**: Menyederhanakan funnel pipeline ke mode snapshot status dengan penskalaan tinggi dinamis (*dynamic height*).

### Fixed
- **Catalog Duplicate Slug Purging**: Membersihkan entri duplikat pada tabel `master_solutions` dan memastikan slug bersifat unik dengan migrasi database idempotent (`ON CONFLICT (slug) DO UPDATE`).

---

## [1.1.0] - 2026-09-11

### Summary
Rilis fitur minor untuk refactoring pipeline KYC menjadi arsitektur modular berurutan (*Sectional Pipeline*) dengan Native Structured Output, serta generator Target Persona Playbook.

### Added
- **Sectional KYC Pipeline Architecture**:
  - Memecah eksekusi analisis KYC yang sebelumnya satu prompt raksasa (*monolithic*) menjadi 6 modul terpisah yang berjalan berurutan.
  - Pemanfaatan Pydantic Native Structured Output per modul untuk memastikan format data selalu konsisten.
  - Mekanisme auto-retry independen per modul jika salah satu bagian mengalami kendala tanpa harus mengulang dari modul pertama.
- **Target Persona Playbook Generator (Inisiatif 2)**:
  - Pembuat strategi pendekatan berbasis persona pengambil keputusan (C-Level, VP, Manager).
  - Dukungan kustomisasi fleksibel dengan input teks bebas untuk peran ("Others") dan departemen non-standar.
  - Contextual subtitle yang menyajikan intisari fokus tiap persona secara instan.

### Changed
- **Master Solutions Cleansing**: Membersihkan URL solusi yang tidak aktif dan menstandarkan nama solusi tingkat enterprise.

---

## [1.0.1] - 2026-09-10

### Summary
Rilis patch awal pasca-peluncuran internal untuk integrasi solusi dasar SMG, persistensi master data, dan suite pengujian performa multi-model.

### Added
- **SMG Company Profile Baseline Solutions**: Mengintegrasikan katalog solusi dasar profil perusahaan Smartnet Magna Global ke dalam sistem grounding AI.
- **Multi-Model KYC Benchmark Testing Suite**: Skrip pengujian otomatis (`backend/tests/test_model_benchmarks.py`) untuk membandingkan latensi, biaya token, dan kualitas hasil antara Google Gemini dan model OpenAI relay.
- **Mass KYC Regeneration CLI**: Skrip terminal untuk meregenerasi laporan KYC pada sekumpulan opportunity secara batch dengan label kustom.

### Fixed
- **Master Data PostgreSQL Persistence**: Memindahkan penyimpanan opsi Presales dan Industry dari memory/in-code ke tabel `system_settings` di PostgreSQL dengan seeding 7 personel tim presales.
- **Idempotent Solutions Seeding**: Memperbaiki skrip migrasi seeding katalog solusi agar bersifat idempotent (`ON CONFLICT DO UPDATE`).

---

## [1.0.0] - 2026-09-09

### Summary
**Peluncuran Pertama Internal MOIP (Internal Launch)**. Menghadirkan solusi intelijen peluang penjualan B2B enterprise yang terintegrasi dengan AI LLM, basis data katalog solusi sentral, pemantauan konsumsi token, dan dashboard eksekutif.

### Added
- **Centralized Master Solutions Catalog**:
  - Model basis data `master_solutions`, migrasi Alembic, dan REST API CRUD lengkap.
  - Scraper dan kurasi cerdas intelijen solusi (`master_solutions.json`).
  - Antarmuka manajemen katalog solusi pada tab Settings untuk superadmin.
  - Engine penyuntikan solusi dinamis (*dynamic prompt grounding*) ke dalam pipeline KYC dan Chat Brainstorming.
- **AI Token Usage & Governance Monitoring**:
  - Engine pelacakan penggunaan token per panggilan model (`ai_token_usages`).
  - Kalkulator estimasi biaya AI dengan konverter kurs real-time USD ke IDR.
  - Drawer audit log interaktif bagi Superadmin untuk meninjau prompt, latency, dan token cost.
- **Executive Dashboard Funnel**:
  - Visualisasi pipeline interaktif berupa Wave Funnel Chart dengan representasi volume deal nyata.
  - Filter presales terpadu dengan kartu metrik performa ringkas.
  - Tahapan deal baru: "POC (Proof of Concept)" di antara Need Proposal dan Negotiation.
- **KYC Multi-Versioning & Context Isolation**:
  - Dukungan multi-versi laporan KYC per opportunity (v1, v2, v3).
  - Fitur penambahan judul versi kustom (*inline version title editing*) dan focus notes.
  - Isolasi konteks antar-regenerasi untuk memastikan iterasi baru tidak tercampur dengan hasil lama.
- **Architecture Documentation**:
  - Dokumentasi resmi pemisahan arsitektur deployment: Frontend di Vercel (CI/CD push to `main`), Backend & Celery di VPS via Docker Compose.
