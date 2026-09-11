---

# Product Requirement Document (PRD)

## Project Name
## Magna Opportunity Intelligence Platform (MOIP)

---

# 1. Background

Saat ini proses penanganan opportunity baru di PT Smartnet Magna Global masih dilakukan melalui grup WhatsApp. Tim Lead Generation Officer (LGO) mengirimkan informasi calon customer secara manual, sehingga:

* Informasi sering tidak terstruktur.
* Engineer harus mencari ulang informasi perusahaan sebelum meeting.
* Persiapan meeting memerlukan waktu lama.
* Knowledge antar engineer tidak terdokumentasi.
* Riwayat progress opportunity sulit ditelusuri.
* Tidak ada monitoring terpusat mengenai status opportunity.

Akibatnya meeting sering berjalan kurang efektif karena engineer belum memahami konteks bisnis customer.

---

# 2. Problem Statement

Engineer menghabiskan terlalu banyak waktu untuk melakukan KYC (Know Your Customer) secara manual sebelum meeting.

Tidak ada sistem terpusat yang:

* menyimpan opportunity
* memonitor progress
* menghasilkan company profile otomatis
* menghasilkan rekomendasi use case
* membantu persiapan meeting

---

# 3. Objectives

## Business Objectives

* Mengurangi ketergantungan terhadap WhatsApp.
* Seluruh opportunity terdokumentasi.
* Mempercepat persiapan meeting.
* Meningkatkan kualitas diskusi presales.
* Menjadi single source of truth seluruh opportunity.

---

## Product Objectives

Membangun platform internal yang mampu

* mengelola opportunity
* melakukan AI KYC otomatis
* menghasilkan meeting preparation
* memberikan monitoring progress
* mengintegrasikan email dan Google Calendar

---

# 4. Target Users

| Role                    | Capability                   |
| ----------------------- | ---------------------------- |
| Admin                   | Full Access                  |
| Lead Generation Officer | Create & Manage Opportunity  |
| Engineer                | View, Edit KYC, Generate KYC |
| Manager                 | Dashboard & Monitoring       |

Seluruh user menggunakan autentikasi Google Workspace.

---

# 5. Success Metrics

* 100% opportunity tercatat di sistem.
* Waktu persiapan meeting berkurang secara signifikan.
* Engineer tidak lagi melakukan riset perusahaan secara manual.
* Seluruh KYC selesai dalam target kurang dari 5 menit.
* Seluruh meeting memiliki riwayat dan dokumentasi.

---

# 6. Opportunity Lifecycle

```
New

↓

KYC Running

↓

Ready Meeting

↓

Meeting Scheduled

↓

Meeting Done

↓

Need Proposal / Solution Brief

↓

POC

↓

Negotiation

↓

PO

↓

Won

↓

Lost

↓

On Hold
```

---

# 7. Features

## Authentication

* Login Google Workspace
* Role-based Access

---

## Dashboard

Menampilkan

* Total Opportunity
* New
* Meeting Today
* KYC Running
* KYC Completed
* Need Follow Up
* Won
* Lost

Revenue pipeline hanya terlihat oleh Manager.

---

## Opportunity Management

Opportunity memiliki

* Company Name *
* Website
* Email
* Phone
* Industry
* Meeting Schedule
* Product
* Customer Needs *
* Additional Notes

(*) Mandatory

---

## Timeline

Semua aktivitas tercatat.

Contoh

```
Opportunity Created

↓

KYC Started

↓

KYC Completed

↓

Meeting 1

↓

Meeting Note Updated

↓

Proposal Uploaded

↓

Status Changed
```

---

## Meeting Management

Satu Opportunity dapat memiliki banyak Meeting.

Setiap Meeting memiliki

* Date
* Participants
* Agenda
* Notes
* Action Items
* Attachments

---

# 8. AI KYC

KYC berjalan otomatis ketika Opportunity dibuat.

Engineer juga dapat menjalankan ulang KYC kapan saja.

AI mencari informasi dari

* Website resmi
* LinkedIn
* News

Jika URL tersedia, AI memprioritaskan URL tersebut dan menggabungkannya dengan hasil pencarian lainnya.

