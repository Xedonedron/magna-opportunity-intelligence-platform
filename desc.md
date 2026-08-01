# Magna Opportunity Intelligence Platform (MOIP)

## Project Name
**Magna Opportunity Intelligence Platform (MOIP)**

## Team Members
* **[Nixon Hutahaean]** — [xedonedron]
* **[Ayup Panjaitan Wicaksana]** — [apanjaitanw]

---

## Problem Statement
At **PT Smartnet Magna Global**, the presales and opportunity handling process was historically conducted via informal WhatsApp group chats. Lead Generation Officers (LGOs) manually submitted client information, leading to:

1. **Unstructured & Fragmented Data:** Crucial customer details scattered across chat histories.
2. **High Manual KYC Overhead:** Engineers spent hours manually researching target companies, industry backgrounds, and potential pain points before meetings.
3. **Inconsistent Meeting Preparation:** Lack of standard preparation checklists and documented internal solution alignment.
4. **No Centralized Visibility:** Managers lacked real-time visibility into opportunity stages, meeting histories, and revenue pipelines.

---

## Proposed Solution

### Main Idea
**Magna Opportunity Intelligence Platform (MOIP)** is an AI-powered presales intelligence and opportunity management platform. It automates customer Know-Your-Customer (KYC) research by combining live web search with RAG (Retrieval-Augmented Generation) against Smartnet Magna's internal solution catalog, powered by Google's **Gemma 4** (`gemma-4-26b-a4b-it`) and Gemini AI models.

### Intended Users
* **Lead Generation Officers (LGO):** Easily create and track new client opportunities.
* **Presales / Sales Engineers:** Access automated AI KYC reports, review RAG-recommended Smartnet Magna solutions, and manage meeting notes.
* **Managers & Executives:** Monitor opportunity pipelines, engineer workloads, meeting schedules, and revenue metrics.
* **Administrators:** Full system control, user management, and audit log inspection.

### Core User Experience
1. **Create Opportunity:** LGO or Sales enters basic company information (Company Name, Need, Website).
2. **Automated AI KYC Pipeline:** Background worker (Celery + ChromaDB + Gemma/Gemini + Tavily Web Search) automatically generates a structured KYC report in < 5 minutes.
3. **Smart Solution Matching:** RAG engine retrieves matching Smartnet Magna products and Google Cloud solutions from internal PDF knowledge bases.
4. **Meeting & Lifecycle Management:** Add meetings, trigger Google Calendar events, receive email reminders, edit KYC versions, and transition opportunities through the lifecycle (New → KYC Running → Meeting Scheduled → Proposal → Won/Lost).

### Expected Outcome / Benefit
* **90% Reduction in Prep Time:** Meeting preparation reduced from hours to under 5 minutes.
* **100% Documentation:** Centralized single source of truth for all sales opportunities.
* **Enhanced Presales Quality:** High-impact, tailored meeting questions and solution recommendations backed by internal technical collateral.

---

## Gemma & AI Integration

Gemma is integrated into MOIP's intelligent pipeline via Google AI Studio / Vertex AI Model Garden (`gemma-4-26b-a4b-it`):

1. **Web Intelligence Harvester (Tavily Search):** Crawls company official websites, recent news, and LinkedIn profiles.
2. **Internal RAG Knowledge Base (ChromaDB Vector Store):** Embeds and indexes Smartnet Magna company profiles, capability statements, and solution datasheets.
3. **Gemma KYC Synthesizer:** Processes raw web data + retrieved internal RAG contexts to produce structured JSON containing:
   * Executive Summary & Business Overview
   * Company Location & Industry Analysis
   * Potential Customer Pain Points
   * Industry Use Cases with Smartnet Magna & Google Cloud Solution Mapping
   * Meeting Objectives, Recommended Questions & Prep Checklist
4. **KYC Versioning Engine:** Maintains immutable version histories (`v1` Auto-generated, `v2` Regenerated, `v3+` Engineer-edited) with full diff capabilities.

---

## Agentic Development Workflow

### Antigravity Use
* **Full-Stack Planning & Codebase Generation:** Audited requirements, established clean architecture for Next.js 15 App Router frontend and FastAPI backend.
* **Database & Migration Design:** Orchestrated PostgreSQL schemas, Alembic migrations, audit logs, and UUID handling.
* **Containerization & Deployment:** Built optimized Dockerfiles, docker-compose setups, and automated Cloud Run deployment commands for Google Cloud Platform (`asia-southeast2`).

