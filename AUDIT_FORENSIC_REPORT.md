# 🔍 LAPORAN AUDIT FORENSIK CODEBASE — MOIP
## Magna Opportunity Intelligence Platform
### Tanggal: 3 Oktober 2026 | Auditor: Claude Opus (Hermes Agent)

---

## RINGKASAN EKSEKUTIF

Audit menemukan **23 temuan** yang terdiri dari:
- 🔴 **6 KRITIKAL** — Dummy fallback yang masuk ke production data
- 🟠 **7 HIGH** — Kalkulasi kredit salah / kelemahan arsitektur
- 🟡 **6 MEDIUM** — Hardcoded defaults yang bisa menyesatkan
- 🔵 **4 LOW** — Placeholder/TODO di service yang belum terimplementasi

---

## BAGIAN 1: DUMMY FALLBACK KRITIKAL (🔴)

### TEMUAN-1: Nomor Telepon Dummy `+628****3344` di E2E Test
**File:** `backend/tests/test_e2e_live_lusha.py`
**Baris:** 118, 127, 255

```python
# Baris 118:
"phone": unmasked_phone or "+628****3344"

# Baris 127 (fallback ketika enrichment tidak mengembalikan data):
"phone": "+628****3344"

# Baris 255 (Direct Candidate Contact hardcoded):
"phone": "+628****3344",
```

**Dampak:** INI ADALAH BUG UTAMA YANG DILAPORKAN USER. Ketika Lusha API mengembalikan result kosong (empty phones array), SEMUA kontak mendapat nomor telepon dummy yang sama: `+628****3344`. Ini menyebabkan Nixon Hutahaean dan Devi Lestari memiliki nomor identik di production. Data palsu ini masuk ke CompanyContact, Opportunity, dan Stakeholder Directory.

**Rekomendasi:**
```python
# GANTI semua fallback "+628****3344" menjadi None
"phone": unmasked_phone or None

# Dan baris 127:
"phone": unmasked_phone  # Biarkan None jika kosong
```
**Prinsip:** Jika Lusha API tidak mengembalikan phone, simpan `None` — JANGAN fabricate nomor palsu.

---

### TEMUAN-2: Email Dummy Dinamis Fabricated di E2E Test
**File:** `backend/tests/test_e2e_live_lusha.py`
**Baris:** 117, 126

```python
# Baris 117:
"email": unmasked_email or f"{c_name.lower().replace(' ', '.')}@magnaglobal.id",

# Baris 126 (fallback total):
"email": f"{c_name.lower().replace(' ', '.')}@magnaglobal.id",
```

**Dampak:** Ketika Lusha API tidak mengembalikan email (or return `None`), script menghasilkan email palsu seperti `nixon.hutahaean@magnaglobal.id` atau `devi.lestari@magnaglobal.id`. Email fabricated ini MASUK ke database sebagai data "terverifikasi Lusha" padahal sama sekali bukan dari Lusha. Data ini kemudian tampil di Opportunity, dossier customer_needs, dan export Excel — sangat menyesatkan.

**Rekomendasi:**
```python
"email": unmasked_email or None
```

---

### TEMUAN-3: `credits_charged` Di-hardcode di API Layer (Bukan dari Lusha Response)
**File:** `backend/app/api/prospecting.py`
**Baris:** 344, 388-389

```python
# Baris 344 (single contact enrich):
credits_charged=len(request.reveal) if request.reveal else 2,

# Baris 388-389 (batch enrich):
reveal_multiplier = len(request.reveal) if request.reveal else 2
credits_charged = len(contact_ids) * reveal_multiplier
```

**Dampak:** `credits_charged` yang dikembalikan ke frontend BUKAN angka real dari Lusha. Ini dihitung secara naif: "jumlah field reveal × jumlah kontak". Padahal Lusha v3 API sudah mengembalikan `billing.creditsCharged` di response enrich. LushaService.enrich_contacts() sudah extract nilai ini (baris 396), tapi API layer **MENGABAIKAN** nilai asli dan mengganti dengan kalkulasi sendiri!