---

## Output

### Executive Summary

### Company Overview

### Industry

### Business Model

### Company Location

### Customer Need Summary

### Potential Pain Points

### Relevant Industry Use Cases

Setiap use case memiliki tampilan expandable yang berisi:

* Deskripsi singkat.
* Permasalahan yang diselesaikan.
* Cara kerja solusi.
* Dampak bisnis yang dihasilkan.
* Produk Google yang relevan.
* Solusi Smartnet Magna yang relevan (berbasis RAG).

### Meeting Objectives

### Recommended Questions

### Preparation Checklist

### References

---

# 9. KYC Versioning

Seluruh hasil KYC memiliki versi.

```
v1

Automatic

---------------

v2

Manual Regenerate

---------------

v3

Engineer Edited

```

Engineer dapat melihat riwayat perubahan maupun mengedit hasil KYC.

---

# 10. Notifications

Sistem mengirimkan notifikasi ketika:

* Opportunity dibuat.
* KYC selesai.
* Status berubah.
* Meeting H-1.
* Meeting H-30 menit.
* Proposal belum dibuat setelah meeting.

Notifikasi dikirim melalui email.

---

# 11. Google Integration

Google Calendar

* Membuat event otomatis.
* Mengundang peserta.

Gmail

* Reminder meeting.
* Reminder follow up.
* Notifikasi KYC selesai.

---

# 12. Future Enhancement

Bagian ini memuat peta inisiatif masa depan (*Future Enhancements*) yang dirancang untuk memperluas kapabilitas MOIP dari sekadar intelligence presales menjadi *end-to-end Opportunity Execution Engine*.

Setiap ide dilengkapi dengan **Technical Implementation Plan (Blueprint)** terstruktur yang berfungsi sebagai referensi siap-eksekusi bagi engineering team maupun AI coding agent ketika inisiatif tersebut diaktifkan di kemudian hari.

> [!IMPORTANT]
> **Kebijakan Embedding & RAG (Non-AI Studio)**:
> Untuk seluruh kebutuhan vector embedding dan semantic search (misal pada modul Proposal Draft dan Solution Brief), sistem **TIDAK menggunakan model embedding dari Google AI Studio**. Sistem mengadopsi standar enterprise dengan opsi:
> 1. **OpenAI / CosmosHub Embeddings** (e.g. `text-embedding-3-small` via OpenAI-compatible endpoint CosmosHub yang sudah terhubung).
> 2. **Google Cloud Vertex AI Text Embeddings** (e.g. `text-embedding-004` via GCP Enterprise SDK dengan Service Account / ADC, bukan consumer AI Studio API key).

---

## 12.1 AI Meeting Summary

### A. Ringkasan & Business Objective
* **Tujuan**: Mengotomatisasi ekstraksi intisari rapat dari catatan mentah presales, transkrip Google Meet, atau rekaman audio menjadi dokumentasi rapat yang terstruktur, ringkas, dan dapat ditindaklanjuti.
* **Manfaat Bisnis**: 
  * Menghilangkan friksi dokumentasi pasca-meeting bagi Engineer dan Presales.
  * Mencegah terlewatnya action items atau komitmen teknis/komersial kepada calon klien.
  * Menjembatani kesinambungan informasi antartim tanpa harus membaca catatan panjang atau mendengar ulang rekaman.
* **Aktor & Pemicu (Trigger)**:
  * **Aktor**: Engineer, Lead Generation Officer (LGO), Manager.
  * **Trigger**: 
    1. Tombol manual *"Generate AI Summary"* pada detail meeting.
    2. Webhook/automasi saat file transkrip Google Meet atau audio di-upload ke meeting attachments.

