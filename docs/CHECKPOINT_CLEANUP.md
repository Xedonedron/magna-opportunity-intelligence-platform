# MOIP Website Cleanup — Master Checkpoint List

Dokumen ini menjadi **referensi tunggal (living checklist)** untuk seluruh catatan perbaikan, perapian UX, dan bug fix pada website **Magna Opportunity Intelligence Platform (MOIP)**.

---

## Ringkasan Status Checkpoint

| ID | Kategori | Item Perbaikan | Lokasi File Utama | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CP-01** | Bug & UX | **Fix Lusha Search di Halaman Detail (Active Company View)** | [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx) | ⏳ Antrean Berikutnya |
| **CP-02** | Bug & API | **Ambil & Tampilkan Nilai Real-Time Lusha API Limit (100/hari) & Kredit** | [`backend/app/services/lusha_service.py`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py), [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx) | ✅ Selesai |

---

## Detail Catatan & Solusi

### CP-01: Fix Bug Lusha Search di Detail View (⏳ Antrean Berikutnya)
- **Keluhan User**:
  - Di halaman awal **Lusha Prospecting Hub**, pencarian perusahaan & tombol **Cari Karyawan** berjalan normal.
  - Namun setelah perusahaan dipilih dan daftar karyawan muncul (halaman detail), terdapat search bar di bagian atas daftar karyawan yang ketika diketik nama perusahaan lain **tidak menampilkan hasil / tidak berfungsi**, padahal saat dicek di Lusha perusahaan tersebut ada (dan baru bisa ditemukan bila kembali ke halaman awal).
- **Root Cause**:
  1. Saat `selectedCompany` bernilai aktif (termasuk saat otomatis dipulihkan dari `sessionStorage` `moip_prospecting_cache`), input pencarian perusahaan (`companyQuery` + tombol **Cari Karyawan**) di kartu atas disembunyikan sepenuhnya.
  2. Satu-satunya search bar yang terlihat di halaman detail adalah input di Discovery Toolbar (`jobTitleSearchQuery`) yang hanya memfilter array `employees` lokal di memori berdasarkan nama karyawan, jabatan, atau departemen perusahaan lama.

### CP-02: Ambil Nilai Real-Time Lusha API Limit (100 Call/Hari) & Kredit (✅ Selesai)
- **Keluhan User**:
  - Akun Lusha berada di level Standard/Starter dengan limit **100 API call per hari** dan kuota kredit.
  - Di website MOIP, indikator kuota di kanan atas **stuck di angka `74 / 100 kredit`** dan tidak pernah berubah.
- **Perbaikan yang Telah Diimplementasikan**:
  1. **Penghapusan Hardcode `74 / 100` & Sinkronisasi Schema**: Menghapus state hardcode `{ used: 0, remaining: 74, total: 100 }` di [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx) dan menyelaraskan `fetchQuota()` dengan response [`LushaUsageResponse`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/schemas/prospecting.py).
  2. **Ekstraksi Real-Time Daily Rate Limit (`100 call/hari`) & Kredit**: Mengupdate [`LushaService.get_usage()`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py) untuk membaca `rateLimits.daily` (`limit`, `used`, `remaining`, `resetsAt`) dan `credits` (`total`, `used`, `remaining`), serta menyinkronkan counter `x-daily-requests-left` dan `x-daily-usage` langsung dari HTTP response headers setiap kali pencarian atau reveal dilakukan (tanpa membuang jatah API call tambahan).
  3. **Widget Dual-Indikator Real-Time di Header**: Menampilkan **Limit API Harian** (contoh: `92 / 100 call` beserta indikator warna hijau/kuning/merah dan jumlah terpakai hari ini) serta **Kredit Reveal** (contoh: `2.630 / 4.820 kredit`) dan tombol refresh langsung (`?refresh=true`).
  4. **Pencegahan Redundant Call**: Mencegah terpanggilnya ulang `/api/prospecting/companies/search` secara duplikat 300ms setelah user memilih perusahaan dari dropdown.
