Sebenarnya saya punya sistem yang digunakan di internal (vendor), tujuannya melakukan KYC perusahaan user, kemudian menggabungkan konteks yang kami dapatkan seperti pain point atau kebutuhan mereka, membuat use case yang relevan, rekomendasi pertanyaan ke user saat meeting dan lainnya.
Jadi flow si aplikasi kurang lebih kayak KYC perusahaan user, konteks use case dari file company profile perusahaan saya, lanjut artikel marketing perusahaan saya sebagai informasi pelengkap.

Nah, dokumen Isti ini harapnnya bisa menjadi playbook yang bisa digunakan sebagai standarisasi untuk digunakan di internal, kira-kira, apakah anda bisa rangkum Isti's Playbook ini agar saya kirimkan sebagai konteks ke AI Agent development saya? Mau kayak brainstorming di sana, ini bisa digunakan seperti apa, bagaimana mekanisme retrieval atau pemilihan informasi yang sesuai, dan lainnya, soalnya saya tidak berniat implementasi vector search dan embedding.

---

Struktur **Isti's Playbook** dapat dirangkum menjadi modular knowledge base yang siap dijadikan *context prompt* untuk AI Agent, disertai rancangan mekanisme retrieval non-vector (berbasis aturan/metadata).

---

### Bagian 1: Ringkasan Terstruktur "Isti's Playbook" (Konteks AI Agent)

#### 1. Hirarki & Pemetaan Solusi (Solution Mapping Framework)

* **Tier 1 — Infrastructure Level (Mandatory):** Solusi pondasi untuk menyederhanakan infrastruktur operasional user.


* *Networking:* Router (penghubung beda jaringan), Core Switch, Distribution Switch, Access Point.


* *Server & HCI:* Server Virtualization (efisiensi resource fisik) dan Hyperconverged Infrastructure / HCI (gabungan server + storage, solusi ringkas untuk rack kecil).




* **Tier 2 — Compliance & Security Solutions (Nice to Have / Regulated):** Wajib dipetakan jika klien terikat regulasi industri.


* *Regulasi Pemicu:* OJK, Bank Indonesia (BI), UU PDP No. 27 Th 2022, PCI DSS (fintech/kartu kredit).


* *Target Industri:* Perbankan & FSI (Financing, Multifinance, E-wallet, Payment Gateway).





---

#### 2. Taksonomi Solusi, Brand Principal, & Trigger Kebutuhan

| Domain | Solusi | Fungsi Kunci / Pain Point

 | Brand / Prinsipal

 | Trigger Masuk (KYC / Kebutuhan)

 |
| --- | --- | --- | --- | --- |
| **Akses & Identitas** | **PAM** | Kontrol & rekaman akses akun istimewa (credential vaulting).

 | CyberArk, BeyondTrust, One Identity, Senhasegura, Delinea

 | Banyak server/admin, sering lupa/berbagi password, audit compliance.

 |
|  | **IAM** | Tata kelola identitas karyawan: onboarding, mutasi, resign, hak akses app.

 | SailPoint, IBM, Oracle

 | HR mengelola banyak aplikasi internal/SaaS manual.

 |
|  | **MFA** | Otentikasi multi-langkah (OTP, biometric, email) untuk OS, DB, & Cloud.

 | WatchGuard, RSA, Cisco

 | Keamanan login remote / VPN / akses server krusial.

 |
|  | **NAC** | Kontrol hak akses jaringan (memisahkan device pribadi vs kantor vs tamu).

 | Cisco ISE, Forescout, Aruba ClearPass, FortiNAC, Ivanti

 | BYOD policy, isolasi network guest & kantor.

 |
| **Proteksi Data** | **DLP** | Cegah ekfiltrasi data sensitif (NIK, Rekening, NPWP) via print, USB, upload.

 | Forcepoint, Symantec, Digital Guardian, Intune, Trellix

 | Kepatuhan UU PDP, proteksi data nasabah/FSI.

 |
| **Keamanan Jaringan & Web** | **NGFW** | Inspeksi lalu lintas, blokir malware/intrusi, integrasi SD-WAN/VPN.

 | Fortinet, Palo Alto, Checkpoint, Sophos, Sangfor, Cisco

 | Perimeter gerbang utama, efisiensi routing cabang.

 |
