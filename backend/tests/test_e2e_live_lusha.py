"""
Script pengujian Agentic End-to-End Lusha Prospecting Integration
Dijalankan di dalam container moip_backend atau melalui network 127.0.0.1:8000
"""
import sys
import json
import requests
from io import BytesIO
import openpyxl

from app.services.auth import create_access_token
from app.models.user import User
from app.models.company_contact import CompanyContact
from app.models.company import Company
from app.models.opportunity import Opportunity, TimelineEvent
from app.core.database import SessionLocal

BASE_URL = "http://127.0.0.1:8000"

def get_auth_token():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "nixon.hutahaean@magnaglobal.id").first()
        if not user:
            raise RuntimeError("User nixon.hutahaean@magnaglobal.id tidak ditemukan di database.")
        token = create_access_token({"sub": str(user.id), "email": user.email, "role": user.role})
        return token
    finally:
        db.close()

def main():
    print("=" * 60)
    print("START: AGENTIC E2E LUSHA PROSPECTING INTEGRATION TEST")
    print("=" * 60)

    token = get_auth_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 0. Check Quota
    print("\n[STEP 0] Checking Lusha Quota...")
    r = requests.get(f"{BASE_URL}/api/prospecting/lusha/usage", headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Quota Data: {r.json()}")
    assert r.status_code == 200, f"Quota failed: {r.text}"

    # 1. Entry Perusahaan Target (Pure Input Nama Perusahaan: 'Smartnet Magna Global')
    print("\n[STEP 1] Entry Target Company (Pencarian Murni Nama: 'Smartnet Magna Global')...")
    r = requests.get(f"{BASE_URL}/api/prospecting/companies/search", headers=headers, params={"q": "Smartnet Magna Global"})
    print(f"Status: {r.status_code}")
    company_data = r.json()
    companies = company_data.get("companies") or company_data.get("results") or []
    print(f"Ditemukan {len(companies)} kandidat perusahaan untuk 'Smartnet Magna Global':")
    for c in companies[:3]:
        print(f" - {c.get('name')} | Domain: {c.get('domain')} | Lokasi: {c.get('country')}")
    assert len(companies) > 0, "Perusahaan 'Smartnet Magna Global' tidak ditemukan di Lusha!"

    target_company = companies[0]
    target_company_name = target_company.get("name")
    target_domain = target_company.get("domain")

    print(f"Target terpilih otomatis dari Lusha: {target_company_name} ({target_domain})")

    # 2. Filter & Ambil Kandidat Orang (Person Search dengan ranah 'data')
    print(f"\n[STEP 2] Filter & Pencarian Kontak Karyawan di {target_company_name} (Ranah Data)...")
    search_payload = {
        "company_name": target_company_name,
        "company_domain": target_domain,
        "job_titles": ["Data", "Data Engineer", "Data Scientist", "Data Analyst", "Analytics", "BI", "Business Intelligence", "AI", "Machine Learning"],
        "job_function": "data",
        "page": 0,
        "size": 25
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/lusha/search", headers=headers, json=search_payload)
    print(f"Status: {r.status_code}")
    search_res = r.json()
    contacts = search_res.get("contacts", [])
    total_contacts = search_res.get("total", len(contacts))
    print(f"Ditemukan total {total_contacts} kontak karyawan Lusha ranah Data (halaman 1: {len(contacts)} orang):")
    for idx, c in enumerate(contacts[:10], 1):
        name = c.get("name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        print(f" {idx}. {name} - {c.get('job_title')} (ID: {c.get('id')}) | Saved: {c.get('is_saved_in_directory')}")
    assert len(contacts) >= 2, f"Diharapkan minimal 2 kontak di ranah data, tetapi ditemukan {len(contacts)}!"

    # Ambil 2 orang kandidat
    chosen_contacts = contacts[:2]
    print(f"\n2 Kandidat terpilih:")
    for i, c in enumerate(chosen_contacts, 1):
        print(f"  {i}. {c.get('name')} - {c.get('job_title')} (ID: {c.get('id')})")

    # 3. Selective Credit Reveal (Enrichment untuk 2 orang)
    print(f"\n[STEP 3] Selective Reveal Data Kontak untuk 2 orang terpilih...")
    enriched_results = []
    for c in chosen_contacts:
        c_id = c.get("id")
        c_name = c.get("name")
        print(f" - Unmasking: {c_name} (ID: {c_id})...")
        enrich_payload = {
            "contact_id": c_id,
            "reveal": ["emails", "phones"]
        }
        r = requests.post(f"{BASE_URL}/api/prospecting/lusha/enrich", headers=headers, json=enrich_payload)
        print(f"   Status: {r.status_code}")
        assert r.status_code == 200, f"Enrich gagal untuk {c_name}: {r.text}"
        res_data = r.json()
        items = res_data.get("contacts", [])
        if items:
            item = items[0]
            unmasked_email = (item.get("emails") or [None])[0]
            unmasked_phone = (item.get("phones") or [None])[0]
            enriched_results.append({
                "id": c_id,
                "name": c_name,
                "job_title": c.get("job_title") or None,
                "email": unmasked_email or None,
                "phone": unmasked_phone or None
            })
            print(f"   Revealed Email: {unmasked_email} | Phone: {unmasked_phone}")
        else:
            enriched_results.append({
                "id": c_id,
                "name": c_name,
                "job_title": c.get("job_title") or None,
                "email": None,
                "phone": None
            })

    # 4. Masuk ke Stakeholder Directory (Local Upsert)
    print(f"\n[STEP 4] Menyimpan 2 kontak ke Stakeholder Directory Lokal ({target_company_name})...")
    save_payload = {
        "company_name": target_company_name,
        "company_domain": target_domain,
        "contacts": enriched_results
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/save-to-stakeholders", headers=headers, json=save_payload)
    print(f"Status: {r.status_code}")
    saved_res = r.json()
    print(f"Save Response: {saved_res}")
    assert r.status_code == 200, f"Save stakeholder failed: {r.text}"

    # Verifikasi langsung ke database PostgreSQL
    db = SessionLocal()
    for er in enriched_results:
        stk = db.query(CompanyContact).filter(CompanyContact.name.ilike(er["name"].strip())).first()
        assert stk is not None, f"Stakeholder {er['name']} tidak ditemukan di database PostgreSQL!"
        print(f"DB Verification: Stakeholder {stk.name} ({stk.job_title}) tersimpan valid di company_contacts.")
    db.close()

    # 5. Ekspor ke Excel (4-Kolom)
    print("\n[STEP 5] Ekspor Kontak ke Spreadsheet Excel 4 Kolom...")
    export_payload = {
        "company_name": target_company_name,
        "contacts": enriched_results
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/export-excel", headers=headers, json=export_payload)
    print(f"Status: {r.status_code}")
    assert r.status_code == 200, f"Export Excel failed: {r.text}"
    assert "spreadsheetml" in r.headers.get("Content-Type", ""), "Response bukan file Excel!"

    wb = openpyxl.load_workbook(BytesIO(r.content))
    ws = wb.active
    assert ws is not None, "Worksheet Excel kosong!"
    print(f"Nama Sheet: {ws.title}")
    
    headers_row = [cell.value for cell in ws[4]]
    print(f"Header Kolom Tabel (Row 4): {headers_row}")
    expected_headers = ["No", "Nama", "Job Title / Jabatan", "Email", "Nomor Telepon"]
    assert headers_row == expected_headers, f"Header tidak sesuai! Diharapkan {expected_headers}, didapat {headers_row}"

    for idx, er in enumerate(enriched_results, start=5):
        row_vals = [cell.value for cell in ws[idx]]
        print(f"Baris Data Kontak (Row {idx}): {row_vals}")
        assert row_vals[1] == er["name"], f"Nama di Excel tidak cocok! Diharapkan {er['name']}, didapat {row_vals[1]}"
        assert row_vals[3] == er["email"], f"Email di Excel tidak cocok! Diharapkan {er['email']}, didapat {row_vals[3]}"

    print("\nData Baris Excel:")
    for row_idx in range(4, ws.max_row + 1):
        row_vals = [ws.cell(row=row_idx, column=c).value for c in range(1, 6)]
        print(f" Row {row_idx}: {row_vals}")

    # 6. Convert Enriched Stakeholders to Outbound Opportunity
    print("\n[STEP 6] Mengonversi Stakeholder Menjadi Outbound Opportunity (Data Analytics Platform)...")
    db = SessionLocal()
    company = db.query(Company).filter(Company.name.ilike(target_company_name.strip())).first()
    assert company is not None, f"Company {target_company_name} tidak ditemukan di database!"
    
    saved_contacts_db = db.query(CompanyContact).filter(CompanyContact.company_id == company.id).all()
    assert len(saved_contacts_db) >= 2, f"Harus ada minimal 2 kontak tersimpan untuk {company.name}!"
    db.close()

    contact_ids = [str(c.id) for c in saved_contacts_db[:2]]
    primary_contact_id = contact_ids[0]

    oppty_payload = {
        "company_id": str(company.id),
        "contact_ids": contact_ids,
        "primary_contact_id": primary_contact_id,
        "solution_title": "Data Analytics Platform",
        "pillar": "data",
        "custom_title": f"[Data Analytics Platform] - {target_company_name} Lakehouse",
        "pain_points": [
            "Data silo antar divisi operasional",
            "Pipeline ETL data lambat dan tidak scalable"
        ],
        "estimated_value": 350000000.0,
        "notes": "Generated from live Lusha prospecting E2E test"
    }

    r = requests.post(f"{BASE_URL}/api/prospecting/convert-to-opportunity", headers=headers, json=oppty_payload)
    print(f"Status: {r.status_code}")
    print(f"Oppty Response: {r.json()}")
    assert r.status_code == 200, f"Convert to opportunity failed: {r.text}"
    oppty_res = r.json()
    assert oppty_res.get("status") == "success"
    oppty_id = oppty_res.get("opportunity_id")
    assert oppty_id is not None, "opportunity_id tidak boleh null"

    # 7. DB & Audit Verification for Created Opportunity
    print("\n[STEP 7] Verifikasi Database & Audit Trail Opportunity...")
    db = SessionLocal()
    created_oppty = db.query(Opportunity).filter(Opportunity.id == oppty_id).first()
    assert created_oppty is not None, f"Opportunity {oppty_id} tidak ditemukan di database!"
    print(f"DB Verification: Opportunity Company '{created_oppty.company_name}' ({created_oppty.product}) tersimpan dengan Status: {created_oppty.status}")
    print(f"Nilai Estimasi: Rp {float(created_oppty.potential_revenue or 0):,.2f}")
    assert float(created_oppty.potential_revenue or 0) == 350000000.0
    assert created_oppty.contacts is not None and len(created_oppty.contacts) == 2

    # Verifikasi format dossier customer_needs
    assert created_oppty.customer_needs is not None
    assert "Data Analytics Platform" in created_oppty.customer_needs
    # Strict negative check: Dilarang memakai syntax LaTeX
    assert "\\rightarrow" not in created_oppty.customer_needs, "Dossier tidak boleh mengandung LaTeX \\rightarrow!"
    assert "$" not in created_oppty.customer_needs, "Dossier tidak boleh mengandung karakter math LaTeX $!"
    print("Dossier Verification: customer_needs tervalidasi bebas dari sintaks LaTeX.")

    # Verifikasi timeline audit event
    timeline_evt = db.query(TimelineEvent).filter(TimelineEvent.opportunity_id == created_oppty.id).first()
    assert timeline_evt is not None, "TimelineEvent tidak tercatat untuk opportunity baru!"
    assert timeline_evt.action in ["Outbound Opportunity Created", "outbound_opportunity_created"]
    print(f"Timeline Verification: Event '{timeline_evt.action}' tercatat oleh actor: {timeline_evt.actor_name}")
    db.close()

    # 8. Direct Outbound Opportunity from Candidate Contacts
    print("\n[STEP 8] Menguji Direct Candidate-to-Oppty (AI/ML Solutions)...")
    direct_payload = {
        "company_name": target_company_name,
        "candidate_contacts": [
            {
                "name": "Arif Wibowo",
                "job_title": "Head of AI & Machine Learning",
                "department": "Engineering",
                "email": None,
                "phone": None,
                "is_primary": True
            }
        ],
        "solution_title": "AI/ML Solutions",
        "pillar": "data",
        "custom_title": f"[AI/ML Solutions] - {target_company_name} Enterprise AI",
        "estimated_value": 500000000.0,
        "notes": "Direct conversion from prospecting candidate contacts"
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/convert-to-opportunity", headers=headers, json=direct_payload)
    print(f"Status: {r.status_code}")
    direct_res = r.json()
    print(f"Direct Oppty Response: {direct_res}")
    assert r.status_code == 200, f"Direct convert failed: {r.text}"
    assert direct_res.get("status") == "success"
    direct_oppty_id = direct_res.get("opportunity_id")

    db = SessionLocal()
    direct_oppty = db.query(Opportunity).filter(Opportunity.id == direct_oppty_id).first()
    assert direct_oppty is not None
    assert direct_oppty.product == "AI/ML Solutions"
    assert "Vertex AI" in direct_oppty.customer_needs
    assert "\\rightarrow" not in direct_oppty.customer_needs
    print(f"Direct Oppty DB Verification: '{direct_oppty.company_name}' ({direct_oppty.product}) tersimpan sukses.")
    db.close()

    print("\n" + "=" * 60)
    print("SUCCESS: SEMUA FLOW AGENTIC E2E LUSHA + OUTBOUND OPPTY VALID!")
    print("=" * 60)

if __name__ == "__main__":
    main()
