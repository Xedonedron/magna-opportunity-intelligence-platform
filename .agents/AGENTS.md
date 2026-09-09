# MOIP Workspace Rules & Guidelines

- **Deployment Architecture Separation**:
  - **Frontend**: Deployed and managed exclusively via **Vercel** with automatic CI/CD on push to `main`. **NEVER** run or require `docker compose build frontend` on the VPS/server.
  - **Backend & Services**: Self-hosted on VPS via Docker Compose (`backend`, `celery`, `postgres`, `redis`).
  - **Docker Compose Deployment**: Rebuild only backend services on the server: `docker compose build --no-cache backend celery && docker compose up -d backend celery`.
- **Database Model Changes**: Whenever modifying SQLAlchemy models under `backend/app/models/`, always verify or create a corresponding Alembic migration file in `backend/alembic/versions/`.
- **Alembic Migration Revisions**: Ensure `down_revision` matches the current `HEAD` of alembic migrations chain.
- **Troubleshooting Database Issues**: Refer to `moip-dev-guidelines` skill and `TROUBLESHOOT.md` when addressing `UndefinedColumn` or Alembic sync errors.
- **Knowledge Graph Generation**: Use `graphify` skill (`.agents/skills/graphify/SKILL.md`) for turn codebase or documentation into queryable knowledge graphs. Trigger: `/graphify`.

