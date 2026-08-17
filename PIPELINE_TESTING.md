# MOIP - API Pipeline Testing Guide

This document describes how to test the core flows of the Magna Opportunity Intelligence Platform (MOIP) directly using the backend API endpoints.

---

## Prerequisites
Ensure the containers are running and accessible at `http://localhost:8000`.

---

## 1. Authentication (Login)
We will authenticate using the static developer user credentials.

### Request
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "engineer",
    "password": "123456"
  }'
```

### Expected Response
```json
{
  "access_token": "ey...",
  "token_type": "bearer",
  "user": {
    "email": "engineer@magnaglobal.id",
    "full_name": "engineer",
    "role": "engineer",
    "id": "e963b6fb-cfa2-46be-8700-1c0f4f9f75a6",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-07-30T15:30:00Z"
  }
}
```

Save the `access_token` returned from the login endpoint. We will refer to it as `YOUR_ACCESS_TOKEN`.

---

## 2. Create a New Opportunity
We will create a new opportunity. This action automatically schedules a Celery worker to run the AI KYC analysis in the background.

We will use **PT. Semen Baturaja Tbk** as our testing subject.

### Request
```bash
curl -X POST http://localhost:8000/api/opportunities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "company_name": "PT. Semen Baturaja Tbk",
    "website": "https://semenbaturaja.co.id/",
    "email": "info@semenbaturaja.co.id",
    "phone": "+62 711 511261",
    "industry": "Manufacturing",
    "product": "Data Analytics Platform",
    "customer_needs": "Visualisasi dashboard sebelumnya menggunakan Tableau tp sudah tidak dilanjutkan lagi 2 tahun terakhir ini karena tim IT nya kebanyakan di induk perusahaan (semen indonesia) jadi tidak ada yg mengolah datanya. Kondisi saat ini: direksi terkait laporan mintanya data by data yg dikirim di email. Mereka ada ketertarikan dengan Power BI karena holdingnya menggunakan Power BI.",
    "additional_notes": "Fokus pada peluang migrasi ke Power BI atau visualisasi berbasis Google Cloud (Looker) karena mereka terafiliasi with Semen Indonesia.",
    "meeting_schedule": "2026-08-05T10:00:00Z"
  }'
```

### Expected Response
```json
{
  "id": "782cd211-1aef-4573-b26a-939e144a2eb9",
  "company_name": "PT. Semen Baturaja Tbk",
  "contact_name": "Budi Santoso",
  "website": "https://semenbaturaja.co.id/",
  "email": "info@semenbaturaja.co.id",
  "phone": "+62 711 511261",
  "contacts": [
    {
      "name": "Budi Santoso",
      "role": "Head of IT",
      "email": "budi@semenbaturaja.co.id",
      "phone": "+62 812 3456 7890"
    }
  ],
  "industry": "Manufacturing",
  "product": "Data Analytics Platform",
  "customer_needs": "Visualisasi dashboard sebelumnya...",
  "additional_notes": "Fokus pada peluang modernisasi data warehouse...",
  "potential_revenue": 750000000.0,
  "meeting_schedule": "2026-08-05T10:00:00Z",
  "assigned_engineer": "Robi Firmansyah",
  "created_by": "e963b6fb-cfa2-46be-8700-1c0f4f9f75a6",
  "status": "New",
  "created_at": "2026-07-30T16:05:00Z"
}
```

Save the `id` of the opportunity. We will refer to it as `OPPORTUNITY_ID`.

---

## 3. Check Opportunity Status
The AI KYC generation runs in the background. You can poll the opportunity details to check when the status changes from `New` to `KYC Running`, and finally to `Ready Meeting`.

### Request
```bash
curl -X GET http://localhost:8000/api/opportunities/OPPORTUNITY_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Expected Response (While Running)
```json
{
  "id": "OPPORTUNITY_ID",
  "company_name": "PT. Semen Baturaja Tbk",
  "status": "KYC Running",
  "assigned_engineer": null,
  "created_at": "2026-07-30T16:05:00Z"
}
```

### Expected Response (When Complete)
```json
{
  "id": "OPPORTUNITY_ID",
  "company_name": "PT. Semen Baturaja Tbk",
  "status": "Ready Meeting",
  "assigned_engineer": null,
  "created_at": "2026-07-30T16:05:00Z"
}
```

Once the status is `Ready Meeting`, the AI report is compiled and saved.

---

