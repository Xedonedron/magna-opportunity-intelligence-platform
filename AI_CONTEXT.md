# AI_CONTEXT.md - Magna Opportunity Intelligence Platform (MOIP)

> Dokumen ini berisi ringkasan implementasi untuk referensi cepat AI assistant. Memudahkan pencarian tanpa harus membaca seluruh codebase.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 16 + SQLAlchemy ORM (UUID Primary Keys) + Alembic migrations
- **Task Queue**: Celery + Redis for background jobs
- **AI Orchestration**: LangGraph + LangChain
- **Vector Store**: pgvector / ChromaDB for RAG

### External Services
- **LLM**: Google AI Studio (Gemini 3.6 Flash / Gemma 4 via langchain-google-genai)
- **Web Search**: Tavily API / Google Search API
- **Crawling**: Firecrawl / Crawl4AI
- **Authentication**: Google OAuth 2.0 (Workspace) + Dev Username/Password Login
- **Email/Calendar**: Gmail API, Google Calendar API

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/google` | Google OAuth login | No |
| POST | `/login` | Dev username/password login | No |
| GET | `/me` | Get current user profile | Yes |

### Opportunities (`/api/opportunities`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List opportunities (paginated) | Yes |
| POST | `/` | Create opportunity | Yes |
| GET | `/search/global` | Global search across opportunities | Yes |
| GET | `/{opportunity_id}` | Get opportunity detail | Yes |
| PATCH | `/{opportunity_id}` | Update opportunity | Yes |
| DELETE | `/{opportunity_id}` | Delete opportunity | Yes |
| GET | `/{opportunity_id}/chat` | Get RAG chat history for opportunity | Yes |
| POST | `/{opportunity_id}/chat` | Send message / RAG chat streaming | Yes |
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
| GET | `/{seniority}/{department}` | Get or generate persona questions | Yes |
| POST | `/generate` | Force generate / regenerate persona questions | Yes |

### KYC Reports (`/api/opportunities/{opportunity_id}/kyc`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | Get latest KYC report | Yes |
| GET | `/versions` | List all KYC versions | Yes |
| GET | `/{report_id}` | Get specific KYC report | Yes |
| POST | `/regenerate` | Trigger KYC regeneration | Yes |
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

### Admin (`/api/admin`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Admin system metrics | Yes (Admin) |
| GET | `/logs` | System audit logs | Yes (Admin) |
| GET | `/users` | List all users | Yes (Admin) |
| PATCH | `/users/{user_id}` | Update user role and capabilities | Yes (Admin) |
| GET | `/master-data` | Get master data options | Yes (Admin) |
| POST | `/master-data` | Update master data options | Yes (Admin) |
| GET | `/settings` | Get system settings (search provider, LLM models) | Yes (Admin) |
| PUT | `/settings` | Update system settings | Yes (Admin) |

### Dashboard (`/api/dashboard`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Get dashboard metrics | Yes |
| GET | `/status-chart` | Get status distribution | Yes |
| GET | `/trend` | Get opportunity trend | Yes |

---

## Database Models

### Users (`users`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String(255) | Unique email |
| full_name | String(255) | Full name |
| avatar_url | String(500) | Profile picture URL |
| role | String(50) | superadmin, admin, lead_gen, managerial, engineer, presales, viewer |
| capabilities | String(255) | Comma-separated permissions (e.g. view,create_edit,delete,generate_kyc,user_management) |
| is_active | Boolean | Active status |
| google_id | String(255) | Google OAuth ID |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |
| last_login | DateTime | Last login timestamp |

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
7. `Negotiation` - Commercial negotiation
8. `PO` - Purchase Order received
9. `Won` - Deal won
10. `Lost` - Deal lost
11. `On Hold` - On hold

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
| version | Integer | Version number |
| executive_summary | JSONB | Executive summary data |
| company_overview | JSONB | Company overview data |
| industry_analysis | JSONB | Industry analysis data |
| competitor_analysis | JSONB | Competitor analysis data |
| pain_points | JSONB | Pain points data |
| use_cases | JSONB | Use cases data |
| meeting_objectives | JSONB | Meeting objectives |
| preparation_checklist | JSONB | Preparation items |
| raw_content | Text | Full raw AI output |
| created_at | DateTime | Creation timestamp |

### Meetings (`meetings`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| opportunity_id | UUID | FK to Opportunities |
| title | String(255) | Meeting title |
| scheduled_at | DateTime | Meeting time |
| agenda | Text | Meeting agenda |
| notes | Text | Meeting notes |
| action_items | JSON | List of action items |
| participants | JSON | List of participants |
| status | String(50) | scheduled, completed, cancelled |

### Notifications (`notifications`)
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users |
| opportunity_id | UUID | FK to Opportunities (optional) |
| type | String(50) | Notification type |
| title | String(255) | Notification title |
| message | Text | Notification message |
| is_read | Boolean | Read status |
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
| role | String(50) | user, assistant |
| content | Text | Chat message content |
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

---

## Backend Services

### KYC Pipeline Service (`backend/app/services/kyc_pipeline.py`)
**Functions:**
- `generate_kyc_report(opportunity_id: UUID)` - Main entry point for KYC generation
- `crawl_company_website(url: str)` - Crawl company website for data
- `extract_company_info(content: str)` - Extract structured info from crawled content
- `generate_executive_summary(data: dict)` - Generate executive summary via LLM
- `generate_use_cases(company_data: dict, solutions: list)` - Generate use cases with RAG

### Target Persona Service (`backend/app/services/persona_service.py`)
**Functions:**
- `generate_persona_playbook(...)` - Generate seniority & department customized presales discovery playbook and objection handling via LLM

### AI Validation & Grounding Service (`backend/app/services/ai_validation_service.py`)
**Functions:**
- `validate_information_and_thinking(...)` - Validates AI output factuality, reasoning consistency, and verifies live web URLs via Google Grounding & Tavily

### Link Verifier Service (`backend/app/services/link_verifier.py`)
**Functions:**
- `verify_urls(...)` - Concurrently checks HTTP status and verifies real accessibility of links before reporting

### Audit Service (`backend/app/services/audit_service.py`)
**Functions:**
- `log_change(entity_type: str, entity_id: UUID, user_id: UUID, action: str, old_value: dict, new_value: dict)` - Log entity changes

### Notification Task / Helper
**Functions:**
- `send_opportunity_created_notification` - Notify team of new opportunity
- `send_status_changed_notification` - Notify assigned engineer on status changes
- `run_kyc_pipeline_task` - Celery task for running KYC research pipeline

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

**Opportunities (`components/domains/opportunities/`):**
- `OpportunityChatSidebar.tsx` - AI RAG Chat assistant sidebar for opportunity
- `OpportunityDetailHeader.tsx` - Header info & action buttons
- `OpportunityTimeline.tsx` - Activity log timeline
- `EditOpportunityDialog.tsx` - Modal to edit opportunity details

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

**Layout (`components/layout/`):**
- `Sidebar.tsx` - Navigation sidebar with role capabilities & dynamic localization
- `TopNav.tsx` - Top navigation bar with global search, notifications badge, and LanguageToggle
- `LanguageToggle.tsx` - Quick toggle button for switching EN/ID interface

**Internationalization (`frontend/src/`):**
- `context/LanguageContext.tsx` - React Context provider for reactive locale switching
- `locales/en.ts` - English translation dictionary
- `locales/id.ts` - Indonesian translation dictionary

**Shared (`components/shared/`):**
- `StatusBadge.tsx` - Status badge component
- `LoadingSpinner.tsx` - Loading indicator
- `EmptyState.tsx` - Empty state placeholder

---

## Frontend API Client & State (`frontend/src/`)

### Modular API & Hooks
- `src/lib/api.ts` - Axios instance (`api`) with Bearer Token interceptor & `meetingApi`
- `src/lib/api/dashboard.ts` - Dashboard metrics API helper (`getDashboardMetrics`)
- `src/lib/master-data.ts` - Admin master data API client
- `src/hooks/use-opportunities.ts` - React Query hooks (`useOpportunities`, `useOpportunity`, `useCreateOpportunity`, `useUpdateOpportunity`, `useDeleteOpportunity`)
- `src/hooks/use-kyc.ts` - React Query hooks (`useKYCReport`, `useKYCVersions`, `useRegenerateKYC`, `useUpdateKYCReport`)
- `src/hooks/use-notifications.ts` - React Query hooks (`useNotifications`, `useUnreadNotificationsCount`, `useMarkNotificationAsRead`, `useMarkAllNotificationsAsRead`)

### Error Handling
- `handleApiError(error: unknown): string` - Standardized error message extraction
- Defined in `frontend/src/lib/error-utils.ts`

---

## Frontend Types (`frontend/src/types/`)

### Core Types
```typescript
// User roles
type UserRole = 'superadmin' | 'admin' | 'lead_gen' | 'managerial' | 'engineer' | 'presales' | 'viewer'

