# Implementation Plan: MOIP Next-Generation Architecture
> **Dokumen Transisi & Panduan Eksekusi Sesi Baru**  
> **Target Platform**: Magna Opportunity Intelligence Platform (MOIP)  
> **Dokumen Rujukan**: `FUTURE_IMPLEMENTATION.md`  
> **Status**: Ready for Next Session Execution

---

## 1. Executive Summary & Ringkasan Konteks

Pada sesi sebelumnya, telah diselesaikan:
- **In-Place Self-Healing Retry**: Pipeline KYC kini otomatis me-retry hingga 3 kali saat terjadi error transient (seperti JSON parsing invalid atau timeout) tanpa menaikkan versi (`v2`) dan tanpa memicu status `KYC Failed` secara prematur.
- **Sectional KYC Runner**: Pembuatan KYC modular per section dengan skema Pydantic terstruktur.
- **Push ke Git Main**: Seluruh kode backend dan pengujian unit (14/14 test lulus) telah ter-commit dan di-push ke branch `main`.

Berdasarkan masukan strategis dari senior konsultan dan evaluasi tim, arsitektur MOIP akan ditransformasikan dari **flat list sekali pakai** menjadi **Platform Intelijen Presales Berkelanjutan (Living Deal Assistant)** dengan struktur folder hierarkis.

---

## 2. Peta Transformasi Arsitektur

### A. Model Folder (Company → Multi-Opportunity)
- **Kondisi Lama**: Seluruh opportunity disatukan berdasarkan nama perusahaan. Versioning bercampur aduk antara pembaruan informasi dengan proyek yang berbeda pada perusahaan yang sama.
- **Kondisi Baru**:
  - **Company (Folder Induk)**: Menyimpan profil statis perusahaan (industri, proses bisnis inti, perkiraan jumlah karyawan, tech stack footprint umum).
  - **Opportunity (Child Deal)**: Inisiatif/kebutuhan proyek spesifik (contoh: `SMBC Indonesia > Backup` dan `SMBC Indonesia > Data Warehouse`).
  - **Optimasi**: Opportunity baru pada perusahaan yang sama langsung mewarisi (*inherit*) data statis perusahaan tanpa perlu riset ulang (hemat ~50% token dan memangkas waktu generasi).

### B. Living Opportunity & MoM-Driven Versioning
- Menambahkan editor teks/markdown untuk Minutes of Meeting (MoM).
- **v1**: Fokus pada pertanyaan kualifikasi makro (*initial discovery*).
- **v2+**: Dihasilkan setelah input MoM, bertransformasi membahas *objection handling*, klarifikasi teknis spesifik, dan arsitektur solusi.

### C. Digitalisasi Internal Sales Playbook
- Mentranskripsikan catatan buku panduan "how-to" presales internal ke dalam format Markdown/JSON terstruktur.
- Menghasilkan rekomendasi use case dan pertanyaan meeting yang mengadopsi insting serta metodologi sales konsultan terbaik Magna.

### D. Katalog Produk Terstruktur & Pragmatic Metadata
- Standarisasi produk (GCP, GWS, Maps, Greenplum EDW, SQL Server Modernization, Network, AI) dengan metadata `deployment_modes` (*on_prem, cloud, hybrid*).
- Menggunakan **Deterministic Metadata Filter + Prompt Injection** (katalog 50 produk hanya ~8.000 token, memanfaatkan prompt cache hit rate >80%), menolak full vector RAG yang dinilai overkill dan rentan false positive untuk skala data saat ini.

---

## 3. Rencana Kerja Per Sesi (Vertical Slices)

### Sesi A: Katalog Produk Terstruktur & Metadata Rules (P1)
**Tujuan:** Menyediakan referensi portofolio produk Magna yang kaya metadata untuk mengeliminasi rekomendasi produk halusinasi.

**Tasks:**
1. Buat file `backend/app/data/products_catalog.json` berisi data produk Magna dengan skema metadata lengkap (`deployment_modes`, `solution_domain`, `target_personas`, `pain_point_triggers`).
2. Buat service `backend/app/services/product_catalog_service.py` untuk filtering deterministik:
   - Filter berdasarkan parameter industri klien.
   - Filter berdasarkan batasan deployment (misal: mutlak *on-premise* vs *cloud*).
