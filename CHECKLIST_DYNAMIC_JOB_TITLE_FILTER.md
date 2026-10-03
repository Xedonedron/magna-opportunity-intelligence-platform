# Checklist & Implementation Plan: Dynamic Job Title Filter Prioritization (Regex-Based Magna Pillars)

## 1. Overview & Objective
Meningkatkan efisiensi tim sales dalam menyaring daftar karyawan dari hasil pencarian prospek (Lusha) di halaman Prospecting (`/prospecting`).

Secara default, Lusha mengembalikan beragam jabatan umum (HR, Legal, Finance, GA, Procurement) bercampur dengan target prospek IT. Rencana ini menerapkan **Smart Regex Matching** berbasis 4 pilar solusi riil PT Smartnet Magna Global untuk:
- Mengurutkan jabatan yang relevan dengan pilar solusi Magna ke **posisi teratas**.
- Memberikan **identitas visual / badge outline** pilar solusi sasaran (`[Data & AI]`, `[Security]`, `[Cloud]`, `[Network]`).
- Menjaga jabatan non-target tetap **tampil normal** (tidak disembunyikan, tidak dipudarkan, dan mudah dibaca/diklik kapan saja).

---

## 2. Pemetaan Regex Solusi Riil Magna (Berdasarkan Basis Kode MOIP)

Mengacu langsung pada data di `backend/app/core/solutions_catalog.py` dan `backend/app/services/prospecting_service.py`:

- **Pilar 1: Data Analytics & AI**
  - Solusi Riil MOIP: BigQuery, Vertex AI, Gemini, Dataflow, Dataproc, Looker, dbt, Snowflake, Cloud Composer, Pub/Sub, Data Lakehouse.
  - Regex Keyword:
    `\b(data|analytics|analyst|bi|business intelligence|data scientist|data engineer|database|dba|ai|machine learning|ml|big data|data architect|etl|lakehouse|data warehouse)\b`
  - Badge Label: `[Data & AI]`
  - Warna Aksen / Outline: Violet / Indigo

- **Pilar 2: Cybersecurity Suite**
  - Solusi Riil MOIP: BeyondTrust PAM, Endpoint Privilege Management (EPM), NGAV/EDR (CrowdStrike, SentinelOne), NGFW (Fortinet, Palo Alto), SOC/SIEM (Chronicle, Mandiant), Security Command Center (SCC), Zero Trust (BeyondCorp).
  - Regex Keyword:
    `\b(security|ciso|soc|cyber|infosec|information security|compliance|iam|threat|firewall|vulnerability|penetration|risk|secops|privileged access|endpoint)\b`
  - Badge Label: `[Security]`
  - Warna Aksen / Outline: Red / Rose

- **Pilar 3: Cloud Infrastructure & Modernization**
  - Solusi Riil MOIP: Nutanix HCI, VMware Exit Strategy & Modernization, Dell PowerEdge, HPE ProLiant, Bare Metal / On-Premise DC, Google Kubernetes Engine (GKE), Google Maps Platform / Fleet Engine.
  - Regex Keyword:
    `\b(cloud|infrastructure|infra|devops|sre|sysadmin|system administrator|virtualization|server|datacenter|data center|storage|platform engineer|solution architect|hci|gke|kubernetes)\b`
  - Badge Label: `[Cloud Infra]`
  - Warna Aksen / Outline: Sky / Blue

- **Pilar 4: Network & Enterprise Workplace**
  - Solusi Riil MOIP: Campus LAN/WAN, Wi-Fi 6, Cisco Catalyst, Aruba CX, HPE Networking, Extreme Networks, Google Workspace (Gmail Enterprise, Meet, Drive, Gemini for Workspace).
  - Regex Keyword:
    `\b(network|networking|noc|network engineer|telecom|telecommunication|wan|lan|switching|routing|workplace|workspace|it support|it operations|service desk|helpdesk)\b`
  - Badge Label: `[Network]`
  - Warna Aksen / Outline: Emerald / Green

---

## 3. Aturan Sorting & Visual Styling