### B. Perubahan Skema Database & Data Models
* **Tabel Terkait**: `meetings` (diperluas) atau tabel relasi baru `meeting_ai_summaries`.
* **Rekomendasi Skema Model SQLAlchemy** (`backend/app/models/meeting.py`):
  * Tambahkan kolom langsung pada tabel `meetings`:
    * `raw_transcript`: `Column(Text, nullable=True)` — Menyimpan teks mentah transkrip rapat.
    * `ai_summary`: `Column(Text, nullable=True)` — Ringkasan eksekutif hasil AI (Markdown).
    * `key_discussion_points`: `Column(JSONB, nullable=True, default=list)` — Poin bahasan utama & temuan kebutuhan baru.
    * `client_sentiment`: `Column(String(50), nullable=True)` — Indikator respon klien: *Positive*, *Neutral*, *Hesitant*, *At Risk*.
    * `ai_action_items`: `Column(JSONB, nullable=True, default=list)` — Format: `[{"task": str, "assignee": str, "due_date": str, "status": "pending"}]`.
    * `summary_version`: `Column(Integer, default=1)` — Pelacakan regenerasi summary.
* **Alembic Migration**: Buat revisi baru dengan chain `down_revision` dari head migrations saat ini.

### C. Arsitektur LLM & Pipeline Prompting
* **Pilihan Model**: Google Gemini 2.5 Flash / Gemini 1.5 Pro via `app.core.llm.get_chat_llm()` atau native `get_genai_client()` (memanfaatkan context window hingga 1M token untuk transkrip panjang dan multimodal audio langsung).
* **Pipeline Service**: `backend/app/services/meeting_ai_service.py`
* **Input Context**:
  * Informasi Opportunity (Company Name, KYC Pain Points, Target Product).
  * Agenda & Peserta Meeting.
  * Raw Notes / Transcript Text.
* **Prompt Strategy**:
  * System prompt bertindak sebagai Presales Technical Scribe.
  * Structured Output (Pydantic Schema): `MeetingSummarySchema` memvalidasi JSON output yang terdiri dari: `executive_summary`, `pain_points_uncovered`, `tech_stack_detected`, `decisions_made`, `action_items` (task, PIC, deadline), dan `opportunity_stage_recommendation`.

### D. Spesifikasi Backend API (FastAPI)
* `POST /api/v1/meetings/{meeting_id}/ai-summary`:
  * Body: `{"source_type": "notes" | "transcript" | "audio", "custom_notes": Optional[str], "transcript_text": Optional[str]}`
  * Trigger background worker jika transkrip panjang (> 5.000 kata) atau pemrosesan audio.
* `GET /api/v1/meetings/{meeting_id}/ai-summary`: Mengambil ringkasan terbaru beserta riwayat versi.
* `POST /api/v1/meetings/{meeting_id}/ai-summary/apply-action-items`: Menyalin otomatis action items AI ke kolom resmi `meetings.action_items` dengan 1-klik konfirmasi pengguna.

### E. Background Worker & Asynchronous Tasks
* **Celery Task**: `tasks.generate_meeting_summary` pada `backend/app/tasks.py`.
* **Workflow**:
  1. Ambil data meeting & opportunity dari DB.
  2. Eksekusi LLM pipeline dengan penanganan retry exponential backoff.
  3. Simpan hasil ke `meetings` dan catat audit log di `audit_logs`.
  4. Kirim notifikasi real-time / email via `email_service` bahwa AI Summary telah siap.

### F. Spesifikasi Frontend UI & UX (Next.js)
* **Lokasi Komponen**:
  * Tab / Accordion baru di `frontend/src/app/(main)/meetings/[id]` atau modal detail meeting.
* **Elemen UI**:
  * Tombol aksi: *"Generate AI Summary"* dengan modal input transkrip / audio file drag-and-drop.
  * Card Ringkasan Eksekutif dengan visual badge sentimen klien.
  * Daftar Action Items interaktif: Checkbox untuk memilih action item yang disetujui, lalu tombol *"Apply to Meeting Action Items"*.
  * Markdown viewer dengan opsi copy / export ke format email follow-up.

### G. Integrasi Eksternal
* **Google Meet**: Integrasi fetching Google Meet Transcripts dari Google Drive user (jika Workspace mengaktifkan native recording/transcripts).
* **Google Calendar**: Sinkronisasi otomatis action items yang memiliki tanggal jatuh tempo ke Google Calendar peserta internal.

