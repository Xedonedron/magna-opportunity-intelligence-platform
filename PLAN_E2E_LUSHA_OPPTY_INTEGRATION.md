# PLAN TESTING END-TO-END (E2E): INTEGRASI LUSHA PROSPECTING & OUTBOUND OPPORTUNITY GENERATION MOIP

Dokumen perencanaan pengujian live End-to-End (E2E) terintegrasi pada Magna Opportunity Intelligence Platform (MOIP) di VM `magnasight`. Pengujian ini memvalidasi siklus penuh dari pencarian prospek vendor eksternal (Lusha), seleksi cerdas berbasis 8 Solusi Target Magna, penyimpanan direktori stakeholder, hingga konversi otomatis menjadi pipeline deal/opportunity konsultatif.

---

## 1. Tujuan & Ruang Lingkup Pengujian

Pengujian ini menguji integritas alur dari awal hingga akhir (lead-to-opportunity pipeline):
1. **Lusha Vendor Live Integration**: Menguji interaksi riil HTTP ke API Lusha untuk pencarian perusahaan dan kontak kandidat tanpa mock/stub.
2. **Selective Enrichment**: Pengambilan data privat (email & telepon) dengan batas presisi konsumsi kredit (tepat 2 kredit terpakai).
3. **Stakeholder Directory Persistence**: Penyimpanan data terstruktur ke tabel PostgreSQL `companies` dan `company_contacts`.
4. **Excel Export Validation**: Verifikasi pembentukan berkas `.xlsx` 5 kolom dengan formatting seluler dan email yang valid.
5. **Outbound Opportunity Generation (New Feature)**:
   - Konversi multi-kontak dari Stakeholder Directory menjadi Opportunity di pipeline deal.
   - Grounding ke **8 Solusi Target Resmi Magna** (Data Analytics Platform, AI/ML Solutions, Cloud Infrastructure GCP, Cybersecurity Suite, Network Solutions, Google Workspace, Google Maps Platform, Enterprise Server & Compute).
   - Pembuatan dossier kebutuhan otomatis di field `customer_needs` (ringkasan kebutuhan, profil PIC, hipotesis pain points, value proposition Magna, discovery questions konsultatif) tanpa sintaks LaTeX dan menggunakan bullet hyphen `-`.
   - Pencatatan jejak audit `TimelineEvent` secara atomik.
6. **Direct Candidate-to-Oppty Flow**: Konversi langsung kontak dari tab hasil pencarian Lusha sebelum disimpan manual ke direktori.

---

## 2. Kondisi Lingkungan & Parameter Uji

### Lingkungan Eksekusi
- **Server Target**: VM GCP `magnasight` (Project: `poc-btpns-beyondtrust`, Zone: `us-central1-f`).
- **Container**: `moip_backend` (Port 8009/8000), `moip_frontend` (Port 3009/3000), `moip_postgres` (Port 5435/5432).
- **Akun Penguji**: User internal `nixon.hutahaean@magnaglobal.id` dengan JWT valid ber-role prospecting.
- **Skenario Target**: Perusahaan `"Smartnet Magna Global"`.
- **Target Persona**: Kontak berlatar belakang ranah **Data & AI** (Data Engineer, Data Scientist, Data Analyst, AI Specialist).

### Status Kuota & Waktu Cooldown Vendor
- **Vendor**: Lusha API Starter (kuota 100 API calls/hari).
- **Status Terkini**: HTTP 429 Too Many Requests (sisa cooldown harian reset pada **14:34 WIB**).
- **Estimasi Hit Saat Live Run**: 5 calls (1 call check usage, 1 call company search, 1 call person search, 2 calls unmask contact).
- **Estimasi Kredit**: 2 credits.

---

## 3. Matriks Alur Pengujian E2E (8 Tahapan)