### Skills & Integration
* **`building-data-apps` & `web_application_development`:** Applied modern design principles (high contrast, vibrant dark/light theme, Recharts visualizations, interactive accordions).
* **`managing-python-dependencies`:** Environment management for FastAPI, SQLAlchemy, Celery, ChromaDB, and Pydantic v2.
* **`gcloud-auth-verification` & `enforcing-resource-attribution`:** Configured gcloud, Artifact Registry, and Cloud Run deployments cleanly.

---

## Google Cloud Architecture

```
[ Next.js 15 Frontend ]  <--->  [ FastAPI Backend (Cloud Run) ]
  (Cloud Run: moip-frontend)        (Cloud Run: moip-backend)
                                           |
                                           +---> [ Cloud SQL PostgreSQL: moip-db ]
                                           +---> [ Redis Task Queue ]
                                           +---> [ Celery KYC Worker ]
                                           |        |
                                           |        +---> [ ChromaDB Vector RAG ]
                                           |        +---> [ Tavily Web Search ]
                                           +---> [ Google Gemma 4 MaaS / Gemini API ]
                                           +---> [ Gmail / Google Calendar ]
```

* **Live Deployed Frontend URL:** [https://moip-frontend-1030572383460.asia-southeast2.run.app](https://moip-frontend-1030572383460.asia-southeast2.run.app)
* **Live Deployed Backend API:** [https://moip-backend-1030572383460.asia-southeast2.run.app](https://moip-backend-1030572383460.asia-southeast2.run.app)
* **Live API Health Check:** [https://moip-backend-1030572383460.asia-southeast2.run.app/api/health](https://moip-backend-1030572383460.asia-southeast2.run.app/api/health)

* **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
* **Backend API:** FastAPI (Python 3.12), SQLAlchemy, Alembic, Pydantic v2.
* **Database:** PostgreSQL (Cloud SQL) for structured data & Audit Logs.
* **AI & RAG:** ChromaDB (Vector DB) + Google AI Studio / Vertex AI (`gemma-4-26b-a4b-it`).
* **Background Processing:** Celery + Redis for asynchronous KYC pipeline execution.
* **Cloud Infrastructure:** Google Cloud Run (`asia-southeast2` Jakarta), Artifact Registry, Cloud SQL.

---

## Development Credentials (Plaintext Login)

For development and evaluation purposes, MOIP supports both **Google Workspace OAuth** and **Development Plaintext Login**:

| Username | Password | Role | Capabilities |
| :--- | :--- | :--- | :--- |
| `admin` | `P@ssw0rd` | Admin | Full Access, User Management, Create/Edit/Delete, KYC |
| `superadmin` | `P@ssw0rd` | Superadmin | Full System Administration |
| `lead_gen` | `123456` | Lead Gen (LGO) | Create & Manage Opportunities |
| `managerial` | `123456` | Manager | Dashboard Monitoring, Revenue Pipelines, Opportunities |
| `engineer` | `123456` | Presales Engineer | View, Edit KYC, Regenerate KYC, Add Meetings |

---

## Instructions to Run

### Option A: Running with Docker (Recommended)

1. Clone repository and ensure Docker Desktop is running.
2. Configure `.env` in `backend/` and `.env.local` in `frontend/`.
3. Start all services (PostgreSQL, Redis, Backend, Frontend, Celery Worker):
   ```bash
   docker-compose up -d
   ```
4. Access application at `http://localhost:3000`.

### Option B: Local Development Setup

1. **Start Infrastructure Services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev # Runs on http://localhost:3000
   ```

4. **Start Asynchronous Worker (Celery):**
   ```bash
   cd backend
   celery -A app.core.celery_app worker --loglevel=info
   ```

### Option C: Cloud Run Deployment Commands

```bash
# 1. Deploy Backend to Cloud Run
gcloud run deploy moip-backend \
  --source ./backend \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --project kodingdeepdive0826-9590

# 2. Deploy Frontend to Cloud Run
gcloud run deploy moip-frontend \
  --source ./frontend \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --project kodingdeepdive0826-9590
```