### H. Roadmap Langkah Eksekusi (Implementation Steps)
1. **Fase 1 (DB & Migration)**: Update model `Meeting`, buat Alembic migration, verifikasi integritas skema.
2. **Fase 2 (AI Engine)**: Buat `meeting_ai_service.py` dengan Pydantic output schema & prompt testing via script benchmark.
3. **Fase 3 (API & Celery)**: Tambahkan endpoints di router `backend/app/api/v1/endpoints/meetings.py` dan task Celery async di `tasks.py`.
4. **Fase 4 (Frontend UI)**: Kembangkan komponen `MeetingAISummaryCard` dan `ActionItemApplier` di Next.js.
5. **Fase 5 (Testing & Rollout)**: Unit test ekstrasi ringkasan, verifikasi RBAC (Engineer/Admin), dan deployment staging.

---

## 12.2 AI Proposal Draft

### A. Ringkasan & Business Objective
* **Tujuan**: Menghasilkan draf awal proposal teknis dan komersial yang komprehensif, terstruktur, dan disesuaikan dengan kebutuhan spesifik klien secara otomatis.
* **Manfaat Bisnis**:
  * Mengurangi beban kerja presales engineer dalam menyusun proposal dari 2-3 hari kerja menjadi kurang dari 15 menit.
  * Standardisasi format dokumen dan ketepatan pemetaan solusi teknologi PT Smartnet Magna Global.
  * Meningkatkan deal velocity pada tahapan *Need Proposal / Solution Brief*.
* **Aktor & Pemicu (Trigger)**:
  * **Aktor**: Presales Engineer, Manager, Lead Generation Officer.
  * **Trigger**: 
    1. Perubahan status Opportunity menjadi `Need Proposal / Solution Brief`.
    2. Tombol manual *"Generate AI Proposal Draft"* pada tab Proposal di Opportunity Detail.

### B. Perubahan Skema Database & Data Models
* **Tabel Baru**: `proposals`
* **Definisi Model SQLAlchemy** (`backend/app/models/proposal.py`):
  * `id`: `UUID` (PK).
  * `opportunity_id`: `UUID` (FK ke `opportunities.id`, index=True, ondelete="CASCADE").
  * `version`: `Integer` (1, 2, 3...).
  * `title`: `String(255)`.
  * `status`: `String(50)` (*draft*, *under_review*, *approved*, *sent_to_client*).
  * `scope_of_work`: `Text` (Markdown/JSONB).
  * `architecture_narrative`: `Text` (Penjelasan arsitektur solusi).
  * `solution_mapping`: `JSONB` (Daftar produk Google Cloud / solusi Smartnet Magna terpilih).
  * `timeline_phases`: `JSONB` (Fase implementasi & milestone).
  * `commercial_framework`: `Text` (Struktur komponen BoQ & asumsi komersial).
  * `google_docs_url`: `String(500), nullable=True` (Link ke file Google Docs yang di-generate).
  * `created_by`: `UUID` (FK ke `users.id`).
  * `created_at`, `updated_at`: `DateTime(timezone=True)`.
* **Alembic Migration**: Buat file migrasi untuk pembuatan tabel `proposals` beserta relasinya di `backend/app/models/opportunity.py`.

### C. Arsitektur LLM & Pipeline Prompting
* **Pilihan Model Generator**: Google Gemini 1.5 Pro / Gemini 2.5 Flash dengan high-reasoning capability.
* **Spesifikasi Model Embedding untuk RAG (Non-AI Studio)**:
  Untuk ekstraksi vektor dan pencarian semantik katalog solusi (*Solution Matching*), sistem **TIDAK menggunakan model embedding dari Google AI Studio**. Sistem mengadopsi salah satu dari dua opsi enterprise berikut:
  1. **OpenAI / CosmosHub Embeddings**: e.g., `text-embedding-3-small` (1536 dim) via OpenAI-compatible endpoint CosmosHub yang sudah terkonfigurasi pada backend.
  2. **Google Cloud Vertex AI Text Embeddings**: e.g., `text-embedding-004` (768 dim) via GCP Enterprise SDK menggunakan Service Account / Application Default Credentials (ADC).
