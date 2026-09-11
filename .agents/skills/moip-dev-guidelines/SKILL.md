---
name: moip-dev-guidelines
description: Best practices and mandatory checklists for modifying SQLAlchemy models, generating Alembic migrations, database deployment, and troubleshooting database schema errors in MOIP. Trigger whenever creating or editing SQLAlchemy models in backend/app/models/, running alembic migrations, or deploying database changes.
---

# 🧠 MOIP Development Skills & Best Practices

Dokumen ini berisi panduan development untuk MOIP (Magna Opportunity Intelligence Platform) agar menghindari error umum dan memastikan konsistensi antara code model dan database schema.

---

## 📋 Checklist: Menambah Field Baru di Model SQLAlchemy

### Wajib Dilakukan
1. **Buat migration** setiap menambah/mengubah field di model SQLAlchemy
2. **Set `down_revision`** ke revision yang benar (HEAD saat ini)
3. **Test migration** sebelum push ke repo

### Langkah-Langkah

```bash
# 1. Cek HEAD revision saat ini
docker compose exec -T backend alembic current

# 2. Buat file migration baru di backend/alembic/versions/
#    Format nama: {revision_id}_{deskripsi}.py
#    Penting: down_revision harus sama dengan HEAD yang dilihat di langkah 1

# 3. Setelah membuat migration, jalankan
docker compose exec -T backend alembic upgrade head

# 4. Verifikasi kolom sudah ada
docker compose exec -T postgres psql -U moip -d moip_db -c "\d {nama_tabel}"
```

### Template Migration

```python
"""{deskripsi singkat}

Revision ID: {revision_id}
Revises: {HEAD_revision_saat_ini}
Create Date: {tanggal}

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '{revision_id}'
down_revision: Union[str, None] = '{HEAD_revision_saat_ini}'  # PENTING: harus sama dengan HEAD
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('{nama_tabel}', sa.Column('{nama_kolom}', sa.{tipe_data}, nullable={True/False}))


def downgrade() -> None:
    op.drop_column('{nama_tabel}', '{nama_kolom}')
```

---

## 🚨 Error yang Sering Terjadi

### 1. `UndefinedColumn: column {nama_kolom} does not exist`

**Penyebab:** Field ditambahkan di model tetapi migration tidak dibuat atau tidak dijalankan.

**Solusi:**
```bash
# Cek backend log
docker compose logs --tail=100 backend 2>&1 | grep -i "undefinedcolumn"

# Cek status migration
docker compose exec -T backend alembic current
docker compose exec -T backend alembic history --verbose | head -30

# Jika migration ada tapi tidak jalan, rebuild container
docker compose build --no-cache backend && docker compose up -d backend

# Jalankan migration
docker compose exec -T backend alembic upgrade head
```

### 2. Migration Baru Tidak Terdeteksi oleh Alembic

**Penyebab:**
- `down_revision` salah (tidak terhubung ke chain)
- Container menggunakan code lama (perlu rebuild)

**Solusi:**
1. Pastikan `down_revision` sama dengan HEAD saat ini
2. Rebuild container: `docker compose build --no-cache backend && docker compose up -d backend`
3. Verifikasi: `docker compose exec -T backend alembic history --verbose | head -30`

### 3. python-dotenv Warning: "could not parse statement"

**Penyebab:** Format `.env` file tidak valid (ada karakter khusus, spasi di sekitar `=`, atau baris kosong dengan spasi).

**Solusi:** Periksa dan perbaiki format `.env` file:
```bash
# Format yang benar
KEY=value
KEY_WITH_QUOTES="value with spaces"

# Hindari
KEY = value        # spasi di sekitar =
KEY="value"        # quote tidak konsisten
```

---

## 🚀 Kebijakan Validasi & Auto-Push (Validation-to-Push Policy)

1. **Validasi Sebelum Push**:
   - Backend: Jalankan `python -m py_compile ...` pada file python yang diubah/dibuat.
   - Frontend: Jalankan TypeScript typecheck (`tsc --noEmit`).
   - Logic / scoring tests dipastikan lulus tanpa error.
