# 🚀 Magna Opportunity Intelligence Platform (MOIP)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Python Version](https://img.shields.io/badge/python-3.12%2B-blue)](https://www.python.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![Google Cloud Run](https://img.shields.io/badge/GCP-Cloud%20Run-4285F4)](https://cloud.google.com/run)
[![Gemma 4](https://img.shields.io/badge/AI-Gemma%204%20MaaS-8E44AD)](https://ai.google.dev/)

An enterprise presales intelligence and opportunity management platform built for **PT Smartnet Magna Global**. MOIP automates client Know-Your-Customer (KYC) research by combining real-time web intelligence with Retrieval-Augmented Generation (RAG) against Smartnet Magna's internal solution catalog, powered by Google's **Gemma 4** (`gemma-4-26b-a4b-it`) and Gemini AI models.

---

## 🌐 Live Deployed Application

* 🚀 **Frontend Web Application:** [https://moip-frontend-1030572383460.asia-southeast2.run.app](https://moip-frontend-1030572383460.asia-southeast2.run.app)
* ⚡ **Backend REST API:** [https://moip-backend-1030572383460.asia-southeast2.run.app](https://moip-backend-1030572383460.asia-southeast2.run.app)
* 💚 **API Health Status:** [https://moip-backend-1030572383460.asia-southeast2.run.app/api/health](https://moip-backend-1030572383460.asia-southeast2.run.app/api/health)
* 📖 **Interactive API Docs (Swagger):** [https://moip-backend-1030572383460.asia-southeast2.run.app/docs](https://moip-backend-1030572383460.asia-southeast2.run.app/docs)

---

## 🌟 Key Features

* 🤖 **Automated AI KYC Research Engine:** Generates comprehensive company intelligence in < 5 minutes by crawling official websites, news, and search data with search grounding.
* 🎯 **Target Persona Intelligence Playbook:** Generates custom discovery questioning strategies, strategic concerns, value propositions, and objection handling tailored by target seniority (C-Level, Director, Manager, Staff) and department (IT, Data & AI, Security, Finance, Operations, Business).
* 📁 **Opportunity Resources & Document Hub:** Centralized document repository supporting Google Drive integration, labels/tagging (MoM, Solution Brief, Proposal), and fast asset preview.
* 🌐 **Bilingual Interface (ID/EN):** Instant one-click locale toggle between Indonesian and English without page reload.
* 📚 **RAG-Backed Solution Matching:** Integrates vector store to match customer pain points directly with internal Smartnet Magna solution briefs and Google Cloud products.
* 🔄 **KYC Versioning & Editor:** Tracks immutable report revisions (`v1` Auto-generated, `v2` Regenerated, `v3+` Engineer-edited) with full diff support.
* 📊 **Executive Dashboard & Pipeline Monitoring:** Role-based metrics, Kanban & Table view toggle, 30-day conversion trends, presales workload filters, and revenue pipeline analytics.
* 📅 **Meeting Manager & Calendar Sync:** Multi-meeting scheduling, automated Google Calendar event sync, and notification reminders.
* 🔒 **Role-Based Access Control (RBAC):** Tailored views and capabilities for Super Admin, Admin, Manager, Presales Engineer, and Lead Gen.
* 📝 **Audit Logging & System Security:** Comprehensive audit logs tracking every entity creation, modification, and state transition.

---

## 🏗️ System Architecture

```
                                    +------------------------------+
                                    |    Next.js 15 Frontend UI    |
                                    |     (App Router + Tailwind)  |
                                    +--------------+---------------+
                                                   |
                                                   v
                                    +------------------------------+
                                    |     FastAPI REST Backend     |
                                    +-------+--------------+-------+
                                            |              |
                    +-----------------------+              +-----------------------+
                    |                                                              |
                    v                                                              v
+-----------------------+                                       +-----------------------+
|  PostgreSQL Database  |                                       |   Redis Task Broker   |
| (Cloud SQL / Audit Log)|                                      +-----------+-----------+
+-----------------------+                                                   |
                                                                            v
                                                                +-----------------------+
                                                                |  Celery KYC Worker    |
                                                                +-----------+-----------+
                                                                            |
                                                    +-----------------------+-----------------------+
                                                    |                                               |
                                                    v                                               v
                                        +-----------------------+                       +-----------------------+
                                        |  ChromaDB Vector RAG  |                       |  Gemma 4 MaaS / AI    |
                                        | (Smartnet Solutions)  |                       | (Vertex AI / Gemini)  |
                                        +-----------------------+                       +-----------------------+
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Axios |
| **Backend API** | FastAPI (Python 3.12), Pydantic v2, SQLAlchemy, Alembic |
| **Database** | PostgreSQL 15 (Cloud SQL) for core relational data & Audit Logs |
| **Task Queue** | Celery + Redis for async KYC background worker jobs |
| **Vector DB & RAG** | ChromaDB + Sentence Transformers + Smartnet PDF Knowledge Base |
| **AI Models** | Google Gemma 4 (`gemma-4-26b-a4b-it`) & Gemini Enterprise API |
| **Cloud Hosting** | Google Cloud Run (`asia-southeast2` Jakarta), Artifact Registry |

---

## 🔐 Development Credentials (Plaintext Login)

For evaluation and testing, MOIP supports **Development Plaintext Login** alongside Google Workspace OAuth:

| Username | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| `admin` | `P@ssw0rd` | Admin | Full Access + User Management |
| `superadmin` | `P@ssw0rd` | Superadmin | Complete System Control |
| `lead_gen` | `123456` | Lead Generation (LGO) | Opportunity Creation & Management |
| `managerial` | `123456` | Manager | Dashboard Analytics & Revenue Monitoring |
| `engineer` | `123456` | Presales Engineer | View/Edit KYC, Meetings & Status Workflow |

---

## ⚡ Quickstart Guide

### Option 1: Docker Compose (Recommended)

1. **Clone Repository:**
   ```bash
   git clone https://github.com/Xedonedron/magna-opportunity-intelligence-platform.git
   cd magna-opportunity-intelligence-platform
   ```

2. **Setup Environment Variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.local.example frontend/.env.local
   ```

3. **Start All Services:**
   ```bash
   docker-compose up -d
   ```
   * **Frontend Web App:** `http://localhost:3009`
   * **Backend REST API:** `http://localhost:8009`
   * **Interactive Swagger Docs:** `http://localhost:8009/docs`

---

### Option 2: Local Development Setup

1. **Start Database & Redis:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Backend API Setup:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload --port 8000
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Celery Worker Setup:**
   ```bash
   cd backend
   celery -A app.core.celery_app worker --loglevel=info
   ```

---

## 🚀 Google Cloud Run Deployment

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

---

## 👥 Team Members

* **Nixon Hutahaean** ([@xedonedron](https://github.com/Xedonedron))
* **Ayup Panjaitan Wicaksana** ([@apanjaitanw](https://github.com/apanjaitanw))

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
