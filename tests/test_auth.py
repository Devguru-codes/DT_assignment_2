from __future__ import annotations


def test_employee_login_routes_to_employee_dashboard(client, login_json):
    response = login_json("employee@corp.local", "Employee@123")

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["user"]["role"] == "employee"
    assert payload["dashboard_url"] == "/dashboard"

    dashboard_response = client.get("/dashboard", follow_redirects=False)
    assert dashboard_response.status_code == 302
    assert dashboard_response.headers["Location"].endswith("/dashboard/employee")


def test_account_locks_after_three_invalid_attempts(client, login_json):
    for expected_remaining in (2, 1):
        response = login_json("employee@corp.local", "wrong-password")
        assert response.status_code == 401
        payload = response.get_json()
        assert payload["attempts_remaining"] == expected_remaining

    locked_response = login_json("employee@corp.local", "wrong-password")
    assert locked_response.status_code == 423
    locked_payload = locked_response.get_json()
    assert locked_payload["error"] == "Account locked."
    assert "unlock_at" in locked_payload

    correct_password_while_locked = login_json("employee@corp.local", "Employee@123")
    assert correct_password_while_locked.status_code == 423


def test_missing_password_returns_bad_request(login_json):
    response = login_json("employee@corp.local", "")

    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "Bad Request"
    assert "password" in payload["message"]


def test_unauthenticated_access_returns_forbidden(client):
    response = client.get("/dashboard/admin")

    assert response.status_code == 403
    payload = response.get_json()
    assert payload["error"] == "Forbidden"


def test_employee_cannot_access_admin_dashboard(client, login_json):
    login_json("employee@corp.local", "Employee@123")

    response = client.get("/dashboard/admin")

    assert response.status_code == 403
    payload = response.get_json()
    assert payload["message"] == "Admin access only."