// Opportunity status (Title Case)
type OpportunityStatus = 'New' | 'KYC Running' | 'Ready Meeting' | 'Meeting Scheduled' | 
  'Meeting Done' | 'Need Proposal' | 'Negotiation' | 'PO' | 'Won' | 'Lost' | 'On Hold'

// Meeting status
type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
```

---

## Background Tasks (Celery)

### KYC Generation Task
- **Task Name**: `run_kyc_pipeline_task`
- **Trigger**: POST `/api/opportunities/{id}/kyc/regenerate` or status change to `KYC Running`
- **Process**:
  1. Update opportunity status to `KYC Running`
  2. Crawl company website + Google Search
  3. Extract structured data
  4. Generate sections via LLM
  5. Query RAG for Smartnet Magna solutions
  6. Compile final report
  7. Update opportunity status to `Ready Meeting` (or `KYC Completed`)
  8. Create notification for assigned engineer / creator

---

## Docker Services

### docker-compose.yml
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:16-alpine | 5432 | Primary database (pgvector enabled) |
| redis | redis:7-alpine | 6379 | Celery broker |
| backend | Python 3.11 | 8000 | FastAPI app |
| celery | Python 3.11 | - | Background worker |
| frontend | Node 20 | 3001:3000 | Next.js app |

---

## Key Files Reference

### Backend Entry Points
- `backend/app/main.py` - FastAPI app initialization, middleware setup, CORS, router inclusions
- `backend/app/core/config.py` - Configuration management
- `backend/app/core/database.py` - DB Session & Base model setup
- `backend/app/tasks.py` - Celery background tasks definition

### Frontend Entry Points
- `frontend/src/app/layout.tsx` - Root layout with QueryClientProvider
- `frontend/src/lib/api.ts` - Axios interceptor setup & meeting API
- `frontend/src/app/login/page.tsx` - Login page component

---

## Authentication Flow

1. User opens app and navigates to `/login`
2. User logs in via Google Workspace OAuth or Dev Username/Password (e.g. `superadmin`, `admin`, `engineer`)
3. Backend verifies credentials (`POST /api/auth/google` or `POST /api/auth/login`)
4. Backend generates JWT session token
5. Frontend stores token in `localStorage.setItem("moip_token", token)` and redirects to `/opportunities` or `/dashboard`
6. Subsequent requests include `Authorization: Bearer {token}` header via Axios interceptor

---

*Last updated: 2026-08-01*
