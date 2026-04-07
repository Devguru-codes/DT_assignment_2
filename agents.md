# Corporate Leave Approval System - Codebase Analysis

## Overview
The repository (`dt_ass_2`) contains a Flask-based backend prototype for a Corporate Leave Approval System. It implements Role-Based Access Control (RBAC), an approval hierarchy, and exception handling for a realistic enterprise workflow.

It also contains a federated learning mockup (`federated_learning_mock.py`) to demonstrate privacy-preserving decentralized analytics conceptually.

## Roles
1. **Employee**: Can submit leave requests and view their own requests.
2. **HR Manager**: Can review (approve/reject) leave requests of 14 days or fewer. Requests longer than 14 days are automatically escalated to an Admin.
3. **Admin**: Has global leave oversight. Can approve or reject escalated requests, and override manager rejections.

## Core API Endpoints

### Authentication & Routing
* `POST /login`: Authenticates a user. Implements lockout protection (max 3 failed attempts lock for 15 mins).
* `POST /logout`: Logs the current user out.
* `GET /dashboard`: Redirects to the role-specific dashboard.
* `GET /dashboard/employee`: Employee-specific dashboard data.
* `GET /dashboard/hr-manager`: HR Manager-specific dashboard data.
* `GET /dashboard/admin`: Admin-specific dashboard data.

### Leave Requests
* `POST /leave-requests`: Create a new leave request (Employee only).
* `GET /leave-requests`: Fetch leave requests (Employees see theirs, HR Managers see pending/escalated/approved, Admins see all).
* `POST /leave-requests/<id>/manager-review`: HR Manager approves or rejects a request. Escalates to Admin if duration > limit (14 days).
* `POST /leave-requests/<id>/admin-review`: Admin approves or rejects escalated or previously manager-reviewed requests.

### Miscellaneous
* `GET /`: Root info endpoint returning project metadata and routes.
* `GET /health`: Basic health-check endpoint.

## Database Models & Technologies
* Framework: Flask
* DB: SQLite with SQLAlchemy (`User`, `Employee`, `HRManager`, `Admin`, `LeaveRequest` models)
* Auth: Flask-Login, Werkzeug Security

## Stitch Integration Recommendations
The backend is well-structured and ready to be integrated with a frontend application. It accepts typical JSON payloads and has robust user state management.
