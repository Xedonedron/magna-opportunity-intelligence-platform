# AI_CONTEXT.md - Magna Opportunity Intelligence Platform (MOIP)

> Dokumen ini berisi ringkasan implementasi untuk referensi cepat AI assistant. Memudahkan pencarian tanpa harus membaca seluruh codebase.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **DnD**: @hello-pangea/dnd (Kanban board)
- **Notifications UI**: Sonner (toast)

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 16 + SQLAlchemy ORM (UUID Primary Keys) + Alembic migrations
- **Task Queue**: Celery + Redis for background jobs
- **AI Orchestration**: LangGraph + LangChain
- **RAG Strategy**: Prompt Context Injection — built-in Smartnet Magna solutions catalog hardcoded in KYC pipeline prompt + Google Search Grounding for live web citations (no vector DB in production)

### External Services
- **LLM (Dual Provider via Unified Factory `app/core/llm.py`)**:
  - **Google**: Google AI Studio — Gemma 4 (`gemma-4-26b-a4b-it`) / Gemini (`gemini-2.5-flash`) via `langchain-google-genai` + native `google-genai` SDK
  - **OpenAI-Compatible**: CosmosHub / DeepSeek / GLM via `langchain-openai` (default `glm-4-plus`, base `https://api.cosmoshub.tech/v1`)
  - Provider & model selectable at runtime via `system_settings` DB table
- **Web Search**: Tavily API + Google Search Grounding (switchable via `system_settings.search_provider`)
- **Web Crawling**: `httpx` + `BeautifulSoup4` with SSRF protection (IP validation against private/loopback/link-local ranges)
- **LinkedIn Intelligence**: LinkedIn Voyager API client (`linkedin_service.py`) for company search, executives, posts, people, and KYC enrichment
- **Authentication**: Google OAuth 2.0 (Workspace) + Dev Username/Password Login
- **Email/Calendar**: Gmail API, Google Calendar API

---

## API Endpoints

### System (`/api`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/health` | Health check (returns `{ status, version }`) | No |
| GET | `/config` | Public config (returns `google_client_id`) | No |

### Authentication (`/api/auth`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/google` | Google OAuth login | No |
| POST | `/login` | Dev username/password login | No |
| GET | `/me` | Get current user profile | Yes |

### Users (`/api/users`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List active users (optional `role` query filter for assignment dropdowns) | Yes |

### Opportunities (`/api/opportunities`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List opportunities (paginated) | Yes |
| POST | `/` | Create opportunity | Yes |
| POST | `/import` | Bulk import opportunities from CSV/Excel file | Yes (create_edit) |
| GET | `/search/global` | Global search across opportunities | Yes |
| GET | `/{opportunity_id}` | Get opportunity detail | Yes |
| PATCH | `/{opportunity_id}` | Update opportunity | Yes |
| DELETE | `/{opportunity_id}` | Delete opportunity | Yes |
| GET | `/{opportunity_id}/chat` | Get chat history for opportunity | Yes |
| POST | `/{opportunity_id}/chat` | Send message / AI chat streaming | Yes |
| GET | `/{opportunity_id}/documents` | List opportunity resources/documents | Yes |
| POST | `/{opportunity_id}/documents` | Add opportunity resource/document | Yes |
| PATCH | `/{opportunity_id}/documents/{document_id}` | Update opportunity document | Yes |
| DELETE | `/{opportunity_id}/documents/{document_id}` | Delete opportunity document | Yes |

**Query Parameters (GET /):**
- `page` (int): Page number, default 1
- `page_size` (int): Items per page, default 20
- `search` (str): Search by company name or customer needs
- `status` (str): Filter by status
- `engineer_id` (UUID): Filter by assigned engineer

### Target Persona Questions (`/api/opportunities/{opportunity_id}/personas`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List all saved personas for opportunity | Yes |
| GET | `/detail?seniority=...&department=...` | Get persona playbook by seniority and department (query params) | Yes |
| POST | `/generate` | Force generate / regenerate persona questions | Yes |

### KYC Reports (`/api/opportunities/{opportunity_id}/kyc`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | Get latest KYC report | Yes |
| GET | `/versions` | List all KYC versions | Yes |
| GET | `/{report_id}` | Get specific KYC report | Yes |
| POST | `/regenerate` | Trigger KYC regeneration (202 Accepted, runs async via Celery) | Yes |
| PATCH | `/{report_id}` | Edit KYC report | Yes |

