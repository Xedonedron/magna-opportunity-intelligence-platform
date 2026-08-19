# 🛠️ Panduan Troubleshooting MOIP (Magna Opportunity Intelligence Platform)

Dokumen ini berisi panduan diagnosa dan penanganan masalah umum yang terjadi selama pengembangan lokal maupun penyebaran (*deployment*) di Virtual Machine (VM).

---

## 📌 1. Error "Failed to Load Dashboard Data" (`Status Code: 500`)

### 🔍 Gejala
Tepat setelah login, halaman dashboard gagal memuat data dan menampilkan pesan error `"Failed to load dashboard data"`. Pada tab Network browser console (F12), endpoint `GET /api/dashboard/metrics` berwarna merah dengan status code `500 Internal Server Error`.

### 🚨 Penyebab Utama
Database PostgreSQL di container Docker belum memiliki kolom atau tabel terbaru (misalnya kolom `potential_revenue` atau `estimated_agenda_date` di tabel `opportunities`), sehingga query agregasi SQLAlchemy mengalami *crash*.

### 🛠️ Solusi & Cara Penanganan
Jalankan migrasi database Alembic ke versi terbaru (*head*) menggunakan perintah berikut di terminal VM / server:

```bash
docker compose exec -T backend alembic upgrade head
```

---

## 📌 1.1 Error 500: Kolom JSON `contacts` Tidak Ada di Database

### 🔍 Gejala
Error 500 pada endpoint `/api/dashboard/metrics` dengan pesan error di log backend:
```
psycopg2.errors.UndefinedColumn: column opportunities.contacts does not exist
```

### 🚨 Penyebab Utama
Model SQLAlchemy `Opportunity` memiliki field `contacts` (tipe JSON), tetapi migration untuk kolom tersebut belum dibuat atau belum dijalankan di database VM. Hal ini menyebabkan SQLAlchemy mencoba query kolom yang tidak ada di tabel `opportunities`.

**Catatan Penting:** Masalah ini dapat terjadi jika:
1. Developer menambahkan field baru di model tanpa membuat migration
2. Migration sudah dibuat tetapi `down_revision` salah (tidak terhubung ke migration sebelumnya)
3. Container Docker menggunakan code lama setelah pull dari repo (perlu rebuild)

### 🛠️ Solusi & Cara Penanganan

#### Langkah 1: Cek Backend Log untuk Identifikasi Kolom yang Hilang
```bash
docker compose logs --tail=100 backend 2>&1 | grep -i "undefinedcolumn\|does not exist"
```

#### Langkah 2: Verifikasi Status Migration
```bash
docker compose exec -T backend alembic current
docker compose exec -T backend alembic history --verbose | head -30
```

#### Langkah 3: Jika Migration Baru Tidak Terdeteksi
Jika migration baru sudah dibuat tetapi tidak muncul di `alembic history`, kemungkinan:
- Container menggunakan code lama → **rebuild container**:
  ```bash
  docker compose build --no-cache backend && docker compose up -d backend
  ```
- `down_revision` salah → perbaiki file migration agar `down_revision` mengarah ke revision terakhir yang aktif

#### Langkah 4: Jalankan Migration
```bash
docker compose exec -T backend alembic upgrade head
```

#### Langkah 5: Verifikasi Kolom Sudah Ada
```bash
docker compose exec -T postgres psql -U moip -d moip_db -c "\d opportunities"
```

### 💡 Pencegahan
- Selalu buat migration setelah menambah field baru di model SQLAlchemy
- Pastikan `down_revision` di migration baru mengarah ke revision yang benar (head saat ini)
- Setelah pull code dari repo, selalu rebuild container jika ada perubahan di folder `alembic/versions/`

---

## 🌐 2. Error CORS & Network Error di VM (`Status Code: (null)`)

### 🔍 Gejala
Saat membuka website di VM melalui domain HTTPS (misal `https://moip.cloudwithmagna.com`), browser menampilkan error:
> *Permintaan Cross-Origin Ditolak: Kebijakan Same Origin melarang pembacaan sumber daya jarak jauh di http://localhost:8009/api/auth/google. (Alasan: Permintaan CORS tidak berhasil). Kode status: (null).*

### 🚨 Penyebab Utama
1. **Build-time Environment Mismatch:** Variabel `NEXT_PUBLIC_API_URL` pada frontend Next.js di-bake/ditanamkan saat kompilasi (*build-time*). Jika file `.env.local` masih berisi `http://localhost:8009`, browser client akan mencoba memanggil `localhost` milik komputer mereka sendiri (bukan IP/Domain VM).
2. **Protocol Mismatch (Mixed Content):** Website dibuka melalui `HTTPS`, namun API dipanggil melalui `HTTP` biasa di port `8009`, sehingga diblokir oleh browser demi keamanan.

### 🛠️ Solusi & Cara Penanganan
Jalankan perintah berikut di VM untuk memperbarui URL API dan merakit ulang (*rebuild*) container frontend:

