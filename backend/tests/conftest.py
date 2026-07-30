"""
Pytest fixtures for MOIP backend tests.

Provides database, client, and authentication fixtures.
"""

import os
import uuid
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models import User, Opportunity
from app.services.auth import create_access_token
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

# Map JSONB to JSON for SQLite compatibility in tests
@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)

    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    # Start a nested transaction (savepoint)
    nested = connection.begin_nested()

    # If the app code calls session.commit(), it will end the nested transaction
    # So we need to restart it
    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(session, transaction):
        if transaction.nested and not transaction._parent.nested:
            session.expire_all()
            session.begin_nested()

    yield session

    # Rollback the transaction
    session.close()
    transaction.rollback()
    connection.close()

    # Drop all tables after test
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db: Session) -> TestClient:
    """Create a test client with database dependency override."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid.uuid4(),
        email="test@smartnet.co.id",
        full_name="Test User",
        role="engineer",
        is_active=True,
        google_id="test_google_id_123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def admin_user(db: Session) -> User:
    """Create an admin test user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@smartnet.co.id",
        full_name="Admin User",
        role="admin",
        is_active=True,
        google_id="admin_google_id_123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def lgo_user(db: Session) -> User:
    """Create an LGO (Leads Generation Officer) test user."""
    user = User(
        id=uuid.uuid4(),
        email="lgo@smartnet.co.id",
        full_name="LGO User",
        role="lgo",
        is_active=True,
        google_id="lgo_google_id_123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user: User) -> dict[str, str]:
    """Create authorization headers for the test user."""
    token = create_access_token(data={"sub": str(test_user.id), "email": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_auth_headers(admin_user: User) -> dict[str, str]:
    """Create authorization headers for the admin user."""
    token = create_access_token(data={"sub": str(admin_user.id), "email": admin_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_opportunity(db: Session, test_user: User) -> Opportunity:
    """Create a test opportunity."""
    opportunity = Opportunity(
        id=uuid.uuid4(),
        company_name="Test Company PT",
        customer_needs="Need cloud migration solution",
        industry="Technology",
        status="New",
        created_by=test_user.id,
    )
    db.add(opportunity)
    db.commit()
    db.refresh(opportunity)
    return opportunity