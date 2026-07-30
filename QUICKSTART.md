# MOIP Quick Start Guide

## Prerequisites

- Docker Desktop (running)
- Python 3.14+
- Node.js 18+
- Google Cloud Console project with OAuth 2.0 credentials

## Initial Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:8000/api/auth/google`
4. Copy Client ID and Client Secret

### 2. Environment Variables

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://moip:moip_secret@localhost:5432/moip_db
SECRET_KEY=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_WORKSPACE_DOMAIN=smartnet.co.id
APP_NAME=Magna Opportunity Intelligence Platform
APP_VERSION=0.1.0
FRONTEND_URL=http://localhost:3000

# AI/KYC Pipeline (optional for full functionality)
GOOGLE_API_KEY=your-google-ai-api-key
TAVILY_API_KEY=your-tavily-api-key
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. API Keys for KYC Pipeline (Optional)

For full KYC functionality, obtain:
- **Google AI API Key**: [Google AI Studio](https://aistudio.google.com/)
- **Tavily API Key**: [Tavily](https://tavily.com/)

## Starting the Application

### Option A: Docker (Recommended - All Services)

Single command starts everything:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Backend API (port 8000)
- Frontend (port 3000)
- Celery Worker (KYC Pipeline)

**Access:** http://localhost:3000

**View logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f celery
```

**Stop all:**
```bash
docker-compose down
```

### Option B: Manual (Development)

For development with hot-reload:

**Step 1: Start Infrastructure**
```bash
docker-compose up -d postgres redis
```

**Step 2: Backend Setup (First Time Only)**
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

**Step 3: Frontend Setup (First Time Only)**
```bash
cd frontend
npm install
```

**Step 4: Start All Services (3 terminals)**

Terminal 1 - Backend:
```bash
cd backend && uvicorn app.main:app --reload
```

Terminal 2 - Frontend:
```bash
cd frontend && npm run dev
```

Terminal 3 - Celery:
```bash
cd backend && celery -A app.core.celery_app worker --loglevel=info
```

**Access:** http://localhost:3000

---

## User Walkthrough

### 1. Login

1. Click "Sign in with Google"
2. Select your Google Workspace account (@smartnet.co.id)
3. System assigns role based on email configuration
4. Redirected to dashboard

### 2. Dashboard Overview

After login, you see:
- **Metrics Cards**: Total opportunities, by status
- **Status Distribution**: Pie chart
- **30-Day Trend**: Area chart
- **Engineer Performance**: (Admin/Manager only)

### 3. Create Opportunity

1. Click "New Opportunity" button (top right)
2. Fill required fields:
   - **Company Name**: Customer company
   - **Customer Needs**: What they need
3. Optional fields:
   - Industry, Website
   - PIC Name, Email, Phone
   - Estimated Value, Close Date
4. Click "Create"
5. Status: "New"
6. Timeline shows creation event
7. KYC pipeline starts automatically (if configured)

### 4. KYC Report

Navigate to opportunity → "KYC Report" tab:

**Sections Generated:**
- Company Profile
- Business Activities
- Financial Overview
- Risk Assessment
- Industry Use Cases
- Recommended Solutions (from Smartnet Magna RAG)

**Actions:**
- Edit any section
- View version history
- Regenerate entire report
- Download as PDF

### 5. Meetings

From opportunity detail page:
1. Click "Add Meeting"
2. Fill details:
   - Date/Time
   - Agenda
   - Participants (internal/external)
   - Location (or video call link)
3. Save
4. System creates Google Calendar event
5. Participants receive email invitation

**During/After Meeting:**
- Add notes
- Record action items
- Upload documents

### 6. Status Workflow

Opportunity status flow:
```
New → KYC Running → KYC Complete → Quotation → Negotiation → Won/Lost
```

Update status:
1. Click status dropdown
2. Select new status
3. Optionally add note
4. Timeline updates automatically
5. Email notifications sent

### 7. Notifications

Bell icon shows:
- Unread count badge
- Recent notifications list

**Notification Types:**
- Opportunity created
- KYC completed
- Status changed
- Meeting reminder (H-1, H-2 hours)

### 8. Role-Based Access

| Role | Can See | Can Do |
|------|---------|--------|
| **Admin** | All opportunities | Everything + manage users |
| **Manager** | All opportunities | Everything |
| **Engineer** | Assigned opportunities | Edit KYC, add meetings, change status |
| **LGO** | Own opportunities | Create, edit own opportunities |

---

## Troubleshooting

### Backend won't start
- Check database running: `docker ps`
- Check .env file exists
- Run migration: `alembic upgrade head`

### Frontend won't start
- Check node_modules: `npm install`
- Check .env.local exists

### Google Login fails
- Verify GOOGLE_CLIENT_ID matches in both .env files
- Check redirect URIs in Google Cloud Console
- Ensure email matches workspace domain

### KYC pipeline not running
- Check Celery worker running
- Verify GOOGLE_API_KEY and TAVILY_API_KEY set
- Check Redis running: `docker ps`

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

Tests use SQLite in-memory database (no Docker needed).