```bash
# 1. Set URL API Frontend ke Domain HTTPS VM
echo "NEXT_PUBLIC_API_URL=https://moip.cloudwithmagna.com" > frontend/.env.local
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com" >> frontend/.env.local

# 2. Set Domain Frontend di Backend
sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=https://moip.cloudwithmagna.com|g' backend/.env

# 3. Rebuild dan Restart Container
docker compose up -d --build
```

---

## 🔐 3. Error Akses Ditolak (`HTTP 403 Forbidden` / User Izin Terbatas)

### 🔍 Gejala
Pengguna dengan role **Presales Engineer** atau **Viewer** tidak dapat mengubah status opportunity, mengedit data, atau menghapus record. API mengembalikan respons `403 Forbidden`:
> *{"detail": "Anda tidak memiliki izin 'create_edit' untuk melakukan aksi ini."}*

### 🚨 Penyebab Utama
Aturan keamanan dua-lapis (RBAC - Role Based Access Control). Role **Engineer** secara bawaan hanya memiliki kapabilitas `view,generate_kyc` dan secara sengaja **dibatasi dari mengubah status atau menghapus data**.

### 🛠️ Solusi & Cara Penanganan
1. **Perilaku Standar:** Ini adalah perilaku normal sistem untuk menjaga integritas data pipeline.
2. **Promosi Akses:** Jika pengguna butuh izin mengedit/mengubah status, **Super Admin** dapat menambahkan kapabilitas `create_edit` melalui menu **Settings ➔ User Management**.

---

## 🤖 5. Potensi Error & Solusi pada Proses KYC (KYC Pipeline)

### 🔍 Gejala
Status Opportunity berubah menjadi `KYC Running` lalu kembali ke status lama atau laporan KYC menampilkan status `failed` / tidak selesai.

### 🚨 Penyebab & Penanganan Berdasarkan Layer:

#### A. Konfigurasi LLM & Search API Key
* **Penyebab**: API Key OpenAI (`OPENAI_API_KEY`) atau Gemini (`GEMINI_API_KEY`) belum dikonfigurasi di DB `system_settings` atau file `.env`.
* **Solusi**: Masuk ke menu **Settings ➔ AI Configuration** sebagai Super Admin dan isi active API key, atau set di file `backend/.env`.

#### B. Celery Worker / Redis Offline
* **Penyebab**: Container Celery worker atau Redis tidak berjalan/restart mendadak.
* **Solusi**:
  ```bash
  docker compose ps celery redis
  docker compose restart celery redis
  ```

#### C. Kegagalan Crawling Website & SSRF Filter
* **Penyebab**: Website target opportunity offline, proteksi Cloudflare (403), atau domain mengarah ke IP privat/lokal yang diblokir oleh anti-SSRF `link_verifier_service`.
* **Solusi**: Periksa validitas field `website` pada opportunity atau kosongkan jika domain tidak dapat diakses publik.

#### D. Kegagalan Parsing JSON Model LLM
* **Penyebab**: Output respon AI terpotong atau format markdown code fence tidak valid.
* **Solusi**: Gunakan model rekomendasi (`gemini-2.5-flash` atau `glm-5`) dengan parameter temperature `0.0` untuk stabilitas output terstruktur.

---

## 🔍 4. Perintah Diagnosa Lengkap di VM (One-Liner Inspection)

Untuk memeriksa kondisi seluruh layanan Docker, variabel lingkungan, dan log di VM, jalankan perintah sekali jalan berikut:

```bash
echo "=== 1. STATUS CONTAINER ===" && docker compose ps
echo -e "\n=== 2. ENV BACKEND ===" && docker compose exec -T backend env | grep -E "FRONTEND_URL|GOOGLE_CLIENT_ID|DATABASE_URL"
echo -e "\n=== 3. ENV FRONTEND ===" && docker compose exec -T frontend env | grep -E "NEXT_PUBLIC_API_URL|NEXT_PUBLIC_GOOGLE_CLIENT_ID"
echo -e "\n=== 4. HEALTH CHECK BACKEND LOKAL ===" && curl -s http://localhost:8009/api/health
echo -e "\n=== 5. LOG BACKEND (50 BARIS TERAKHIR) ===" && docker compose logs --tail=50 backend
```


---

### 16. Error `_clean_and_parse_json` (JSON Parse Error pada KYC / Persona AI)

**Penyebab:**
- Output LLM terpotong (max tokens) sehingga kurung penutup (`}`, `]`) atau tanda kutip string hilang.
- LLM menulis markdown fences rusak atau unescaped double quotes di dalam string.

**Solusi & Mitigasi Otomatis yang Diterapkan:**
1. **Self-Healing Truncation Parser**: Parser otomatis menyeimbangkan stack kurung kurawal/siku dan menutup string yang terpotong.
2. **Auto-Retry Loop (3 Attempts)**: Jika JSON decode tetap gagal, pipeline otomatis me-reinvoke LLM dengan feedback pesan error format spesifik.
3. Jika model sering menghasilkan format tidak stabil di environment tertentu, pastikan model LLM di System Settings menggunakan provider yang mendukung strict JSON mode (misalnya `gpt-4o`, `deepseek-chat`, `glm-5`).
