import sys
sys.path.append(".")

from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()
    print("Vector extension created if not exists.")