Contoh kasus real:
- Kontak sudah pernah di-reveal sebelumnya → Lusha charge 0 kredit → tapi API tetap report "2 credits charged"
- Phone cost 5 credits bukan 1 → Lusha charge 5+1=6 → tapi API report "2 credits charged"

**Rekomendasi:**
```python
# Baris 344 — gunakan actual credits dari Lusha:
credits_charged=res.get("credits_charged", 0),

# Baris 388-389 — aggregate dari batch results:
total_credits = sum(item.get("credits_charged", 0) for item in results)
# ...
credits_charged=total_credits,
```

---

### TEMUAN-4: Job Title Fallback `"Stakeholder"` Tanpa Logging
**File:** `backend/app/services/lusha_service.py`
**Baris:** 255, 264

```python
# Baris 255:
job_title_str = job_title_raw.get("title") or "Stakeholder"

# Baris 264:
job_title_str = "Stakeholder"
```

**Dan di file lain:**
- `backend/app/services/prospecting_service.py` baris 411: `job_title=req.contact.job_title or "Stakeholder"`
- `backend/app/api/prospecting.py` baris 468: `job_title=c.job_title or "Stakeholder"`

**Dampak:** Ketika Lusha tidak mengembalikan job title (jobTitle null/undefined), kontak disimpan dengan job title generic "Stakeholder". Ini membuat pillar detection (detect_pillar_from_titles) tidak bisa bekerja — dan fallback ke "security" (lihat TEMUAN-8). Kontak tanpa job title tampak seolah-olah memiliki jabatan "Stakeholder" yang sebenarnya bukan jabatan real.

**Rekomendasi:**
```python
job_title_str = job_title_raw.get("title") or None  # Biarkan null
# Atau minimal:
job_title_str = job_title_raw.get("title") or "Tidak Diketahui"
```
Dan tambahkan logging: `logger.warning(f"Contact {full_name_calc} has no job title from Lusha")`

---

### TEMUAN-5: Nama Kontak Fallback `"Unnamed"`
**File:** `backend/app/services/lusha_service.py`
**Baris:** 268

```python
full_name_calc = item.get("fullName") or f"{item.get('firstName', '')} {item.get('lastName', '')}".strip() or "Unnamed"
```

**Dampak:** Kontak tanpa nama dari Lusha akan disimpan sebagai "Unnamed" di database. Record ini kemudian bisa masuk ke Opportunity contacts JSON, dossier, dan Excel export.

**Rekomendasi:** Skip kontak tanpa nama — jangan masukkan ke contacts_list:
```python
if not full_name_calc or full_name_calc == "Unnamed":
    logger.warning(f"Skipping contact without name: id={item.get('id')}")
    continue
```

---

### TEMUAN-6: User Fallback Otomatis Tanpa Auth (Security Risk)
**File:** `backend/app/api/prospecting.py`
**Baris:** 72-88

```python
# Baris 72-75: Fallback to first active user
dev_user = db.query(User).filter(User.is_active == True).first()
if dev_user:
    return dev_user

# Baris 78-88: Auto-provision default user
default_user = User(
    email="consultant@magnaglobal.id",
    full_name="Magna Solution Consultant",
    role="admin",
    ...
)
```

**Dampak:** Di production, jika JWT gagal decode atau expired, system **diam-diam fallback** ke user aktif pertama di database. Ini adalah CELAH KEAMANAN SERIUS — siapapun tanpa token valid bisa mengakses Lusha API, consume credits, dan create opportunities. Lebih buruk: jika tidak ada user sama sekali, system auto-create user admin!

**Rekomendasi:** Nonaktifkan fallback di production:
```python
if settings.ENVIRONMENT == "production":
    raise HTTPException(status_code=401, detail="Token tidak valid atau expired.")
# Fallback hanya di development
```

---

## BAGIAN 2: ANOMALI KALKULASI KREDIT (🟠)

### TEMUAN-7: Default Kredit Email=1, Phone=5 Sebelum canReveal Override
**File:** `backend/app/services/lusha_service.py`
**Baris:** 286-287