## 4. Retrieve the Generated KYC Report
Now, retrieve the generated KYC report which includes:
- Company overview (founded, key products, location).
- Industry analysis & pain points.
- Suggested use cases (aligned to Smartnet Magna Global's Google Cloud & Looker capabilities).
- Meeting preparation checklist & recommended questions.

### Request
```bash
curl -X GET http://localhost:8000/api/opportunities/OPPORTUNITY_ID/kyc \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Expected Response (AI KYC Report Content)
```json
{
  "id": "893df455-7cf2-4de9-9e8a-81f13fefc1e1",
  "opportunity_id": "OPPORTUNITY_ID",
  "version": 1,
  "status": "completed",
  "source_type": "automatic",
  "executive_summary": "PT. Semen Baturaja Tbk is a leading Indonesian cement manufacturer and subsidiary of SIG (Semen Indonesia Group). Currently, they face a lack of data-driven intelligence due to centralized IT staff at their parent company, resorting to sending manual data reports via email. There is a strong interest in adopting Power BI to align with the holding group's ecosystem, creating a direct opportunity to integrate a Google Cloud-backed Looker or Power BI modern data warehouse solution.",
  "company_overview": {
    "name": "PT. Semen Baturaja Tbk",
    "description": "Cement production and distribution company based in South Sumatra, Indonesia.",
    "founded": "1974",
    "size": "500-1000 employees",
    "headquarters": "Palembang, Indonesia",
    "key_products": ["Cement", "Clinker", "Concrete"]
  },
  "industry_analysis": "The cement manufacturing industry is undergoing digitisation and optimization of supply chain logistics. Centralized IT structures in large holding groups like Semen Indonesia often delay localized BI implementations, creating regional reporting bottlenecks.",
  "business_model": "PT. Semen Baturaja Tbk operates as a bulk and bag cement provider for infrastructure development and retail markets, generating revenue via direct sales and distribution networks.",
  "company_location": "Headquarters in Palembang, South Sumatra, with major cement factories in Baturaja and Panjang.",
  "customer_need_summary": "Migrating manual email-based reports to an interactive, automated dashboard. While they show interest in Power BI due to SIG holding, they require architecture design, database extraction, and visualization development.",
  "potential_pain_points": [
    "No localized IT team to manage and compile raw data dashboards.",
    "Delays in executive decision making due to email-based static reporting.",
    "Data silos between regional subsidiaries and holding parent company."
  ],
  "use_cases": [
    {
      "title": "Google Cloud Looker & BigQuery Modern Data Warehouse",
      "description": "Migrate regional sales and distribution logs to Google Cloud BigQuery, connecting Looker to serve as an automated, interactive analytical platform.",
      "problem_solved": "Eliminates manually sending email reports by providing real-time data access.",
      "how_it_works": "Establish ETL pipeline from Semen Baturaja databases to BigQuery, build analytical models, and publish reports in Looker.",
      "business_impact": "Reduces report generation time by 90% and provides direktur-level analytics immediately.",
      "google_products": ["BigQuery", "Looker", "Vertex AI"],
      "smartnet_solutions": ["Data Analytics & AI (BigQuery, Looker, Vertex AI)"],
      "impact_level": "High"
    }
  ],
  "meeting_objectives": [
    "Identify current source databases for reporting data.",
    "Determine holding SIG's policies on sharing/connecting Power BI with Google Cloud datasets.",
    "Present a proposal for a Looker or hybrid Power BI dashboard on GCP."
  ],
  "recommended_questions": [
    "Who is responsible for the current data aggregation that gets sent via email?",
    "Where is the source data currently stored? (SQL Server, SAP, Oracle?)",
    "Is there any restriction from Semen Indonesia holding regarding setting up cloud pipelines?"
  ],
  "preparation_checklist": [
    "Prepare Looker and BigQuery architecture presentation.",
    "Review Semen Indonesia Group's existing cloud footprint.",
    "Develop a proof-of-concept template showing cement manufacturing analytics."
  ],
  "references": [
    {
      "title": "PT Semen Baturaja Tbk Official Website",
      "url": "https://semenbaturaja.co.id/",
      "type": "website"
    }
  ],
  "error_message": null,
  "created_at": "2026-07-30T16:05:01Z",
  "completed_at": "2026-07-30T16:07:32Z"
}
```

---

## 5. RAG Chat Assistant Query
You can interact with the RAG Chat AI for any opportunity to ask targeted architecture, solution matching, or presales strategy questions:

### Request
```bash
curl -X POST http://localhost:8000/api/opportunities/OPPORTUNITY_ID/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "message": "Solusi Google Cloud dan Smartnet Magna apa yang paling cocok untuk kebutuhan PT Semen Baturaja?"
  }'
```

---

## 6. Trigger KYC Regeneration
To trigger a new KYC analysis version (e.g., after updating customer needs or context):

### Request
```bash
curl -X POST http://localhost:8000/api/opportunities/OPPORTUNITY_ID/kyc/regenerate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 7. Generate Target Persona Playbook
Generate customized questioning strategies, strategic concerns, and objection handling for specific seniority and department targets:

### Request
```bash
curl -X POST http://localhost:8000/api/opportunities/OPPORTUNITY_ID/personas/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "seniority": "C-Level",
    "department": "IT"
  }'
```

### Expected Response
```json
{
  "id": "persona-uuid",
  "opportunity_id": "OPPORTUNITY_ID",
  "seniority": "C-Level",
  "department": "IT",
  "focus_areas": [
    "Digital Transformation ROI",
    "Data Governance & Modernization",
    "Cloud Security Compliance"
  ],
  "questions": [
    {
      "category": "discovery",
      "question": "Bagaimana strategi modernisasi infrastruktur data Baturaja mendukung efisiensi operasional pabrik?",
      "rationale": "Mengaitkan investasi TI dengan metrik bisnis utama C-level."
    }
  ],
  "value_props": [
    "Smartnet Magna menyediakan arsitektur BigQuery + Looker yang mempercepat pelaporan hingga 60%."
  ],
  "objection_handling": [
    {
      "objection": "Biaya migrasi dan lisensi cloud dipandang terlalu tinggi.",
      "response": "Smartnet Magna menawarkan TCO assessment dan optimasi bertahap untuk menekan OPEX."
    }
  ]
}
```

---

## 8. Manage Opportunity Documents & Resources
Attach and organize references, Minutes of Meeting (MoM), or proposals:

### Request (Add Document)
```bash
curl -X POST http://localhost:8000/api/opportunities/OPPORTUNITY_ID/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "title": "MoM First Discovery Meeting PT Semen Baturaja",
    "url": "https://docs.google.com/document/d/example-doc-id/edit",
    "description": "Catatan rapat perdana dengan Head of IT",
    "labels": ["MoM", "Discovery"]
  }'
```

### Request (List Documents)
```bash
curl -X GET http://localhost:8000/api/opportunities/OPPORTUNITY_ID/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

