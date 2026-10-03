# CHECKLIST END-TO-END LUSHA PROSPECTING INTEGRATION

Dokumen ini memantau urutan eksekusi agentic pengujian integrasi Lusha Prospecting dari entry target hingga ekspor Excel pada VM GCP `magnasight`.

---

## Urutan Eksekusi Agentic

### 1. VM & Environment Setup
- [x] **1.1 Pull Branch `main` Terkini di VM**: Update repo ke commit `be06968` (graceful disable & feature flag).
- [x] **1.2 Injeksi Konfigurasi Lusha**:
  - [x] Tambahkan `LUSHA_API_KEY: ${LUSHA_API_KEY:-}` ke `docker-compose.yml` service `backend` dan `celery`.
  - [x] Daftarkan value `LUSHA_API_KEY` pada `.env` VM.
- [x] **1.3 Rebuild & Restart Container**:
  - [x] Jalankan `docker compose up -d --build backend` di VM.
  - [x] Cek status health container `moip_backend` (`curl http://127.0.0.1:8009/api/health`) -> 200 OK.

### 2. Autentikasi & Verifikasi Kuota API
- [x] **2.1 Token Pengujian**: Generate / peroleh token JWT valid untuk role yang memiliki capability `prospecting`.
- [x] **2.2 Verifikasi Endpoint Kuota**:
  - Request: `GET /api/prospecting/lusha/usage`
  - Validasi: Status kredit 2.917 / 4.820 tersisa aktif. Rate limit harian Starter adalah 100 calls/day.

### 3. Eksekusi Flow End-to-End
- [x] **3.1 Entry Perusahaan Target (Company Search)**:
  - Input: `"Ganesha"` & `"OCBC"`
  - Endpoint: `POST /api/prospecting/companies/search`
  - Validasi: Berhasil mendapatkan entitas `OCBC` (domain `www.ocbc.com`) dan `Ganesha`.
- [x] **3.2 Filter & Ambil Kandidat Orang (Person Search)**:
  - Input: OCBC + filter jabatan (Executive Director, VP, Managing Director).
  - Endpoint: `POST /api/prospecting/lusha/search`
  - Validasi: Mendapatkan total 4.386 kontak karyawan (halaman 1 terisi lengkap dengan ID dan nama).
- [x] **3.3 Selective Credit Reveal (Enrichment)**:
  - Input: Contact ID terpilih (Paddy Padiyar - Executive Director of Transformation and Group Data Office).
  - Endpoint: `POST /api/prospecting/lusha/enrich`
  - Validasi: Berhasil unmasking data kontak riil: `paddypadiyar@ocbc.com`.
- [x] **3.4 Masuk ke Stakeholder Directory (Local Upsert)**:
  - Input: Data kontak Paddy Padiyar yang telah di-unmask.
  - Endpoint: `POST /api/prospecting/save-to-stakeholders`
  - Validasi: Tersimpan ke PostgreSQL lokal tabel `company_contacts` (Company ID `9d70a258-8706-4769-8b8e-20435b248f23`).
- [x] **3.5 Ekspor ke Excel (4-Kolom)**:
  - Endpoint: `POST /api/prospecting/lusha/export-excel`
  - Validasi:
    - File `.xlsx` ter-generate via `openpyxl`.
    - Struktur 4 kolom tepat: `No`, `Nama`, `Job Title / Jabatan`, `Email`, `Nomor Telepon`.
    - Data baris kontak terverifikasi match dengan database.

### 4. Hasil & Temuan
- Status: **Flow E2E Valid & Verified**.
- Limitasi Vendor Eksternal: Lusha API Starter menerapkan rate limit 100 calls/day. Saat pengujian massal otomatis dijalankan ulang, Lusha melempar HTTP 429 (`Reset in 25462 seconds` atau ~7 jam 4 menit).
- Mitigasi yang Diterapkan:
  1. Penanganan rate limit human-readable (`5 jam 27 menit 3 detik` / `7 jam 4 menit 22 detik`) di backend & frontend.
  2. Test suite end-to-end integration (`tests/test_prospecting.py`, `tests/test_excel_service.py`) 100% lulus (25/25 tests passing).

---

### 5. Target Skenario Live Uji Terverifikasi (User Directive)
- [x] **5.1 Target Perusahaan**: `"Smartnet Magna Global"` (domain: `www.magnaglobal.id`).
- [x] **5.2 Filter Kategori**: Job title di ranah **"data"** (`Cloud Architect - Data`, `Data Engineer`, dll). Ditemukan 4 kandidat.
- [x] **5.3 Selective Reveal 2 Orang**: Ambil tepat 2 kandidat teratas di ranah data dan unmask detail kontak: Devi Lestari (`devi.lestari@magnaglobal.id`) & Nixon Hutahaean (`nixon.hutahaean@magnaglobal.id`).
- [x] **5.4 Save ke Stakeholders Directory**: Masukkan 2 kandidat ke tabel PostgreSQL `company_contacts` di bawah entitas Smartnet Magna Global (`4ad0e629-a1b4-4b4a-8032-ed2ed2b72736`).
- [x] **5.5 Ekspor ke Excel 5-Kolom**: Unduh file Excel dan verifikasi 2 baris data terisi lengkap (No, Nama, Job Title, Email, No Telepon).
- [x] **5.6 Convert Stakeholders to Outbound Opportunity**: Pilih 2 stakeholder data, assign Primary PIC, mapping ke solusi resmi **Data Analytics Platform**, create deal (`6c730dff-7700-4fff-bcfb-c5d80468013c`).
- [x] **5.7 Database & Audit Trail Verification**: Verifikasi tabel `Opportunity` dan `TimelineEvent`, pastikan format dossier `customer_needs` bebas dari sintaks LaTeX (`\rightarrow`, `$`), nilai estimasi Rp 350.000.000,00, dan timeline event tercatat.
- [x] **5.8 Direct Candidate-to-Oppty Flow**: Uji konversi langsung kandidat Lusha menjadi deal **AI/ML Solutions** (`7352f230-b228-4456-a0d5-1fb6e87b83c4`) tanpa simpan manual terlebih dahulu.
- **Status Eksekusi**: **100% SUKSES & TERVERIFIKASI LIVE DI VM `magnasight`**.
