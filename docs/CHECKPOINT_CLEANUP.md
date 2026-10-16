# MOIP Website Cleanup — Master Checkpoint List

Dokumen ini menjadi **referensi tunggal (living checklist)** untuk seluruh catatan perbaikan, perapian UX, dan bug fix pada website **Magna Opportunity Intelligence Platform (MOIP)**.

---

## Ringkasan Status Checkpoint

| ID | Kategori | Item Perbaikan | Lokasi File Utama | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CP-01** | Bug & UX | **Fix Lusha Search di Halaman Detail (Active Company View)** | [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx), [`backend/app/services/lusha_service.py`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py) | ✅ Selesai |
| **CP-02** | Bug & API | **Ambil & Tampilkan Nilai Real-Time Lusha API Limit (100/hari) & Tarif Kredit V3 (Email=1, Phone=5, Search=1/25)** | [`backend/app/services/lusha_service.py`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py), [`frontend/src/components/domains/prospecting/CreditRevealModal.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/components/domains/prospecting/CreditRevealModal.tsx), [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx) | ✅ Selesai |
| **CP-03** | UX & API | **Hybrid Table Pagination & Load More Batch 25 Kontak dari Lusha** | [`frontend/src/app/(main)/prospecting/page.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/app/(main)/prospecting/page.tsx), [`backend/app/services/lusha_service.py`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py) | ✅ Selesai |

---

## Detail Catatan & Solusi

### CP-01: Fix Bug Lusha Search di Detail View (✅ Selesai)
- **Keluhan User**:
  - Di halaman awal **Lusha Prospecting Hub**, pencarian perusahaan & tombol **Cari Karyawan** berjalan normal.
  - Namun setelah perusahaan dipilih dan daftar karyawan muncul (halaman detail), terdapat search bar di bagian atas daftar karyawan yang ketika diketik nama perusahaan lain **tidak menampilkan hasil / tidak berfungsi**, padahal saat dicek di Lusha perusahaan tersebut ada (dan baru bisa ditemukan bila kembali ke halaman awal).
- **Perbaikan yang Telah Diimplementasikan**:
  1. **Search Bar Perusahaan & Tombol `Cari Karyawan` Selalu Tampil**: Menghapus kondisi `{!selectedCompany ? ... : ...}` yang menyembunyikan search bar perusahaan saat ada perusahaan aktif. Kini search bar perusahaan beserta autocomplete live Lusha/MOIP selalu tampil di bagian atas kartu **Target Perusahaan**, dan kartu ringkasan perusahaan aktif ditampilkan tepat di bawahnya.
  2. **Smart Company Lookup di Search Bar Detail (Discovery Toolbar)**:
     - Memperjelas placeholder search bar di toolbar menjadi `Filter nama / jabatan di <Nama Perusahaan>...` dan menambahkan tombol cepat **`Cari Perusahaan "<Query>"`** di sebelahnya.
     - Ketika user mengetik nama perusahaan baru di search bar detail dan menghasilkan 0 karyawan yang cocok pada perusahaan lama, sistem secara otomatis mengambil rekomendasi perusahaan dari `/api/prospecting/companies/search?q=...` dan menampilkannya langsung sebagai daftar perusahaan Lusha yang bisa diklik (atau tekan `Enter ↵`) di area hasil.
  3. **Peningkatan Resolusi Perusahaan & Domain di Backend (`LushaService.search_contacts`)**:
     - Menambahkan fallback pencarian `domains` saja bila pencarian gabungan `names` + `domains` mengembalikan 0 kontak karena perbedaan penulisan nama legal PT di Lusha.
     - Menambahkan auto-resolution ke `LushaService.search_companies()` bila pencarian langsung menggunakan `company_name` tanpa domain menghasilkan 0 kontak, sehingga nama perusahaan dan domain resminya di Lusha otomatis dipetakan.