```python
email_credits = 1 if has_email else 0
phone_credits = 5 if has_phone else 0
```

**Dampak:** Angka default 1 (email) dan 5 (phone) di-hardcode sebagai asumsi awal. Meskipun selanjutnya di baris 288-294 ada loop yang mengoverride dari `canReveal`, logika ini HANYA bekerja jika `canReveal` array terisi. Jika Lusha API mengembalikan `has: ["email", "phones"]` tapi `canReveal: []` (yang terjadi di beberapa plan), maka default hardcoded 1/5 yang digunakan — TANPA validasi apakah angka tersebut akurat untuk plan user saat itu.

**Rekomendasi:**
```python
# Default ke None, bukan angka asumsi
email_credits = None
phone_credits = None
for cr in can_reveal_raw:
    fld = str(cr.get("field", "")).lower()
    c_val = cr.get("credits", None)
    if "email" in fld:
        email_credits = c_val
    elif "phone" in fld:
        phone_credits = c_val
# Jika masih None setelah loop, tandai sebagai "unknown"
if email_credits is None and has_email:
    email_credits = -1  # Unknown, perlu di-resolve
```

---

### TEMUAN-8: `credits_charged` Tidak Per-Kontak di Batch Enrich
**File:** `backend/app/services/lusha_service.py`
**Baris:** 396, 418

```python
billing = data.get("billing", {}) or {}
credits_charged = billing.get("creditsCharged", 0)
# ...
enriched.append({
    ...
    "credits_charged": credits_charged,  # TOTAL untuk SEMUA kontak
})
```

**Dampak:** `credits_charged` dari `billing.creditsCharged` adalah TOTAL kredit untuk SELURUH batch, bukan per-kontak. Tapi di loop `for item in results:`, setiap kontak diberi `credits_charged` yang sama = total batch. Jadi jika batch 3 kontak cost 18 credits total, setiap kontak dilaporkan "18 credits" — total jadi 54 credits yang salah.

**Rekomendasi:**
```python
# Simpan total terpisah
total_credits = billing.get("creditsCharged", 0)
per_contact = total_credits / max(len(results), 1)
# Atau kembalikan total_credits di level batch, bukan per-item
```

---

### TEMUAN-9: Test Assert `credits_charged == 1` Yang Salah
**File:** `backend/tests/test_prospecting.py`
**Baris:** 458

```python
assert data["credits_charged"] == 1
```

**Konteks:** Test `test_enrich_contacts_selective` melakukan enrich 1 kontak dengan `reveal: ["emails"]` saja. Test mengassert bahwa `credits_charged == 1`, tapi ini bukan karena Lusha mengembalikan 1 — ini karena kalkulasi naif di API layer: `len(contact_ids) * len(reveal) = 1 * 1 = 1`.

**Dampak:** Test memberi false confidence bahwa kalkulasi kredit benar, padahal test sebenarnya memvalidasi formula yang salah.

**Rekomendasi:** Mock harus menyertakan `credits_charged` dari response Lusha, dan assert harus memvalidasi nilai dari Lusha response, bukan dari kalkulasi API layer.

---

### TEMUAN-10: Deteksi Pilar Default ke "security" Tanpa Signal
**File:** `backend/app/services/prospecting_service.py`
**Baris:** 507-508, 544-545

```python
# Baris 507-508:
if not titles:
    return "security"

# Baris 544-545:
if scores[best_pillar] == 0:
    return "security"
```

**Dampak:** Jika semua kontak tidak punya job title (atau semuanya "Stakeholder" dari TEMUAN-4), maka opportunity otomatis di-tag ke pilar "security" — Cybersecurity Suite. Ini menyesatkan karena bukan keputusan berdasarkan data, melainkan default arbitrer.

**Rekomendasi:**
```python
if scores[best_pillar] == 0:
    return "general"  # Buat pilar "general" atau kembalikan None
```
Dan di caller, handle None: minta user memilih pilar secara manual.

