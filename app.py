from __future__ import annotations

import os
from typing import Any

from flask import Flask, abort, jsonify, redirect, request, url_for
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()
login_manager = LoginManager()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, index=True)
    is_active_user = db.Column(db.Boolean, default=True, nullable=False)

    __mapper_args__ = {
        "polymorphic_on": role,
        "polymorphic_identity": "user",
    }

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_active(self) -> bool:
        return self.is_active_user

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
        }


class Employee(User):
    __tablename__ = "employees"

    id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    department = db.Column(db.String(100), nullable=False)
    manager_name = db.Column(db.String(120), nullable=False)

    __mapper_args__ = {
        "polymorphic_identity": "employee",
    }

    def to_dict(self) -> dict[str, Any]:
        payload = super().to_dict()
        payload.update(
            {
                "department": self.department,
                "manager_name": self.manager_name,
            }
        )
        return payload


class HRManager(User):
    __tablename__ = "hr_managers"

    id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    region = db.Column(db.String(100), nullable=False)
    approval_limit_days = db.Column(db.Integer, nullable=False, default=14)

    __mapper_args__ = {
        "polymorphic_identity": "hr_manager",
    }

    def to_dict(self) -> dict[str, Any]:
        payload = super().to_dict()
        payload.update(
            {
                "region": self.region,
                "approval_limit_days": self.approval_limit_days,
            }
        )
        return payload


class Admin(User):
    __tablename__ = "admins"

    id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    access_scope = db.Column(db.String(100), nullable=False)

    __mapper_args__ = {
        "polymorphic_identity": "admin",
    }

    def to_dict(self) -> dict[str, Any]:
        payload = super().to_dict()
        payload.update({"access_scope": self.access_scope})
        return payload


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.getenv("SECRET_KEY", "phase-1-dev-secret"),
        SQLALCHEMY_DATABASE_URI=os.getenv("DATABASE_URL", "sqlite:///leave_approval.db"),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
    )
    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    login_manager.init_app(app)

    @login_manager.unauthorized_handler
    def unauthorized() -> Any:
        return (
            jsonify(
                {
                    "error": "Forbidden",
                    "message": "Authentication is required to access this resource.",
                }
            ),
            403,
        )

    @app.errorhandler(403)
    def handle_forbidden(error: Any) -> Any:
        description = getattr(error, "description", "Access denied.")
        return jsonify({"error": "Forbidden", "message": description}), 403

    @app.get("/")
    def root() -> Any:
        return jsonify(
            {
                "message": "Corporate Leave Approval System backend is running.",
                "project": "IT Prototyping of Approval & Authorization System",
                "domain": "Corporate Leave Approval System",
                "phases_completed": 1,
                "routes": [
                    "POST /login",
                    "POST /logout",
                    "GET /dashboard",
                    "GET /dashboard/employee",
                    "GET /dashboard/hr-manager",
                    "GET /dashboard/admin",
                ],
            }
        )

    @app.post("/login")
    def login() -> Any:
        payload = request.get_json(silent=True) or {}
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({"error": "Invalid credentials."}), 401

        login_user(user)
        return jsonify(
            {
                "message": "Login successful.",
                "user": user.to_dict(),
                "dashboard_url": url_for("dashboard", _external=False),
            }
        )

    @app.post("/logout")
    @login_required
    def logout() -> Any:
        logout_user()
        return jsonify({"message": "Logout successful."})

    @app.get("/dashboard")
    @login_required
    def dashboard() -> Any:
        if current_user.role == "employee":
            return redirect(url_for("employee_dashboard"))
        if current_user.role == "hr_manager":
            return redirect(url_for("hr_manager_dashboard"))
        if current_user.role == "admin":
            return redirect(url_for("admin_dashboard"))
        abort(403, description="Unsupported role.")

    @app.get("/dashboard/employee")
    @login_required
    def employee_dashboard() -> Any:
        if current_user.role != "employee":
            abort(403, description="Employee access only.")
        return jsonify(
            {
                "dashboard": "employee",
                "message": "Welcome to the employee dashboard.",
                "profile": current_user.to_dict(),
            }
        )

    @app.get("/dashboard/hr-manager")
    @login_required
    def hr_manager_dashboard() -> Any:
        if current_user.role != "hr_manager":
            abort(403, description="HR Manager access only.")
        return jsonify(
            {
                "dashboard": "hr_manager",
                "message": "Welcome to the HR manager dashboard.",
                "profile": current_user.to_dict(),
            }
        )

    @app.get("/dashboard/admin")
    @login_required
    def admin_dashboard() -> Any:
        if current_user.role != "admin":
            abort(403, description="Admin access only.")
        return jsonify(
            {
                "dashboard": "admin",
                "message": "Welcome to the admin dashboard.",
                "profile": current_user.to_dict(),
            }
        )

    with app.app_context():
        db.create_all()
        seed_demo_users()

    return app


@login_manager.user_loader
def load_user(user_id: str) -> User | None:
    return db.session.get(User, int(user_id))


def seed_demo_users() -> None:
    if User.query.count() > 0:
        return

    seed_accounts: list[User] = [
        Employee(
            full_name="Evelyn Employee",
            email="employee@corp.local",
            department="Engineering",
            manager_name="Harish Manager",
        ),
        HRManager(
            full_name="Harish Manager",
            email="manager@corp.local",
            region="APAC",
            approval_limit_days=14,
        ),
        Admin(
            full_name="Aarav Admin",
            email="admin@corp.local",
            access_scope="Global leave oversight",
        ),
    ]

    passwords = {
        "employee@corp.local": "Employee@123",
        "manager@corp.local": "Manager@123",
        "admin@corp.local": "Admin@123",
    }

    for account in seed_accounts:
        account.set_password(passwords[account.email])
        db.session.add(account)

    db.session.commit()


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
