# MOIP Workspace Rules & Guidelines

- **Deployment Architecture Separation**:
  - **Frontend**: Deployed and managed exclusively via **Vercel** with automatic CI/CD on push to `main`. **NEVER** run or require `docker compose build frontend` on the VPS/server.
  - **Backend & Services**: Self-hosted on VPS via Docker Compose (`backend`, `celery`, `postgres`, `redis`).
  - **Docker Compose Deployment**: Rebuild only backend services on the server: `docker compose build --no-cache backend celery && docker compose up -d backend celery`.
- **Database Model Changes**: Whenever modifying SQLAlchemy models under `backend/app/models/`, always verify or create a corresponding Alembic migration file in `backend/alembic/versions/`.
- **Alembic Migration Revisions**: Ensure `down_revision` matches the current `HEAD` of alembic migrations chain.
- **Automated Validation & Push Policy**: Once code changes pass verification and validation checks (syntax check, TypeScript typecheck, tests), commit and push to `origin main` directly.
- **VPS Deployment Guidelines**: The standard VPS pull and deployment procedures are centralized in `.agents/skills/moip-dev-guidelines/SKILL.md`. Do **NOT** repetitively spam or recite the full copy-paste `git pull / docker compose` commands in every single assistant turn unless explicitly requested by the user.
- **Knowledge Graph Generation**: Use `graphify` skill (`.agents/skills/graphify/SKILL.md`) for turn codebase or documentation into queryable knowledge graphs. Trigger: `/graphify`.

---

## MANDATORY RULE: Knowledge Graph Navigation (Graphify)
Setiap developer atau AI agent yang berinteraksi dengan repositori MOIP **WAJIB** memanfaatkan knowledge graph Graphify di `graphify-out/` sebelum melakukan penjelajahan manual, refactoring, atau modifikasi kode.

Dilarang melakukan pencarian teks/grep masif secara membabi-buta tanpa terlebih dahulu mengecek dependensi, relasi modul, dan struktur arsitektur pada graph.

### Artifacts yang Tersedia:
- **Index Wiki Agen:** `graphify-out/wiki/index.md` (terindeks per modul & komunitas arsitektur)
- **Ringkasan Arsitektur & Klaster:** `graphify-out/GRAPH_REPORT.md`
- **Data Graph:** `graphify-out/graph.json`
- **Visualisasi Arsitektur & Relasi:** `graphify-out/graph.html`
- **Visualisasi Call-Flow & Urutan Eksekusi:** `graphify-out/magna-opportunity-intelligence-platform-callflow.html`

### 4 Aturan Alur Kerja Koding (Coding Workflow):
1. **SEBELUM KODING (Reconnaissance & Blast Radius):**
   - Cek alur atau temukan node relevan:
     ```bash
     graphify query "<alur fitur atau kata kunci>"
     ```
   - Pahami detail kelas/fungsi/komponen dan koneksinya:
     ```bash
     graphify explain "<NamaSimbol atau path::Simbol>"
     ```
   - Cek rantai panggilan antar dua komponen:
     ```bash
     graphify path "<SimbolAsal>" "<SimbolTujuan>"
     ```
   - **Wajib Analisis Dampak (Blast Radius)** sebelum mengubah fungsi/model/file:
     ```bash
     graphify affected "<path/ke/file atau Simbol>"
     ```
     Periksa semua caller, importer, dan test yang berpotensi terdampak oleh perubahan.

2. **SAAT KODING (Contextual Accuracy):**
   - Manfaatkan dokumentasi modul yang relevan di `graphify-out/wiki/` untuk memastikan konvensi penamaan, schema Pydantic/TypeScript, dan pola desain yang sudah ada tetap konsisten.

3. **SETELAH KODING (Post-Edit Synchronization):**
   - Setelah menambah, mengubah, atau menghapus kode di `frontend/`, `backend/`, maupun `scripts/`, **WAJIB** jalankan:
     ```bash
     graphify update .
     ```
     Perintah ini berjalan cepat (AST-only lokal tanpa biaya API) untuk menjaga graph, laporan, dan visualisasi tetap sinkron dengan kode terbaru.

4. **VERIFIKASI & KOMIT:**
   - Jalankan uji tipe dan validasi (misal: pytest di backend, build/lint di frontend) sebelum melakukan push.
