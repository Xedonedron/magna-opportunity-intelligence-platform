
# Implementation Plan

Saya **tidak** menyarankan membangun fitur demi fitur secara acak. Untuk proyek berbasis AI seperti ini, pendekatan terbaik adalah membangun **vertikal slice**: setiap sesi menghasilkan fitur yang benar-benar dapat dijalankan dan diuji.

## Session 1 — Project Foundation

**Tujuan**

* Inisialisasi repository.
* Menentukan arsitektur frontend, backend, database, dan worker AI.
* Konfigurasi autentikasi dasar.
* Menyiapkan pipeline CI/CD lokal.

**Output**

* Struktur proyek.
* Login berhasil.
* Halaman dashboard kosong.

**Testing**

* Pengguna dapat login menggunakan akun Google Workspace.
* Role pengguna terbaca.
* Halaman dashboard hanya dapat diakses setelah login.

---

## Session 2 — Database & Opportunity CRUD

**Tujuan**

* Mendesain skema database.
* Implementasi CRUD Opportunity.
* Validasi field wajib.
* Timeline dasar.

**Output**

* Opportunity dapat dibuat, diedit, dilihat, dan dihapus.
* Timeline mencatat aktivitas pembuatan dan perubahan.

**Testing**

* Buat opportunity baru dengan field minimum.
* Pastikan field wajib divalidasi.
* Edit status dan cek timeline bertambah.
* Hapus opportunity dan pastikan data tidak lagi muncul.

---

## Session 3 — Meeting Management

**Tujuan**

* Menambahkan entitas Meeting.
* Mendukung banyak meeting untuk satu opportunity.
* Menyimpan agenda, peserta, catatan, dan action item.

**Output**

* Meeting dapat ditambah dan dikelola.

**Testing**

* Tambahkan dua meeting pada satu opportunity.
* Pastikan kedua meeting tersimpan dan dapat diedit.
* Verifikasi timeline mencatat aktivitas meeting.

---

## Session 4 — Notification Engine

**Tujuan**

* Sistem event internal.
* Pengiriman email notifikasi.
* Integrasi Google Calendar.

**Output**

* Email terkirim saat opportunity dibuat.
* Event kalender otomatis dibuat.

**Testing**

* Buat opportunity dengan jadwal meeting.
* Pastikan email notifikasi diterima.
* Pastikan event muncul di Google Calendar dengan peserta yang benar.

---

## Session 5 — AI KYC Pipeline

**Tujuan**

* Background worker.
* Pencarian website resmi.
* Crawling website.
* Pencarian LinkedIn dan berita.
* Penyusunan ringkasan awal.

**Output**

* KYC otomatis berjalan setelah opportunity dibuat.

**Testing**

* Buat opportunity hanya dengan nama perusahaan.
* Pastikan status berubah menjadi "KYC Running".
* Verifikasi hasil KYC selesai dalam target waktu.
* Cek sumber referensi yang digunakan.

---

## Session 6 — RAG Integration

**Tujuan**

* Import PDF company profile Smartnet Magna.
* Chunking dan embedding.
* Vector database.
* Retrieval untuk solusi Magna.

**Output**

* AI mampu memberikan rekomendasi solusi Magna berdasarkan konteks customer.

**Testing**

* Impor PDF company profile.
* Jalankan KYC.
* Verifikasi rekomendasi solusi berasal dari dokumen internal dan relevan dengan kebutuhan customer.

---

## Session 7 — KYC Editor & Versioning

**Tujuan**

* Editor hasil KYC.
* Penyimpanan versi.
* Regenerate KYC.

**Output**

* Riwayat versi tersedia.
* Engineer dapat mengedit tanpa kehilangan versi sebelumnya.

**Testing**

* Edit hasil KYC.
* Regenerate KYC.
* Pastikan versi bertambah dan histori tetap dapat diakses.

---

## Session 8 — Use Case Generator ✅

**Tujuan**

* Menghasilkan use case industri.
* Menampilkan accordion detail (deskripsi, isu, cara kerja, dampak, produk Google, solusi Magna).

**Output**

* Use case interaktif tersedia di halaman KYC.

**Implementation:**
- `UseCaseAccordion.tsx` - Frontend accordion component (sudah ada dari session sebelumnya)
- Enhanced `kyc_pipeline.py` - LLM prompt now uses:
  - `industry_use_cases` from web search (Tavily)
  - `smartnet_solutions` from RAG (ChromaDB)
- Use cases now reference actual Smartnet Magna solutions from internal documents

**Testing**

* Jalankan KYC pada beberapa industri berbeda.
* Verifikasi setiap use case memiliki detail lengkap dan sesuai konteks kebutuhan customer.

---

## Session 9 — Dashboard & Monitoring

**Tujuan**

* Dashboard ringkasan.
* Filter berdasarkan status, engineer, dan tanggal.
* Tampilan berbeda sesuai role.

**Output**

* Dashboard operasional siap digunakan.

**Testing**

* Login sebagai LGO, Engineer, dan Manager.
* Pastikan data dan metrik yang tampil sesuai hak akses masing-masing.

---

## Session 10 — Hardening & Acceptance ✅

**Tujuan**

* Optimasi performa.
* Penanganan error.
* Audit log.
* Pengujian end-to-end.

**Output**

* Sistem siap digunakan sebagai MVP.

**Implementation:**

- `backend/app/core/exceptions.py` — Custom exception classes (MOIPException, NotFoundError, ValidationError, etc.)
- `backend/app/core/error_handler.py` — Global error handling middleware
- `backend/app/models/audit_log.py` — AuditLog model for tracking all system changes
- `backend/app/services/audit_service.py` — Audit service for logging create/update/delete operations
- `backend/alembic/versions/20260728_001_add_audit_log_table.py` — Migration for audit_logs table
- `frontend/src/lib/error-utils.ts` — Frontend error parsing and user-friendly messages
- `backend/pytest.ini` — Pytest configuration
- `backend/tests/conftest.py` — Test fixtures (db, client, auth, users)
- `backend/tests/test_opportunities.py` — Tests for Opportunity API endpoints
- `backend/tests/test_auth.py` — Tests for Authentication API endpoints

**Testing**

* Jalankan seluruh skenario utama secara berurutan:

  1. Login.
  2. Membuat opportunity.
  3. KYC otomatis.
  4. Menerima notifikasi email.
  5. Membuat meeting.
  6. Mengedit KYC.
  7. Regenerate KYC.
  8. Melihat versi KYC.
  9. Mengubah status opportunity.
  10. Memastikan timeline dan dashboard merefleksikan seluruh aktivitas.