| No | Tahapan Uji | Endpoint / Operasi | Input / Parameter | Verifikasi Sukses |
|---|---|---|---|---|
| 0 | Health & Quota Check | `GET /api/prospecting/lusha/usage` | Header JWT | Status 200 OK, kuota aktif & counter reset |
| 1 | Company Disambiguation | `GET /api/prospecting/companies/search?q=Smartnet Magna Global` | Query: `"Smartnet Magna Global"` | Ditemukan entitas perusahaan, domain `magnaglobal.id` |
| 2 | Smart Role Search | `POST /api/prospecting/lusha/search` | Company + Job function "data" | Kontak terfilter, minimal 2 kandidat data ditemukan |
| 3 | Selective Credit Reveal | `POST /api/prospecting/lusha/enrich` | 2 Contact IDs terpilih | Email & nomor telepon ter-unmask, tepat 2 kredit terpotong |
| 4 | Stakeholder Upsert | `POST /api/prospecting/save-to-stakeholders` | Array 2 kontak hasil enrich | Status 200 OK, terverifikasi di PostgreSQL `company_contacts` |
| 5 | Excel Export | `POST /api/prospecting/export-excel` | Array 2 kontak tersimpan | File `.xlsx` valid, header 5 kolom match, data baris akurat |
| 6 | Directory to Opportunity | `POST /api/prospecting/convert-to-opportunity` | Contact IDs, Solution: `Data Analytics Platform` | Opportunity ID terbit, dossier terisi lengkap |
| 7 | DB & Audit Integrity | Query PostgreSQL `opportunities` & `timeline_events` | Opportunity ID | Record tersimpan, value IDR valid, dossier bebas LaTeX, timeline audit tercatat |
| 8 | Direct Candidate to Oppty | `POST /api/prospecting/convert-to-opportunity` | Candidate contacts langsung, Solution: `AI/ML Solutions` | Kontak auto-persisted, deduplikasi berjalan, deal kedua terbit |

---

## 4. Rincian Langkah Eksekusi & Validasi

### Fase 1: Validasi Live Lusha API & Directory Flow
1. **Langkah 1 (Cek Kuota)**:
   - Memastikan respons HTTP 200 dari `/api/prospecting/lusha/usage`.
2. **Langkah 2 (Pencarian Perusahaan Murni)**:
   - Mencari hanya dengan string `"Smartnet Magna Global"` tanpa domain fallback manual.
   - Memvalidasi entitas pertama yang dikembalikan Lusha memiliki nama relevan.
3. **Langkah 3 (Pencarian Person Berbasis Data)**:
   - Mengirimkan filter `job_titles`: `["Data", "Data Engineer", "Data Scientist", "Data Analyst", "AI", "Machine Learning"]`.
   - Mengonfirmasi minimal 2 kandidat ditemukan.
4. **Langkah 4 (Enrichment 2 Profil)**:
   - Memanggil unmask untuk 2 profil teratas.
   - Memvalidasi data email dan telepon tidak null/masked.
5. **Langkah 5 (Penyimpanan ke Direktori & Verifikasi Database)**:
   - Simpan ke `save-to-stakeholders`.
   - Query langsung ke DB PostgreSQL via `SessionLocal()`: `SELECT * FROM company_contacts WHERE name ILIKE ...`.
6. **Langkah 6 (Ekspor Spreadsheet Excel)**:
   - Parse binary stream menggunakan `openpyxl`.
   - Pastikan header baris ke-4: `['No', 'Nama', 'Job Title / Jabatan', 'Email', 'Nomor Telepon']`.
   - Validasi data baris ke-5 dan ke-6 sesuai profil yang di-unmask.

