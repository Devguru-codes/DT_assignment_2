from __future__ import annotations


def login_as(client, email: str, password: str) -> None:
    response = client.post("/login", json={"email": email, "password": password})
    assert response.status_code == 200


def test_manager_approves_leave_within_threshold(app):
    employee_client, manager_client = _build_clients(app)
    login_as(employee_client, "employee@corp.local", "Employee@123")
    login_as(manager_client, "manager@corp.local", "Manager@123")

    create_response = employee_client.post(
        "/leave-requests",
        json={
            "leave_type": "Annual Leave",
            "start_date": "2026-05-01",
            "end_date": "2026-05-14",
            "reason": "Planned vacation",
        },
    )
    assert create_response.status_code == 201
    request_id = create_response.get_json()["leave_request"]["id"]

    review_response = manager_client.post(
        f"/leave-requests/{request_id}/manager-review",
        json={"action": "approve", "comments": "Approved within threshold"},
    )

    assert review_response.status_code == 200
    payload = review_response.get_json()
    assert payload["leave_request"]["status"] == "manager_approved"


def test_long_leave_escalates_to_admin_then_admin_approves(app):
    employee_client, manager_client, admin_client = _build_clients(app, include_admin=True)
    login_as(employee_client, "employee@corp.local", "Employee@123")
    login_as(manager_client, "manager@corp.local", "Manager@123")
    login_as(admin_client, "admin@corp.local", "Admin@123")

    create_response = employee_client.post(
        "/leave-requests",
        json={
            "leave_type": "Medical Leave",
            "start_date": "2026-06-01",
            "end_date": "2026-06-20",
            "reason": "Recovery period",
        },
    )
    request_id = create_response.get_json()["leave_request"]["id"]

    manager_review = manager_client.post(
        f"/leave-requests/{request_id}/manager-review",
        json={"action": "approve", "comments": "Escalating due to duration"},
    )
    assert manager_review.status_code == 200
    assert manager_review.get_json()["leave_request"]["status"] == "escalated_to_admin"

    admin_review = admin_client.post(
        f"/leave-requests/{request_id}/admin-review",
        json={"action": "approve", "comments": "Approved after escalation"},
    )
    assert admin_review.status_code == 200
    assert admin_review.get_json()["leave_request"]["status"] == "admin_approved"


def test_admin_can_override_manager_rejection(app):
    employee_client, manager_client, admin_client = _build_clients(app, include_admin=True)
    login_as(employee_client, "employee@corp.local", "Employee@123")
    login_as(manager_client, "manager@corp.local", "Manager@123")
    login_as(admin_client, "admin@corp.local", "Admin@123")

    create_response = employee_client.post(
        "/leave-requests",
        json={
            "leave_type": "Special Leave",
            "start_date": "2026-07-10",
            "end_date": "2026-07-11",
            "reason": "Personal matter",
        },
    )
    request_id = create_response.get_json()["leave_request"]["id"]

    manager_reject = manager_client.post(
        f"/leave-requests/{request_id}/manager-review",
        json={"action": "reject", "comments": "High workload"},
    )
    assert manager_reject.status_code == 200
    assert manager_reject.get_json()["leave_request"]["status"] == "rejected_by_manager"

    admin_override = admin_client.post(
        f"/leave-requests/{request_id}/admin-review",
        json={"action": "approve", "comments": "Override approved"},
    )
    assert admin_override.status_code == 200
    assert admin_override.get_json()["leave_request"]["status"] == "admin_approved"


def test_leave_request_requires_all_fields(client, login_json):
    login_json("employee@corp.local", "Employee@123")

    response = client.post(
        "/leave-requests",
        json={"leave_type": "Casual Leave", "reason": "Short break"},
    )

    assert response.status_code == 400
    payload = response.get_json()
    assert "start_date" in payload["message"]
    assert "end_date" in payload["message"]


def test_manager_review_requires_action(client, login_json):
    login_json("employee@corp.local", "Employee@123")
    create_response = client.post(
        "/leave-requests",
        json={
            "leave_type": "Annual Leave",
            "start_date": "2026-08-01",
            "end_date": "2026-08-02",
            "reason": "Weekend extension",
        },
    )
    request_id = create_response.get_json()["leave_request"]["id"]

    manager_client = client.application.test_client()
    login_as(manager_client, "manager@corp.local", "Manager@123")

    response = manager_client.post(f"/leave-requests/{request_id}/manager-review", json={})

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Bad Request"
    assert "action" in payload["message"]


def _build_clients(app, include_admin: bool = False):
    employee_client = app.test_client()
    manager_client = app.test_client()
    if include_admin:
        admin_client = app.test_client()
        return employee_client, manager_client, admin_client
    return employee_client, manager_client
