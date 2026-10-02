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

    # 1. Entry Perusahaan Target (Company Search)
    print("\n[STEP 1] Entry Target Company (Pencarian Perusahaan: 'OCBC')...")
    r = requests.get(f"{BASE_URL}/api/prospecting/companies/search", headers=headers, params={"q": "OCBC"})
    print(f"Status: {r.status_code}")
    company_data = r.json()
    companies = company_data.get("companies") or company_data.get("results") or []
    print(f"Ditemukan {len(companies)} kandidat perusahaan untuk 'OCBC'")
    for c in companies[:3]:
        print(f" - {c.get('name')} | Domain: {c.get('domain')} | Lokasi: {c.get('country')}")
    assert len(companies) > 0, "Pencarian perusahaan OCBC kosong!"

    target_company = companies[0]
    target_company_name = target_company.get("name")
    target_domain = target_company.get("domain")
    print(f"Target terpilih: {target_company_name} ({target_domain})")

    # Uji juga pencarian 'Ganesha'
    print("\n[STEP 1b] Entry Target Company (Pencarian Perusahaan: 'Ganesha')...")
    r_ganesha = requests.get(f"{BASE_URL}/api/prospecting/companies/search", headers=headers, params={"q": "Ganesha"})
    ganesha_data = r_ganesha.json()
    ganesha_companies = ganesha_data.get("companies") or ganesha_data.get("results") or []
    print(f"Ditemukan {len(ganesha_companies)} kandidat perusahaan untuk 'Ganesha'")
    for c in ganesha_companies[:3]:
        print(f" - {c.get('name')} | Domain: {c.get('domain')}")
    assert len(ganesha_companies) > 0, "Pencarian perusahaan Ganesha kosong!"

    # 2. Filter & Ambil Kandidat Orang (Person Search)
    print(f"\n[STEP 2] Filter & Pencarian Kontak Karyawan di {target_company_name}...")
    search_payload = {
        "company_name": target_company_name,
        "company_domain": target_domain,
        "job_titles": ["Director", "Manager", "Head", "VP"],
        "seniority": "vp_director",
        "page": 0,
        "size": 10
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/lusha/search", headers=headers, json=search_payload)
    print(f"Status: {r.status_code}")
    search_res = r.json()
    contacts = search_res.get("contacts", [])
    total_contacts = search_res.get("total", len(contacts))
    print(f"Ditemukan total {total_contacts} kontak karyawan Lusha (halaman 1: {len(contacts)} orang):")
    for idx, c in enumerate(contacts[:5], 1):
        name = c.get("name") or f"{c.get('first_name', '')} {c.get('last_name', '')}".strip()
        print(f" {idx}. {name} - {c.get('job_title')} (ID: {c.get('id')}) | Saved: {c.get('is_saved_in_directory')}")
    assert len(contacts) > 0, "Pencarian kontak karyawan tidak mengembalikan hasil!"

    chosen_contact = contacts[0]
    chosen_id = chosen_contact.get("id")
    chosen_name = chosen_contact.get("name")
    print(f"\nKandidat terpilih untuk selective reveal & save: {chosen_name} (ID: {chosen_id})")

    # 3. Selective Credit Reveal (Enrichment)
    print(f"\n[STEP 3] Selective Reveal Data Kontak ({chosen_name})...")
    enrich_payload = {
        "contact_id": chosen_id,
        "reveal": ["emails", "phones"]
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/lusha/enrich", headers=headers, json=enrich_payload)
    print(f"Status: {r.status_code}")
    enrich_res = r.json()
    enriched_items = enrich_res.get("contacts", [])
    assert len(enriched_items) > 0, "Hasil enrich kosong!"
    enriched_contact = enriched_items[0]
    unmasked_emails = enriched_contact.get("emails", [])
    unmasked_phones = enriched_contact.get("phones", [])
    print(f"Revealed Emails: {unmasked_emails}")
    print(f"Revealed Phones: {unmasked_phones}")
    assert r.status_code == 200, f"Enrich failed: {r.text}"

    # 4. Masuk ke Stakeholder Directory (Local Upsert)
    print(f"\n[STEP 4] Menyimpan {chosen_name} ke Stakeholder Directory Lokal...")
    contact_email = unmasked_emails[0] if unmasked_emails else f"{chosen_name.lower().replace(' ', '.')}@example.com"
    contact_phone = unmasked_phones[0] if unmasked_phones else "+62812345678"
    save_payload = {
        "company_name": target_company_name,
        "company_domain": target_domain,
        "contacts": [
            {
                "name": chosen_name,
                "job_title": chosen_contact.get("job_title") or "Manager",
                "email": contact_email,
                "phone": contact_phone
            }
        ]
    }
    r = requests.post(f"{BASE_URL}/api/prospecting/save-to-stakeholders", headers=headers, json=save_payload)
    print(f"Status: {r.status_code}")
    saved_res = r.json()
    print(f"Save Response: {saved_res}")
    assert r.status_code == 200, f"Save stakeholder failed: {r.text}"

    # Verifikasi langsung ke database PostgreSQL
    db = SessionLocal()
    stk = db.query(CompanyContact).filter(CompanyContact.name.ilike(chosen_name.strip())).first()
    assert stk is not None, "Stakeholder tidak ditemukan di database PostgreSQL!"
    print(f"DB Verification: Stakeholder {stk.name} ({stk.job_title}) tersimpan valid di company_contacts.")
    db.close()

    # 5. Ekspor ke Excel (4-Kolom)
    print("\n[STEP 5] Ekspor Kontak ke Spreadsheet Excel 4 Kolom...")
    export_payload = {
        "company_name": target_company_name,
        "contacts": [
            {
                "name": chosen_name,
                "job_title": chosen_contact.get("job_title") or "Manager",
                "email": contact_email,
                "phone": contact_phone
            },
            {
                "name": contacts[1].get("name") if len(contacts) > 1 else "Kandidat Kedua",
                "job_title": contacts[1].get("job_title") if len(contacts) > 1 else "Lead IT",
                "email": "kandidat2@bankocbc.com",
                "phone": "+62811987654"
            }
        ]
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

    row1 = [cell.value for cell in ws[5]]
    print(f"Baris Data Kontak 1 (Row 5): {row1}")
    assert row1[1] == chosen_name, f"Nama di Excel tidak cocok! Diharapkan {chosen_name}, didapat {row1[1]}"
    assert row1[3] == contact_email, f"Email di Excel tidak cocok! Diharapkan {contact_email}, didapat {row1[3]}"

    print("\nData Baris Excel:")
    for row_idx in range(4, ws.max_row + 1):
        row_vals = [ws.cell(row=row_idx, column=c).value for c in range(1, 6)]
        print(f" Row {row_idx}: {row_vals}")

    print("\n" + "=" * 60)
    print("SUCCESS: SEMUA FLOW AGENTIC E2E LUSHA INTEGRATION VALID!")
    print("=" * 60)

if __name__ == "__main__":
    main()
