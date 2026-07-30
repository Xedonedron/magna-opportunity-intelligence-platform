# Catatan Arsitektur

Saya menyarankan implementasi dengan arsitektur berikut agar tetap modular dan mudah dikembangkan:

* **Frontend**: Next.js + TypeScript + Tailwind CSS + shadcn/ui.
* **Backend API**: FastAPI.
* **Database**: PostgreSQL.
* **ORM**: SQLAlchemy + Alembic.
* **Background Jobs**: Celery atau Dramatiq dengan Redis sebagai broker.
* **AI Orchestration**: LangGraph (karena alur KYC terdiri dari beberapa langkah yang saling bergantung).
* **RAG**: LangChain + pgvector atau ChromaDB untuk dokumen internal Smartnet Magna.
* **Web Search & Crawling**: Tavily/Google Search API dikombinasikan dengan crawler (misalnya Firecrawl atau Crawl4AI) untuk memperoleh konten website.
* **LLM**: Gemini 2.5 Pro atau model setara yang mendukung tool calling dan konteks panjang.
* **Authentication**: Google OAuth 2.0 melalui Google Workspace.
* **Email & Calendar**: Gmail API dan Google Calendar API.

---

### 1. Information Architecture (IA)

The application follows a flat, predictable navigation model to minimize cognitive load for enterprise users.

* **/** (Root) - *Redirects to /dashboard*
* **/dashboard** - High-level metrics, upcoming meetings, recent KYC runs.
* **/opportunities** - Master table of all opportunities.
* **/opportunities/create** - Multi-step form & AI Pipeline view.
* **/opportunities/[id]** - Detail view with context-switching tabs.
* *Tabs:* Overview | Meetings | Timeline | KYC Report | Versions




* **/meetings** - Global view of all meetings across opportunities.
* **/notifications** - Global notification center.
* **/settings** - User & system preferences.

---

### 2. Routing Structure (Next.js App Router)

We will use Route Groups `(main)` to share the core layout (Sidebar + Top Navigation) across all internal pages without affecting the URL structure.

```text
app/
├── (main)/                     # Core authenticated app layout
│   ├── layout.tsx              # Renders Sidebar + TopNav
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard page
│   ├── opportunities/
│   │   ├── page.tsx            # Opportunities list (DataTable)
│   │   ├── create/
│   │   │   └── page.tsx        # Multi-step creation form & Pipeline
│   │   └── [id]/
│   │       └── page.tsx        # Detail page (Tabs)
│   ├── meetings/
│   │   └── page.tsx            # Global meetings page
│   ├── notifications/
│   │   └── page.tsx            # Full-page notifications
│   └── settings/
│       └── page.tsx            # Settings page
├── layout.tsx                  # Root layout (Providers, Fonts, Globals)
└── page.tsx                    # Root redirect to /dashboard

```

---

### 3. Folder Structure

A highly modular, domain-driven structure ensures the codebase remains maintainable as the application scales.

```text
src/
├── app/                        # Next.js App Router (Routes as defined above)
├── components/                 # Reusable React Components
│   ├── ui/                     # shadcn/ui base components (buttons, inputs, dialogs)
│   ├── layout/                 # Sidebar, TopNav, PageHeader
│   ├── shared/                 # StatusBadge, EmptyState, Skeleton, Timeline
│   └── domains/                # Domain-specific complex components
│       ├── dashboard/          # MetricCards, ActivityFeed, StatusChart
│       ├── opportunities/      # DataTable, CreateStepper, AIPipeline
│       └── kyc/                # KYCReport, UseCaseAccordion, VersionHistory
├── lib/                        # Utilities
│   ├── utils.ts                # Tailwind merge/clsx, formatting utils
│   └── constants.ts            # Status colors, static configuration
├── hooks/                      # Custom React Hooks
│   ├── use-opportunities.ts    # TanStack Query hooks for opportunities
│   └── use-kyc.ts              # TanStack Query hooks for KYC data
├── types/                      # TypeScript Definitions
│   ├── opportunity.ts          # Interfaces for Opportunity, Timeline, Meeting
│   ├── kyc.ts                  # Interfaces for KYC sections, Use Cases
│   └── common.ts               # Generic types (API responses, Pagination)
└── mocks/                      # Mocked JSON Data
    ├── opportunities.json
    ├── kyc-reports.json
    └── timeline.json

```

