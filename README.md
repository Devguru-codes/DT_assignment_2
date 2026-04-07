# Corporate Leave Approval System (Full Stack)

This repository contains a full-stack **Corporate Leave Approval System** built as an **IT Prototyping Finalization Project** using Python Flask and Vanilla JS + Vite.

The prototype focuses on a realistic enterprise workflow featuring robust RBAC, full responsive dashboards, Chart.js analytics, and automated DOCX generation.

## Project Architecture

### 1. Frontend (Vite + Vanilla JS + Tailwind)
- Runs on `http://localhost:5173`.
- Dynamically rendered Vanilla HTML components utilizing Tailwind CSS styling.
- Interactive Chart.js analytics logic that filters dynamic data points.
- Full role-based rendering (Employee vs Manager vs Admin).
- API proxied cleanly via Vite Configuration to the 5000 port backend.
- Baseline `vitest` implementations running to test DOM elements.

### 2. Backend (Flask + SQLite + python-docx)
- Runs on `http://localhost:5000`.
- Python 3.11+ using SQLAlchemy for ORM structure.
- Handles authorization, lockout mechanisms, threshold calculation (14 days constraints), and DOCX report exports via `python-docx`.
- Employs strict CSRF limits on internal requests alongside thorough Pytest workflows.

### 3. Federated Learning Concept Mock
A standalone simulation that demonstrates the concept of decentralized data processing for leave data aggregation without compromising local privacy states.

## Setup & Running Locally

### 1. Backend Setup
```powershell
# Create and activate virtual environment
python -m venv venv
venv\Scripts\Activate.ps1

# Install logic
pip install -r requirements.txt

# Run Flask backend server
python app.py
```

### 2. Frontend Setup
Open a second separate terminal window:
```powershell
cd frontend
npm install
npx vite --port 5173
```
Then navigate your browser to `http://localhost:5173`.

## Demo Accounts
- Employee: `employee@corp.local` / `Employee@123`
- HR Manager: `manager@corp.local` / `Manager@123`
- Admin: `admin@corp.local` / `Admin@123`

## Testing Submodules

### Python Backend Suite (`pytest`)
Thorough workflow testing mapping the complete lifecycle:
```powershell
pytest tests/
```

### JS Frontend Suite (`vitest`)
DOM stability assumptions:
```powershell
cd frontend
npm run test
```

## Advanced Features
- **DOCX Generation:** Click "Export Report" in either manager or admin dashboards to query the backend `python-docx` stream securely.
- **Analytics Dashboarding:** Live chart population mapped via REST architecture endpoints (`/dashboard/stats`).
- **Account Lockouts:** 3 consecutive fail attempts trigger 15-minute HTTP 423 locks.