* **Pipeline Service**: `backend/app/services/proposal_generator_service.py` (berbasis LangGraph Multi-Node Workflow):
  1. **Node 1: Context Aggregator**: Mengumpulkan data Opportunity KYC (Business Model, Pain Points), riwayat Meeting Notes, dan produk teridentifikasi.
  2. **Node 2: Solution Matching (RAG & Semantic Retrieval)**: Mengambil data mendalam dari tabel `master_solutions` (Use cases, business impact, primary products) menggunakan pencarian semantik berbasis embedding (OpenAI/CosmosHub atau Vertex AI) yang dikombinasikan dengan pembobotan kata kunci produk.
  3. **Node 3: Outline Synthesizer**: Menyusun struktur proposal (Executive Summary, Problem Context, Proposed Architecture, Deliverables, Project Plan).
  4. **Node 4: Deep Content Drafter**: Menghasilkan narasi teknis per sub-bagian dalam format Markdown terstruktur.
* **Output Format**: Format Markdown terstruktur yang siap dikonversi menjadi dokumen formal.

### D. Spesifikasi Backend API (FastAPI)
* `POST /api/v1/opportunities/{opp_id}/proposals/generate`:
  * Body: `{"focus_areas": Optional[str], "custom_scope": Optional[str], "target_products": Optional[list[str]]}`
  * Enqueue background Celery task.
* `GET /api/v1/opportunities/{opp_id}/proposals`: List riwayat proposal versi yang pernah digenerate.
* `GET /api/v1/proposals/{proposal_id}`: Detail proposal lengkap.
* `PUT /api/v1/proposals/{proposal_id}`: Menyimpan hasil edit/revisi manual oleh engineer.
* `POST /api/v1/proposals/{proposal_id}/export-google-docs`: Mengonversi draf proposal menjadi Google Docs baru di Google Drive user.

### E. Background Worker & Asynchronous Tasks
* **Celery Task**: `tasks.generate_proposal_draft` pada `backend/app/tasks.py`.
* **Proses**: Mengingat penyusunan proposal multi-step membutuhkan waktu 20-45 detik, pemrosesan wajib menggunakan Celery worker dengan status progress tracking via task state di Redis.
* **Notifikasi**: Kirim notifikasi in-app dan email saat proposal selesai dibuat.

### F. Spesifikasi Frontend UI & UX (Next.js)
* **Lokasi Komponen**: Tab baru *"Proposals"* di `frontend/src/app/(main)/opportunities/[id]/page.tsx`.
* **Fitur Antarmuka**:
  * Proposal Hub: Daftar versi proposal dengan status tag (*Draft*, *Reviewed*, *Sent*).
  * Proposal Generator Modal: Pengaturan parameter (fokus arsitektur, SLA, timeline kustom).
  * Rich Markdown Document Editor: Memungkinkan presales engineer mengoreksi teks secara inline.
  * One-click Action Buttons:
    * *"Export to Google Docs"* (membuka tab baru langsung ke Google Docs).
    * *"Download PDF / Markdown"*.
    * *"Copy to Clipboard"*.

### G. Integrasi Eksternal
* **Google Docs API & Google Drive API**:
  * Menggunakan Google Service Account atau User OAuth Token untuk membuat file Google Docs baru di shared folder tim presales.
  * Menerapkan corporate formatting styling (heading fonts, company header/footer, tables styling).

### H. Roadmap Langkah Eksekusi (Implementation Steps)
1. **Fase 1 (DB & Model)**: Buat model `Proposal`, update relasi `Opportunity`, jalankan Alembic migration.
2. **Fase 2 (RAG & Multi-Step LLM)**: Rancang prompt generator proposal terikat dengan katalog `MasterSolution`.
3. **Fase 3 (Google Docs Exporter)**: Implementasikan `google_docs_export_service.py` untuk konversi Markdown ke Google Docs.
4. **Fase 4 (API & Background Task)**: Implementasi Celery worker task dan endpoint FastAPI.
5. **Fase 5 (Frontend Integration)**: Bangun tab Proposal di Next.js dengan rich text/markdown editor dan tombol ekspor.