---

### TEMUAN-11: `employee_count` Hardcoded "500+" di Company Creation
**File:** `backend/app/services/prospecting_service.py`
**Baris:** 374

```python
company = Company(
    ...
    employee_count="500+",
)
```

**Dampak:** Setiap company baru yang dibuat via prospecting convert selalu memiliki employee_count "500+", padahal tidak ada data pendukung. Ini misleading di dashboard dan laporan.

**Rekomendasi:** Set ke `None` atau ambil dari Lusha company data jika tersedia.

---

### TEMUAN-12: `industry` Hardcoded "General Enterprise"
**File:** `backend/app/services/prospecting_service.py`
**Baris:** 372

```python
industry=req.industry or "General Enterprise",
```

**Dampak:** Company tanpa industry data disimpan sebagai "General Enterprise" — kategori yang tidak ada di dunia real.

**Rekomendasi:** Simpan sebagai `None` atau "Belum Diketahui".

---

### TEMUAN-13: Rate Limit Fallback Hardcoded
**File:** `backend/app/services/lusha_service.py`
**Baris:** 112-113

```python
"rate_limit_per_minute": rate_limits.get("minute", {}).get("limit", 40) if rate_limits.get("minute") else 40,
"rate_limit_per_day": rate_limits.get("daily", {}).get("limit", 100) if rate_limits.get("daily") else 100,
```

**Dampak:** Default 40/menit dan 100/hari di-hardcode. Jika plan user berubah, angka ini tidak update dan UI menampilkan limit yang salah.

---

## BAGIAN 3: KELEMAHAN ALUR WORKFLOW (🟡)

### TEMUAN-14: E2E Test Hardcoded "Arif Wibowo" Sebagai Kandidat Palsu
**File:** `backend/tests/test_e2e_live_lusha.py`
**Baris:** 249-257

```python
"candidate_contacts": [
    {
        "name": "Arif Wibowo",
        "job_title": "Head of AI & Machine Learning",
        "department": "Engineering",
        "email": "arif.wibowo@magnaglobal.id",
        "phone": "+628****3344",
        "is_primary": True
    }
],
```

**Dampak:** Step 8 test menggunakan kontak completely fabricated (bukan dari Lusha). Kontak ini masuk ke DB production sebagai data real. Email `arif.wibowo@magnaglobal.id` dan phone `+628****3344` adalah dummy — sama dengan pattern yang menyebabkan bug awal.

**Rekomendasi:** Hilangkan step 8, atau pastikan hanya menggunakan kontak yang sudah di-resolve dari Lusha di step sebelumnya.

---

### TEMUAN-15: Frontend CSV Template Mengandung Data Dummy
**File:** `frontend/src/app/(main)/opportunities/import/page.tsx`

```
"PT Bank Mandiri Sejahtera,Hendra Setiawan (IT Dir),hendra@mandirisejahtera.co.id,08123456789,..."
"PT Toko Retail Nusantara,Dian Kartika (Procurement),dian@tokoretail.com,08198765432,..."
```

**Dampak:** Rendah — ini adalah contoh template CSV. Tapi jika user mengimport tanpa mengedit, data dummy masuk ke production.

**Rekomendasi:** Tambahkan prefix `[CONTOH]` di nama perusahaan, atau validasi reject import jika company name mengandung template text.

---

### TEMUAN-16: `"Data Specialist"` Sebagai Job Title Fallback di E2E
**File:** `backend/tests/test_e2e_live_lusha.py`
**Baris:** 116, 125

```python
"job_title": c.get("job_title") or "Data Specialist",
```

**Dampak:** Jika Lusha tidak mengembalikan job title, kontak disimpan dengan jabatan "Data Specialist" yang palsu.

**Rekomendasi:** Gunakan `None` atau string kosong.

---

### TEMUAN-17: `LushaSearchResponse` Tidak Include `email_credits` dan `phone_credits`
**File:** `backend/app/schemas/prospecting.py`
**Baris:** 43-64 (LushaCandidateContact)

