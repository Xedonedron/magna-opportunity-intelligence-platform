# MOIP Workspace Rules & Guidelines

- **Database Model Changes**: Whenever modifying SQLAlchemy models under `backend/app/models/`, always verify or create a corresponding Alembic migration file in `backend/alembic/versions/`.
- **Alembic Migration Revisions**: Ensure `down_revision` matches the current `HEAD` of alembic migrations chain.
- **Troubleshooting Database Issues**: Refer to `moip-dev-guidelines` skill and `TROUBLESHOOT.md` when addressing `UndefinedColumn` or Alembic sync errors.
- **Docker Compose Deployment**: Rebuild the backend container (`docker compose build --no-cache backend && docker compose up -d backend`) whenever new migrations are added before executing `alembic upgrade head`.
