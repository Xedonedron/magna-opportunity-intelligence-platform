# MOIP Master Implementation Plan & Progress Tracker

Dokumen ini berfungsi sebagai **Blueprint Teknis** sekaligus **Living Tracker** untuk seluruh perbaikan logika/alur (Bug Fixes) dan peningkatan fitur (Improvements) pada **Magna Opportunity Intelligence Platform (MOIP)**.

Setiap kali satu task atau fase selesai dikerjakan dan tervalidasi, tabel **Master Progress Tracker** di bawah ini diperbarui (`Status`, `Tanggal Selesai`, `Catatan / Deskripsi Penyelesaian`).

---

## 📊 Master Progress Tracker

| ID | Kategori | Fase | Nama Task / Perbaikan | Prioritas | Status | Catatan / Deskripsi Penyelesaian |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Bug Logika | Fase 1 | Eliminasi Duplikasi In-App Notification & Self-Notification Bug | 🔴 Critical | `✅ Completed` | `2026-10-16` — Dihapus duplikasi insert `Notification` dan self-notification pada `tasks.py` (`send_opportunity_created_notification`, `send_kyc_completed_notification`, `send_status_changed_notification`); In-App Notification kini tunggal via `NotificationService`. |
| **BUG-02** | Bug Alur | Fase 1 | Perbaikan Bulk Import CSV/Excel (`Company` Folder, `CompanyContact`, & Celery Commit Race Condition) | 🔴 Critical | `✅ Completed` | `2026-10-16` — `import_opportunities()` kini menautkan/membuat `Company` & `CompanyContact`, memanggil `NotificationService.notify_opportunity_created`, dan melakukan `db.commit()` sebelum men-dispatch `run_kyc_pipeline_task.delay()`. |
| **BUG-03** | Bug Logika | Fase 1 | Sentralisasi Normalisasi `Company` (`normalized_name` & `root_domain`) & Penanganan Conflict 409 | 🔴 High | `✅ Completed` | `2026-10-16` — Dibuat helper terpusat `resolve_or_create_company()` di `companies.py` dan diterapkan ke `opportunities.py`, `prospecting.py`, & `prospecting_service.py`; ditambahkan validasi `409 Conflict` pada `PATCH /api/companies/{id}`. |
| **BUG-04** | Bug & Perf | Fase 1 | Hapus Side-Effect Write pada `GET /api/meetings`, Fix Overwrite `meeting_schedule`, & Fix `participants` Crash | 🔴 High | `✅ Completed` | `2026-10-16` — `_sync_missing_initial_meetings()` dioptimasi menjadi single `LEFT OUTER JOIN` query; `opp.meeting_schedule` dilindungi dari overwrite meeting masa lampau; `send_meeting_reminder` kini mendukung `participants` bertipe `list` maupun `str`. |
| **BUG-05** | Bug Alur | Fase 2 | Perbaikan Konversi Outbound Prospecting → Opportunity (`is_primary` Demotion, Notifikasi, & Auto-KYC Option) | 🟠 High | `✅ Completed` | `2026-10-16` — `convert_prospect()` & `create_opportunity_from_stakeholders()` kini melakukan demote `is_primary` lama sebelum membuat kontak utama baru, menyertakan `opp_title` di `customer_needs`, memanggil `NotificationService.notify_opportunity_created`, dan men-trigger `run_kyc_pipeline_task.delay()` jika `trigger_kyc=True`. |
| **BUG-06** | Keamanan/RBAC | Fase 2 | Standarisasi Role Alias (`lgo`/`lead_gen`, `manager`/`managerial`) & Konsistensi Visibilitas Data | 🟠 High | `✅ Completed` | `2026-10-16` — Ditambahkan `normalize_role()` di `security.py` dan diterapkan pada guard permission, `dashboard.py`, `opportunities.py` (`global_search`), serta `notification_service.py`. |
| **BUG-07** | Performa | Fase 2 | Optimasi Query `GET /api/dashboard/metrics` (90 Queries → Agregasi SQL) & Deduplikasi Polling Notifikasi Frontend | 🟡 Medium | `✅ Completed` | `2026-10-16` — Loop 90 sequential queries di `get_dashboard_metrics()` diganti menjadi 2 query agregasi `GROUP BY date`; `useNotificationToaster()` kini menyinkronkan cache `["notifications", "unread-count"]` tanpa polling ganda 15 detik. |
| **BUG-08** | Concurrency | Fase 2 | Pencegahan Race Condition & Stuck `"running"` Status pada Regenerate KYC Report | 🟡 Medium | `✅ Completed` | `2026-10-16` — `regenerate_kyc_report()` di `kyc.py` kini menolak request duplikat dengan `409 Conflict` jika report berstatus `"running"` berusia < 5 menit, dan otomatis menandai `"failed"` jika > 5 menit (stale worker). |
| **IMP-01** | Fitur AI | Fase 3 | **Living Opportunity Intelligence**: Integrasi MoM (`Meeting.notes`) & `OpportunityDocument` ke Konteks Regenerate KYC | 🟢 High | `✅ Completed` | `2026-10-16` — `run_kyc_pipeline_task()` kini mengambil histori `Meeting` (agenda, notes/MoM, action items) dan `OpportunityDocument` milik opportunity lalu menginjeksikannya ke Layer B (Modules 3–6) melalui `_build_deal_progression_context()` tanpa mengontaminasi Layer A (Modules 1–2). |
| **IMP-02** | Fitur AI | Fase 3 | Personalisasi Outbound Dossier Dinamis (Nama/Role User Aktif + Konteks KYC/Berita Perusahaan) | 🟢 Medium | `✅ Completed` | `2026-10-16` — `generate_dossier()` & `_build_outreach_copies()` kini menggunakan identitas user aktif (`full_name` & role title) serta memperkaya hipotesis dan naskah outreach (WA, Email, LinkedIn) dengan profil korporat (`Company`) dan `KYCReport` dari DB. |
| **IMP-03** | Otomatisasi | Fase 4 | Aktivasi Scheduler Pengingat Meeting & Deteksi Stale Opportunity (>7 Hari Tanpa Aktivitas) | 🟢 Medium | `⏳ Pending` | Belum dikerjakan |
| **IMP-04** | Arsitektur DB | Fase 4 | Relasi `assigned_engineer_id` (FK ke `users.id`) & Fitur **Merge Duplicate Company** untuk Admin/Manager | 🟢 Medium | `⏳ Pending` | Belum dikerjakan |