Schema `LushaCandidateContact` tidak memiliki field `email_credits`, `phone_credits`, atau `can_reveal`. Data ini dikirim oleh LushaService.search_contacts() tapi tidak di-validasi oleh schema response.

**Dampak:** Frontend mungkin tidak menerima informasi biaya kredit per-field, sehingga user tidak bisa membuat keputusan "reveal email saja karena phone terlalu mahal (5 credits)".

**Rekomendasi:** Tambahkan ke schema:
```python
class LushaCandidateContact(BaseModel):
    ...
    email_credits: Optional[int] = None
    phone_credits: Optional[int] = None
    can_reveal: Optional[List[Dict[str, Any]]] = None
```

---

### TEMUAN-18: `enrich_contact()` Return `credits_charged: 0` Saat Gagal
**File:** `backend/app/services/lusha_service.py`
**Baris:** 445

```python
"credits_charged": first.get("credits_charged", 0),
```

**Dampak:** Jika batch enrich return 0 results tapi Lusha tetap charge credits (edge case pada API error partial), `credits_charged` dilaporkan 0 padahal credits sudah terpakai. Ini membuat tracking kredit tidak akurat.

---

### TEMUAN-19: Tidak Ada Validasi Duplikasi Sebelum Enrich
**File:** `backend/app/api/prospecting.py` dan `backend/app/services/lusha_service.py`

Tidak ada pengecekan apakah kontak sudah pernah di-enrich sebelumnya. User bisa melakukan enrich yang sama berulang kali — wasting credits. Lusha v3 memang mengembalikan `credits: 0` di `canReveal` untuk kontak yang sudah pernah di-reveal, tapi ini tidak dicek di frontend maupun backend sebelum memanggil enrich API.

**Rekomendasi:** Check `canReveal` credits === 0 sebelum enrich, atau check database apakah kontak sudah punya email/phone yang terisi.

---

## BAGIAN 4: SERVICE BELUM TERIMPLEMENTASI (🔵)

### TEMUAN-20: CalendarService = Log-Only Stub
**File:** `backend/app/services/calendar_service.py` Baris 47
```python
# TODO: Implement actual Google Calendar API integration
```

### TEMUAN-21: EmailService = Log-Only Stub
**File:** `backend/app/services/email_service.py` Baris 45
```python
# TODO: Implement actual email sending via Gmail API
```

### TEMUAN-22: PersonaService Fallback Stub
**File:** `backend/app/services/persona_service.py`
```python
# Fallback stub if no LLM key configured
```

### TEMUAN-23: Auth Dummy Login Comment
**File:** `backend/app/api/auth.py`
```python
"""Login with username and password (dummy auth for development)."""
```

**Dampak (TEMUAN 20-23):** Service-service ini masih stub/placeholder. Meeting calendar events hanya di-log, email notifications hanya di-log. Tidak critical untuk alur Lusha→Stakeholder→Opportunity, tapi penting untuk production readiness.

---

## MATRIKS PRIORITAS PERBAIKAN