|  | **WAF** | Memfilter dan memblokir lalu lintas HTTP/S berbahaya ke aplikasi web.

 | Akamai, Cloudflare, Imperva, FortiWeb, F5, Radware

 | Punya portal publik, web banking, e-commerce.

 |
|  | **ZTNA / SASE** | Pengganti VPN konvensional; akses berbasis identitas/per-aplikasi.

 | Zscaler, Palo Alto, Fortinet, Cloudflare

 | Remote worker masif, integrasi cloud apps aman.

 |
| **Endpoint & Deteksi Lanjutan** | **NGAV / EDR** | Proteksi malware berbasis IOA (behavior), isolasi otomatis titik akhir.

 | CrowdStrike, SentinelOne, Trellix, Trend Micro, Sophos

 | Ancaman ransomware, AV lama boros resource/signature.

 |
|  | **NDR** | Analisis anomali lalu lintas jaringan via AI/sensor mirroring.

 | Darktrace, ExtraHop, Cisco, Sophos

 | Butuh visibilitas pergerakan lateral ancaman.

 |
|  | **SIEM / SOAR** | Agregasi log/peringatan (SIEM) + otomatisasi respons playbook (SOAR).

 | ArcSight, LogRhythm, Splunk

 | Tim IT kewalahan analisis alert manual.

 |
|  | **MDR** | Layanan SOC 24x7 gabungan deteksi & respons pihak ketiga.

 | CrowdStrike, Palo Alto, Sophos

 | Tidak punya tim SOC internal mandiri 24/7.

 |
| **Data & Cloud** | **Data Warehouse & Lake** | Konsolidasi data terstruktur & mentah untuk analitik bisnis.

 | BigQuery (Google), Snowflake, Oracle, Cloudera, Tanzu

 | Pengambilan keputusan berbasis data, reporting terpusat.

 |
|  | **GCP / Cloud** | Modernisasi infra, PaaS, integrasi AI, Google Maps tracking.

 | Google Cloud Platform, Google Workspace

 | Ekspedisi/e-commerce (tracking rute), fleksibilitas dev.

 |

---

#### 3. Bank Pertanyaan Probing (Discovery Questions Saat Meeting)

* **Kategori Jaringan & Perimeter:**
* Bagaimana topologi jaringan eksisting dan pembagiannya (LAN/WAN/MAN)?


* Apakah sering ada isu performa/bottleneck antar-kantor cabang?


* Jenis firewall apa yang aktif saat ini, dan apakah sudah terintegrasi SD-WAN?




* **Kategori Endpoint & Deteksi Serangan:**
* Berapa jumlah user/endpoint yang aktif saat ini?


* Antivirus/solusi keamanan endpoint apa yang sedang digunakan, dan kendala apa yang dirasakan tim IT (misal: lemot, update signature harian)?


* Jika terjadi anomali di endpoint, apakah tim bisa langsung mengisolasi jaringan secara otomatis atau masih manual?




* **Kategori Kepatuhan & Akses:**
* Apakah organisasi memiliki kewajiban audit OJK, BI, UU PDP, atau PCI DSS?


* Bagaimana mekanisme pembagian akses untuk administrator server dan user remote (apakah masih menggunakan VPN konvensional atau password bersama)?





---

#### 4. Battlecard & Positioning Point (Contoh Kasus: CrowdStrike vs Kompetitor)

* **Value Utama:** Single-agent (ringan, RAM ~12 MB, tidak perlu reboot saat update).


* **Teknologi:** 100% berbasis *Indicator of Attack* (IOA/Behavioral), bukan *Indicator of Compromise* (IOC/Signature scanning) sehingga kebal terhadap serangan *zero-day*.


* **Keberatan "Data di Cloud":** Jelaskan bahwa yang dikirim ke cloud hanya data *telemetry* (aktivitas sistem), bukan file/konten dokumen pribadi nasabah.


* **Fakta Pendukung:** 75% serangan siber modern kini bebas dari malware (melainkan pencurian kredensial/identitas).



---

### Bagian 2: Mekanisme Retrieval & Pemilihan Informasi Non-Vector (Tanpa Embeddings)