### Logika Sorting
1. **Grup 1 (Magna Target Roles - Pinned to Top):**
   - Jabatan yang cocok dengan salah satu dari 4 regex di atas.
   - Diurutkan berdasarkan: jumlah personil terbanyak (`count` descending), lalu abjad (`title` ascending).
2. **Grup 2 (Other Roles / Non-Target):**
   - Jabatan umum lainnya (HR, Legal, Finance, GA, Marketing, Operations, dsb).
   - Diurutkan berdasarkan: jumlah personil terbanyak (`count` descending), lalu abjad (`title` ascending).

### Desain Visual
- **Target Roles:** Diberi label prefix pilar `[Pilar]` dan outline pembeda visual agar langsung terbaca sebagai fokus utama sales.
- **Non-Target Roles:** Ditampilkan dengan gaya **normal** (teks kontras standar, ukuran font reguler, tidak pudar/transparan) di bawah kelompok target.

---

## 4. Rincian Checklist Implementasi

### Fase 1: Engine Utility Regex & Klasifikasi Pilar
- [ ] Buat file utilitas klasifikasi pilar di frontend: `frontend/src/lib/pillar-classifier.ts`.
- [ ] Implementasikan fungsi `classifyJobTitle(title: string)` dengan regex boundary matching (`\b...\b`).
- [ ] Definisi tipe metadata hasil klasifikasi:
  - `isTarget: boolean`
  - `pillarId: 'data' | 'security' | 'cloud' | 'network' | null`
  - `pillarLabel: string` (contoh: `"Data & AI"`, `"Security"`)
  - `badgeColor: string` (kelas Tailwind untuk border & badge)
- [ ] Validasi penanganan whole-word matching (mencegah kata "lan" salah mendeteksi "penjualan" atau "plan").

### Fase 2: Refactoring Hook Dynamic Job Titles di Halaman Prospecting
- [ ] Buka `frontend/src/app/(main)/prospecting/page.tsx` pada bagian hook `jobTitleOptions`.
- [ ] Klasifikasikan setiap jabatan unik menggunakan `classifyJobTitle`.
- [ ] Terapkan sorting dua tingkat:
  - Prioritas 1: `isTarget === true` naik ke paling atas.
  - Prioritas 2: `count` terbanyak -> abjad nama jabatan.
- [ ] Pisahkan daftar hasil menjadi 2 kelompok terstruktur:
  - `targetOptions`: Daftar jabatan sasaran Magna dengan badge pilar.
  - `otherOptions`: Daftar jabatan umum lainnya dengan format normal.

### Fase 3: Pembaruan Komponen Dropdown Filter UI
- [ ] Perbarui elemen dropdown filter jabatan di `frontend/src/app/(main)/prospecting/page.tsx`.
- [ ] Terapkan pembagian kelompok menggunakan `<optgroup>` standar atau custom select:
  - `<optgroup label="Target Solusi Magna (Prioritas)">`: Berisi jabatan dengan label pilar (misal: `[Data & AI] Data Engineer (3)`).
  - `<optgroup label="Jabatan Lainnya">`: Berisi jabatan non-target dengan tampilan teks normal reguler.
- [ ] Tambahkan indikator total kuantitas target di header opsi (misal: `Semua Target Magna (X kontak)`).

### Fase 4: Integrasi Pencarian Instan & Penanganan Filter
- [ ] Pastikan input pencarian instan (search bar) tetap bekerja fleksibel mencari di seluruh opsi (baik target maupun non-target).
- [ ] Pastikan saat user memilih salah satu opsi dari kelompok target maupun non-target, tabel data personil di bawah terfilter secara presisi.
- [ ] Verifikasi tombol reset filter / clear selection mengembalikan tampilan ke seluruh kontak tanpa lag.

### Fase 5: Pengujian & Validasi
- [ ] Unit Test klasifikasi jabatan: uji 20 variasi nama jabatan riil (cth: *Data Warehouse Lead*, *BeyondTrust Admin*, *Network Specialist*, *HR Generalist*, *Legal Counsel*).
- [ ] Pastikan tidak ada jabatan non-target yang hilang atau tidak terbaca di layar.
- [ ] Uji responsivitas UI pada tampilan mobile dan desktop saat dropdown dibuka.