---

## Ringkasan Fase Eksekusi

### Fase 1: Perbaikan Bug Kritis & Integritas Data (`BUG-01` s/d `BUG-04`) — ✅ Selesai
1. **`BUG-01`**: Penghapusan duplikasi In-App Notification pada Celery email tasks (`backend/app/tasks.py`) dan penghapusan self-notification ke `created_by`.
2. **`BUG-02`**: Perbaikan `POST /api/opportunities/import` (`backend/app/api/opportunities.py`) agar membuat/menautkan folder `Company` dan `CompanyContact`, mencatat In-App Notification, serta melakukan `db.commit()` sebelum men-dispatch Celery task `run_kyc_pipeline_task`.
3. **`BUG-03`**: Sentralisasi `resolve_or_create_company()` di `backend/app/api/companies.py` (digunakan oleh `opportunities.py`, `prospecting.py`, dan `prospecting_service.py`) serta penanganan `409 Conflict` saat update nama/website perusahaan.
4. **`BUG-04`**: Optimasi `_sync_missing_initial_meetings()` dengan single `LEFT OUTER JOIN` query di `backend/app/api/meetings.py`, proteksi `opp.meeting_schedule` agar tidak tertimpa meeting lampau, dan perbaikan parsing `meeting.participants` (`list` vs `str`) di `backend/app/tasks.py`.

### Fase 2: Perbaikan Workflow Outbound, RBAC, Performa Dashboard & Concurrency KYC (`BUG-05` s/d `BUG-08`) — ✅ Selesai
- **`BUG-05`**: Kelengkapan konversi Outbound Prospecting → Opportunity (`opp_title`, demote `is_primary` lama, notifikasi via `NotificationService`, & opsi auto-trigger KYC `trigger_kyc: bool = True`).
- **`BUG-06`**: Normalisasi role alias (`lgo`/`lead_gen`, `manager`/`managerial`, `engineer`/`presales`, `admin`/`superadmin`) via `normalize_role()` di `security.py`, `dashboard.py`, `opportunities.py`, dan `notification_service.py`.
- **`BUG-07`**: Optimasi 90 sequential queries di `GET /api/dashboard/metrics` menjadi 2 query agregasi SQL `GROUP BY date`, serta deduplikasi polling notifikasi di `frontend/src/hooks/use-notifications.ts`.
- **`BUG-08`**: Concurrency guard pada `POST /api/opportunities/{opportunity_id}/kyc/regenerate` terhadap report berstatus `"running"` (< 5 menit menghasilkan `409 Conflict`, ≥ 5 menit ditandai `"failed"`).

### Fase 3: Peningkatan Fitur AI & Sales Intelligence (`IMP-01` & `IMP-02`) — ✅ Selesai
- **`IMP-01`**: Living Opportunity Intelligence — injeksi histori `Meeting` (agenda, notes/MoM, action items) dan `OpportunityDocument` (title, labels, description, url) ke dalam Layer B KYC Pipeline (Modules 3–6) melalui `_build_deal_progression_context()`, dengan isolasi penuh terhadap Layer A (Modules 1–2).
- **`IMP-02`**: Personalisasi Outbound Dossier dinamis menggunakan nama/role user aktif (`current_user`) serta pengayaan konteks korporat (`Company` & `KYCReport` terbaru di DB) pada naskah WhatsApp, Email, dan LinkedIn.

### Fase 4: Otomatisasi Scheduler & Evolusi Skema (`IMP-03` & `IMP-04`) — ⏳ Menunggu Eksekusi
- **`IMP-03`**: Scheduler periodik pengingat meeting & deteksi opportunity stagnan (>7 hari tanpa aktivitas).
- **`IMP-04`**: Kolom `assigned_engineer_id` (FK ke `users.id`) beserta migrasi Alembic & endpoint Merge Duplicate Company (`POST /api/companies/{target_id}/merge/{source_id}`).
