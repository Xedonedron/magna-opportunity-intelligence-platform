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
- **Database**: PostgreSQL 16 + SQLAlchemy ORM + Alembic migrations
- **Task Queue**: Celery + Redis for background jobs
- **AI Orchestration**: LangGraph + LangChain
- **Vector Store**: pgvector / ChromaDB for RAG

### External Services
- **LLM**: Google Gemini 2.5 Pro
- **Web Search**: Tavily API / Google Search API
- **Crawling**: Firecrawl / Crawl4AI
- **Authentication**: Google OAuth 2.0 (Workspace)
- **Email/Calendar**: Gmail API, Google Calendar API

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/google` | Google OAuth login | No |
| GET | `/me` | Get current user profile | Yes |

### Opportunities (`/api/opportunities`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List opportunities (paginated) | Yes |
| POST | `/` | Create opportunity | Yes |
| GET | `/{opportunity_id}` | Get opportunity detail | Yes |
| PATCH | `/{opportunity_id}` | Update opportunity | Yes |
| DELETE | `/{opportunity_id}` | Delete opportunity | Yes |

**Query Parameters (GET /):**
- `page` (int): Page number, default 1
- `page_size` (int): Items per page, default 10
- `search` (str): Search by company name
- `status` (str): Filter by status
- `engineer_id` (int): Filter by assigned engineer

### KYC Reports (`/api/opportunities/{opportunity_id}/kyc`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | Get latest KYC report | Yes |
| GET | `/versions` | List all KYC versions | Yes |
| GET | `/{report_id}` | Get specific KYC report | Yes |
| POST | `/regenerate` | Trigger KYC regeneration | Yes |
| PATCH | `/{report_id}` | Edit KYC report | Yes |

### Meetings (`/api/opportunities/{opportunity_id}/meetings`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List meetings | Yes |
| POST | `/` | Create meeting | Yes |
| GET | `/{meeting_id}` | Get meeting detail | Yes |
| PATCH | `/{meeting_id}` | Update meeting | Yes |
| DELETE | `/{meeting_id}` | Delete meeting | Yes |

### Notifications (`/api/notifications`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/` | List notifications | Yes |
| PATCH | `/{notification_id}/read` | Mark as read | Yes |
| PATCH | `/read-all` | Mark all as read | Yes |

### Dashboard (`/api/dashboard`)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/metrics` | Get dashboard metrics | Yes |
| GET | `/status-chart` | Get status distribution | Yes |
| GET | `/trend` | Get opportunity trend | Yes |

---

## Database Models

### Users
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| email | String | Unique email |
| name | String | Full name |
| role | Enum | admin, lgo, engineer, manager |
| google_id | String | Google OAuth ID |
| avatar_url | String | Profile picture URL |
| created_at | DateTime | Creation timestamp |

### Opportunities
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| company_name | String | Company name |
| website | String | Company website |
| status | Enum | 11 statuses (see below) |
| assigned_engineer_id | Integer | FK to Users |
| notes | Text | Additional notes |
| created_at | DateTime | Creation timestamp |
| updated_at | DateTime | Last update timestamp |

**Status Values:**
1. `new` - New opportunity
2. `kyc_running` - KYC research in progress
3. `kyc_completed` - KYC research done
4. `ready_meeting` - Ready for meeting
5. `meeting_scheduled` - Meeting scheduled
6. `meeting_completed` - Meeting completed
7. `won` - Deal won
8. `lost` - Deal lost
9. `on_hold` - On hold
10. `cancelled` - Cancelled
11. `reopened` - Reopened

### KYC Reports
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| opportunity_id | Integer | FK to Opportunities |
| version | Integer | Version number |
| executive_summary | JSONB | Executive summary data |
| company_overview | JSONB | Company overview data |
| industry_analysis | JSONB | Industry analysis data |
| pain_points | JSONB | Pain points data |
| use_cases | JSONB | Use cases data |
| meeting_objectives | JSONB | Meeting objectives |
| preparation_checklist | JSONB | Preparation items |
| raw_content | Text | Full raw AI output |
| created_at | DateTime | Creation timestamp |

