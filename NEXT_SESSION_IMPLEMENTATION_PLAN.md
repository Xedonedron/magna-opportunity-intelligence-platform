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

### Sesi C: Restrukturisasi Model Folder & Migrasi Un-flattening (P1 - Core)
**Tujuan:** Membangun entitas `Company`, menghubungkan `Opportunity` sebagai child, dan memilah data lama secara aman.

**Tasks:**
1. **Database Schema**:
   - Buat model `Company` di `backend/app/models/company.py`.
   - Tambahkan `company_id` pada `backend/app/models/opportunity.py` (relasi Foreign Key).
   - Buat migration script Alembic.
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