### Meetings (`/api/meetings`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List meetings (optional filter `opportunity_id`) | Yes |
| POST | `/` | Create meeting | Yes |
| GET | `/{meeting_id}` | Get meeting detail | Yes |
| PUT | `/{meeting_id}` | Update meeting | Yes |
| DELETE | `/{meeting_id}` | Delete meeting | Yes |

### Notifications (`/api/notifications`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List notifications (paginated) | Yes |
| GET | `/unread-count` | Get unread notifications count | Yes |
| PATCH | `/{notification_id}` | Mark read status (`{ "is_read": bool }`) | Yes |
| POST | `/mark-all-read` | Mark all notifications as read | Yes |

### AI Validation (`/api/ai`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/validate` | Validate AI generated info, reasoning consistency & URL veracity | Yes |

### LinkedIn Intelligence (`/api/linkedin`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/company/search` | Search LinkedIn for company details, headcount, specialties | Yes |
| POST | `/company/posts` | Get recent company posts and updates | Yes |
| POST | `/company/executives` | Get key executives and decision makers | Yes |
| POST | `/company/people` | Search employees by optional title filter | Yes |
| POST | `/person/profile` | Get detailed background & presales briefing for a participant | Yes |
| POST | `/enrich/{opportunity_id}` | Enrich opportunity KYC report with LinkedIn insights | Yes |

### Admin (`/api/admin`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Admin system metrics | Yes (Admin) |
| GET | `/logs` | System audit logs | Yes (Admin) |
| GET | `/users` | List all users with telemetry (last active, monthly active days, last action) | Yes (Admin) |
| GET | `/users/{user_id}/activity` | Granular chronological activity audit trail for specific user | Yes (Admin) |
| PATCH | `/users/{user_id}` | Update user role and capabilities | Yes (Admin) |
| GET | `/master-data` | Get master data options | Yes (Admin) |
| POST | `/master-data` | Update master data options | Yes (Admin) |
| GET | `/settings` | Get system settings (search provider, LLM models, API keys) | Yes (Admin) |
| PATCH | `/settings` | Update system settings | Yes (Admin) |
| POST | `/settings/test-connection` | Test LLM API key connectivity and model validity | Yes (Admin) |
| GET | `/ai/metrics` | AI Token usage summary, costs (USD/IDR), 14-day trend & distribution | Yes (Admin) |
| GET | `/ai/usage/by-opportunity` | Aggregated AI token & cost breakdown per opportunity | Yes (Admin) |
| GET | `/ai/usage/by-user` | Aggregated AI token & cost breakdown per user (abuse prevention) | Yes (Admin) |
| GET | `/ai/assistant-queries` | Transparent audit log of user prompts and AI Assistant queries | Yes (Admin) |
| GET | `/solutions` | List master solutions catalog with filters (pillar, search, tier, is_active) | Yes |
| POST | `/solutions` | Create new solution in master catalog | Yes (Admin) |
| PUT | `/solutions/{solution_id}` | Update existing solution in master catalog | Yes (Admin) |
| DELETE | `/solutions/{solution_id}` | Delete solution from master catalog | Yes (Admin) |

### Dashboard (`/api/dashboard`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Get dashboard metrics (KPIs, status, trend, recent opportunities, upcoming meetings) | Yes |

**Query Parameters (GET /metrics):**
- `status` (str): Filter by opportunity status
- `engineer_name` (str): Filter metrics by assigned pre-sales engineer name (e.g. "Devi", "Bayu", "Gerry")
- `date_from` (date): Start date range
- `date_to` (date): End date range

---

## Database Models

### Users (`users`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String(255) | Unique email |
| full_name | String(255) | Full name |
| avatar_url | String(500) | Profile picture URL |
| role | String(50) | admin, lead_gen, managerial, engineer, presales, viewer |
| capabilities | String(255) | Comma-separated permissions (e.g. view,create_edit,delete,generate_kyc,user_management) |
| is_active | Boolean | Active status |
| google_id | String(255) | Google OAuth ID |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| last_login | DateTime | Last login timestamp |
| last_active_at | DateTime | Last user interaction / action timestamp |

