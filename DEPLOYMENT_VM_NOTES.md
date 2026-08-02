# 📝 Catatan Perubahan & Rangkuman Deployment VM (MOIP)

Dokumen ini berisi rangkuman seluruh perubahan aplikasi, konfigurasi Nginx reverse proxy, pengaturan environment variables, serta langkah troubleshooting untuk tim/rekan kerja.

---

## 1. Perubahan Aplikasi & Fitur Baru (Source Code)

1. **Fitur Interactive Kanban Board (Drag-and-Drop):**
   - Menambahkan tampilan Kanban di halaman `/opportunities` dengan kemampuan menggeser kartu (*drag-and-drop*) antar 11 status peluang secara *real-time*.
   - Komponen baru: [`KanbanBoard.tsx`](file:///E:/SMG%20-%20Internal/magna_opportunity_intelligence_platform/frontend/src/components/domains/opportunities/KanbanBoard.tsx), [`KanbanColumn.tsx`](file:///E:/SMG%20-%20Internal/magna_opportunity_intelligence_platform/frontend/src/components/domains/opportunities/KanbanColumn.tsx), dan [`KanbanCard.tsx`](file:///E:/SMG%20-%20Internal/magna_opportunity_intelligence_platform/frontend/src/components/domains/opportunities/KanbanCard.tsx).
   - Menggunakan pustaka `@hello-pangea/dnd` dengan *optimistic UI update*.

2. **Migrasi Database PostgreSQL (Alembic):**
   - Menambahkan file migrasi [`f6a7b8c9d0e1_add_financial_fields_to_opportunities.py`](file:///E:/SMG%20-%20Internal/magna_opportunity_intelligence_platform/backend/alembic/versions/f6a7b8c9d0e1_add_financial_fields_to_opportunities.py) untuk menambahkan kolom `potential_revenue` dan `estimated_agenda_date` di tabel `opportunities`.

3. **Robust LocalStorage Error Handling:**
   - Menambahkan penanganan otomatis jika item `moip_user` di `localStorage` bernilai corrupt/invalid agar langsung dibersihkan tanpa menyebabkan `JSON.parse SyntaxError`.

---

## 2. Konfigurasi Nginx Reverse Proxy di VM (`/etc/nginx/sites-available/moip`)

Nginx bertindak sebagai gerbang utama (*Reverse Proxy*) di port SSL 443 yang membagikan lalu lintas ke container Docker:

```nginx
server {
    listen 80;
    server_name moip.cloudwithmagna.com;

    # 1. Routing Frontend Next.js (Container Port 3009)
    location / {
        proxy_pass http://127.0.0.1:3009;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 2. Routing Backend FastAPI (Container Port 8009)
    location /api {
        proxy_pass http://127.0.0.1:8009;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

*Status Sertifikat SSL:* Diaktifkan otomatis via Certbot (`certbot --nginx -d moip.cloudwithmagna.com`).

---

## 3. Pengaturan Variabel Lingkungan (`.env`) di VM

### A. File Frontend (`frontend/.env.local`):
```env
# PENTING: Panggilan API diarahkan ke Nginx SSL (tanpa port 8009)
NEXT_PUBLIC_API_URL=https://moip.cloudwithmagna.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com
```
*(Catatan: Karena Next.js menanamkan variabel `NEXT_PUBLIC_` saat build, setiap ada perubahan file ini WAJIB melakukan `docker compose up -d --build frontend`).*

### B. File Backend (`backend/.env`):
```env
DATABASE_URL=postgresql://moip:moip_secret@postgres:5432/moip_db
SECRET_KEY=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=800933197735-9grufhka8flbpje3iqgaiudplbp2pqot.apps.googleusercontent.com
GOOGLE_WORKSPACE_DOMAIN=magnaglobal.id
APP_NAME=Magna Opportunity Intelligence Platform
APP_VERSION=0.1.0
FRONTEND_URL=https://moip.cloudwithmagna.com
```

---

## 4. SOP Menjalankan Update Aplikasi di VM (Cheat Sheet)

Jika tim melakukan *update* kodingan di GitHub, jalankan urutan perintah berikut di VM:

```bash
cd ~/magna-opportunity-intelligence-platform

# 1. Tarik kode terbaru dari GitHub
git pull origin main

# 2. Jalankan migrasi database jika ada perubahan tabel
docker compose exec -T backend alembic upgrade head

# 3. Build & restart container
docker compose up -d --build
```