---

### 4. Component Hierarchy

By breaking down the UI into atomic and composite components, we ensure consistent design (Linear/GitHub style) and prevent code duplication.

#### A. Core Layout (`components/layout/`)

* `AppLayout`: Wraps the authenticated experience.
* `Sidebar`: Navigation links, collapsed/expanded state.
* `TopNav`:
* `GlobalSearch` (Command Palette triggered by `Cmd+K`).
* `NotificationDropdown` (Unread badge, quick list).
* `UserProfileMenu`.



#### B. Dashboard (`components/domains/dashboard/`)

* `DashboardMetricsGrid`: Contains `MetricCard`s (Total, Won, Lost, Running, etc.).
* `RecentActivityFeed`: List of recent system actions.
* `UpcomingMeetings`: Minimal list view of today's calendar.
* `KYCStatusList`: Real-time mock view of KYC pipeline statuses.

#### C. Opportunity List (`components/domains/opportunities/`)

* `OpportunityDataTable`: Built with TanStack Table.
* `TableToolbar`: Search input, Filter dropdowns, "Create" button.
* `TablePagination`.


* `OpportunityStatusBadge`: Applies specific brand colors (Blue, Orange, Green, Red, Emerald, Yellow).

#### D. Opportunity Detail (`components/domains/opportunities/`)

* `PageHeader`: Breadcrumbs, Title, Main Actions.
* `OpportunityTabs`: Next.js state or URL-param driven tabs.
* **Tab: Overview** -> `CompanyInfoCard`, `NeedsSummary`, `StatusWidget`.
* **Tab: Meetings** -> `MeetingAccordion` (Agenda, Notes, Action Items).
* **Tab: Timeline** -> `TimelineRoot` -> `TimelineItem` (GitHub-style, connected by vertical lines).
* **Tab: KYC Report** (The highlight) ->
* `KYCHeader` (Executive Summary).
* `CompanyOverviewGrid`.
* `UseCaseAccordion` (Expanded/Collapsed state for AI capabilities).
* `ChecklistBoard` (Preparation items).


* **Tab: Versions** -> `VersionHistoryList` (Selectable past KYC generations).



#### E. Create Opportunity (`components/domains/opportunities/`)

* `CreateOpportunityStepper`: Tracks steps 1-3.
* `CompanyInfoForm`: React Hook Form (RHF) + Zod validation.
* `MeetingInfoForm`: RHF + DatePicker.
* `CustomerNeedsForm`: RHF Textareas.
* `AITaskPipeline`: Post-submit UI (Replaces the form).
* *States:* Opportunity Created -> AI KYC Running -> Waiting -> Completed (Visualized as a Linear-style progress pipeline, not a generic spinner).



---

### 5. Design System & Theming Notes

To achieve the requested "Enterprise SaaS" look (Linear, Vercel style):

* **Typography:** Inter or standard sans-serif (`font-sans`). Dense, highly readable text with strict hierarchy.
* **Colors:** `zinc` or `slate` for neutral backgrounds. Pure white (`#FFFFFF`) for cards.
* *Borders:* Very subtle (`border-border/40`).
* *Shadows:* Barely visible, crisp shadows (`shadow-sm` for cards, `shadow-md` for dropdowns).


* **Status Colors (Strict):**
* New: `bg-blue-100 text-blue-700`
* Running: `bg-orange-100 text-orange-700`
* Completed: `bg-green-100 text-green-700`
* Lost: `bg-red-100 text-red-700`
* Won: `bg-emerald-100 text-emerald-700`
* Need Follow Up: `bg-yellow-100 text-yellow-700`


* **Interactions:** Hover states on rows, subtle scaling on buttons, instant visual feedback via Toast notifications.