### Meetings
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| opportunity_id | Integer | FK to Opportunities |
| title | String | Meeting title |
| scheduled_at | DateTime | Meeting time |
| agenda | Text | Meeting agenda |
| notes | Text | Meeting notes |
| action_items | JSON | List of action items |
| participants | JSON | List of participants |
| status | Enum | scheduled, completed, cancelled |

### Notifications
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| user_id | Integer | FK to Users |
| type | String | Notification type |
| title | String | Notification title |
| message | Text | Notification message |
| is_read | Boolean | Read status |
| metadata | JSON | Additional data |
| created_at | DateTime | Creation timestamp |

### Timeline Events
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| opportunity_id | Integer | FK to Opportunities |
| actor_id | Integer | FK to Users |
| action | String | Action description |
| event_type | String | Event type |
| metadata | JSON | Additional data |
| created_at | DateTime | Creation timestamp |

### Audit Logs
| Field | Type | Description |
|-------|------|-------------|
| id | Integer | Primary key |
| entity_type | String | Entity type |
| entity_id | Integer | Entity ID |
| user_id | Integer | FK to Users |
| action | String | Action type |
| old_value | JSONB | Previous value |
| new_value | JSONB | New value |
| created_at | DateTime | Creation timestamp |

---

## Backend Services

### KYC Pipeline Service (`backend/app/services/kyc_pipeline.py`)
**Functions:**
- `generate_kyc_report(opportunity_id: int)` - Main entry point for KYC generation
- `crawl_company_website(url: str)` - Crawl company website for data
- `extract_company_info(content: str)` - Extract structured info from crawled content
- `generate_executive_summary(data: dict)` - Generate executive summary via LLM
- `generate_use_cases(company_data: dict, solutions: list)` - Generate use cases with RAG

### Audit Service (`backend/app/services/audit_service.py`)
**Functions:**
- `log_change(entity_type: str, entity_id: int, user_id: int, action: str, old_value: dict, new_value: dict)` - Log entity changes

### Notification Service
**Functions:**
- `create_notification(user_id: int, type: str, title: str, message: str, metadata: dict)` - Create notification
- `notify_engineer_assignment(opportunity_id: int, engineer_id: int)` - Notify engineer of new assignment

---

## Backend Schemas

### Request Schemas
- `OpportunityCreate` - Create opportunity request
- `OpportunityUpdate` - Update opportunity request
- `KYCReportUpdate` - Edit KYC report request
- `MeetingCreate` - Create meeting request
- `MeetingUpdate` - Update meeting request

### Response Schemas
- `UserResponse` - User data response
- `OpportunityResponse` - Opportunity with timeline
- `OpportunityListResponse` - Paginated opportunity list
- `KYCReportResponse` - KYC report with all sections
- `MeetingResponse` - Meeting detail response
- `DashboardMetrics` - Dashboard KPIs
- `StatusChartResponse` - Status distribution for charts
- `TrendResponse` - Time series data for trend charts

---

## Frontend Structure

### App Routes (`frontend/src/app/`)
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `page.tsx` | Landing/login page |
| `/dashboard` | `(main)/dashboard/page.tsx` | Dashboard view |
| `/notifications` | `(main)/notifications/page.tsx` | Notifications list |
| `/opportunities` | `(main)/opportunities/page.tsx` | Opportunities list |
| `/opportunities/[id]` | `(main)/opportunities/[id]/page.tsx` | Opportunity detail |
| `/opportunities/create` | `(main)/opportunities/create/page.tsx` | Create opportunity |

### Components by Domain

**Dashboard (`components/dashboard/`):**
- `DashboardFilters.tsx` - Filter controls
- `DashboardMetrics.tsx` - KPI cards
- `StatusChart.tsx` - Pie chart for status distribution
- `TrendChart.tsx` - Line chart for trends