3. Sambungkan hasil filter ke prompt Module 4 (*Use Cases*) di `kyc_sectional_runner.py`.
4. Tambahkan unit test untuk memastikan 0% false positive rekomendasi cloud pada klien bertag on-premise.

---

### Sesi B: Digitalisasi & Integrasi Internal Sales Playbook (P1)
**Tujuan:** Mengintegrasikan framework "how-to" presales internal ke dalam rekomendasi strategi meeting.

**Tasks:**
1. Siapkan struktur repositori knowledge di `backend/app/data/playbook/`:
   - `winning_questions.md`: Daftar pertanyaan pembuka teruji per sektor industri.
   - `bridging_tactics.md`: Panduan transisi dari keluhan klien ke penawaran solusi Magna.
   - `pitching_personas.md`: Sudut pandang dialog untuk CIO, CFO, dan Head of Infrastructure.
2. Buat service loader `backend/app/services/playbook_service.py`.
3. Injeksi aturan playbook ke prompt Module 5 (*Presales Engagement Strategy*) di `kyc_sectional_runner.py`.
4. Uji generasi output untuk memastikan nada rekomendasi berubah menjadi konsultatif taktis.

---

### Sesi C: Restrukturisasi Model Folder & Migrasi Un-flattening (P1 - Core) - STATUS: BACKEND COMPLETED
**Tujuan:** Membangun entitas `Company`, menghubungkan `Opportunity` sebagai child, dan memilah data lama secara aman tanpa risiko data loss di lingkungan production (karena tidak ada staging).

#### Status Implementasi Sesi C:
- [x] **Model & Database Migration**: Model `Company` dibuat di `backend/app/models/company.py`, `company_id` ditambahkan ke `Opportunity` (`nullable=True`), Alembic migration `w3r4k5f6g7h8` siap dieksekusi.
- [x] **Un-flattening Logic & Test**: `scripts/unflatten_opportunities.py` terbukti 100% akurat mengelompokkan 34 record database riil ke tepat 30 entitas Company unik. Wrapper `./scripts/run_unflatten_docker.sh` telah disiapkan.
- [x] **REST API & Schemas**: CRUD `/api/companies` & `/api/v1/companies` serta pembuatan opportunity bersarang `POST /api/v1/companies/{company_id}/opportunities` (dengan automatic metadata inheritance) selesai dan teruji (7/7 test passed).
- [ ] **Pending Production Steps**:
  1. Commit & push ke `main` untuk trigger GitHub Actions runner di VM `magnasight`.
  2. Backup database otomatis dieksekusi oleh `scripts/deploy_backend.sh`.
  3. Eksekusi `./scripts/run_unflatten_docker.sh --dry-run` lalu `--commit` di server.
- [ ] **Frontend UI**: Mengubah navigasi utama menjadi folder view.

#### Protokol Keamanan & Mitigasi Rollback (Wajib Dijalankan):
1. **Langkah 0: Full Snapshot Backup (Pre-Migration Checkpoint)**
   Sebelum menyentuh skema atau menjalankan script migrasi apa pun, jalankan script backup otomatis:
   ```bash
   ./scripts/backup_database.sh
   ```
   Script ini menghasilkan snapshot terkompresi `backups/moip_db_backup_<timestamp>.sql.gz`.
2. **Prinsip Migrasi Aditif (Non-Destructive Schema)**:
   - DILARANG menghapus (*DROP*) kolom atau tabel existing (`company_name` pada tabel `opportunities` tetap dipertahankan sebagai fallback).
   - Buat tabel baru `companies`.
   - Tambahkan kolom baru `company_id` pada `opportunities` sebagai `nullable=True`.
   - Dengan pendekatan ini, jika frontend/backend versi lama masih membaca kolom lama, sistem TIDAK AKAN ERROR (*zero downtime*).
3. **Dry-Run & Staging Preview**:
   Script `scripts/unflatten_opportunities.py` wajib dijalankan dengan mode preview (`--dry-run`) terlebih dahulu untuk memverifikasi pemetaan 34 data riil sebelum menulis ke database.