### Opportunities (`opportunities`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| company_name | String(255) | Company name |
| contact_name | String(255) | Primary contact person name |
| website | String(500) | Company website |
| email | String(255) | Contact email |
| phone | String(50) | Contact phone number |
| contacts | JSON | Multi-contact list `[{"name", "role", "email", "phone"}]` |
| industry | String(255) | Industry sector |
| product | String(255) | Product/solution target |
| customer_needs | Text | Detailed customer pain points / needs |
| additional_notes | Text | Additional notes / context for AI |
| potential_revenue | Numeric(15,2) | Estimated project / deal value |
| estimated_agenda_date | DateTime | Target agenda / closing date |
| status | String(50) | Status (11 values below, default "New") |
| meeting_schedule | DateTime | Scheduled meeting timestamp |
| assigned_engineer | String(255) | Assigned presales engineer name |
| created_by | UUID | FK to Users (creator) |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Status Values (Title Case):**
1. `New` - New opportunity created
2. `KYC Running` - KYC AI research in progress
3. `Ready Meeting` - Ready for scheduling meeting
4. `Meeting Scheduled` - Meeting scheduled
5. `Meeting Done` - Meeting completed
6. `Need Proposal` - Proposal requested
7. `POC` - Proof of Concept / technical validation in progress
8. `Negotiation` - Commercial negotiation
9. `PO` - Purchase Order received
10. `Won` - Deal won
11. `Lost` - Deal lost
12. `On Hold` - On hold