### CP-02: Ambil Nilai Real-Time Lusha API Limit (100 Call/Hari) & Tarif Kredit V3 (✅ Selesai)
- **Keluhan User**:
  - Akun Lusha berada di level Standard/Starter dengan limit **100 API call per hari** dan kuota kredit.
  - Indikator **Limit API Harian** tidak berkurang saat melakukan reveal/refresh, dan nilai pembukaan kredit ternyata **bukan 1 kredit per info** (melainkan `Email = 1 kredit`, `Phone = 5 kredit`, dan `contactSearch = 1 kredit / 25 kontak`).
- **Perbaikan yang Telah Diimplementasikan**:
  1. **Persistensi Real-Time Header Rate Limits (`self._latest_header_limits`)**:
     - Menyimpan header `x-rate-limit-daily`, `x-daily-usage`, `x-daily-requests-left`, dan `x-daily-reset` dari setiap request Lusha secara persisten di [`LushaService`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py), dan selalu melakukan *merge* ke response `get_usage()` (termasuk saat `refresh=true`) agar angka `Limit API Harian` tidak pernah tertimpa nilai basi dari body `/account/usage`.
     - Menghapus reset timestamp `self._cached_usage_ts = time.time()` di `_sync_rate_limits_from_headers()` serta menurunkan TTL cache `get_usage()` dari `45s` menjadi `10s`.
  2. **Akurasi Tarif Kredit Lusha V3 (`Email = 1 Kredit`, `Phone = 5 Kredit`)**:
     - Menampilkan tarif spesifik pada tombol lock di tabel karyawan: **`Tersedia (1 Kredit)`** pada kolom Email dan **`Tersedia (5 Kredit)`** pada kolom Nomor Telepon.
     - Menambahkan `initialMode` (`"email"` | `"phone"` | `"all"`) pada [`CreditRevealModal.tsx`](file:///srv/projects/magna-opportunity-intelligence-platform/frontend/src/components/domains/prospecting/CreditRevealModal.tsx) sehingga klik pada tombol lock Email langsung memilih mode **Hanya Email (1 kredit)**, klik pada tombol lock Nomor Telepon memilih **Hanya Nomor HP (5 kredit)**, dan klik **Buka Kontak** memilih keduanya (**1 + 5 = 6 kredit**).

### CP-03: Hybrid Table Pagination & Load More Batch 25 Kontak dari Lusha (✅ Selesai)
- **Keluhan / Pertanyaan User**:
  - Di halaman hasil pencarian karyawan Lusha Prospecting Hub belum ada pagination; padahal API Lusha V3 hanya mengembalikan maksimal 25 kontak per halaman (`page=0, size=25`) dengan tarif **1 kredit per 25 kontak**.
- **Perbaikan yang Telah Diimplementasikan**:
  1. **Client-Side Table Pagination (0 Kredit / Instan)**:
     - Menambahkan navigasi halaman (`Prev / 1 / 2 / ... / Next`) dan selector jumlah baris per halaman (`10 / 25 / 50`, default `25`) untuk membagi daftar karyawan yang sudah di-load tanpa memotong kuota Lusha.
     - Menjaga state kontak yang sudah dibuka (*revealed*) dan centang checkbox (`selectedIds`) tetap utuh saat berpindah halaman tabel.
  2. **On-Demand Batch Loader (`+ Muat 25 Kontak Berikutnya dari Lusha (1 Kredit)`)**:
     - Mengekstrak total kontak sebenarnya di Lusha (`total_results`) secara akurat di [`LushaService.search_contacts()`](file:///srv/projects/magna-opportunity-intelligence-platform/backend/app/services/lusha_service.py).
     - Menampilkan badge **`X dari Y Karyawan Lusha`** di header perusahaan aktif dan tombol **`+ Muat 25 Kontak Berikutnya dari Lusha (1 Kredit)`** di footer tabel (serta di tampilan filter kosong) apabila `totalLushaContacts > employees.length`, yang mengambil halaman berikutnya (`page: lushaLoadedPage + 1, limit: 25`) dan menggabungkannya tanpa duplikat.