4. **Prosedur Rollback Cepat (1-Command Emergency Recovery)**:
   Jika terjadi anomali data atau migrasi gagal, cukup eksekusi script restore:
   ```bash
   ./scripts/restore_database.sh ./backups/moip_db_backup_<timestamp>.sql.gz
   ```
   Database akan langsung kembali 100% ke kondisi awal sebelum migrasi.

**Tasks:**
1. **Database Schema**:
   - Buat model `Company` di `backend/app/models/company.py`.
   - Tambahkan `company_id` pada `backend/app/models/opportunity.py` (relasi Foreign Key, `nullable=True` aditif).
   - Buat migration script Alembic aditif.
2. **Offline Data Migration Script (`scripts/unflatten_opportunities.py`)**:
   - Script deduplikasi nama perusahaan (normalisasi nama PT, website canonical).
   - Algoritma pemilahan baris opportunity di bawah perusahaan yang sama:
     - Domain produk/needs berbeda $\rightarrow$ jadikan Opportunity terpisah (Oppty A & Oppty B).
     - Domain produk/needs sama $\rightarrow$ merge sebagai Versi 1 & 2 dari Opportunity yang sama.
   - Hasilkan file preview audit sebelum mengeksekusi commit perubahan.
3. **Backend API Endpoints**:
   - CRUD `/api/v1/companies`.
   - Endpoint pembuatan opportunity bersarang: `POST /api/v1/companies/{company_id}/opportunities`.
4. **Frontend Navigation**:
   - Tampilan utama berubah menjadi daftar Folder Perusahaan.
   - Membuka folder menampilkan daftar inisiatif/oppty di dalamnya (contoh: `SMBC Indonesia > Backup`).

---

### Sesi D: Living Opportunity Lifecycle & MoM-Driven Versioning (P2)
**Tujuan:** Menjadikan opportunity hidup sepanjang sales cycle melalui pencatatan Minutes of Meeting.

**Tasks:**
1. Tambahkan kolom/tabel `mom_entries` pada detail opportunity.
2. Sediakan endpoint API untuk submit MoM: `POST /api/v1/opportunities/{id}/mom`.
3. Tambahkan komponen editor Markdown MoM pada frontend tab detail opportunity.
4. Perbarui logika pipeline KYC:
   - Jika `version == 1`: Jalankan kualifikasi discovery standar.
   - Jika `version > 1` dan terdapat MoM: Ekstrak poin keberatan klien, batasan teknis, dan timeline dari MoM, lalu fokuskan KYC lanjutan pada *deep-dive architecture & scoping checklist*.

---

## 4. Instruksi Kickoff untuk Agen di Sesi Baru

Bagi AI Agent yang membaca dokumen ini di sesi baru:

1. **Verifikasi Lingkungan**:
   - Lokasi Project: `/root/projects/magna-opportunity-intelligence-platform`
   - Git Branch: `main` (pastikan working tree clean sebelum mulai).
   - Python Runner: `/home/nixon/.hermes/bin/uv` (jalankan test dengan `uv run --project backend --extra dev pytest backend/tests/test_sectional_kyc.py`).
2. **Baca File Konteks Utama**:
   - Baca `FUTURE_IMPLEMENTATION.md` untuk melihat arsitektur lengkap dan checklist master.
   - Baca `NEXT_SESSION_IMPLEMENTATION_PLAN.md` (dokumen ini) untuk urutan eksekusi sesi.
3. **Tanyakan kepada Dan**:
   - *"Apakah kita langsung mulai dari **Sesi A (Katalog Produk Terstruktur & Metadata Rules)** atau Dan sudah memiliki transkrip file PDF playbook untuk **Sesi B**?"*

---

## 5. Baseline Data Riil dari Database (Snapshot 34 Records)

Data aktual yang diekstrak langsung dari container `moip_postgres` (`opportunities`):