### Opportunity Personas (`opportunity_personas`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| seniority | String(50) | Target seniority (C-Level, VP/Director, Manager, Lead/Senior, Staff) |
| department | String(50) | Target department (IT, Data & AI, Security, Finance, Operations, Business) |
| focus_areas | JSONB | Priority topics and strategic concerns |
| questions | JSONB | Discovery, technical, and commercial questions with rationales |
| value_props | JSONB | Tailored value proposition statements |
| objection_handling | JSONB | Antipatterns, objections, and suggested responses |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Opportunity Documents (`opportunity_documents`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| title | String(500) | Document title |
| url | String(2000) | Document link / Google Drive URL |
| description | Text | Document summary or notes |
| labels | JSON | Array of document tags (e.g. `MoM`, `Solution Brief`, `Compro`) |
| uploaded_by | UUID | FK to Users |
| created_at | DateTime | Creation timestamp |

### System Settings (`system_settings`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| key | String(100) | Unique setting key (e.g. `search_provider`, `gemini_model`) |
| value | Text | Setting value |
| description | String(255) | Setting description |
| updated_at | DateTime | Last update timestamp |

### KYC Reports (`kyc_reports`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| version | Integer | Report version number (default 1) |
| status | String(50) | `pending`, `running`, `completed`, `failed` |
| executive_summary | Text | Executive summary |
| company_overview | JSONB | Company overview |
| industry_analysis | Text | Industry analysis |
| competitor_analysis | JSONB | Competitor analysis |
| business_model | Text | Business model analysis |
| company_location | Text | Company location |
| customer_need_summary | Text | Customer need summary |
| potential_pain_points | JSONB | Pain points |
| use_cases | JSONB | Use cases and solution mapping |
| meeting_objectives | JSONB | Meeting objectives |
| recommended_questions | JSONB | Recommended discovery questions |
| preparation_checklist | JSONB | Preparation items |
| references | JSONB | Source references and citations |
| progress_step | String(50) | Current pipeline step (default `pending`) |
| progress_percent | Integer | Pipeline progress percentage (0-100) |
| source_type | String(50) | `automatic`, `manual_regenerate`, `engineer_edited` |
| error_message | Text | Error details if pipeline failed |
| created_by | UUID | FK to Users |
| created_at | DateTime | Creation timestamp |
| completed_at | DateTime | Pipeline completion timestamp |

### Meetings (`meetings`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| title | String(255) | Meeting title |
| date | DateTime(tz) | Meeting date and time |
| location | String(255) | Zoom, Google Meet, Office, etc. |
| participants | JSON | List of participant names/emails |
| agenda | JSON | List of agenda items |
| notes | Text | Meeting notes |
| action_items | JSON | List of action items |
| attachments | JSON | List of attachment URLs/metadata |
| created_by | UUID | FK to Users |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

### Notifications (`notifications`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users |
| opportunity_id | UUID | FK to Opportunities (optional) |
| type | String(50) | opportunity_created, kyc_completed, status_changed, meeting_reminder, follow_up |
| title | String(255) | Notification title |
| message | Text | Notification message |
| is_read | Boolean | Read status |
| metadata | Text | JSON string for extra data (column alias `metadata_json`) |
| created_at | DateTime | Creation timestamp |

### Timeline Events (`timeline_events`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| actor_id | UUID | FK to Users |
| actor_name | String(255) | Actor display name |
| action | String(255) | Action title |
| description | Text | Event detailed description |
| event_type | String(50) | create, update, meeting, system, status_change |
| created_at | DateTime | Creation timestamp |

### Opportunity Chat Messages (`opportunity_chat_messages`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| user_id | UUID | FK to Users (actor/author) |
| role | String(50) | user, assistant |
| content | Text | Chat message content |
| created_at | DateTime | Creation timestamp |

### AI Token Usages (`ai_token_usages`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users (actor, nullable) |
| opportunity_id | UUID | FK to Opportunities (target, nullable) |
| feature | String(50) | `opportunity_chat`, `kyc_generation`, `persona_generation`, `ai_validation`, etc. |
| model_name | String(100) | Active model name (e.g. `gemini-2.5-flash`, `glm-4-plus`) |
| provider | String(50) | LLM provider (`google`, `openai`) |
| prompt_tokens | Integer | Input tokens count |
| completion_tokens | Integer | Output tokens count |
| total_tokens | Integer | Total tokens |
| cost_usd | Numeric(10,6) | Estimated cost in USD |
| cost_idr | Numeric(14,2) | Estimated cost in IDR |
| query_prompt | Text | User's prompt query text for audit transparency |
| response_preview | Text | AI response preview |
| status | String(50) | `success`, `error` |
| error_message | Text | Error details if failed |
| duration_ms | Integer | Execution duration in ms |
| metadata_json | JSONB | Parameter snapshots |
| created_at | DateTime | Creation timestamp |

### Audit Logs (`audit_logs`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| entity_type | String(50) | Entity type |
| entity_id | UUID | Entity ID |
| user_id | UUID | FK to Users |
| action | String(50) | Action type |
| old_value | JSONB | Previous value |
| new_value | JSONB | New value |
| created_at | DateTime | Creation timestamp |

### Master Solutions (`master_solutions`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| slug | String(150) | Unique slug identifier |
| title | String(255) | Title / solution name |
| pillar | String(100) | Solution pillar category |
| tier | Integer | Tier (1 = Core Product/Case Study, 2 = Niche Concept/Framework) |
| primary_products | JSONB / ARRAY | Core products (e.g. BigQuery, GKE, Palo Alto, CrowdStrike) |
| all_products | JSONB / ARRAY | All products involved |
| target_industries | JSONB / ARRAY | Targeted industry verticals |
| key_subheadings | JSONB / ARRAY | Architectural components & technical structure |
| pain_points | JSONB / ARRAY | Client challenges resolved |
| business_impact | Text | Quantifiable business impact or case study outcome |
| summary_snippet | Text | Brief technical summary |
| source_url | String(500) | URL reference to original article / whitepaper |
| is_active | Boolean | Active status for AI prompt grounding & UI |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

---

## Backend Services

### Solutions Catalog Engine (`backend/app/core/solutions_catalog.py`)
- **Centralized Grounding Provider**: Single Source of Truth for PT Smartnet Magna Global official product offerings, architectures, and case studies.
- **Database & Memory Caching**: Dynamically loads active solutions from PostgreSQL `master_solutions` table via `SessionLocal` with fallback to `backend/app/data/curated_solutions.json` and in-memory presets. Auto-reloads in memory on admin mutations (`POST /api/admin/solutions`, `PUT`, `DELETE`).
- **Dynamic Relevance Matching Algorithm (`get_solutions_for_prompt`)**:
  - Scores solution cards dynamically against the target Opportunity context without context dilution or token bloating:
    * **Industry Match (+5 points)**: Matches client industry against `target_industries`.
    * **Product Match (+6 points)**: Matches presales product against `primary_products` / `all_products`.
    * **Needs Keyword Match (+4 points)**: Matches terms in `customer_needs` (e.g., "fraud", "ransomware", "migration") against titles and `pain_points`.
    * **Tier 1 Priority Boost (+2 points)**: Prioritizes concrete product/case study solutions over conceptual frameworks.
  - Returns top `limit` cards (default 3–4, ~800–1,200 tokens) with structured subheadings, products, pain points, quantifiable business impact, and reference URLs.
- **Dual Pipeline Integration**:
  1. **KYC Pipeline** (`analysis_node` in `kyc_pipeline.py`): Replaces static 5-bullet placeholder with contextualized solution cards so recommended use cases cite actual GCP stacks and SMG architectures.
  2. **Opportunity AI Chat** (`opportunities.py`): Injects official pillar summary overview + top matching solution cards directly into the Pre-Sales Assistant system prompt.

### KYC Pipeline Service (`backend/app/services/kyc_pipeline.py`)
**Architecture**: LangGraph 2-node StateGraph (`research_node` → `analysis_node`)
- `research_node` — Web research phase: Tavily search + Google Grounding + website crawling via `WebCrawlerService`
- `analysis_node` — LLM analysis phase: generates all KYC sections from research context + Smartnet Magna catalog (prompt-injected)
- `generate_kyc_report(opportunity_id, source_type, db)` — Main entry point, invokes LangGraph pipeline

### Web Crawler Service (`backend/app/services/web_crawler_service.py`)
**Functions:**
- `crawl_url(url)` — Fetch and extract text from URL using `httpx` + `BeautifulSoup4` with SSRF protection (blocks private/loopback/link-local IPs)

### Web Search Service (`backend/app/services/web_search_service.py`)
**Functions:**
- `search(query, max_results)` — Web search via Tavily API or Google Grounding (provider switchable via `system_settings.search_provider`)

### Google Grounding Service (`backend/app/services/google_grounding_service.py`)
**Functions:**
- `search_and_ground(prompt, model_name, db)` — Query Gemini with native Google Search Grounding tool for live web citations

### LinkedIn Service (`backend/app/services/linkedin_service.py`)
**Functions:**
- `search_company(company_name)` — LinkedIn Voyager API company search
- `get_company_updates(company_name)` — Recent company posts
- `get_company_executives(company_name)` — Key executives and decision makers
- `get_company_people(company_name, title_filter)` — Employee search with optional title filter
- `get_person_profile(full_name, company_name)` — Individual profile + presales briefing

### Target Persona Service (`backend/app/services/persona_service.py`)
**Functions:**
- `generate_persona_playbook(...)` - Generate seniority & department customized presales discovery playbook and objection handling via LLM

### AI Validation & Grounding Service (`backend/app/services/ai_validation_service.py`)
**Functions:**
- `validate_information_and_thinking(...)` - Validates AI output factuality, reasoning consistency, and verifies live web URLs via Google Grounding & Tavily

### Link Verifier Service (`backend/app/services/link_verifier.py`)
**Functions:**
- `verify_urls(...)` - Concurrently checks HTTP status and verifies real accessibility of links before reporting

### AI Usage & Pricing Service (`backend/app/services/ai_usage_service.py`)
**Functions:**
- `calculate_cost(...)` - Compute estimated costs in USD and IDR based on model catalog rate cards
- `record_ai_usage(...)` - Persist token counts, latency, acting user, opportunity, and query prompt
- `get_metrics_summary(...)` - KPIs summary (today, yesterday, all-time, daily trend, model breakdown)
- `get_usage_by_opportunity(...)` - Aggregated AI consumption per opportunity
- `get_usage_by_user(...)` - Aggregated AI consumption per user for abuse monitoring
- `get_assistant_queries_audit(...)` - Transparent granular query/prompt audit trail

### Audit Service (`backend/app/services/audit_service.py`)
**Functions:**
- `log_change(entity_type: str, entity_id: UUID, user_id: UUID, action: str, old_value: dict, new_value: dict)` - Log entity changes

### Notification Task / Helper (`backend/app/tasks.py`)
**Celery Tasks:**
- `send_opportunity_created_notification` — Notify team of new opportunity
- `send_kyc_completed_notification` — Notify when KYC pipeline completes
- `send_status_changed_notification` — Notify assigned engineer on status changes
- `create_calendar_event` — Create Google Calendar event for meeting
- `run_kyc_pipeline_task` — Async KYC research pipeline execution
- `send_meeting_reminder` — Meeting reminder notifications (h1, h24 types)

---

## Backend Schemas

### Request Schemas
- `OpportunityCreate` - Create opportunity request
- `OpportunityUpdate` - Update opportunity request
- `KYCReportUpdate` - Edit KYC report request
- `MeetingCreatePayload` - Create meeting request
- `MeetingUpdatePayload` - Update meeting request
- `UsernameLoginRequest` - Dev login request (`username`, `password`)
- `GoogleLoginRequest` - Google OAuth request (`credential`)

### Response Schemas
- `UserResponse` - User data response
- `OpportunityResponse` - Opportunity basic response
- `OpportunityDetailResponse` - Opportunity with timeline, meetings, kyc, chat
- `OpportunityListResponse` - Paginated opportunity list
- `KYCReportResponse` - KYC report with all sections
- `MeetingListResponse` - List of meetings
- `DashboardMetrics` - Dashboard KPIs
- `StatusChartResponse` - Status distribution for charts
- `TrendResponse` - Time series data for trend charts

---

## Frontend Structure

### App Routes (`frontend/src/app/`)
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `page.tsx` | Landing / Home redirect |
| `/login` | `login/page.tsx` | Login page (Google & Dev Auth) |
| `/dashboard` | `(main)/dashboard/page.tsx` | Dashboard view |
| `/notifications` | `(main)/notifications/page.tsx` | Notifications list |
| `/opportunities` | `(main)/opportunities/page.tsx` | Opportunities list |
| `/opportunities/[id]` | `(main)/opportunities/[id]/page.tsx` | Opportunity detail (with KYC, Meetings, Chat) |
| `/opportunities/create` | `(main)/opportunities/create/page.tsx` | Create opportunity |
| `/meetings` | `(main)/meetings/page.tsx` | Meetings list & management |
| `/settings` | `(main)/settings/page.tsx` | Settings & Admin user/master data management |

### Components by Domain

**Dashboard (`components/dashboard/`):**
- `DashboardFilters.tsx` - Filter controls
- `DashboardMetrics.tsx` - KPI cards
- `StatusChart.tsx` - Status distribution chart
- `TrendChart.tsx` - Opportunity trend line chart
- `IndustryDistributionChart.tsx` - Industry distribution chart
- `PipelineFunnelChart.tsx` - Pipeline funnel chart
- `SolutionDistributionChart.tsx` - Solution distribution chart

**Opportunities (`components/domains/opportunities/`):**
- `OpportunityChatSidebar.tsx` - AI Chat assistant sidebar for opportunity
- `EditOpportunityDialog.tsx` - Modal to edit opportunity details
- `KanbanBoard.tsx` - Kanban board view for opportunities
- `KanbanCard.tsx` - Individual Kanban card component
- `KanbanColumn.tsx` - Kanban column component

**Target Persona (`components/domains/personas/`):**
- `TargetPersonaTab.tsx` - Persona selection matrix, AI questions generator, and playbook view

**Documents / Resources (`components/domains/documents/`):**
- `ResourcesTab.tsx` - Opportunity documents library with Google Drive preview & label filtering
- `AddDocumentDialog.tsx` - Modal to link/edit document assets

**KYC (`components/domains/kyc/`):**
- `KYCReportTab.tsx` - Main KYC display component (with Competitor Analysis)
- `KYCEditForm.tsx` - Edit KYC sections
- `VersionSelector.tsx` - Version history dropdown
- `UseCaseAccordion.tsx` - Expandable use case list

**Meetings (`components/domains/meetings/`):**
- `MeetingAccordion.tsx` - Meeting list with expandable details
- `CreateMeetingDialog.tsx` - Meeting creation modal
- `EditMeetingDialog.tsx` - Meeting edit modal

**Admin & User Management (`components/domains/admin/`):**
- `UserActivityDrawer.tsx` - Slide-over drawer with user telemetry KPIs, filters, and granular chronological activity audit trail
- `AITokenMonitoringTab.tsx` - AI token usage monitoring dashboard with charts and cost tracking
- `SolutionsCatalogTab.tsx` - Master Solutions Catalog management UI with pillar filters, tier switcher, search, and dynamic CRUD modal

**Notifications (`components/domains/notifications/`):**
- `NotificationDropdown.tsx` - Notification dropdown in top nav

**Layout (`components/layout/`):**
- `Sidebar.tsx` - Navigation sidebar with role capabilities & dynamic localization
- `TopNav.tsx` - Top navigation bar with global search, notifications badge, ThemeToggle, and LanguageToggle
- `ThemeToggle.tsx` - Interactive button for toggling light/dark mode with localized tooltips
- `LanguageToggle.tsx` - Quick toggle button for switching EN/ID interface

**Providers (`components/providers/`):**
- `ThemeProvider.tsx` - Next-themes provider wrapper with class attribute and persistent storage
- `QueryProvider.tsx` - TanStack React Query provider
- `AuthProvider.tsx` - Authentication state verification and session provider

**Internationalization (`frontend/src/`):**
- `context/LanguageContext.tsx` - React Context provider for reactive locale switching
- `locales/en.ts` - English translation dictionary
- `locales/id.ts` - Indonesian translation dictionary

**Shared (`components/shared/`):**
- `StatusBadge.tsx` - Status badge component

---

## Frontend API Client & State (`frontend/src/`)

### Modular API & Hooks
- `src/lib/api.ts` — Axios instance (`api`) with Bearer Token interceptor & `meetingApi`
-`src/lib/api/dashboard.ts` — Dashboard metrics API helper (`getDashboardMetrics`)
- `src/lib/api/personas.ts` — Persona API client (`personaApi`)
- `src/lib/api/solutions.ts` — Master Solutions Catalog API client (`solutionsApi`)
- `src/lib/master-data.ts` — Admin master data API client
- `src/lib/clipboard-formatters.ts` — Clipboard copy formatters
- `src/lib/error-utils.ts` — Standardized error message extraction (`handleApiError`)
- `src/hooks/use-opportunities.ts` — React Query hooks (`useOpportunities`, `useOpportunity`, `useCreateOpportunity`, `useUpdateOpportunity`, `useDeleteOpportunity`)
- `src/hooks/use-kyc.ts` — React Query hooks (`useKYCReport`, `useKYCVersions`, `useRegenerateKYC`, `useUpdateKYCReport`)
- `src/hooks/use-notifications.ts` — React Query hooks (`useNotifications`, `useUnreadNotificationsCount`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`)
- `src/hooks/use-meetings.ts` — React Query hooks (`useMeetings`, `useMeeting`, `useCreateMeeting`, `useUpdateMeeting`, `useDeleteMeeting`)
- `src/hooks/use-personas.ts` — React Query hooks (`usePersonasList`, `usePersonaDetail`, `useGeneratePersona`)
- `src/hooks/use-users.ts` — React Query hooks (`useUsers` with optional role filter)

---

## Frontend Types (`frontend/src/types/`)

### Core Types
```typescript
// User roles
type UserRole = 'admin' | 'lead_gen' | 'managerial' | 'engineer' | 'presales' | 'viewer'

// Opportunity status (Title Case)
type OpportunityStatus = 'New' | 'KYC Running' | 'Ready Meeting' | 'Meeting Scheduled' | 
  'Meeting Done' | 'Need Proposal' | 'POC' | 'Negotiation' | 'PO' | 'Won' | 'Lost' | 'On Hold'

// Meeting status
type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
```

---

## Background Tasks (Celery)

### KYC Generation Task
- **Task Name**: `run_kyc_pipeline_task`
- **Trigger**: POST `/api/opportunities/{id}/kyc/regenerate` (returns 202) or auto on opportunity creation
- **Architecture**: LangGraph StateGraph with 2 nodes
- **Process**:
  1. Update opportunity status to `KYC Running`, create `kyc_reports` record with `status=running`
  2. **research_node**: Tavily web search + Google Search Grounding + website crawling (`httpx`+`BeautifulSoup4`)
  3. **analysis_node**: LLM generates all 13 KYC sections from research context + Smartnet Magna catalog (prompt-injected)
  4. Parse JSON output, persist to `kyc_reports` columns
  5. Update `kyc_reports.status=completed`, `progress_percent=100`
  6. Update opportunity status to `Ready Meeting`
  7. Send notification via `send_kyc_completed_notification` task

### KYC Process Possible Errors & Failure Points
1. **API & Authentication Layer**:
   - `401 Unauthorized`: Missing, expired, or invalid JWT bearer token.
   - `403 Forbidden`: User lacking `generate_kyc` capability (e.g. `viewer` role).
   - `404 Not Found`: Opportunity record not found by UUID.
   - `422 Unprocessable Entity`: Invalid UUID format or corrupted request body.
2. **Task Queue & Worker Layer (Celery/Redis)**:
   - Redis broker unreachable or connection refused during task dispatch (`run_kyc_pipeline_task.delay`).
   - Celery worker timeout, OOM crash, or worker offline.
   - Database connection pool exhaustion inside worker thread (`SessionLocal`).
3. **API Key & External Configuration Layer**:
   - Missing LLM Key: `has_active_llm_key() == False` (`OPENAI_API_KEY` / `GEMINI_API_KEY` unconfigured in DB & env) → instant failure status.
   - Expired / exhausted quota / invalid API key for LLM provider or Web Search provider (HTTP 401 / 403 / 429).
4. **Web Research & Scraping Layer**:
   - Web search engine timeout or rate limit (Tavily API / Google Search Grounding).
   - Target website crawler failure: timeout, SSL/TLS handshake error, DNS failure, or Cloudflare/WAF anti-bot block (403/503).
   - SSRF Protection Block: Website URL resolving to internal/private IP or metadata endpoints (`link_verifier_service`).
5. **LLM Inference & Parsing Layer**:
   - Provider rate limits (TPM/RPM limits hit) or provider service outage (5xx).
   - Context window overflow from excessively long web crawling payloads.
   - `HTTP 502 - Upstream stream ended before completion`:
     - **Symptom**: Settings "Test Koneksi Model" succeeds (OK/stable), but running actual KYC pipeline fails with 502 error.
     - **Root Cause**: Test connection only sends 2 tokens (`Say 'OK'`) taking <500ms. The actual KYC pipeline generates 13 structured sections (3,000–5,000+ tokens) which can take 60–120s. Upstream aggregator proxies (CosmosHub / LiteLLM) or model providers drop the streaming connection if generation exceeds their gateway timeout (30–60s), or if reasoning models (e.g. DeepSeek-R1, o1) spend too long generating internal `<think>` tokens, or when strict `response_format: {"type": "json_object"}` is rejected by non-supporting models.
     - **Mitigation & Resilience**:
       - Increased client/gateway timeout to 180s–240s in `get_chat_llm()`.
       - Automatic bypass of `response_format: {"type": "json_object"}` for reasoning models (e.g. `r1`, `o1`, `reasoner`) and graceful downgrade to prompt-only JSON on retries.
       - Retry loop with exponential backoff on transient exceptions (502, 503, 504, stream disconnects) instead of immediate abort.
       - Automatic fallback to Google Gemini/Gemma (`gemini-2.5-flash`) on final retry if OpenAI provider fails.
   - JSON parsing defects: LLM output truncation (`MAX_TOKENS`), broken markdown code block fences, or malformed JSON syntax (handled via regex fencing and self-healing bracket repair in `_clean_and_parse_json`).
   - Content moderation / safety filter rejection on target company profile or prompts.
6. **Database & Persistence Layer**:
   - DB commit error or transaction conflict when saving output to `kyc_reports`.
   - Inconsistent state revert: pipeline fails and reverting `opportunities.status` encounters a database rollback failure.

## Deployment Architecture

### Frontend (Vercel)
- **Hosting**: Deployed separately on **Vercel** (connected to the GitHub repository).
- **Auto-Deployment**: Automatically triggers build & deployment on push to `main`.
- **Environment**: Next.js 16 (App Router).
- **API Connection**: Points to the backend server via `NEXT_PUBLIC_API_URL`.

### Backend & Services (Docker / Self-Hosted VPS)
- **Hosting**: Self-hosted on VPS (`root@magnasight`) via Docker Compose.
- **Active Server Services**: `backend` (FastAPI), `celery` (worker), `postgres` (DB), `redis` (task queue).
- **Important**: Frontend container is **not** deployed on the VPS. On the server, only build and run backend services:
  ```bash
  docker compose build --no-cache backend celery
  docker compose up -d backend celery
  ```

---

## Docker Services

### docker-compose.yml
| Service | Image | Port | Purpose | Deployment Location |
|---------|-------|------|---------|---------------------|
| postgres | postgres:16-alpine | 5435→5432 | Primary database | VPS Docker |
| redis | redis:7-alpine | 6379 | Celery broker | VPS Docker |
| backend | Python 3.11 | 8009→8000 | FastAPI app | VPS Docker |
| celery | Python 3.11 | - | Background worker | VPS Docker |
| frontend | Node 20 | 3009→3000 | Next.js app | **Vercel** (Production) / Docker (Local Dev only) |

---

## Key Files Reference

### Backend Entry Points
- `backend/app/main.py` — FastAPI app initialization, middleware setup (CORS, ErrorHandler), router inclusions
- `backend/app/core/config.py` — Configuration management
- `backend/app/core/database.py` — DB Session & Base model setup
- `backend/app/core/llm.py` — Unified LLM Factory (`get_chat_llm`) — dual-provider (Google/OpenAI), runtime switchable via `system_settings`
- `backend/app/core/celery_app.py` — Celery app configuration with Redis broker
- `backend/app/core/security.py` — JWT auth, `get_current_user`, `require_admin`, capability-based auth
- `backend/app/tasks.py` — Celery background tasks definition

### Frontend Entry Points
- `frontend/src/app/layout.tsx` - Root layout with QueryClientProvider
- `frontend/src/lib/api.ts` - Axios interceptor setup & meeting API
- `frontend/src/app/login/page.tsx` - Login page component

---

## Authentication Flow

1. User opens app and navigates to `/login`
2. User logs in via Google Workspace OAuth or Dev Username/Password (e.g. `admin`, `engineer`)
3. Backend verifies credentials (`POST /api/auth/google` or `POST /api/auth/login`)
4. Backend generates JWT session token
5. Frontend stores token in `localStorage.setItem("moip_token", token)` and redirects to `/opportunities` or `/dashboard`
6. Subsequent requests include `Authorization: Bearer {token}` header via Axios interceptor

---

*Last updated: 2026-09-09*
