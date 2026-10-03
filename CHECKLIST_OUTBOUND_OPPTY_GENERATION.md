# Checklist & Implementation Plan: Outbound Opportunity Generation from Stakeholder Directory

## 1. Overview & Objective
Membangun alur otomatis untuk menghubungkan kontak karyawan yang tersimpan di direktori perusahaan (`company_contacts` / Stakeholder Directory) menjadi entitas `Opportunity` baru di MOIP.

Karena prospek hasil outbound (Lusha) belum memiliki konteks permasalahan aktual (belum ada RFP/TOR), sistem menerapkan pendekatan **Hypothesis-Driven Opportunity Generation** dengan memanfaatkan pemetaan 4 pilar solusi utama PT Smartnet Magna Global (`PILLAR_INTELLIGENCE`).

---

## 2. Pemetaan 4 Pilar Solusi Magna (Default Template)

Sistem secara otomatis mendeteksi pilar solusi berdasarkan jabatan kontak dan mengisi field `product` serta `customer_needs` dengan template default:

- **Pilar Data Analytics & AI**
  - Jabatan Sasaran: Data Engineer, Data Scientist, Data Analyst, Head of Data, BI Analyst, AI/ML Specialist.
  - Nilai Field `product`: `Data Analytics & AI`
  - Default Pain Points:
    - Silo data antar divisi perbankan/operasional yang menghambat Single Source of Truth.
    - Proses pelaporan analitik manual yang lambat dan berisiko salah tafsir.
    - Kurangnya pemanfaatan AI generatif privat untuk mempercepat pencarian SOP & pengetahuan internal secara aman.
  - Default Benefits:
    - Akses analitik mandiri (self-service BI) hingga 5x lebih cepat.
    - AI Assistant privat untuk data intelektual perusahaan.
    - Pipeline data otomatis dengan SLA mendekati real-time.

- **Pilar Network & Enterprise Workplace**
  - Jabatan Sasaran: Network Engineer, IT Infrastructure, Head of Network, Telecom Specialist.
  - Nilai Field `product`: `Network & Enterprise Workplace`
  - Default Pain Points:
    - Kompleksitas routing multi-cabang & latensi tinggi pada aplikasi sentral.
    - Tingginya OPEX leased line konvensional tanpa manajemen bandwidth terpusat.
    - Visibilitas SLA jaringan antar cabang minim saat terjadi insiden packet loss.
  - Default Benefits:
    - Reduksi biaya leased line hingga 35-40% via dynamic path steering.
    - Zero-touch provisioning untuk ekspansi cabang baru dalam hitungan jam.
    - Dashboard monitoring real-time untuk SLA aplikasi kritis.

- **Pilar Cybersecurity Suite**
  - Jabatan Sasaran: CISO, Security Engineer, IT Security Manager, SOC Analyst, Compliance Officer.
  - Nilai Field `product`: `Cybersecurity Suite`
  - Default Pain Points:
    - Kebutuhan kepatuhan ketat regulasi perlindungan data (UU PDP & OJK).
    - Kelelahan audit dan alert fatigue pada tim security akibat ribuan log tanpa korelasi AI.
    - Blindspot keamanan pada akses privilese pihak ketiga (vendor & partner eksternal).
  - Default Benefits:
    - Pencegahan ransomware real-time dengan Mean Time to Detect (MTTD) di bawah 15 menit.
    - Otomatisasi laporan kepatuhan regulasi OJK/BI/PDP.
    - Konsolidasi keamanan dalam arsitektur Zero Trust terpadu.

- **Pilar Cloud Infrastructure & Modernization**
  - Jabatan Sasaran: Cloud Architect, DevOps Engineer, IT Operations, Sysadmin, Infrastructure Lead.
  - Nilai Field `product`: `Cloud Infrastructure & Modernization`
  - Default Pain Points:
    - Biaya CAPEX lisensi & hardware legacy yang membengkak serta kompleksitas scaling data center.
    - Tantangan pencapaian RTO/RPO ketat pada skenario Disaster Recovery Center (DRC).
    - Silo operasional antara infrastruktur on-premise dengan adopsi container/microservices.
  - Default Benefits:
    - Efisiensi CAPEX data center hingga 30-40% melalui migrasi ke Hyperconverged Infrastructure (HCI).
    - Otomatisasi failover DRC dengan Recovery Time Objective (RTO) di bawah 15 menit.
    - Infrastruktur terukur untuk beban kerja transaksi tinggi.

---

## 3. Alur Kerja Sistem (End-to-End Flow)

- **Langkah 1: Pemilihan Kontak di Stakeholder Directory**
  - User membuka halaman detail perusahaan atau tabel Stakeholder Directory (`/companies/[id]` atau `/prospecting`).
  - User mencentang 1 atau beberapa kontak target.
  - User menekan tombol: `Generate Opportunity from Contacts`.

