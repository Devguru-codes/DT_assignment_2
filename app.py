from __future__ import annotations

import os
from datetime import date, datetime, timedelta
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
from sqlalchemy import inspect, text
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


db = SQLAlchemy()
login_manager = LoginManager()
MAX_LOGIN_ATTEMPTS = 3
LOCKOUT_MINUTES = 15


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, index=True)
    is_active_user = db.Column(db.Boolean, default=True, nullable=False)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)

    __mapper_args__ = {
        "polymorphic_on": role,
        "polymorphic_identity": "user",
    }

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def is_locked(self) -> bool:
        return bool(self.locked_until and self.locked_until > datetime.utcnow())

    def reset_login_protection(self) -> None:
        self.failed_login_attempts = 0
        self.locked_until = None

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


class LeaveRequest(db.Model):
    __tablename__ = "leave_requests"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey("employees.id"), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey("hr_managers.id"), nullable=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admins.id"), nullable=True)
    leave_type = db.Column(db.String(50), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_days = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(
        db.String(50),
        nullable=False,
        default="pending_manager_review",
        index=True,
    )
    manager_comments = db.Column(db.Text, nullable=True)
    admin_comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    employee = db.relationship("Employee", foreign_keys=[employee_id])
    manager = db.relationship("HRManager", foreign_keys=[manager_id])
    admin = db.relationship("Admin", foreign_keys=[admin_id])

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "employee_name": self.employee.full_name if self.employee else None,
            "manager_id": self.manager_id,
            "admin_id": self.admin_id,
            "leave_type": self.leave_type,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "total_days": self.total_days,
            "reason": self.reason,
            "status": self.status,
            "manager_comments": self.manager_comments,
            "admin_comments": self.admin_comments,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


def parse_iso_date(value: str, field_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid ISO date (YYYY-MM-DD).") from exc


def require_fields(payload: dict[str, Any], required_fields: list[str]) -> None:
    missing_fields: list[str] = []

    for field_name in required_fields:
        value = payload.get(field_name)
        if value is None:
            missing_fields.append(field_name)
        elif isinstance(value, str) and not value.strip():
            missing_fields.append(field_name)

    if missing_fields:
        abort(400, description=f"Missing required field(s): {', '.join(missing_fields)}.")


def ensure_security_columns() -> None:
    existing_columns = {
        column["name"] for column in inspect(db.engine).get_columns("users")
    }

    with db.engine.begin() as connection:
        if "failed_login_attempts" not in existing_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"
                )
            )
        if "locked_until" not in existing_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN locked_until DATETIME"))


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

    @app.errorhandler(400)
    def handle_bad_request(error: Any) -> Any:
        description = getattr(error, "description", "Bad request.")
        return jsonify({"error": "Bad Request", "message": description}), 400

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
                "phases_completed": 4,
                "routes": [
                    "POST /login",
                    "POST /logout",
                    "GET /dashboard",
                    "GET /dashboard/employee",
                    "GET /dashboard/hr-manager",
                    "GET /dashboard/admin",
                    "POST /leave-requests",
                    "GET /leave-requests",
                    "POST /leave-requests/<id>/manager-review",
                    "POST /leave-requests/<id>/admin-review",
                ],
            }
        )

    @app.get("/health")
    def health() -> Any:
        return jsonify({"status": "ok"})

    @app.post("/login")
    def login() -> Any:
        payload = request.get_json(silent=True) or {}
        require_fields(payload, ["email", "password"])

        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        user = User.query.filter_by(email=email).first()
        if user and user.is_locked():
            return (
                jsonify(
                    {
                        "error": "Account locked.",
                        "message": "Too many invalid login attempts. Try again later.",
                        "unlock_at": user.locked_until.isoformat(),
                    }
                ),
                423,
            )

        if not user or not user.check_password(password):
            if user:
                user.failed_login_attempts += 1
                attempts_remaining = max(MAX_LOGIN_ATTEMPTS - user.failed_login_attempts, 0)

                if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
                    user.locked_until = datetime.utcnow() + timedelta(
                        minutes=LOCKOUT_MINUTES
                    )
                    db.session.commit()
                    return (
                        jsonify(
                            {
                                "error": "Account locked.",
                                "message": "Too many invalid login attempts. Try again later.",
                                "unlock_at": user.locked_until.isoformat(),
                            }
                        ),
                        423,
                    )

                db.session.commit()
                return (
                    jsonify(
                        {
                            "error": "Invalid credentials.",
                            "message": "The email or password is incorrect.",
                            "attempts_remaining": attempts_remaining,
                        }
                    ),
                    401,
                )

            return jsonify({"error": "Invalid credentials."}), 401

        user.reset_login_protection()
        db.session.commit()
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
                "next_step": "Submit leave requests for manager approval.",
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
                "next_step": "Review employee leave requests under the approval limit.",
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
                "next_step": "Handle escalations and override approvals when required.",
            }
        )

    @app.post("/leave-requests")
    @login_required
    def create_leave_request() -> Any:
        if current_user.role != "employee":
            abort(403, description="Only employees can create leave requests.")

        payload = request.get_json(silent=True) or {}
        require_fields(payload, ["leave_type", "reason", "start_date", "end_date"])

        leave_type = payload.get("leave_type", "").strip()
        reason = payload.get("reason", "").strip()
        start_date_raw = payload.get("start_date")
        end_date_raw = payload.get("end_date")

        try:
            start_date = parse_iso_date(start_date_raw, "start_date")
            end_date = parse_iso_date(end_date_raw, "end_date")
        except ValueError as exc:
            abort(400, description=str(exc))

        if end_date < start_date:
            abort(400, description="end_date must be on or after start_date.")

        total_days = (end_date - start_date).days + 1
        leave_request = LeaveRequest(
            employee_id=current_user.id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            total_days=total_days,
            reason=reason,
            status="pending_manager_review",
        )
        db.session.add(leave_request)
        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Leave request submitted for manager review.",
                    "leave_request": leave_request.to_dict(),
                }
            ),
            201,
        )

    @app.get("/leave-requests")
    @login_required
    def list_leave_requests() -> Any:
        if current_user.role == "employee":
            records = LeaveRequest.query.filter_by(employee_id=current_user.id).all()
        elif current_user.role == "hr_manager":
            records = LeaveRequest.query.filter(
                LeaveRequest.status.in_(
                    ["pending_manager_review", "escalated_to_admin", "manager_approved"]
                )
            ).all()
        elif current_user.role == "admin":
            records = LeaveRequest.query.all()
        else:
            abort(403, description="Unsupported role.")

        return jsonify(
            {
                "count": len(records),
                "leave_requests": [record.to_dict() for record in records],
            }
        )

    @app.post("/leave-requests/<int:request_id>/manager-review")
    @login_required
    def manager_review(request_id: int) -> Any:
        if current_user.role != "hr_manager":
            abort(403, description="HR Manager access only.")

        leave_request = db.session.get(LeaveRequest, request_id)
        if not leave_request:
            return jsonify({"error": "Leave request not found."}), 404

        if leave_request.status != "pending_manager_review":
            return (
                jsonify(
                    {
                        "error": "Only requests pending manager review can be processed by HR managers."
                    }
                ),
                409,
            )

        payload = request.get_json(silent=True) or {}
        require_fields(payload, ["action"])
        action = payload.get("action", "").strip().lower()
        comments = payload.get("comments", "").strip()

        if action not in {"approve", "reject"}:
            abort(400, description="action must be either approve or reject.")

        leave_request.manager_id = current_user.id
        leave_request.manager_comments = comments or None

        if action == "reject":
            leave_request.status = "rejected_by_manager"
            db.session.commit()
            return jsonify(
                {
                    "message": "Leave request rejected by manager.",
                    "leave_request": leave_request.to_dict(),
                }
            )

        manager_limit = getattr(current_user, "approval_limit_days", 14)

        if leave_request.total_days <= manager_limit:
            leave_request.status = "manager_approved"
            db.session.commit()
            return jsonify(
                {
                    "message": "Leave request approved by manager within the configured approval threshold.",
                    "leave_request": leave_request.to_dict(),
                }
            )

        leave_request.status = "escalated_to_admin"
        db.session.commit()
        return jsonify(
            {
                "message": "Leave request exceeds manager threshold and was escalated to admin.",
                "leave_request": leave_request.to_dict(),
            }
        )

    @app.post("/leave-requests/<int:request_id>/admin-review")
    @login_required
    def admin_review(request_id: int) -> Any:
        if current_user.role != "admin":
            abort(403, description="Admin access only.")

        leave_request = db.session.get(LeaveRequest, request_id)
        if not leave_request:
            return jsonify({"error": "Leave request not found."}), 404

        if leave_request.status not in {
            "escalated_to_admin",
            "manager_approved",
            "rejected_by_manager",
        }:
            return (
                jsonify(
                    {
                        "error": "Admin review is only available for escalated, manager-approved, or manager-rejected requests."
                    }
                ),
                409,
            )

        payload = request.get_json(silent=True) or {}
        require_fields(payload, ["action"])
        action = payload.get("action", "").strip().lower()
        comments = payload.get("comments", "").strip()

        if action not in {"approve", "reject"}:
            abort(400, description="action must be approve or reject.")

        leave_request.admin_id = current_user.id
        leave_request.admin_comments = comments or None

        if action == "approve":
            leave_request.status = "admin_approved"
        else:
            leave_request.status = "admin_rejected"

        db.session.commit()
        return jsonify(
            {
                "message": "Admin decision recorded successfully.",
                "leave_request": leave_request.to_dict(),
            }
        )

    with app.app_context():
        db.create_all()
        ensure_security_columns()
        seed_demo_users()
        sync_demo_configuration()

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


def sync_demo_configuration() -> None:
    manager = User.query.filter_by(email="manager@corp.local").first()
    if isinstance(manager, HRManager) and manager.approval_limit_days != 14:
        manager.approval_limit_days = 14
        db.session.commit()


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
