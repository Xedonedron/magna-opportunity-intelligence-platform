# Blueprint Implementasi Masa Depan (Future Implementation Roadmap)
> **Dokumen Arsitektur & Panduan Pengembangan Lanjutan MOIP**  
> **Status**: Approved for Roadmap | **Target Model Utama**: Google Gemini (Gemini 3.8 Flash & text-embedding-004)

Dokumen ini merangkum rencana arsitektur dan peningkatan strategis untuk platform **Magna Opportunity Intelligence Platform (MOIP)** berdasarkan evaluasi teknis, feedback senior konsultan, dan hasil benchmark multi-model.

---

## Daftar Isi
1. [Inisiatif 1: Generation by Section & Native Structured Output](#inisiatif-1-generation-by-section--native-structured-output)
2. [Inisiatif 2: Penyempurnaan Target Personas (UX & Schema)](#inisiatif-2-penyempurnaan-target-personas-ux--schema)
3. [Inisiatif 3: RAG & Vector Embeddings untuk Magna Solutions Catalog](#inisiatif-3-rag--vector-embeddings-untuk-magna-solutions-catalog)
4. [Rencana Fase Eksekusi & Prioritas](#rencana-fase-eksekusi--prioritas)

---

## Inisiatif 1: Generation by Section & Native Structured Output

### 1.1 Latar Belakang Masalah (Kenapa Perlu Diubah?)
Saat ini, pembuatan laporan KYC dilakukan dalam **satu panggilan LLM monolitik (*single brutal prompt*)**:
- LLM dipaksa menghasilkan seluruh 12 section sekaligus (Executive Summary, Company Overview, Industry Analysis, Competitors, Business Model, Customer Needs, Pain Points, 3 Solusi/Use Cases detail, Meeting Objectives, Questions, Checklist, dan References).
- **Kelemahan Monolitik**:
  1. *Attention Decay*: LLM cenderung dangkal pada bagian tengah atau akhir karena beban instruksi yang terlalu padat dalam satu prompt.
  2. *Brittle JSON Parsing*: Mengandalkan regex pembersih teks (`_clean_and_parse_json`) yang rawan *syntax error* atau terpotong (*truncated*) jika output panjang.
  3. *Sulit Fine-Tuning Per Section*: Tidak bisa memberikan instruksi mendalam (misal: analisis finansial khusus perbankan) tanpa membuat prompt utama membengkak.

### 1.2 Apa itu "Structured Output"?
**Structured Output** adalah fitur mutakhir dari provider AI modern (Google Gemini API & OpenAI) yang menjamin **100% output mematuhi skema JSON (Pydantic Schema)** pada level decoding token:
- Model **tidak akan pernah** menghasilkan JSON rusak, kurung kurawal terpotong, atau markdown pengantar yang tidak diinginkan.
- Di LangChain: menggunakan metode `llm.with_structured_output(PydanticModel)`.
- Di Google GenAI SDK: menggunakan konfigurasi native `generation_config={"response_mime_type": "application/json", "response_schema": PydanticModel}`.
- **Dampaknya**: Seluruh fungsi regex *self-healing* yang rumit dapat dihapus total, dan integritas data API dijamin 100% konsisten.

### 1.3 Arsitektur *Sectional Generation Pipeline* (LangGraph / Asynchronous Modular)
Laporan KYC dipecah menjadi beberapa node generasi modular yang dapat berjalan secara independen atau paralel:

```mermaid
graph TD
    Start[Input Opportunity Data & Research Context] --> Branch
    
### 1.3 Arsitektur *Sectional Generation Pipeline* & Granular Auto-Retry

#### A. Urutan Alur Generasi: *Executive Summary* sebagai Sintesis Terakhir
Dalam praktik konsultan bisnis enterprise, **Executive Summary selalu ditulis paling akhir**. Executive Summary yang bernilai tinggi bukan sekadar ringkasan profil perusahaan, melainkan sintesis strategis yang merangkum:
1. Konteks bisnis dan posisi industri klien.
2. Akar permasalahan teknis (*pain points*) yang mendesak.
3. Rekap portofolio solusi SMG yang diajukan beserta justifikasi arsitekturnya.
4. Urgensi bisnis dan target pencapaian pada meeting presales mendatang.

Oleh karena itu, alur eksekusi generasi dibagi menjadi 3 fase bertingkat:

```mermaid
graph TD
    Start[Input Opportunity Data & Research Context] --> Phase1
    
    subgraph Phase 1: Analisis Fondasi (Paralel)
        Phase1[Dispatcher Stage 1] --> SecA[1. Profil & Model Bisnis Perusahaan]
        Phase1 --> SecB[2. Lanskap Industri & Analisis Kompetitor]
        Phase1 --> SecC[3. Customer Needs & Operational Pain Points]
    end

    subgraph Phase 2: Solusi Teknis & Eksekusi Presales (Paralel)
        SecC --> Phase2[Dispatcher Stage 2]
        Phase2 --> SecD[4. Arsitektur Solusi SMG & Presales Use Cases]
        Phase2 --> SecE[5. Meeting Objectives, Discovery Questions & Checklist]
    end

    subgraph Phase 3: Sintesis Akhir (Executive Synthesis)
        SecA & SecB & SecD & SecE --> SecFinal[6. Executive Summary Terintegrasi]
    end

    SecFinal --> AtomicCheck{Semua Section Berhasil?}
    AtomicCheck -- Ya --> FinalJSON[Commit ke Database & Tampilkan di Frontend]
    AtomicCheck -- Gagal di Bagian Tertentu --> SectionRetry[Auto-Retry Hanya Section yang Gagal]
    SectionRetry --> AtomicCheck
```

#### B. Granular Fault-Tolerance & Section-Level Auto-Retry
- **Masalah pada Pipeline Monolitik**: Jika satu prompt 12-section mengalami timeout atau *rate limit* di detik ke-40, seluruh proses gagal dan harus diulang dari awal (buang token dan waktu).
- **Mekanisme Granular Auto-Retry per Section**:
  1. Setiap section dijalankan sebagai unit task independen dengan mekanisme *retry handler* (misal: 3x *exponential backoff*).
  2. Jika 5 section berhasil dan 1 section (misal: *Analisis Kompetitor*) mengalami kegagalan/timeout, sistem **HANYA me-retry section yang gagal tersebut**. Hasil 5 section lainnya tetap dipertahankan dalam memori/state.
  3. **Atomic UI Presentation Guarantee**: Meskipun proses di backend bersifat terpotong-potong per section, frontend **HANYA menampilkan laporan ketika 100% seluruh section telah berhasil diproses secara lengkap**. User tidak akan pernah melihat laporan yang setengah jadi atau *corrupted*.

#### C. Pembagian Modul Section:
1. **Module 1: Company Profile & Business Footprint** (`CompanyOverviewModel`, `BusinessModel`, `LocationModel`)
2. **Module 2: Industry Dynamics & Competitors** (`IndustryAnalysisModel`, `List[CompetitorModel]`)
3. **Module 3: Customer Pain Points & Latent Needs** (`CustomerNeedSummaryModel`, `List[PainPointModel]`)
4. **Module 4: Technical Architecture & Presales Use Cases** (`List[PresalesUseCaseModel]` - Grounding Hybrid RAG Solusi SMG)
5. **Module 5: Presales Engagement Strategy** (`MeetingStrategyModel` - Pertanyaan discovery per stakeholder & checklist)
6. **Module 6: Ultimate Executive Summary** (`ExecutiveSummaryModel` - Mengonsolidasikan Module 1 s/d 5 menjadi narasi C-Level yang kohesif)

---

## Inisiatif 3: RAG & Vector Embeddings untuk Magna Solutions Catalog

### 3.1 Transisi dari Lexical Search ke Hybrid RAG
Untuk mencegah *false positives* (seperti artikel rumah sakit masuk ke perbankan) sekaligus memastikan relevansi semantik tingkat tinggi saat katalog SMG bertambah besar:

```
                      [ Input Kebutuhan Klien ]
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ 1. Deterministic Metadata Filter (Hard Constraints)               │
│    - Industry Isolation: Exclude dokumen yang bertag eksklusif    │
│      industri lain (misal: Healthcare jika klien adalah Banking).  │
│    - Deployment Mode: Prioritaskan On-Premises jika klien         │
│      eksplisit meminta server lokal.                              │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼  (Kandidat Dokumen Terfilter)
┌───────────────────────────────────────────────────────────────────┐
│ 2. Semantic Embedding Similarity (Gemini text-embedding-004)      │
│    - Query Embed: 1 call API ke text-embedding-004               │
│    - Compute Cosine Similarity terhadap Vektor Katalog SMG        │
│    - Ambil Top-K (misal Top 3) Solusi dengan skor tertinggi       │
└───────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────┐
│ 3. LLM Generation (Gemini 3.8 Flash)                              │
│    - Menghasilkan rekomendasi use case arsitektural yang akurat   │
│      berdasarkan dokumen resmi terpilih                           │
└───────────────────────────────────────────────────────────────────┘
```

### 3.2 Standardisasi Ekosistem: Google Gemini
- **Generasi & Analisis**: `gemini-3.8-flash` (cepat, cerdas, context window besar, cost-effective).
- **Embedding Model**: `text-embedding-004` (model embedding resmi Google dengan dimensi 768, mendukung retrieval dokumen B2B dengan presisi tinggi).
- **Manajemen Kredensial**: Menggunakan `get_genai_client()` yang sudah ada di `backend/app/core/llm.py` via `GEMINI_API_KEY`.

### 3.3 Mekanisme Caching Vektor (Zero Extra Cost)
- Seluruh 46+ kartu solusi SMG dihitung vektor embedding-nya sekali saja (*pre-computed*).
- Vektor disimpan di file cache JSON lokal (`app/data/solution_embeddings.json`) atau tabel PostgreSQL dengan ekstensi `pgvector`.
- Saat runtime, proses retrieval **hanya melakukan 1 kali API call** untuk embedding query input klien, lalu menghitung *cosine similarity* di memori (< 1 milidetik).

### 3.4 Penambahan Solusi Resmi SMG yang Hilang
Katalog solusi resmi SMG wajib ditambahkan 2 kartu solusi strategis:
1. **On-Premise Enterprise Data Warehouse (EDW) with Greenplum Database (MPP Architecture)**
   - *Teknologi*: Greenplum Database (VMware Tanzu / Open Source MPP), Dell PowerEdge Server, Nutanix HCI, All-Flash NVMe Storage.
   - *Use Case*: Pengolahan data historis skala 10 TB - 100 TB+, pemrosesan query join kompleks antar ratusan tabel, Single Source of Truth on-premises.
2. **Microsoft SQL Server Modernization, Performance Tuning & Hybrid Data Mart**
   - *Teknologi*: Microsoft SQL Server Enterprise, Clustered Columnstore Indexing, In-Memory OLTP, Partitioning, PolyBase.
   - *Use Case*: Optimasi performa database existing, eliminasi query bottleneck, dan offloading beban pelaporan harian.

---

## Rencana Fase Eksekusi & Prioritas

| No | Inisiatif | Estimasi Kompleksitas | Komponen Terdampak | Prioritas |
|---|---|---|---|---|
| 1 | **Katalog RAG & Solusi Greenplum/SQL Server** | Menengah | `backend` (`solutions_catalog.py`, `embedding_service.py`, data kartu) | **Tinggi (P1)** |
| 2 | **Penyempurnaan Target Personas (Others & Subtitle)** | Rendah - Menengah | `frontend` (`TargetPersonaTab.tsx`), `backend` (`persona_service.py`) | **Tinggi (P1)** |
| 3 | **Sectional KYC Generation & Structured Output** | Menengah - Tinggi | `backend` (`kyc_pipeline.py`, schema Pydantic) | **Strategis (P2)** |

---
*Dokumen ini merupakan acuan resmi untuk iterasi pengembangan berikutnya di MOIP.*