---

## 12.3 AI Solution Brief Generator

### A. Ringkasan & Business Objective
* **Tujuan**: Menghasilkan dokumen ringkas 1-2 halaman (*executive one-pager*) yang menyajikan ringkasan masalah klien, usulan arsitektur solusi, portofolio produk partner, dan taksiran dampak bisnis (business value proposition).
* **Manfaat Bisnis**:
  * Menyediakan materi siap-pakai untuk LGO dan Presales saat melakukan follow-up awal tanpa perlu menunggu proposal formal yang panjang.
  * Membantu pengambil keputusan level C-level/Direksi di sisi klien memahami urgensi dan solusi dalam waktu baca kurang dari 3 menit.
* **Aktor & Pemicu (Trigger)**:
  * **Aktor**: Lead Generation Officer (LGO), Presales Engineer, Sales/Account Executive.
  * **Trigger**: 
    1. Tahap setelah KYC selesai (*Ready Meeting* atau *Meeting Done*).
    2. Tombol cepat *"Generate 1-Page Solution Brief"* pada Opportunity Overview Card.

### B. Perubahan Skema Database & Data Models
* **Tabel Baru**: `solution_briefs`
* **Definisi Model SQLAlchemy** (`backend/app/models/solution_brief.py`):
  * `id`: `UUID` (PK).
  * `opportunity_id`: `UUID` (FK ke `opportunities.id`, ondelete="CASCADE", index=True).
  * `title`: `String(255)`.
  * `target_audience`: `String(100)` (e.g., *CTO*, *Head of IT*, *Finance Director*).
  * `challenge_statement`: `Text` (Pernyataan masalah utama).
  * `proposed_solution`: `Text` (Ringkasan pendekatan solusi).
  * `key_benefits`: `JSONB` (3-4 bullet points dampak bisnis kuantitatif/kualitatif).
  * `recommended_products`: `JSONB` (Daftar produk relevan dari Smartnet Magna / Google Cloud).
  * `next_steps`: `JSONB` (Langkah akselerasi yang disarankan).
  * `created_by`: `UUID` (FK ke `users.id`).
  * `created_at`, `updated_at`: `DateTime(timezone=True)`.
* **Alembic Migration**: Buat file migrasi SQLAlchemy untuk tabel `solution_briefs`.

### C. Arsitektur LLM & Pipeline Prompting
* **Pilihan Model Generator**: Google Gemini 2.5 Flash (sangat cepat, latensi rendah 3-7 detik).
* **Spesifikasi Model Embedding untuk RAG**:
  Mengikuti standar enterprise MOIP (Opsi 1: OpenAI/CosmosHub `text-embedding-3-small` atau Opsi 2: GCP Vertex AI `text-embedding-004`, **bukan Google AI Studio**) untuk mencocokkan cuplikan solusi `master_solutions` secara presisi.
* **Pipeline Service**: `backend/app/services/solution_brief_service.py`
* **Input Context**:
  * Executive summary & pain points dari hasil AI KYC yang sudah ada.
  * Catatan kebutuhan customer (`customer_needs`).
  * Cuplikan profil solusi relevan dari `master_solutions` hasil pencarian semantik embedding.
* **Prompt Engineering**:
  * Format template ketat: Maksimal 500-700 kata dalam 4 pilar (Problem, Solution Architecture, Value Proposition & ROI, Next Engagement).
  * Tone: Executive-friendly, persuasif, solutif, dan bebas jargon teknis yang tidak perlu.

### D. Spesifikasi Backend API (FastAPI)
* `POST /api/v1/opportunities/{opp_id}/solution-briefs`:
  * Body: `{"target_audience": "Technical" | "Executive" | "Business", "custom_notes": Optional[str]}`
  * Respon sinkron (synchronous) atau asinkron cepat (~5 detik).
* `GET /api/v1/opportunities/{opp_id}/solution-briefs`: Mengambil daftar brief yang pernah digenerate.
* `GET /api/v1/solution-briefs/{brief_id}/pdf`: Render HTML template ke PDF secara instan (menggunakan WeasyPrint atau headless chrome).

