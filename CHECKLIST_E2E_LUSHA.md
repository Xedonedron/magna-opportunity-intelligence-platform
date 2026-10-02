# CHECKLIST END-TO-END LUSHA PROSPECTING INTEGRATION

Dokumen ini memantau urutan eksekusi agentic pengujian integrasi Lusha Prospecting dari entry target hingga ekspor Excel pada VM GCP `magnasight`.

---

## Urutan Eksekusi Agentic

### 1. VM & Environment Setup
- [ ] **1.1 Pull Branch `main` Terkini di VM**: Update repo ke commit `f81211d` (prefix `/api` fix).
- [ ] **1.2 Injeksi Konfigurasi Lusha**:
  - [ ] Tambahkan `LUSHA_API_KEY: ${LUSHA_API_KEY:-}` ke `docker-compose.yml` service `backend`.
  - [ ] Daftarkan value `LUSHA_API_KEY` pada `.env` VM.
- [ ] **1.3 Rebuild & Restart Container**:
  - [ ] Jalankan `docker compose up -d --build backend` di VM.
  - [ ] Cek status health container `moip_backend` (`curl http://127.0.0.1:8009/api/health`).

### 2. Autentikasi & Verifikasi Kuota API
- [ ] **2.1 Token Pengujian**: Generate / peroleh token JWT valid untuk role yang memiliki capability `prospecting`.
- [ ] **2.2 Verifikasi Endpoint Kuota**:
  - Request: `GET /api/prospecting/quota`
  - Validasi: Status kredit dan rate limit Lusha aktif.

### 3. Eksekusi Flow End-to-End
- [ ] **3.1 Entry Perusahaan Target (Company Search)**:
  - Input: `"Ganesha"` & `"OCBC"`
  - Endpoint: `POST /api/prospecting/companies/search`
  - Validasi: Mendapatkan daftar kandidat perusahaan (nama, domain, logo/info).
- [ ] **3.2 Filter & Ambil Kandidat Orang (Person Search)**:
  - Input: Perusahaan terpilih + filter job title (contoh: Director, IT, Manager).
  - Endpoint: `POST /api/prospecting/lusha/search`
  - Validasi: Mendapatkan list karyawan dengan field `name` lengkap, jabatan, dan status simpan lokal.
- [ ] **3.3 Selective Credit Reveal (Enrichment)**:
  - Input: Contact ID / candidate terpilih.
  - Endpoint: `POST /api/prospecting/lusha/enrich`
  - Validasi: Membuka email kerja dan nomor telepon langsung dari Lusha API.
- [ ] **3.4 Masuk ke Stakeholder Directory (Local Upsert)**:
  - Input: Kandidat yang sudah di-enrich.
  - Endpoint: `POST /api/prospecting/save-to-stakeholders`
  - Validasi: Data masuk ke database PostgreSQL lokal `stakeholders`, flag `is_saved_in_directory` menjadi `true`.
- [ ] **3.5 Ekspor ke Excel (4-Kolom)**:
  - Endpoint: `POST /api/prospecting/lusha/export-excel`
  - Validasi:
    - File `.xlsx` ter-generate.
    - Struktur 4 kolom tepat: `Nama`, `Job Title / Jabatan`, `Email`, `Nomor Telepon`.
    - Data baris sesuai dengan data kandidat yang dipilih.

### 4. Hasil & Temuan
- Status: *Menunggu eksekusi tahap 1.*
- Bukti Eksekusi: *(Akan dilampirkan log & output riil dari terminal VM)*
