# AI Job Lead Tracker

This is a full-stack application designed to help track job opportunities, particularly those relevant to the Arboreum Impact Fund (AIF) Mandates. The application uses a React/Vite frontend and a Python FastAPI backend, orchestrated via Docker Compose for a seamless development experience.

## 🚀 Development Setup (Volume-Mounted)

This setup uses Docker volumes, allowing you to edit files on your local machine and see changes instantly reflected in the running containers without needing to rebuild the images.

1. Build and Run Services:
    ```
    # Set your environment variables first (replace with your actual secrets)
    export GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
    # IMPORTANT: Ensure this is the full JSON string
    export FIREBASE_CREDENTIALS='YOUR_FIREBASE_SERVICE_ACCOUNT_JSON_STRING'

    docker compose up --build
    ```
    (The `--build` flag ensures the base images and initial dependencies are installed.)
1. Access Points:
   * **Frontend (React/Vite Dev Server)**: http://localhost:5173
   * **Backend (FastAPI)**: http://localhost:8000
   * **Backend Docs (Swagger UI)**: http://localhost:8000/docs

## 🛠️ Local CI/CD Validation

Before committing code, it is essential to run the continuous integration checks locally. These shell scripts run linting, testing, and production builds inside the respective containers, ensuring the environment is stable before pushing to GitHub.

### Setup CI Scripts

Ensure the CI scripts are executable:
```
chmod +x ci_frontend.sh ci_backend.sh
```

### Run All Checks
Execute both scripts to validate the full stack:
```
# Validate the React/Vite Frontend (Lint, Test, and Production Build)
./ci_frontend.sh

# Validate the Python/FastAPI Backend (Lint and Test)
./ci_backend.sh
```
If both scripts report `PASSED`, your changes are verified and ready for public commit.

## 📦 Container Services

| Service    | Technology       | Port | Purpose                                                                                   |
| ---------- | ---------------- | ---- | ----------------------------------------------------------------------------------------- |
| `frontend` | React / Vite     | 5173 | UI for viewing and managing leads.                                                        |
| `backend`  | Python / FastAPI | 8000 | Provides API endpoints for data storage (to be replaced by Firestore) and AI interaction. |
