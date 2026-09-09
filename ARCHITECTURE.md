# MOIP Technical Architecture & System Design

> Dokumen arsitektur teknikal untuk **Magna Opportunity Intelligence Platform (MOIP)** — AI-powered pre-sales intelligence system milik PT Smartnet Magna Global. Terpisah dari [MOIP_USER_MANUAL.md](./MOIP_USER_MANUAL.md) (panduan end-user) dan [AI_CONTEXT.md](./AI_CONTEXT.md) (referensi cepat AI assistant).

---

## Daftar Isi

1. [Overview Arsitektur & Topology](#1-overview-arsitektur--topology)
2. [Tech Stack & Komponen](#2-tech-stack--komponen)
3. [Sequence Diagram & Flow Aplikasi](#3-sequence-diagram--flow-aplikasi)
4. [State Machine & Lifecycle](#4-state-machine--lifecycle)
5. [Database Schema & Relasi (ERD)](#5-database-schema--relasi-erd)
6. [Keamanan, RBAC & Capabilities](#6-keamanan-rbac--capabilities)
7. [Arsitektur AI Engine & RAG Strategy](#7-arsitektur-ai-engine--rag-strategy)
8. [Arsitektur Deployment & Infrastruktur](#8-arsitektur-deployment--infrastruktur)
9. [Katalog API Endpoints](#9-katalog-api-endpoints)

---

## 1. Overview Arsitektur & Topology

MOIP menggunakan arsitektur **decoupled frontend-backend** dengan async task queue untuk operasi AI yang berat.

```mermaid
graph TB
    subgraph "Client Browser"
        FE["Next.js 16 Vercel\nReact 19 + TypeScript"]
    end

    subgraph "External Services"
        GOOGLE_AI["Google AI Studio\nGemini / Gemma"]
        OPENAI_COMPAT["OpenAI-Compatible\nCosmosHub / DeepSeek / GLM"]
        TAVILY["Tavily API\nWeb Search"]
        GOOGLE_GROUND["Google Search\nGrounding"]
        LINKEDIN["LinkedIn Voyager\nAPI"]
        GMAIL["Gmail API"]
        GCAL["Google Calendar API"]
    end

    subgraph "VPS Docker Compose"
        API["FastAPI Backend\n:8009 → :8000"]
        CELERY["Celery Worker\nBackground Jobs"]
        PG["PostgreSQL 16\n:5435 → :5432"]
        REDIS["Redis 7\n:6379\nMessage Broker"]
    end

    FE -- "HTTPS REST\nBearer JWT" --> API
    API -- "SQLAlchemy ORM" --> PG
    API -- "Task Dispatch .delay" --> REDIS
    REDIS -- "Consume Tasks" --> CELERY
    CELERY -- "DB Read/Write" --> PG
    CELERY -- "LLM Inference" --> GOOGLE_AI
    CELERY -- "LLM Inference" --> OPENAI_COMPAT
    CELERY -- "Web Research" --> TAVILY
    CELERY -- "Web Research" --> GOOGLE_GROUND
    API -- "Streaming Chat" --> GOOGLE_AI
    API -- "Streaming Chat" --> OPENAI_COMPAT
    API -- "LinkedIn Intel" --> LINKEDIN
    CELERY -- "Email Notify" --> GMAIL
    CELERY -- "Calendar Sync" --> GCAL
```

### Batasan Arsitektur

| Boundary | Komponen | Lokasi |
|----------|----------|--------|
| **Frontend** | Next.js 16 (App Router) | Vercel (auto-deploy dari `main`) |
| **API Gateway** | FastAPI + Uvicorn | Docker container di VPS |
| **Worker** | Celery (Python) | Docker container di VPS |
| **Data Store** | PostgreSQL 16 + Redis 7 | Docker containers di VPS |
| **AI Providers** | Google AI Studio, OpenAI-compatible | External cloud APIs |
| **Search Providers** | Tavily, Google Search Grounding | External APIs (switchable via DB) |

---

## 2. Tech Stack & Komponen

### Frontend

| Kategori | Teknologi | Detail |
|----------|-----------|--------|
| Framework | Next.js (App Router) | v16 |
| UI Library | React | v19 |
| Language | TypeScript | Strict mode |
| Styling | Tailwind CSS + shadcn/ui | Utility-first + headless components |
| State / Data Fetching | TanStack Query (React Query) | Server state caching & mutations |
| Forms | React Hook Form + Zod | Schema-based validation |
| Charts | Recharts | Dashboard visualizations |
| Drag & Drop | @hello-pangea/dnd | Kanban board |
| Notifications | Sonner | Toast notifications |
| Theming | next-themes | Dark/light mode persistence |
| i18n | Custom React Context | `locales/en.ts`, `locales/id.ts` |

### Backend

| Kategori | Teknologi | Detail |
|----------|-----------|--------|
| Framework | FastAPI | Python 3.11+, async |
| ORM | SQLAlchemy 2.0 | Mapped columns, UUID primary keys |
| Migrations | Alembic | Auto-upgrade on container start |
| Database | PostgreSQL 16 | Alpine image, JSONB columns |
| Task Queue | Celery 5+ | Redis 7 as broker |
| AI Orchestration | LangGraph + LangChain | StateGraph 2-node pipeline |
| Web Crawling | httpx + BeautifulSoup4 | Async HTTP + HTML parsing |
| Web Search | Tavily API + Google Grounding | Switchable via `system_settings` |
| LinkedIn | LinkedIn Voyager API client | Company/executive/post intelligence |
| Auth | Google OAuth 2.0 + Dev login | JWT Bearer tokens |
| Password Hashing | PBKDF2-HMAC-SHA256 | 100k iterations, random salt |

### LLM Integration — Dual Provider via `app/core/llm.py`

```
┌────────────────────────────────────────────────────────┐
│              Unified LLM Factory: get_chat_llm()       │
│                                                        │
│  ┌──────────────────┐    ┌───────────────────────────┐ │
│  │  Google Provider  │    │  OpenAI-Compatible        │ │
│  │  gemini-2.5-flash│    │  glm-4-plus (default)     │ │
│  │  gemma-4-26b-a4b │    │  deepseek-*, gpt-*        │ │
│  │  langchain-      │    │  langchain-openai          │ │
│  │  google-genai    │    │  base: cosmoshub.tech/v1   │ │
│  └──────────────────┘    └───────────────────────────┘ │
│                                                        │
│  Runtime switchable via DB table system_settings       │
│  Keys: llm_provider, ai_model, temperature,           │
│         gemini_api_key, openai_api_key, openai_api_base│
└────────────────────────────────────────────────────────┘
```


---

## 3. Sequence Diagram & Flow Aplikasi

### 3.1 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant FE as Next.js Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL

    U->>FE: Buka /login
    alt Google OAuth
        U->>FE: Klik Sign in with Google
        FE->>U: Google consent popup
        U->>FE: OAuth credential token
        FE->>API: POST /api/auth/google
        API->>API: Verify Google ID token
        API->>DB: Upsert User by google_id + email
    else Dev Login
        U->>FE: Input username + password
        FE->>API: POST /api/auth/login
        API->>DB: Query User by email
        API->>API: PBKDF2 verify password
    end
    API->>API: Generate JWT sub=user.id
    API-->>FE: token + user
    FE->>FE: localStorage moip_token = token
    FE-->>U: Redirect ke /dashboard

    Note over FE,API: Subsequent requests:<br/>Axios interceptor adds<br/>Authorization: Bearer token
```

### 3.2 KYC Pipeline Flow — Async Celery + LangGraph

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant Redis as Redis
    participant Worker as Celery Worker
    participant Search as Tavily / Google Grounding
    participant Crawler as WebCrawlerService
    participant LLM as LLM Provider
    participant DB as PostgreSQL

    U->>FE: Create Opportunity atau Klik Regenerate
    FE->>API: POST /api/opportunities atau POST .../kyc/regenerate
    API->>DB: Insert Opportunity status=New
    API->>DB: Insert KYCReport status=running progress=0%
    API->>DB: Update Opportunity status=KYC Running
    API->>Redis: Dispatch run_kyc_pipeline_task.delay
    API-->>FE: 202 Accepted

    Note over FE: UI shows progress bar polling KYC status

    Redis->>Worker: Consume task

    rect rgb(230, 245, 255)
        Note over Worker: LangGraph Node 1 - research_node
        Worker->>Search: Search company info + news + industry use cases
        Search-->>Worker: Search results URLs and snippets
        Worker->>Worker: LinkVerifier filter and verify live URLs
        Worker->>Crawler: crawl_website company_url
        Note over Crawler: SSRF check then httpx GET then BeautifulSoup parse
        Crawler-->>Worker: title description text_content headings
        Worker->>DB: Update progress researching 40-65%
    end

    rect rgb(255, 245, 230)
        Note over Worker: LangGraph Node 2 - analysis_node
        Worker->>Worker: Build prompt with research context + Smartnet Magna catalog
        Worker->>LLM: Invoke LLM 13-section JSON output
        LLM-->>Worker: JSON response 3000-5000+ tokens
        Worker->>Worker: _clean_and_parse_json regex repair bracket healing
        Worker->>Worker: LinkVerifier sanitize references
        Worker->>DB: Update progress analyzing 85%
    end

    Worker->>DB: Write KYCReport 13 fields
    Worker->>DB: KYCReport status=completed progress=100%
    Worker->>DB: Opportunity status=Ready Meeting
    Worker->>DB: Insert TimelineEvent KYC Completed
    Worker->>Redis: Dispatch send_kyc_completed_notification.delay
    Worker->>DB: Insert Notification type=kyc_completed
```


### 3.3 LLM Resilience & Fallback Flow

```mermaid
flowchart TD
    A[LLM Invocation] --> B{Response OK?}
    B -- Yes --> C[Parse JSON]
    C --> D{JSON Valid?}
    D -- Yes --> E[Return KYC Sections]
    D -- No --> F{Retry count < 3?}
    F -- Yes --> G[Switch json_mode=False\nTimeout 240s]
    G --> A
    F -- No --> H[Return Error]

    B -- 502 Timeout Stream Dropped --> I{Retry count < 3?}
    I -- Yes --> J{Final retry\nand Google key exists?}
    J -- Yes --> K[Auto-fallback Google\ngemini-2.5-flash]
    J -- No --> G
    K --> A
    I -- No --> H

    style K fill:#ffd700,stroke:#333
    style H fill:#ff6b6b,stroke:#333
    style E fill:#51cf66,stroke:#333
```

**Strategi Resilience:**

| Strategi | Detail |
|----------|--------|
| Client timeout | 180s–240s di `get_chat_llm()` |
| Reasoning model guard | Auto-strip `response_format` JSON untuk model R1, o1, o3, QWQ |
| Retry loop | Max 3 attempts, exponential backoff 2s–6s |
| JSON self-healing | Regex fence extraction, trailing comma cleanup, bracket balancing |
| Provider fallback | Final retry auto-switch ke `gemini-2.5-flash` jika OpenAI gagal |

### 3.4 AI Chat Streaming Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant DB as PostgreSQL
    participant LLM as LLM Provider

    U->>FE: Ketik pesan di Chat Sidebar
    FE->>API: POST /api/opportunities/id/chat
    API->>DB: Load opportunity + KYC report + chat history 7 hari
    API->>API: Build system prompt opportunity context + KYC data
    API->>LLM: Stream LLM inference streaming=true
    loop Token chunks
        LLM-->>API: Token chunk
        API-->>FE: SSE chunked response
        FE->>FE: Render token real-time
    end
    API->>DB: Save user message role=user
    API->>DB: Save AI response role=assistant
    API->>DB: Record ai_token_usages tokens cost duration
```

### 3.5 Target Persona Generation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant LLM as LLM Provider
    participant DB as PostgreSQL

    U->>FE: Pilih Seniority + Department lalu Generate
    FE->>API: POST /api/opportunities/id/personas/generate
    API->>DB: Load opportunity + KYC report data
    API->>LLM: Generate persona playbook seniority x department
    LLM-->>API: focus_areas questions value_props objection_handling
    API->>DB: Upsert OpportunityPersona unique opp_id+seniority+department
    API-->>FE: Persona playbook data
    FE->>FE: Render 4 sections
```

### 3.6 LinkedIn Intelligence & KYC Enrichment Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as FastAPI
    participant LI as LinkedIn Voyager API
    participant DB as PostgreSQL

    U->>FE: Search company executives posts
    FE->>API: POST /api/linkedin/company/search
    API->>LI: LinkedIn Voyager company search
    LI-->>API: Company profile headcount specialties
    API-->>FE: LinkedIn data

    U->>FE: Enrich KYC with LinkedIn
    FE->>API: POST /api/linkedin/enrich/opportunity_id
    API->>LI: Fetch company + executives + posts
    LI-->>API: Enrichment data
    API->>DB: Merge LinkedIn insights into KYC report
    API-->>FE: Enriched KYC
```


---

## 4. State Machine & Lifecycle

### 4.1 Opportunity Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> New: Opportunity created

    New --> KYC_Running: Auto KYC pipeline triggered

    KYC_Running --> Ready_Meeting: Auto KYC completed
    KYC_Running --> New: Auto KYC failed status reverted

    Ready_Meeting --> Meeting_Scheduled: Manual meeting date confirmed
    Meeting_Scheduled --> Meeting_Done: Manual meeting completed

    Meeting_Done --> Need_Proposal: Manual proposal requested
    Meeting_Done --> POC: Manual POC needed
    Meeting_Done --> Negotiation: Manual direct negotiation

    Need_Proposal --> POC: Manual
    Need_Proposal --> Negotiation: Manual
    POC --> Negotiation: Manual

    Negotiation --> PO: Manual PO received
    PO --> Won: Manual contract signed

    Negotiation --> Lost: Manual deal lost
    Ready_Meeting --> On_Hold: Manual client postponed
    Meeting_Scheduled --> On_Hold: Manual
    Meeting_Done --> On_Hold: Manual

    state "New" as New
    state "KYC Running" as KYC_Running
    state "Ready Meeting" as Ready_Meeting
    state "Meeting Scheduled" as Meeting_Scheduled
    state "Meeting Done" as Meeting_Done
    state "Need Proposal" as Need_Proposal
    state "POC" as POC
    state "Negotiation" as Negotiation
    state "PO" as PO
    state "Won" as Won
    state "Lost" as Lost
    state "On Hold" as On_Hold
```

### 4.2 KYC Report Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: KYCReport record created
    pending --> running: Pipeline task consumed by worker
    running --> completed: All 13 sections generated and saved
    running --> failed: LLM error or parse error or timeout
    failed --> pending: User clicks Regenerate new version
    completed --> pending: User clicks Regenerate new version
```

**KYC Progress Steps:**

| Step | Percent | Keterangan |
|------|---------|------------|
| `pending` | 0% | Record dibuat, menunggu worker |
| `fetching_web` | 40% | Web search + crawling aktif |
| `fetching_industry` | 65% | Industry use case search |
| `analyzing` | 85% | LLM inference sedang berjalan |
| `completed` | 100% | Semua section tersimpan |
| `failed` | — | Error, dengan pesan di `error_message` |


---

## 5. Database Schema & Relasi (ERD)

### 5.1 Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ opportunities : "created_by"
    users ||--o{ notifications : "user_id"
    users ||--o{ audit_logs : "user_id"
    users ||--o{ ai_token_usages : "user_id"
    users ||--o{ opportunity_chat_messages : "user_id"

    opportunities ||--o{ kyc_reports : "opportunity_id"
    opportunities ||--o{ opportunity_personas : "opportunity_id"
    opportunities ||--o{ opportunity_documents : "opportunity_id"
    opportunities ||--o{ meetings : "opportunity_id"
    opportunities ||--o{ timeline_events : "opportunity_id"
    opportunities ||--o{ opportunity_chat_messages : "opportunity_id"
    opportunities ||--o{ notifications : "opportunity_id"
    opportunities ||--o{ ai_token_usages : "opportunity_id"

    users {
        UUID id PK
        String email UK
        String full_name
        String avatar_url
        String role
        String capabilities
        Boolean is_active
        String google_id UK
        DateTime last_active_at
        DateTime last_login
        DateTime created_at
        DateTime updated_at
    }

    opportunities {
        UUID id PK
        String company_name
        String contact_name
        String website
        String email
        String phone
        JSON contacts
        String industry
        String product
        Text customer_needs
        Text additional_notes
        Numeric potential_revenue
        DateTime estimated_agenda_date
        String status
        DateTime meeting_schedule
        String assigned_engineer
        UUID created_by FK
        DateTime created_at
        DateTime updated_at
    }

    kyc_reports {
        UUID id PK
        UUID opportunity_id FK
        Integer version
        String status
        Text executive_summary
        JSONB company_overview
        Text industry_analysis
        JSONB competitor_analysis
        Text business_model
        Text company_location
        Text customer_need_summary
        JSONB potential_pain_points
        JSONB use_cases
        JSONB meeting_objectives
        JSONB recommended_questions
        JSONB preparation_checklist
        JSONB references
        String progress_step
        Integer progress_percent
        String source_type
        Text error_message
        UUID created_by FK
        DateTime completed_at
        DateTime created_at
    }

    opportunity_personas {
        UUID id PK
        UUID opportunity_id FK
        String seniority
        String department
        JSONB focus_areas
        JSONB questions
        JSONB value_props
        JSONB objection_handling
        DateTime created_at
        DateTime updated_at
    }

    opportunity_documents {
        UUID id PK
        UUID opportunity_id FK
        String title
        String url
        Text description
        JSON labels
        UUID uploaded_by FK
        DateTime created_at
        DateTime updated_at
    }

    meetings {
        UUID id PK
        UUID opportunity_id FK
        String title
        DateTime date
        String location
        JSON participants
        JSON agenda
        Text notes
        JSON action_items
        JSON attachments
        UUID created_by FK
        DateTime created_at
        DateTime updated_at
    }

    timeline_events {
        UUID id PK
        UUID opportunity_id FK
        UUID actor_id FK
        String actor_name
        String action
        Text description
        String event_type
        DateTime created_at
    }

    opportunity_chat_messages {
        UUID id PK
        UUID opportunity_id FK
        UUID user_id FK
        String role
        Text content
        DateTime created_at
    }

    notifications {
        UUID id PK
        UUID user_id FK
        UUID opportunity_id FK
        String type
        String title
        Text message
        Boolean is_read
        Text metadata_json
        DateTime created_at
    }

    ai_token_usages {
        UUID id PK
        UUID user_id FK
        UUID opportunity_id FK
        String feature
        String model_name
        String provider
        Integer prompt_tokens
        Integer completion_tokens
        Integer total_tokens
        Numeric cost_usd
        Numeric cost_idr
        Text query_prompt
        Text response_preview
        String status
        Text error_message
        Integer duration_ms
        JSONB metadata_json
        DateTime created_at
    }

    audit_logs {
        UUID id PK
        UUID user_id FK
        String action
        String entity_type
        UUID entity_id
        JSONB old_value
        JSONB new_value
        String ip_address
        String user_agent
        JSONB extra_data
        DateTime created_at
    }

    system_settings {
        UUID id PK
        String key UK
        Text value
        String description
        DateTime updated_at
    }
```


### 5.2 Tabel & Model

| # | Tabel | Model SQLAlchemy | JSONB Columns |
|---|-------|------------------|---------------|
| 1 | `users` | `User` | — |
| 2 | `opportunities` | `Opportunity` | `contacts` (JSON) |
| 3 | `kyc_reports` | `KYCReport` | `company_overview`, `competitor_analysis`, `potential_pain_points`, `use_cases`, `meeting_objectives`, `recommended_questions`, `preparation_checklist`, `references` |
| 4 | `opportunity_personas` | `OpportunityPersona` | `focus_areas`, `questions`, `value_props`, `objection_handling` |
| 5 | `opportunity_documents` | `OpportunityDocument` | `labels` (JSON) |
| 6 | `meetings` | `Meeting` | `participants`, `agenda`, `action_items`, `attachments` (JSON) |
| 7 | `timeline_events` | `TimelineEvent` | — |
| 8 | `opportunity_chat_messages` | `OpportunityChatMessage` | — |
| 9 | `notifications` | `Notification` | — |
| 10 | `ai_token_usages` | `AITokenUsage` | `metadata_json` |
| 11 | `audit_logs` | `AuditLog` | `old_value`, `new_value`, `extra_data` |
| 12 | `system_settings` | `SystemSetting` | — |

### 5.3 Unique Constraints & Indexes

| Tabel | Constraint / Index | Kolom |
|-------|-------------------|-------|
| `users` | Unique | `email`, `google_id` |
| `users` | Index | `email`, `last_active_at` |
| `opportunity_personas` | Unique | `(opportunity_id, seniority, department)` |
| `ai_token_usages` | Index | `created_at`, `user_id`, `opportunity_id`, `feature`, `model_name` |
| `audit_logs` | Index | `(entity_type, entity_id)`, `user_id`, `created_at`, `action` |
| `system_settings` | Unique + Index | `key` |


---

## 6. Keamanan, RBAC & Capabilities

### 6.1 Authentication

```
┌──────────────────────────────────────────────────────┐
│ JWT Bearer Token Authentication                      │
│                                                      │
│ 1. Login → POST /api/auth/google or /api/auth/login  │
│ 2. Backend generates JWT sub=user.id                 │
│ 3. Frontend: localStorage moip_token                 │
│ 4. Axios interceptor: Authorization: Bearer token    │
│ 5. FastAPI: HTTPBearer → decode JWT → query User     │
│ 6. Check user.is_active == true                      │
└──────────────────────────────────────────────────────┘
```

### 6.2 Dual-Tier Permission Model

MOIP menggunakan **role** (label identitas) + **capabilities** (izin aksi) sebagai dua lapisan independen.

**Identity Roles:**

| Role | Deskripsi |
|------|-----------|
| `admin` | Administrative access |
| `lead_gen` | Lead Generation Officer |
| `managerial` | Manager / team lead |
| `engineer` | Pre-sales engineer |
| `presales` | Pre-sales role |
| `viewer` | Read-only (default untuk user baru) |

> Untuk perubahan role atau kapabilitas akun, hubungi **Nixon** atau **Robi**.

**Functional Capabilities** (comma-separated di kolom `users.capabilities`):

| Capability | Aksi |
|------------|------|
| `view` | Lihat dashboard, opportunity, KYC report |
| `create_edit` | Buat/edit opportunity, meeting, dokumen |
| `delete` | Hapus opportunity, meeting |
| `generate_kyc` | Trigger/regenerate KYC AI + persona |
| `user_management` | Kelola user di panel Settings |

**Enforcement di Backend:**

```python
# Capability check via dependency injection
@router.post("/")
async def create_opportunity(
    user: User = Depends(require_capability("create_edit"))
): ...

# Admin-only endpoint
@router.get("/settings")
async def get_settings(
    user: User = Depends(require_admin)
): ...
```

### 6.3 SSRF Protection — Web Crawler

`WebCrawlerService._is_safe_url()` memblokir URL yang resolve ke:

| Blocked Range | Alasan |
|---------------|--------|
| Private IP (RFC 1918) | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` |
| Loopback | `127.0.0.0/8` |
| Link-local | `169.254.0.0/16` (termasuk GCP metadata `169.254.169.254`) |
| Multicast | `224.0.0.0/4` |
| Reserved | IANA reserved ranges |

Implementasi: `socket.gethostbyname()` → `ipaddress.ip_address()` → check `.is_private`, `.is_loopback`, `.is_link_local`, `.is_multicast`, `.is_reserved`.


---

## 7. Arsitektur AI Engine & RAG Strategy

### 7.1 KYC Pipeline — LangGraph 2-Node StateGraph

```
┌────────────────────────────────────────────────────────────────┐
│                   LangGraph StateGraph                         │
│                                                                │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │ research_node│────────►│ analysis_node│────────► END        │
│  │              │         │              │                    │
│  │ Tavily search│         │ Build prompt │                    │
│  │ Google       │         │ Inject       │                    │
│  │  Grounding   │         │  Smartnet    │                    │
│  │ Website      │         │  Magna       │                    │
│  │  crawling    │         │  catalog     │                    │
│  │ Link         │         │ LLM → 13    │                    │
│  │  verifier    │         │  JSON        │                    │
│  │              │         │  sections    │                    │
│  └──────────────┘         └──────────────┘                    │
│                                                                │
│  State: KYCState (TypedDict)                                   │
│  Input: company_name, website, industry, customer_needs, etc.  │
│  Output: 13 KYC sections + references                          │
└────────────────────────────────────────────────────────────────┘
```

### 7.2 RAG Strategy: Prompt Context Injection

MOIP **tidak menggunakan vector database** di produksi. Strategi RAG:

1. **Smartnet Magna Solutions Catalog** — hardcoded dalam prompt KYC pipeline sebagai inline context. 5 kategori solusi: GCP Infra, Data & AI, Cybersecurity, Network, Managed Services.
2. **Live Web Data** — Tavily search + Google Search Grounding menghasilkan snippets dan citations yang di-inject sebagai research context.
3. **Website Content** — Crawled via `httpx` + `BeautifulSoup4`, dimuat langsung ke prompt.
4. **Opportunity Context** — Data opportunity + KYC report di-inject ke system prompt untuk AI Chat.

### 7.3 KYC Output Sections — 13 bagian

| # | Field | Type | Deskripsi |
|---|-------|------|-----------|
| 1 | `executive_summary` | Text | Ringkasan eksekutif 2-3 paragraf |
| 2 | `company_overview` | JSONB | Profil: lokasi, karyawan, tahun, deskripsi |
| 3 | `industry_analysis` | Text | Tren dan tantangan industri |
| 4 | `competitor_analysis` | JSONB | Kompetitor + diferensiasi SMG |
| 5 | `business_model` | Text | Model bisnis dan revenue klien |
| 6 | `company_location` | Text | Lokasi perusahaan |
| 7 | `customer_need_summary` | Text | Rangkuman kebutuhan |
| 8 | `potential_pain_points` | JSONB | Pain points klien |
| 9 | `use_cases` | JSONB | Use case + solusi SMG + Google Cloud + impact level |
| 10 | `meeting_objectives` | JSONB | Tujuan rapat |
| 11 | `recommended_questions` | JSONB | Pertanyaan discovery |
| 12 | `preparation_checklist` | JSONB | Checklist persiapan |
| 13 | `references` | JSONB | URL sumber verified via LinkVerifier |

### 7.4 JSON Self-Healing Pipeline

LLM output sering mengandung defect. `_clean_and_parse_json()` menangani:

1. Extract JSON dari markdown code fence
2. Slice dari `{` pertama
3. Clean trailing commas (`, }` → `}`, `, ]` → `]`)
4. Standard `json.loads()` pada substring balanced
5. Escape unescaped newlines/tabs dalam string
6. **Structural repair**: scan karakter, track `in_string` + bracket stack, close open quotes/brackets


---

## 8. Arsitektur Deployment & Infrastruktur

### 8.1 Deployment Topology

```
┌─────────────────────────────────┐
│         Vercel (Cloud)          │
│                                 │
│  Next.js 16 Frontend            │
│  Auto-deploy on push to main    │
│  NEXT_PUBLIC_API_URL → VPS      │
└───────────┬─────────────────────┘
            │ HTTPS
            ▼
┌─────────────────────────────────────────────────┐
│              VPS Self-Hosted                     │
│              Docker Compose                      │
│                                                  │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  │
│  │   backend    │  │  celery   │  │ postgres │  │
│  │  FastAPI     │  │  Worker   │  │   16     │  │
│  │  :8009→:8000 │  │           │  │:5435→5432│  │
│  └──────┬───────┘  └─────┬─────┘  └──────────┘  │
│         │                │                       │
│         └──────┬─────────┘                       │
│                ▼                                 │
│         ┌──────────┐                             │
│         │  redis 7 │                             │
│         │  :6379   │                             │
│         └──────────┘                             │
└─────────────────────────────────────────────────┘
```

### 8.2 Docker Services

| Service | Image | Port Mapping | Startup Command |
|---------|-------|-------------|-----------------|
| `postgres` | `postgres:16-alpine` | `127.0.0.1:5435 → 5432` | Default PostgreSQL |
| `redis` | `redis:7-alpine` | `127.0.0.1:6379 → 6379` | Default Redis |
| `backend` | Python 3.11 (custom) | `8009 → 8000` | `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| `celery` | Python 3.11 (custom) | — | `celery -A app.core.celery_app worker --loglevel=info` |
| `frontend` | Node 20 (custom) | `3009 → 3000` | **Production: Vercel** — Docker hanya untuk local dev |

### 8.3 Environment Variables

| Variable | Service | Deskripsi |
|----------|---------|-----------|
| `DATABASE_URL` | backend, celery | PostgreSQL connection string |
| `SECRET_KEY` | backend | JWT signing secret |
| `REDIS_URL` | backend, celery | Redis broker URL |
| `GOOGLE_CLIENT_ID` | backend, frontend | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | backend | Google OAuth secret |
| `GOOGLE_WORKSPACE_DOMAIN` | backend | Allowed domain `magnaglobal.id` |
| `LLM_PROVIDER` | backend, celery | Default LLM provider google or openai |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | backend, celery | Google AI Studio key |
| `GEMINI_MODEL` | backend, celery | Default Gemini model |
| `OPENAI_API_KEY` | backend, celery | OpenAI-compatible API key |
| `OPENAI_API_BASE` | backend, celery | OpenAI-compatible base URL |
| `OPENAI_MODEL` | backend, celery | Default OpenAI model |
| `TAVILY_API_KEY` | backend, celery | Tavily search API key |
| `FRONTEND_URL` | backend | CORS allowed origin |
| `NEXT_PUBLIC_API_URL` | frontend | Backend API base URL |

### 8.4 Deploy Commands

```bash
# Backend only (production VPS)
docker compose build --no-cache backend celery
docker compose up -d backend celery

# Migrations dijalankan otomatis saat backend container start
# Manual jika perlu:
docker compose exec -T backend alembic upgrade head
```


---

## 9. Katalog API Endpoints

### System

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/api/health` | No | Health check |
| GET | `/api/config` | No | Public config google_client_id |

### Auth — `/api/auth`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/google` | No | Google OAuth login |
| POST | `/login` | No | Dev username/password login |
| GET | `/me` | Yes | Current user profile |

### Users — `/api/users`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | List active users, optional role filter |

### Opportunities — `/api/opportunities`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | List paginated, filterable by status/search/engineer_id |
| POST | `/` | Yes | Create opportunity, triggers KYC |
| POST | `/import` | create_edit | Bulk import CSV/Excel |
| GET | `/search/global` | Yes | Global search |
| GET | `/{id}` | Yes | Opportunity detail |
| PATCH | `/{id}` | Yes | Update opportunity |
| DELETE | `/{id}` | Yes | Delete opportunity |
| GET | `/{id}/chat` | Yes | Chat history |
| POST | `/{id}/chat` | Yes | AI chat streaming |
| GET | `/{id}/documents` | Yes | List documents |
| POST | `/{id}/documents` | Yes | Add document |
| PATCH | `/{id}/documents/{doc_id}` | Yes | Update document |
| DELETE | `/{id}/documents/{doc_id}` | Yes | Delete document |

### Personas — `/api/opportunities/{id}/personas`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | List saved personas |
| GET | `/detail` | Yes | Get playbook by seniority+department query params |
| POST | `/generate` | Yes | Generate persona |

### KYC — `/api/opportunities/{id}/kyc`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | Latest KYC report |
| GET | `/versions` | Yes | Version history |
| GET | `/{report_id}` | Yes | Specific report |
| POST | `/regenerate` | Yes | Trigger regeneration 202 Accepted |
| PATCH | `/{report_id}` | Yes | Edit KYC report |

### Meetings — `/api/meetings`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | List meetings |
| POST | `/` | Yes | Create meeting |
| GET | `/{id}` | Yes | Meeting detail |
| PUT | `/{id}` | Yes | Update meeting |
| DELETE | `/{id}` | Yes | Delete meeting |

### Notifications — `/api/notifications`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | Yes | List paginated |
| GET | `/unread-count` | Yes | Unread count |
| PATCH | `/{id}` | Yes | Mark read/unread |
| POST | `/mark-all-read` | Yes | Mark all read |

### AI Validation — `/api/ai`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/validate` | Yes | Validate AI output + URL veracity |

### LinkedIn — `/api/linkedin`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| POST | `/company/search` | Yes | Search company |
| POST | `/company/posts` | Yes | Company posts |
| POST | `/company/executives` | Yes | Key executives |
| POST | `/company/people` | Yes | Employee search |
| POST | `/person/profile` | Yes | Person profile |
| POST | `/enrich/{id}` | Yes | Enrich KYC with LinkedIn |

### Admin — `/api/admin`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/metrics` | Admin | System metrics |
| GET | `/logs` | Admin | Audit logs |
| GET | `/users` | Admin | User list + telemetry |
| GET | `/users/{id}/activity` | Admin | User activity trail |
| PATCH | `/users/{id}` | Admin | Update user role/capabilities |
| GET | `/master-data` | Admin | Master data options |
| POST | `/master-data` | Admin | Update master data |
| GET | `/settings` | Admin | System settings |
| PATCH | `/settings` | Admin | Update settings |
| POST | `/settings/test-connection` | Admin | Test LLM API key |
| GET | `/ai/metrics` | Admin | AI token usage summary |
| GET | `/ai/usage/by-opportunity` | Admin | AI cost per opportunity |
| GET | `/ai/usage/by-user` | Admin | AI cost per user |
| GET | `/ai/assistant-queries` | Admin | Prompt audit log |

### Dashboard — `/api/dashboard`

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/metrics` | Yes | KPIs, status, trend, recent, upcoming meetings |

Filter params: `status`, `engineer_name`, `date_from`, `date_to`


---

## Backend Services Map

```
backend/app/
├── main.py                          # FastAPI app, CORS, middleware, router includes
├── tasks.py                         # Celery tasks (notifications, KYC runner, reminders)
├── core/
│   ├── config.py                    # Settings (env vars, defaults)
│   ├── database.py                  # SQLAlchemy engine, SessionLocal, Base
│   ├── llm.py                       # Unified LLM Factory (get_chat_llm)
│   ├── celery_app.py                # Celery config with Redis broker
│   ├── security.py                  # JWT auth, get_current_user, require_capability
│   └── error_handler.py             # Global error handler middleware
├── models/                          # SQLAlchemy ORM models (12 tables)
├── schemas/                         # Pydantic request/response schemas
├── api/                             # FastAPI routers (12 route modules)
│   ├── auth.py, users.py, opportunities.py, meetings.py
│   ├── notifications.py, kyc.py, dashboard.py, admin.py
│   ├── linkedin.py, personas.py, ai_validation.py
│   └── ...
└── services/                        # Business logic & external integrations
    ├── kyc_pipeline.py              # LangGraph 2-node KYC pipeline
    ├── persona_service.py           # Persona playbook generation
    ├── web_search_service.py        # Tavily / Google Grounding search
    ├── web_crawler_service.py       # httpx + BS4 crawler (SSRF protected)
    ├── google_grounding_service.py  # Google Search Grounding via native SDK
    ├── linkedin_service.py          # LinkedIn Voyager API client
    ├── ai_validation_service.py     # AI output factuality validation
    ├── ai_usage_service.py          # Token tracking & cost calculation
    ├── link_verifier.py             # Concurrent URL accessibility checker
    ├── audit_service.py             # Entity change audit logging
    ├── auth.py                      # JWT encode/decode, Google token verify
    ├── email_service.py             # Gmail API email sender
    └── calendar_service.py          # Google Calendar API integration
```

## Frontend Structure Map

```
frontend/src/
├── app/                             # Next.js App Router
│   ├── layout.tsx                   # Root layout (providers)
│   ├── page.tsx                     # Root redirect
│   ├── login/page.tsx               # Login page
│   └── (main)/                      # Authenticated layout group
│       ├── layout.tsx               # Sidebar + TopNav
│       ├── dashboard/page.tsx
│       ├── opportunities/
│       │   ├── page.tsx             # List (Kanban + Table views)
│       │   ├── create/page.tsx
│       │   └── [id]/page.tsx        # Detail (tabbed: Overview, KYC, Persona, etc.)
│       ├── meetings/page.tsx
│       ├── notifications/page.tsx
│       └── settings/page.tsx        # Admin: User mgmt, Master data, AI settings
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── layout/                      # Sidebar, TopNav, ThemeToggle, LanguageToggle
│   ├── providers/                   # ThemeProvider, QueryProvider, AuthProvider
│   ├── shared/                      # StatusBadge
│   └── domains/
│       ├── dashboard/               # Metrics, charts (Status, Trend, Funnel, etc.)
│       ├── opportunities/           # ChatSidebar, EditDialog, Kanban components
│       ├── kyc/                     # KYCReportTab, EditForm, VersionSelector
│       ├── personas/                # TargetPersonaTab
│       ├── documents/               # ResourcesTab, AddDocumentDialog
│       ├── meetings/                # Accordion, Create/Edit dialogs
│       ├── admin/                   # UserActivityDrawer, AITokenMonitoringTab
│       └── notifications/           # NotificationDropdown
├── hooks/                           # React Query hooks (opportunities, kyc, meetings, etc.)
├── lib/                             # API clients, utilities, clipboard, error handling
├── types/                           # TypeScript type definitions
├── context/                         # LanguageContext
└── locales/                         # en.ts, id.ts translation dictionaries
```

---

*Dokumen ini terakhir diperbarui: 2026-09-09*
*Source of truth: codebase aktual di `backend/app/` dan `frontend/src/`*