**KYC (`components/domains/kyc/`):**
- `KYCReportTab.tsx` - Main KYC display component
- `KYCEditForm.tsx` - Edit KYC sections
- `VersionSelector.tsx` - Version history dropdown
- `UseCaseAccordion.tsx` - Expandable use case list

**Meetings (`components/domains/meetings/`):**
- `MeetingAccordion.tsx` - Meeting list with expandable details
- `CreateMeetingDialog.tsx` - Meeting creation modal

**Layout (`components/layout/`):**
- `Sidebar.tsx` - Navigation sidebar
- `TopNav.tsx` - Top navigation bar

**Shared (`components/shared/`):**
- `StatusBadge.tsx` - Status badge component
- `LoadingSpinner.tsx` - Loading indicator
- `EmptyState.tsx` - Empty state placeholder

---

## Frontend API Client (`frontend/src/lib/api.ts`)

### API Functions
```typescript
// Authentication
loginWithGoogle(idToken: string): Promise<UserResponse>
getCurrentUser(): Promise<UserResponse>

// Opportunities
getOpportunities(params: OpportunityQuery): Promise<OpportunityListResponse>
getOpportunity(id: number): Promise<OpportunityResponse>
createOpportunity(data: OpportunityCreate): Promise<OpportunityResponse>
updateOpportunity(id: number, data: OpportunityUpdate): Promise<OpportunityResponse>
deleteOpportunity(id: number): Promise<void>

// KYC Reports
getKYCReport(opportunityId: number): Promise<KYCReportResponse>
getKYCVersions(opportunityId: number): Promise<KYCReport[]>
regenerateKYC(opportunityId: number): Promise<KYCReportResponse>
updateKYCReport(opportunityId: number, reportId: number, data: KYCReportUpdate): Promise<KYCReportResponse>

// Meetings
getMeetings(opportunityId: number): Promise<MeetingResponse[]>
createMeeting(opportunityId: number, data: MeetingCreate): Promise<MeetingResponse>
updateMeeting(opportunityId: number, meetingId: number, data: MeetingUpdate): Promise<MeetingResponse>
deleteMeeting(opportunityId: number, meetingId: number): Promise<void>

// Notifications
getNotifications(): Promise<Notification[]>
markAsRead(notificationId: number): Promise<void>
markAllAsRead(): Promise<void>

// Dashboard
getDashboardMetrics(params: DashboardQuery): Promise<DashboardMetrics>
getStatusChart(): Promise<StatusChartResponse>
getTrend(params: TrendQuery): Promise<TrendResponse>
```

### Error Handling
- `handleApiError(error: unknown): string` - Standardized error message extraction
- Defined in `frontend/src/lib/error-utils.ts`

---

## Frontend Types (`frontend/src/types/`)

### Core Types
```typescript
// User roles
type UserRole = 'admin' | 'lgo' | 'engineer' | 'manager'

// Opportunity status
type OpportunityStatus = 'new' | 'kyc_running' | 'kyc_completed' | 'ready_meeting' | 
  'meeting_scheduled' | 'meeting_completed' | 'won' | 'lost' | 'on_hold' | 
  'cancelled' | 'reopened'

// Meeting status
type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
```

---

## Background Tasks (Celery)

### KYC Generation Task
- **Task Name**: `generate_kyc_task`
- **Trigger**: POST `/api/opportunities/{id}/kyc/regenerate`
- **Process**:
  1. Update opportunity status to `kyc_running`
  2. Crawl company website + LinkedIn + News
  3. Extract structured data
  4. Generate sections via LLM
  5. Query RAG for Smartnet Magna solutions
  6. Compile final report
  7. Update opportunity status to `kyc_completed`
  8. Create notification for assigned engineer

---

## Docker Services

