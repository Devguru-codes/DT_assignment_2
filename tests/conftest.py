from __future__ import annotations

from pathlib import Path

import pytest

from app import create_app, db


@pytest.fixture()
def app(tmp_path: Path):
    database_path = tmp_path / "test_leave_approval.db"
    test_app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": f"sqlite:///{database_path}",
        }
    )

    yield test_app

    with test_app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def login_json(client):
    def _login(email: str, password: str):
        return client.post("/login", json={"email": email, "password": password})

    return _login