### Fase 2: Validasi Outbound Opportunity Generation
1. **Langkah 7 (Konversi dari Direktori ke Opportunity)**:
   - Payload:
     - `company_name`: `"Smartnet Magna Global"`
     - `contact_ids`: `[contact_1.id, contact_2.id]`
     - `primary_contact_id`: `contact_1.id`
     - `solution_title`: `"Data Analytics Platform"`
     - `pillar`: `"data"`
     - `estimated_value`: `250000000.0` (Rp 250.000.000)
     - `custom_title`: `"[Data Analytics Platform] - Smartnet Magna Global Modernization"`
     - `pain_points`: `["Silo data antar divisi operasional", "Pipeline ETL lambat dan rentan failure"]`
     - `notes`: `"Prospek hasil evaluasi kapabilitas data Smartnet Magna Global via MOIP."`
   - Validasi Response:
     - `status`: `"success"`
     - `opportunity_id`: UUID valid
     - `solution_title`: `"Data Analytics Platform"`
     - `pillar`: `"Data Analytics & AI Solutions"`
     - `redirect_url`: `"/opportunities/{opportunity_id}"`
2. **Langkah 8 (Audit Database & Formatter Dossier)**:
   - Query DB `opportunities`:
     - Memastikan `stage` terinisialisasi (`PROSPECTING` / `LEAD`).
     - Memastikan `contacts` (JSON) menyimpan kedua stakeholder dengan tanda PIC pada kontak pertama.
     - Memastikan field `customer_needs` (dossier) memuat:
       - Bab 1: Rekomendasi Solusi Magna (BigQuery, Databricks, Looker).
       - Bab 2: Profil Stakeholder Kunci (nama, kontak, PIC).
       - Bab 3: Hipotesis Pain Points.
       - Bab 4: Value Proposition Magna.
       - Bab 5: Discovery Questions.
     - **Pemeriksaan Negatif**: Tidak boleh ada karakter/sintaks LaTeX (`\rightarrow`, `\textbf`, `$`, `\frac`). Hanya menggunakan bullet hyphen `-`.
   - Query DB `timeline_events`:
     - Verifikasi event `action="outbound_opportunity_created"`.
     - Verifikasi `actor_id` dan `actor_name` sesuai user penguji.
3. **Langkah 9 (Konversi Direct Candidate ke Opportunity)**:
   - Simulasi sales memilih langsung kandidat dari tabel pencarian Lusha tanpa menyimpan manual terlebih dahulu.
   - Payload menggunakan `candidate_contacts` dengan target solusi `"AI/ML Solutions"`.
   - Memastikan sistem secara otomatis meng-upsert kontak ke `company_contacts`, menduplikasi secara cerdas, dan menerbitkan opportunity baru.

---

## 5. Quality Gates & Kriteria Keberhasilan

- [ ] **Vendor Rate Limit Safety**: Eksekusi live tepat 5 API calls, menyisakan 95 calls untuk operasional harian.
- [ ] **Credit Discipline**: Hanya 2 kredit Lusha yang terpotong.
- [ ] **Zero Mocking pada Live Test**: Seluruh response berasal dari upstream API Lusha dan PostgreSQL aktif di VM `magnasight`.
- [ ] **Data Consistency**: Kontak di database, baris di file Excel, dan kontak di opportunity terhubung secara identik.
- [ ] **UI & Compliance Standards**: Dossier di field `customer_needs` 100% bebas dari sintaks LaTeX, menggunakan bullet `-`, dan mengacu pada katalog solusi resmi Magna.

---

## 6. Jadwal & Trigger Eksekusi

1. **Persiapan Script & Pipeline**: Sekarang (pukul 11:15 WIB).
2. **Standby Cooldown**: Pukul 11:15 - 14:33 WIB.
3. **Trigger Eksekusi Live E2E**: Pukul **14:34 WIB** melalui script terotomatisasi di VM `magnasight`:
   ```bash
   sudo docker exec moip_backend python tests/test_e2e_live_lusha.py
   ```
4. **Verifikasi Laporan Akhir**: Pengecekan status di DB PostgreSQL, unduhan Excel, dan pipeline deals di UI frontend (`http://[IP_VM]:3009/opportunities`).