```text
d3b61780-d1e0-45d6-9511-68a63d5e69d6 | Advisains
1b8ceb79-ee0f-4ac6-9540-0782f5b4c76a | Asuransi Jasindo
a9654bfd-365f-4500-b28b-e482c3e52bcd | Bank bjb
fde3dca5-0b55-48f3-b2d0-9ce1e8a6f712 | Bappeda Kutai Kertanegara
876c4e2c-d01a-4e52-9fe3-4fe832d92171 | Bintang 7
bfe49482-1318-4a12-baee-27849cf4c248 | Cardig Aero Services
fcb71609-1403-45b4-b4ef-d0b14fc76a80 | Dana Pensiun Bank Mandiri
5c4af4ab-9d69-4f24-bd71-6582f2b5e550 | Era ventura indonesia
97b7f9ab-59ee-4ccd-9209-73b4ea603399 | Gibox Digital Asia
f0a55a78-d295-4028-beb3-e9c8d5699b16 | Indoprima Group
41a836f8-d915-45b1-b7a6-8935b1780883 | JNE
08f6d884-c9ae-49ff-bc77-ffb280ba0ea0 | Kalbe Farma
77061fec-5ce3-45fe-9c4e-a25861f71e8d | Microdrama
6959aa68-8d97-4bd9-be44-c215cd6d08b6 | Nodeflux
b1f530cd-6d5e-41b2-a632-06aea4efe099 | Omnicare
9ae9b99c-0353-43ab-9bdb-0d86174d68db | PT BRI Life
983f350d-046b-4590-9b4f-37dc5d74832e | PT Cahaya Matahari Prima
61af6e00-402d-4f3e-bab6-e7835dc853c6 | PT Cardig Aero Services
dae70398-0859-4f34-8d3a-8635359fbf0d | PT Darma Henwa
2f098736-b1ca-49d1-9cd9-b4299148f276 | PT Giordano Indonesia
bd7a795f-df4f-4c9e-9579-150565c276a1 | PT Inovasi Lintas Media
888a826a-f4d2-4d46-ba04-36586f82172c | PT Prodia Widyahusada Tbk
1fe85034-c554-46d8-97fb-f8ed0186f5ec | PT Prodia Widyahusada Tbk
b6c24fa9-2955-4371-a151-c72f01c96e4a | PT Prodia Widyahusada Tbk
bd5db437-d3d8-4793-b53c-380c8cec251c | PT SMBC Indonesia
c3daedc5-0a14-4e0d-9615-e0ebc2e3d20c | PT SPR Langgak
88ee72bb-80c3-4594-b499-ea33b068c39b | PT. Indoteknik Dotcom Gemilang
81585f2e-0471-42bd-aa1c-a4638997a915 | Penerbit Erlangga
392a3e5c-2d92-4635-9fa6-c62ea0cbc04c | SCSKIDN
f75cffe3-8c07-4f18-b487-eca25d7e3794 | SMC RS Telogorejo
47a4bbfe-cb59-444f-9677-8bd7a4e0a5f4 | Sampoerna Schools Systems - Custom Dashboard
a3841240-6f09-4bb8-a6d8-9532550cb680 | Sampoerna Schools Systems - Gemini Enterprise
b20ee900-e86c-4c91-a365-884c0ab3d7b7 | Semen Baturaja Tbk
2b76e96d-24af-4346-873c-d4badc64a3db | Top Group
```

### Pemetaan Target Un-flattening Berdasarkan Data Aktual:
1. **Pola Delimiter Tanda Hubung (`Company - Project Title`)**:
   - `Sampoerna Schools Systems` $\rightarrow$
     - Oppty 1 (`47a4bbfe`): Custom Dashboard
     - Oppty 2 (`a3841240`): Gemini Enterprise
2. **Pola Normalisasi Legal Prefix PT**:
   - `PT Cardig Aero Services` $\rightarrow$
     - Oppty 1 (`bfe49482`): On-Premise to GCP Infrastructure Migration
     - Oppty 2 (`61af6e00`): AI/ML Solutions Exploration
3. **Pola Multiple Oppty / Duplicate Review pada PT yang Sama**:
   - `PT Prodia Widyahusada Tbk` $\rightarrow$
     - Oppty 1 (`1fe85034` & `888a826a`): AI Speech-to-Text Transkrip Audio Dokter
     - Oppty 2 (`b6c24fa9`): Real-Time Data Analytics
4. **Pola Single Oppty (26 Perusahaan lainnya)**:
   - Menghasilkan 1 folder Company dengan 1 child Opportunity awal.