2. **Langsung Push ke Remote (`origin main`)**:
   - Begitu validasi selesai dan sukses, AI assistant langsung melakukan commit dan `git push origin main`.
   - Tidak perlu menunda atau meminta persetujuan terpisah untuk push yang sudah disetujui dalam rencana kerja.
3. **Pemberitahuan Perintah Deploy VPS**:
   - Prosedur deploy VPS (`git pull origin main`, `docker compose build...`, `alembic upgrade head`) sudah baku dan terdokumentasi di bagian bawah.
   - **JANGAN** menyebutkan perintah deploy VPS ini secara repetitif di setiap akhir balasan chat agar tidak memenuhi respons, kecuali diminta secara spesifik oleh user.

---

## 🌐 Arsitektur Deployment MOIP (PENTING)

Sistem MOIP memiliki arsitektur deployment terpisah (*decoupled deployment*):

| Komponen | Platform Deployment | Cara Deploy & Karakteristik |
|---|---|---|
| **Frontend (Next.js)** | **Vercel** | Terpisah dari VM. Otomatis ter-deploy (*CI/CD*) saat commit/push ke branch GitHub terkait. **TIDAK** dibuild atau dijalankan di dalam Docker VPS. |
| **Backend (FastAPI)** | **VM / VPS (Docker Compose)** | Dijalankan via Docker container `backend`. Perlu `docker compose build` atau `restart` saat ada perubahan logic/dependency. |
| **Worker (Celery)** | **VM / VPS (Docker Compose)** | Dijalankan via Docker container `celery`. Wajib rebuild bersamaan dengan backend. |
| **Database (PostgreSQL)** | **VM / VPS (Docker Compose)** | Container `postgres`. Skema diatur via Alembic migrations. |
| **Cache / Queue (Redis)** | **VM / VPS (Docker Compose)** | Container `redis`. |

> [!WARNING]
> **JANGAN PERNAH** mencoba mem-build frontend di Docker VPS atau menambahkan frontend service ke dalam `docker-compose.yml` VM. Segala kompilasi dan serving frontend sepenuhnya ditangani oleh Vercel.

---

## 🔄 Workflow: Deploy ke VM / VPS (Referensi Permanen)

### Setelah Pull dari Repo di VM Backend

Jika ada perubahan di folder `backend/alembic/versions/`, dependency, atau logic backend:

```bash
# 1. Pull code terbaru dari repository
git pull origin main

# 2. Rebuild backend & celery (WAJIB jika ada perubahan logic, dataset master, atau dependency)
docker compose build --no-cache backend celery && docker compose up -d backend celery

# 3. Jalankan migration database (jika ada file migrasi baru)
docker compose exec -T backend alembic upgrade head

# 4. Verifikasi status container & migration
docker compose ps
docker compose exec -T backend alembic current
```

### Jika Hanya Perubahan Kecil Tanpa Perubahan Dependency / Dockerfile

```bash
git pull origin main
docker compose restart backend celery
```

### Deployment Frontend (Vercel)
- Cukup lakukan `git push origin main`.
- Vercel akan otomatis mendeteksi perubahan di folder `frontend/` dan mentrigger production deployment.
- Pastikan environment variables di dashboard Vercel (`NEXT_PUBLIC_API_URL`) tetap mengarah ke domain backend VPS yang aktif.

---

## 📊 Database Connection Info

| Environment | Database Name | User | Host |
|-------------|---------------|------|------|
| VM Docker   | `moip_db`     | `moip` | `postgres:5432` |

### Perintah Database

```bash
# Connect ke database
docker compose exec -T postgres psql -U moip -d moip_db

# Lihat struktur tabel
docker compose exec -T postgres psql -U moip -d moip_db -c "\d {nama_tabel}"

# Lihat semua tabel
docker compose exec -T postgres psql -U moip -d moip_db -c "\dt"
```

---

## ✅ Pre-Commit Checklist

Sebelum commit code yang mengubah model database:

- [ ] Migration file sudah dibuat dengan `down_revision` yang benar
- [ ] Migration sudah ditest di local dengan `alembic upgrade head`
- [ ] Migration bisa di-downgrade dengan `alembic downgrade -1`
- [ ] Tidak ada conflict dengan migration lain
- [ ] Code sudah di-push ke repo
- [ ] TROUBLESHOOT.md diupdate jika ada error pattern baru