### docker-compose.yml
| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:16-alpine | 5432 | Primary database |
| redis | redis:7-alpine | 6379 | Celery broker |
| backend | Python 3.11 | 8000 | FastAPI app |
| celery | Python 3.11 | - | Background worker |
| frontend | Node 20 | 3001:3000 | Next.js app |

### Environment Variables
**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth secret
- `GEMINI_API_KEY` - LLM API key
- `TAVILY_API_KEY` - Web search API

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - OAuth client ID

---

## Key Files Reference

### Backend Entry Points
- `backend/app/main.py` - FastAPI app initialization, middleware setup
- `backend/app/core/config.py` - Configuration management
- `backend/app/core/exceptions.py` - Custom exception classes
- `backend/app/core/error_handler.py` - Global error handling

### Frontend Entry Points
- `frontend/src/app/layout.tsx` - Root layout with providers
- `frontend/src/lib/api.ts` - Base API client setup
- `frontend/src/lib/query-provider.tsx` - TanStack Query setup

### Database
- `backend/alembic/versions/661fc11f0974_initial_schema.py` - Initial migration

---

## Authentication Flow

1. User clicks "Login with Google" on frontend
2. Frontend obtains Google ID token via OAuth
3. Frontend sends ID token to `POST /api/auth/google`
4. Backend verifies token with Google
5. Backend creates/updates user record
6. Backend generates JWT session token
7. Frontend stores token and redirects to dashboard
8. Subsequent requests include `Authorization: Bearer {token}` header

---

## KYC Report Structure

Each KYC report contains these JSONB sections:

### executive_summary
```json
{
  "overview": "string",
  "key_insights": ["string"],
  "recommendation": "string"
}
```

### company_overview
```json
{
  "name": "string",
  "industry": "string",
  "size": "string",
  "location": "string",
  "founded": "string",
  "website": "string",
  "description": "string"
}
```

### industry_analysis
```json
{
  "market_size": "string",
  "trends": ["string"],
  "challenges": ["string"],
  "opportunities": ["string"]
}
```

### pain_points
```json
[
  {
    "title": "string",
    "description": "string",
    "impact": "string"
  }
]
```

### use_cases
```json
[
  {
    "title": "string",
    "description": "string",
    "smartnet_solution": "string",
    "benefits": ["string"]
  }
]
```

### meeting_objectives
```json
[
  {
    "objective": "string",
    "talking_points": ["string"]
  }
]
```

### preparation_checklist
```json
[
  {
    "item": "string",
    "completed": false
  }
]
```

---

## Testing

### Backend Tests (`backend/tests/`)
- `test_auth.py` - Authentication tests
- `test_opportunities.py` - Opportunity CRUD tests
- `conftest.py` - Pytest fixtures

### Running Tests
```bash
cd backend
pytest
```

---

## Quick Commands

### Development
```bash
# Start all services
docker-compose up -d

# Backend logs
docker-compose logs -f backend

# Frontend logs
docker-compose logs -f frontend

# Rebuild containers
docker-compose up -d --build
```

### Database
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Backend
```bash
# Install dependencies
cd backend && pip install -r requirements.txt

# Run dev server locally
uvicorn app.main:app --reload
```

### Frontend
```bash
# Install dependencies
cd frontend && npm install

# Run dev server locally
npm run dev
```

---

## Dependencies

### Backend (requirements.txt)
- fastapi
- uvicorn[standard]
- sqlalchemy
- alembic
- psycopg2-binary
- redis
- celery
- python-jose[cryptography]
- google-auth
- google-auth-oauthlib
- langchain
- langgraph
- langchain-google-genai
- tavily-python
- firecrawl-py

### Frontend (package.json)
- next
- react
- react-dom
- @tanstack/react-query
- react-hook-form
- @hookform/resolvers
- zod
- recharts
- tailwindcss
- @radix-ui/* (shadcn/ui components)
- lucide-react

---

*Last updated: 2026-07-28*