### E. Background Worker & Asynchronous Tasks
* Untuk generation standar dapat diproses secara langsung via async FastAPI handler jika durasi < 10 detik, atau menggunakan Celery task `tasks.generate_solution_brief` untuk menjaga beban server tetap stabil.

### F. Spesifikasi Frontend UI & UX (Next.js)
* **Lokasi Komponen**:
  * Quick-action card di halaman detail Opportunity (`/opportunities/[id]`).
* **Elemen UI**:
  * Modal pratinjau responsif dengan layout elegan menyerupai lembar brosur eksekutif (Executive One-Pager Layout).
  * Switcher tone: *Executive C-Level* vs *Technical Lead*.
  * Tombol aksi:
    * *"Download Branded PDF"* (lengkap dengan kop surat PT Smartnet Magna Global).
    * *"Copy as Markdown/Email"*.

### G. Integrasi Eksternal
* **PDF Engine**: Server-side rendering menggunakan Jinja2 HTML template + WeasyPrint/Puppeteer untuk menghasilkan layout PDF siap cetak berstandar korporat.
* **Email Sender**: Tombol kirim langsung sebagai attachment email ke stakeholder internal / partner.

### H. Roadmap Langkah Eksekusi (Implementation Steps)
1. **Fase 1 (DB Schema)**: Buat model `SolutionBrief` dan migrasi Alembic.
2. **Fase 2 (LLM Prompt & Engine)**: Bangun `solution_brief_service.py` dengan Pydantic output model.
3. **Fase 3 (HTML-to-PDF Template)**: Desain layout HTML/CSS printable branded 1-pager.
4. **Fase 4 (FastAPI Endpoints)**: Rilis endpoints generate & PDF export.
5. **Fase 5 (Frontend Widget)**: Tambahkan drawer/modal Solution Brief di tampilan Opportunity.

---

## 12.4 AI Next Action Recommendation

### A. Ringkasan & Business Objective
* **Tujuan**: Membangun asisten presales cerdas (*Presales Deal Coach / Opportunity Copilot*) yang proaktif memonitor setiap opportunity dan merekomendasikan tindakan konkret paling relevan secara berkala.
* **Manfaat Bisnis**:
  * Mencegah opportunity menjadi "dingin" (*stale / abandoned*) akibat keterlambatan follow-up.
  * Memberikan bimbingan taktis kepada engineer junior atau LGO mengenai langkah presales berikutnya yang paling efektif.
  * Meningkatkan rasio konversi deal (*Win Rate*) secara terukur.
* **Aktor & Pemicu (Trigger)**:
  * **Aktor**: Seluruh pengguna (LGO, Engineer, Manager, Admin).
  * **Trigger**:
    1. **Event-driven**: Otomatis dievaluasi ketika status Opportunity berubah, meeting baru selesai ditambahkan, atau KYC selesai di-generate.
    2. **Scheduled (Celery Beat)**: Pengecekan otomatis setiap pagi (pukul 08:00 WIB) untuk seluruh opportunity aktif.

### B. Perubahan Skema Database & Data Models
* **Tabel Baru**: `opportunity_recommendations`
* **Definisi Model SQLAlchemy** (`backend/app/models/opportunity_recommendation.py`):
  * `id`: `UUID` (PK).
  * `opportunity_id`: `UUID` (FK ke `opportunities.id`, ondelete="CASCADE", index=True).
  * `recommendation_type`: `String(50)` (e.g., *follow_up_stale*, *schedule_technical_deep_dive*, *prepare_proposal*, *send_reference_case*, *escalate_blocker*).
  * `priority`: `String(20)` (*urgent*, *high*, *medium*, *low*).
  * `title`: `String(255)`.
  * `description`: `Text` (Alasan rekomendasi & insight konteks).
  * `suggested_action_payload`: `JSONB` (Template email follow-up siap pakai, daftar pertanyaan lanjutan, atau link materi solusi).
  * `is_completed`: `Boolean, default=False`.
  * `is_dismissed`: `Boolean, default=False`.
  * `dismissed_reason`: `String(255), nullable=True`.
  * `expires_at`: `DateTime(timezone=True), nullable=True`.
  * `created_at`: `DateTime(timezone=True), server_default=func.now()`.