Tanpa vector database, sistem dapat mengandalkan **Deterministic Rule Routing** dan **Tag-Based Graph/JSON Lookup**. Mekanisme ini justru lebih presisi untuk domain B2B sales karena tidak ada variasi halusinasi kedekatan semantik.

```
                    [Input KYC Perusahaan]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [Industry / Regulatory]               [Infrastructure Status]
   (FSI, Retail, Tech, OJK, PDP)          (On-prem, Cloud, Cabang, Remote)
            │                                     │
            └──────────────────┬──────────────────┘
                               ▼
                [Rule Engine / Deterministic Filter]
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     [Target Solution]   [Relevant Pain]    [Discovery Questions]
            │                  │                  │
            └──────────────────┬──────────────────┘
                               ▼
                 [LLM Context Construction]
                               │
                               ▼
        [Output: Relevansi Use Case & Panduan Meeting]

```

#### 1. Skema Metadata & Tagging Matrix (Struktur JSON Statis)

Definisikan setiap solusi dari playbook ke dalam berkas metadata terstruktur:

```json
{
  "solution_id": "DLP",
  "name": "Data Loss Prevention",
  "tier": 2,
  "triggers": {
    "industries": ["banking", "multifinance", "insurance", "fintech", "healthcare"],
    "regulations": ["UU_PDP", "OJK", "BI", "PCI_DSS"],
    "infrastructure_indicators": ["local_storage", "remote_workers", "customer_data_handling"]
  },
  "pain_points": [
    "Resiko kebocoran data NIK/Rekening via USB, cetak, atau web upload",
    "Kekhawatiran sanksi non-compliance UU PDP No. 27 Th 2022"
  ],
  "probing_questions": [
    "Bagaimana pengawasan saat ini jika ada karyawan mentransfer data sensitif ke media eksternal?",
    "Apakah sudah ada sistem otomatis untuk mendeteksi data NIK atau nomor rekening keluar dari jaringan?"
  ],
  "brands": ["Forcepoint", "Symantec", "Digital Guardian", "Trellix"]
}

```

#### 2. Mesin Logika Penyaring (Heuristic Decision Rules)

Gunakan *hard-filtering* sederhana sebelum mengirim konteks ke AI Agent:

* **Rule A (Regulasi / Compliance Gate):**
* *IF* KYC Industri = `FSI` / `Fintech` / `Perbankan`
*THEN* Inject modul konteks: `Tier 2 - Compliance`, `DLP`, `PAM`, `Security Gateway (Email)`, regulasi `OJK/BI/PCI DSS`.




* **Rule B (Tipe Operasional & Multi-Site):**
* *IF* KYC menunjukkan perusahaan punya `Banyak Cabang` atau `Work From Anywhere`
*THEN* Inject modul konteks: `SD-WAN`, `ZTNA`, `MFA`, `NAC`.




* **Rule C (Modernisasi Infra):**
* *IF* Profil user berupa `Startup` / `E-Commerce` / `Logistik`
*THEN* Inject modul konteks: `GCP (Cloud/Maps tracking)`, `Data Warehouse/BigQuery`, `WAF`.




* **Rule D (Level Kesiapan Tim IT):**
* *IF* Tim IT berukuran kecil namun membutuhkan pengawasan 24 jam
*THEN* Inject modul konteks: `MDR` (alih-alih merekomendasikan SIEM mandiri) dan `SentinelOne/CrowdStrike` (agentless/single agent).





#### 3. Mekanisme Slot Filling (Two-Pass Prompting)

1. **Pass 1 (Entity Extraction):** Minta model sederhana/kecil mengekstrak *slot* dari profil user:
* *Industry:* (misal: "Multifinance")
* *Regulations:* (misal: "OJK")
* *Reported Issue:* (misal: "Antivirus existing berat, laptop kantor lemot")


2. **Deterministic Lookup:** Kode backend (Python/Node.js) mencocokkan hasil ekstraksi ke file metadata JSON di atas (O(1) dictionary key lookup).
3. **Pass 2 (Synthesis Prompt):** Ambil sub-bab playbook yang cocok, masukkan ke *system prompt* bersama profil perusahaan dan artikel marketing internal Anda untuk menghasilkan:
* Skenario *use case* yang kontekstual.
* Urutan pertanyaan *discovery* saat meeting.
* Komparasi brand yang tepat untuk ditawarkan.