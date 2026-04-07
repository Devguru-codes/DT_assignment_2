# IT Prototyping of Approval & Authorization System

This repository contains a backend prototype for a **Corporate Leave Approval System** built as an **IT Prototyping of Approval & Authorization System** using Design Thinking principles.

The prototype focuses on a realistic enterprise workflow:

- employees submit leave requests
- HR managers review requests within their approval threshold
- admins handle escalations and can override manager decisions
- the system protects role-based access and handles exceptions safely
- a separate federated learning mock demonstrates privacy-preserving analytics on decentralized leave data

## Project Objective

The goal of this project is to translate a business approval problem into a working backend prototype that demonstrates:

- authentication and authorization
- role-based routing and access control
- approval workflow orchestration
- exception handling and lockout protection
- decentralized analytics concepts through federated learning

This is not just a CRUD demo. It models how approval decisions depend on:

- user identity
- organizational role
- configured approval authority
- leave duration and request attributes
- previous approval outcomes

## Design Thinking Lens

The system was structured around the Design Thinking mindset:

- **Empathize:** understand pain points for employees, managers, and admins in approval-heavy workflows
- **Define:** formalize approval rules, escalation boundaries, and access control responsibilities
- **Ideate:** design a backend flow that is simple to demo but still reflects enterprise logic
- **Prototype:** implement a working Flask + SQLite backend with role-based behavior
- **Test:** validate the workflow with pytest and scenario-based API checks

## Tech Stack

- Python 3.11+
- Flask
- Flask-Login
- Flask-SQLAlchemy
- SQLite
- pytest

## What The Project Includes

### 1. Login and Authorization

The system defines three primary roles:

- `Employee`
- `HRManager`
- `Admin`

Each role authenticates through the same login entry point, but dashboard access is routed based on role.

### 2. Leave Approval Workflow

The approval policy implemented is:

- employees create leave requests
- HR managers review requests first
- requests of **14 days or fewer** can be approved by the HR manager
- requests of **more than 14 days** are escalated to the admin
- admins can approve or reject escalated requests
- admins can also override a manager rejection

### 3. Exception Handling

The backend supports structured failure handling for:

- invalid login attempts
- temporary account lockout after repeated failures
- forbidden access to protected resources
- missing required request data
- invalid request formats such as bad dates

### 4. Federated Learning Concept Mock

The file `federated_learning_mock.py` is a standalone simulation that demonstrates the idea of decentralized data processing.

It shows:

- each node keeps its own raw leave data locally
- local processing converts raw records into processed parameters
- only processed parameters are sent to the central aggregator
- the central node writes a privacy-preserving global model summary to `aggregate.json`

This is a conceptual analytics layer, not part of the transactional approval API.

## Repository Structure

```text
dt_ass_2/
|-- app.py
|-- federated_learning_mock.py
|-- requirements.txt
|-- README.md
|-- tests/
|   |-- conftest.py
|   |-- test_auth.py
|   |-- test_leave_workflow.py
|   `-- test_federated_mock.py
`-- .gitignore
```

## Phase-by-Phase Delivery

This repository was intentionally built in five stages:

### Phase 0: Project Initialization

- initialized Git and virtual environment
- added `.gitignore`
- defined project dependencies in `requirements.txt`

### Phase 1: Login and Authorization System

- created user models for employee, HR manager, and admin
- implemented secure password hashing
- implemented login and logout
- added role-based dashboard routing

### Phase 2: RBAC and Approval Data Dependency Flow

- added `LeaveRequest` model
- added employee leave submission endpoint
- added manager approval and rejection endpoints
- added escalation to admin based on leave duration
- added admin override capability

### Phase 3: Exception Handling

- added invalid login tracking
- added lockout after repeated failed logins
- added structured `400` and `403` responses
- improved input validation for required fields

### Phase 4: Federated Learning Concept Mockup

- created decentralized training mock
- created local node result files
- created aggregated global output
- kept raw records local to each node

## Setup

### 1. Create and activate virtual environment

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 3. Run the backend

```powershell
python app.py
```

The Flask backend starts with a SQLite database and seeds demo users automatically.

## Demo Accounts

- Employee: `employee@corp.local` / `Employee@123`
- HR Manager: `manager@corp.local` / `Manager@123`
- Admin: `admin@corp.local` / `Admin@123`

## Core API Endpoints

- `POST /login`
- `POST /logout`
- `GET /dashboard`
- `GET /dashboard/employee`
- `GET /dashboard/hr-manager`
- `GET /dashboard/admin`
- `POST /leave-requests`
- `GET /leave-requests`
- `POST /leave-requests/<id>/manager-review`
- `POST /leave-requests/<id>/admin-review`

## Example Approval Flow

1. Employee logs in.
2. Employee submits leave details.
3. Request enters `pending_manager_review`.
4. HR manager reviews the request.
5. If leave duration is within the manager threshold, the request becomes `manager_approved`.
6. If the duration exceeds the threshold, the request becomes `escalated_to_admin`.
7. Admin reviews the escalated request and records a final decision.

## Testing

The project includes pytest coverage for:

- successful and failed login behavior
- account lockout protection
- role-based access restrictions
- leave approval and escalation workflow
- admin override behavior
- federated learning local processing and aggregation outputs

Run the tests with:

```powershell
pytest
```

## Federated Learning Mock Usage

Run the standalone mock with:

```powershell
python federated_learning_mock.py
```

Expected behavior:

- local node outputs are written under `federated_nodes/`
- a central summary is written to `aggregate.json`
- only processed parameters are aggregated centrally

## Current Prototype Limitations

This is a strong backend prototype, but it is still a prototype. A production-ready version should add:

- API schema documentation with OpenAPI or Swagger
- database migrations with Alembic or Flask-Migrate
- full audit logging
- JWT or token-based auth for frontend/mobile integrations
- manager-to-employee relational mapping
- request history and notification system
- real decentralized nodes or microservices for federated analytics
- secure parameter exchange and model versioning

## Why This Project Matters

Approval systems are common in enterprise software, but they become hard to scale when:

- role boundaries are unclear
- approval authority is inconsistent
- workflows have exceptions and overrides
- analytics need data from multiple departments without centralizing sensitive records

This prototype demonstrates how to model those concerns in code while staying understandable, testable, and extensible.