* **Alembic Migration**: Buat revisi Alembic untuk tabel `opportunity_recommendations`.

### C. Arsitektur LLM & Heuristic Pipeline
* **Hybrid Engine**: Kombinasi aturan heuristik (*rule-based filtering*) dan penalaran AI (*LLM Deal Coach*):
  1. **Heuristic Filter**:
     * Opportunity di status `Ready Meeting` > 3 hari tanpa jadwal meeting terdaftar -> Trigger rekomendasi jadwalkan meeting.
     * Meeting `Done` > 2 hari tanpa update proposal/brief -> Trigger rekomendasi pembuatan proposal.
     * Opportunity tidak ada update aktivitas di timeline > 7 hari -> Trigger peringatan *deal stagnation*.
  2. **LLM Contextual Reasoning (Gemini 2.5 Flash)**:
     * Menganalisis catatan meeting terakhir, sentimen klien, dan pain point KYC.
     * Menghasilkan teks rekomendasi yang personal dan kontekstual beserta draft email follow-up khusus untuk klien tersebut.
* **Service File**: `backend/app/services/recommendation_service.py`

### D. Spesifikasi Backend API (FastAPI)
* `GET /api/v1/opportunities/{opp_id}/recommendations`: Mengambil daftar rekomendasi aktif untuk opportunity tertentu.
* `GET /api/v1/recommendations/my-feed`: Mengambil agregasi rekomendasi prioritas tinggi di seluruh opportunity milik user yang sedang login (untuk Dashboard).
* `POST /api/v1/recommendations/{rec_id}/complete`: Menandai rekomendasi telah selesai dijalankan.
* `POST /api/v1/recommendations/{rec_id}/dismiss`: Mengabaikan rekomendasi dengan alasan opsional.

### E. Background Worker & Asynchronous Tasks
* **Celery Task**:
  * `tasks.evaluate_opportunity_recommendations(opportunity_id)`: Dipanggil saat event perubahan data.
  * `tasks.daily_opportunity_health_scan()`: Dijalankan berkala oleh **Celery Beat** setiap hari kerja pukul 08:00 WIB.

### F. Spesifikasi Frontend UI & UX (Next.js)
* **Lokasi Komponen**:
  1. **Widget di Dashboard (`/dashboard`)**: Card *"Presales Copilot: Urgent Recommendations"* menampilkan 5 aksi paling kritis hari ini.
  2. **Sidebar Card di Opportunity Detail (`/opportunities/[id]`)**: Box interaktif berwarna aksen (Amber/Blue) dengan badge prioritas, tombol *"Mark Done"*, *"Dismiss"*, dan tombol *"Use Email Template"*.
* **Fitur Tambahan**: Modal pop-up preview draft email follow-up yang bisa langsung dibuka ke `mailto:` atau disalin dengan 1 klik.

### G. Integrasi Eksternal
* **Gmail / Email Service**: Otomatisasi pembukaan template email di Gmail klien atau pengiriman reminder internal via `email_service.py`.
* **In-app Notification System**: Menyambung ke tabel `notifications` MOIP untuk mengirimkan bell notification jika terdapat rekomendasi berprioritas *urgent*.

### H. Roadmap Langkah Eksekusi (Implementation Steps)
1. **Fase 1 (DB & Model)**: Buat model `OpportunityRecommendation` dan file migrasi Alembic.
2. **Fase 2 (Heuristic Rules & LLM Evaluator)**: Implementasikan logika evaluasi di `recommendation_service.py`.
3. **Fase 3 (Celery Beat & Event Hooks)**: Tambahkan beat schedule di Celery configuration dan hook event pada perubahan opportunity.
4. **Fase 4 (FastAPI Router)**: Buat router endpoints dan pengujian unit test.
5. **Fase 5 (Frontend UI Copilot)**: Rancang widget dashboard dan card rekomendasi interaktif di tampilan Opportunity.

---