| # | Severity | File | Baris | Masalah | Effort |
|---|----------|------|-------|---------|--------|
| 1 | 🔴 CRITICAL | test_e2e_live_lusha.py | 118,127,255 | Phone dummy "+628****3344" | 10 min |
| 2 | 🔴 CRITICAL | test_e2e_live_lusha.py | 117,126 | Email dummy fabricated | 10 min |
| 3 | 🔴 CRITICAL | api/prospecting.py | 344,388-389 | credits_charged hardcoded | 30 min |
| 6 | 🔴 CRITICAL | api/prospecting.py | 72-88 | Auth fallback tanpa token | 20 min |
| 4 | 🟠 HIGH | lusha_service.py | 255,264 | "Stakeholder" job title fallback | 15 min |
| 5 | 🟠 HIGH | lusha_service.py | 268 | "Unnamed" nama fallback | 10 min |
| 7 | 🟠 HIGH | lusha_service.py | 286-287 | Default credit 1/5 | 20 min |
| 8 | 🟠 HIGH | lusha_service.py | 396,418 | credits_charged total=per-item | 20 min |
| 9 | 🟠 HIGH | test_prospecting.py | 458 | Test assert credit salah | 10 min |
| 10 | 🟠 HIGH | prospecting_service.py | 507,544 | Default pilar "security" | 15 min |
| 11 | 🟠 HIGH | prospecting_service.py | 374 | employee_count "500+" | 5 min |
| 14 | 🟡 MED | test_e2e_live_lusha.py | 249-257 | Fabricated "Arif Wibowo" | 10 min |
| 15 | 🟡 MED | import/page.tsx | — | CSV template dummy | 10 min |
| 16 | 🟡 MED | test_e2e_live_lusha.py | 116,125 | "Data Specialist" fallback | 5 min |
| 17 | 🟡 MED | schemas/prospecting.py | 43-64 | Missing credit fields | 15 min |
| 12 | 🟡 MED | prospecting_service.py | 372 | "General Enterprise" | 5 min |
| 13 | 🟡 MED | lusha_service.py | 112-113 | Rate limit hardcoded | 10 min |
| 19 | 🟡 MED | api/prospecting.py | — | No duplicate enrich check | 30 min |
| 18 | 🟡 MED | lusha_service.py | 445 | credits_charged saat gagal | 10 min |
| 20-23 | 🔵 LOW | calendar/email service | — | Service stubs | 4+ hrs |

---

## DIAGRAM ALUR KELEMAHAN

```
LUSHA PROSPECTING API → search_contacts()
    ↓
    [TEMUAN-4] job_title = "Stakeholder" (dummy)
    [TEMUAN-5] full_name = "Unnamed" (dummy)
    [TEMUAN-7] email_credits=1, phone_credits=5 (hardcoded default)
    ↓
    enrich_contacts() → LUSHA ENRICH API
    ↓
    [TEMUAN-8] credits_charged = TOTAL for ALL, not per-contact
    ↓
API Layer (prospecting.py)
    [TEMUAN-3] credits_charged = len(reveal) * count ← IGNORES real billing
    [TEMUAN-6] Auth fallback → any request goes through
    ↓
E2E Test Script
    [TEMUAN-1] phone fallback → "+628****3344" for ALL contacts
    [TEMUAN-2] email fallback → fabricated "@magnaglobal.id"
    [TEMUAN-14] hardcoded fake "Arif Wibowo" contact
    [TEMUAN-16] "Data Specialist" fake job title
    ↓
SAVE TO STAKEHOLDERS → CompanyContact DB
    → CORRUPTED DATA enters production
    ↓
CONVERT TO OPPORTUNITY
    [TEMUAN-10] pillar = "security" (blind default)
    [TEMUAN-11] employee_count = "500+"
    [TEMUAN-12] industry = "General Enterprise"
    ↓
    OPPORTUNITY CREATED WITH DUMMY DATA ❌
```

---

## REKOMENDASI ARSITEKTURAL

1. **Prinsip "No Data is Better Than Fake Data"**: Setiap fallback dummy harus diganti dengan `None`. Frontend harus handle null state dengan UI "Data belum tersedia" bukan menampilkan data palsu.

2. **Credits Tracking Harus End-to-End**: Buat tabel `lusha_credit_transactions` yang mencatat setiap enrich call beserta `billing.creditsCharged` actual dari Lusha response. Jangan pernah kalkulasi sendiri.

3. **E2E Test Harus Idempotent dan Honest**: E2E test harus punya mode `--dry-run` yang SKIP actual Lusha API calls, dan mode `--live` yang menggunakan data real. Jangan campur dummy data di test yang mengklaim E2E.

4. **Production Auth Guard**: Hapus auth fallback di production. Gunakan environment variable `ALLOW_DEV_AUTH_FALLBACK=true` yang hanya di-set di `.env.development`.

5. **Schema Validation Ketat**: Tambahkan validator di Pydantic schema yang reject kontak tanpa nama, atau phone format `+628****XXXX` (yang jelas masked/dummy).