- **Langkah 2: Auto-Detection & Modal Review**
  - Sistem menganalisis daftar jabatan kontak terpilih -> mencocokkan ke salah satu dari 4 pilar di atas.
  - Muncul modal konfirmasi pembuatan Opportunity:
    - Nama Opportunity (default: `[Pilar] - [Nama Perusahaan]`).
    - Pilar & Solusi Terpilih (dropdown dengan 4 pilar utama).
    - Daftar Stakeholder yang akan dikaitkan (dengan opsi memilih Primary Contact).
    - Ringkasan Hipotesis `customer_needs` (pre-filled dari template default, editable oleh sales).
    - Estimasi Nilai Potensial (`potential_revenue`, opsional).

- **Langkah 3: Pembuatan Opportunity & Asset Provisioning**
  - Backend membuat entitas `Opportunity` baru:
    - Menghubungkan `company_id`.
    - Menghubungkan `primary_contact_id` ke kontak terpilih.
    - Menyimpan seluruh kontak terpilih ke dalam relasi/JSON kontak opportunity.
    - Mengisi `customer_needs` dengan teks hipotesis terstruktur.
    - Mengatur status awal menjadi `New`.
  - Sistem otomatis membuat folder dokumen dan aset opportunity terkait.
  - Sistem mencatat riwayat event ke `timeline_events`.

- **Langkah 4: AI Enrichment & Sales Ammunition Ready**
  - KYC Generator dan AI Assistant dapat langsung dijalankan karena sudah ada konteks target solusi dan persona kontak.
  - Modul outreach otomatis menyiapkan draft copy WhatsApp, Email, dan LinkedIn berdasarkan pilar tersebut.

---

## 4. Rincian Checklist Implementasi

### Fase 1: Backend Data Contracts & Logic
- [x] Buat schema Pydantic `ConvertStakeholdersToOpportunityRequest` dan `ConvertToOpportunityResponse` di `backend/app/schemas/prospecting.py`.
- [x] Tambahkan utilitas helper pendeteksi pilar otomatis berbasis kata kunci jabatan di `backend/app/services/prospecting_service.py`.
- [x] Buat service method `create_opportunity_from_stakeholders(...)` di `backend/app/services/prospecting_service.py` yang menangani:
  - Validasi keberadaan kontak dan perusahaan.
  - Konstruksi teks hipotesis `customer_needs` terstruktur.
  - Pembuatan record `Opportunity` dan asosiasi kontak.
  - Pencatatan timeline audit event.
- [x] Buat endpoint API `POST /api/prospecting/convert-to-opportunity` di `backend/app/api/prospecting.py`.

### Fase 2: Frontend Stakeholder Directory & Modal
- [x] Tambahkan checkbox selection pada baris kontak di komponen Stakeholder Directory (`frontend/src/app/(main)/companies/[id]` atau komponen terkait).
- [x] Buat aksi toolbar / bulk action button `Generate Opportunity Pitch`.
- [x] Buat dialog modal `GenerateOpportunityModal.tsx`:
  - Menampilkan ringkasan kontak terpilih.
  - Dropdown pemilihan pilar solusi (Data Analytics & AI, Network, Security, Cloud).
  - Textarea preview `customer_needs` yang otomatis terisi template dan bisa diedit manual.
  - Input opsional nilai estimasi deal (`potential_revenue`).
  - Tombol submit `Create Opportunity`.
- [x] Integrasikan mutation API frontend ke endpoint `POST /api/prospecting/convert-to-opportunity`.
- [x] Tambahkan redirect atau notifikasi sukses yang mengarahkan user langsung ke halaman detail Opportunity yang baru terbentuk (`/opportunities/[new_id]`).

### Fase 3: Integrasi Downstream AI & Folder Asset
- [x] Pastikan generator KYC dapat membaca teks hipotesis `customer_needs` tanpa error saat status Opportunity masih `New`.
- [x] Pastikan folder penyimpanan dokumen opportunity di-generate secara otomatis saat record Opportunity tersimpan.
- [x] Verifikasi bahwa outreach copy (Email, WhatsApp, LinkedIn) langsung tersedia di tab komunikasi Opportunity.

### Fase 4: Pengujian & Validasi
- [x] Unit Test Backend: Tes deteksi pilar berdasarkan berbagai variasi varian kata kunci job title (Data Analyst -> Data, CISO -> Security, Cloud Architect -> Cloud).
- [x] Unit Test Backend: Tes pembuatan Opportunity dari kontak tanpa error, verifikasi keterkaitan `company_id` dan `primary_contact_id`.
- [x] E2E Flow Test: Jalankan alur dari pencarian perusahaan -> simpan kontak ke directory -> generate opportunity -> verifikasi record di DB dan kelengkapan field konteks AI.
