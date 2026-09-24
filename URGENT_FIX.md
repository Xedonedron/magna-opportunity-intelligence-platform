# URGENT_FIX.md — Rencana Implementasi Perbaikan Kritis Backend MOIP (1-4)

Tanggal: 2026-09-24  
Status: Planned / Ready for Execution  

Dokumen implementasi perbaikan teknis arsitektur backend MOIP meliputi optimasi database query, LLM settings caching & connection pooling, handling konkurensi/kegagalan Celery, dan pengerasan autentikasi.

---

## 1. Database Query & Deduplication Optimization (Fix N+1 & Full-Table Scans) ✅ DONE

### Masalah
* Pengecekan root domain pada `companies.py`, `opportunities.py`, dan `tasks.py` memuat seluruh record `Company` ke memory Python (`db.query(Company).all()`). Latensi O(N) dan boros RAM.
* `list_companies()` mengakses `len(c.opportunities)` pada setiap item. Memicu N+1 database queries.

### File Terdampak
* `backend/app/models/company.py`
* `backend/alembic/versions/a1b2c3d4e5f6_add_root_domain_to_companies.py` (file baru)
* `backend/app/api/companies.py`
* `backend/app/api/opportunities.py`
* `backend/app/tasks.py`

### Langkah Kerja
1. **Alembic Migration (`a1b2c3d4e5f6_add_root_domain_to_companies.py`)**:
   * Down revision: `z6u7n8i9j0k1`
   * Tambah kolom `root_domain` (`sa.String(length=255)`, nullable=True, indexed=True) pada tabel `companies`.
   * Backfill otomatis data existing: ambil row dengan `website IS NOT NULL`, hitung domain apex via fungsi `extract_root_domain`, dan update kolom `root_domain`.
2. **Model SQLAlchemy (`backend/app/models/company.py`)**:
   * Tambah atribut: `root_domain = Column(String(255), index=True, nullable=True)`.
3. **Optimasi Deduplikasi & Mutasi (`backend/app/api/companies.py`)**:
   * Pada saat `create_company` dan `update_company`: isi `company.root_domain = extract_root_domain(website)`.
   * Ganti `check_company_similarity`:
     * Jika `query_domain` ada: `db.query(Company).filter(Company.root_domain == query_domain).all()`.
     * Cek exact normalized: `db.query(Company).filter(Company.normalized_name == norm_query).all()`.
     * Hindari total `db.query(Company).all()`.
   * Pada `create_company`:
     * Cek domain duplikat langsung di DB: `db.query(Company).filter(Company.root_domain == input_domain).first()`.
4. **Optimasi N+1 `list_companies`**:
   * Gunakan subquery agregasi `Opportunity` grouped by `company_id`.
5. **Autolink di `opportunities.py` & `tasks.py`**:
   * Ganti iterasi scan company dengan query tunggal terindeks:
     `db.query(Company).filter(Company.root_domain == req_domain).first()`.

---

## 2. LLM Factory DB Settings Caching & Connection Pool Configuration ✅ DONE

### Masalah
* `get_db_setting()` di `backend/app/core/llm.py` membuka `SessionLocal()` baru setiap kali dipanggil tanpa session aktif. Boros koneksi DB.
* Engine SQLAlchemy di `backend/app/core/database.py` hanya menggunakan pool size default (5).

### File Terdampak
* `backend/app/core/llm.py`
* `backend/app/core/config.py`
* `backend/app/core/database.py`

### Langkah Kerja
1. **In-Memory TTL Cache di `backend/app/core/llm.py`**:
   * Implementasikan cache berbasis timestamp sederhana (TTL 60s) untuk `SystemSetting`.

---

## 3. Concurrency & Failure Resilience di KYC Pipeline ✅ DONE

### Masalah
* Pada `opportunities.py:254`, `opportunity.status` langsung diset `"KYC Running"` dan dicommit sebelum Celery dispatch dipastikan sukses. Jika Redis gagal, status stuck.
* Pada `tasks.py:234-245`, penentuan versioning tanpa proteksi race condition saat dipanggil berdekatan.

### File Terdampak
* `backend/app/api/opportunities.py`
* `backend/app/tasks.py`

### Langkah Kerja
1. **Atomic Dispatch & Rollback di `opportunities.py`**:
   * Pertahankan status `"New"` saat pembuatan opportunity.
   * Update status menjadi `"KYC Running"` di dalam worker Celery ketika eksekusi benar-benar dimulai. Jika dispatch gagal, status tetap `"New"`.
2. **Idempotency & Safe Version Generation di `tasks.py`**:
   * Cek apakah ada KYCReport berstatus `"running"` untuk opportunity terkait sebelum membuat row baru.
   * Tangani race condition version generation secara graceful.

---

## 4. Keamanan Autentikasi (Production Hardening untuk Static Dev Users) ✅ DONE

### Masalah
* `STATIC_USERS` pada `auth.py:32` menyediakan login statis tanpa proteksi flag `DEBUG`.

### File Terdampak
* `backend/app/api/auth.py`
* `backend/tests/test_auth.py`

### Langkah Kerja
1. **Guard `DEBUG` Mode di `/api/auth/login` (`auth.py`)**:
   * Validasi flag `settings.DEBUG` di baris teratas fungsi:
     ```python
     if not settings.DEBUG:
         raise HTTPException(
             status_code=status.HTTP_403_FORBIDDEN,
             detail="Development credential login is disabled in production.",
         )
     ```
2. **Unit Test Coverage (`test_auth.py`)**:
   * Tambahkan test case: verifikasi login username mengembalikan `403 Forbidden` saat `settings.DEBUG = False`.

---

## 5. Rencana Verifikasi & Validasi

1. **Syntax & Compilation**:
   ```bash
   python -m py_compile backend/app/models/company.py backend/app/api/companies.py backend/app/api/opportunities.py backend/app/tasks.py backend/app/core/llm.py backend/app/core/database.py backend/app/api/auth.py
   ```
2. **Unit & Regression Testing**:
   ```bash
   pytest backend/tests/test_companies.py -v
   pytest backend/tests/test_opportunities.py -v
   pytest backend/tests/test_auth.py -v
   pytest backend/tests/test_sectional_kyc.py -v
   ```

2. **Explicit Connection Pooling di `database.py` & `config.py`**:
   * Tambahkan konfigurasi `DB_POOL_SIZE` (20), `DB_MAX_OVERFLOW` (30), `DB_POOL_RECYCLE` (1800) pada `Settings`.
   * Konfigurasikan `create_engine` dengan pool parameters tersebut.
