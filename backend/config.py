import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- API Keys and Credentials ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
    print("Warning: GEMINI_API_KEY not set in environment. Using placeholder.")

# --- Gemini Model Configuration ---
GEMINI_MODEL_NAME = os.getenv(
    "GEMINI_MODEL_NAME", "gemini-2.5-flash-preview-09-2025")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL_NAME}:generateContent"

# --- AIF Mandate Pillars (Long lines wrapped) ---
# These mandates guide the LLM's job analysis.
AIF_MANDATES = [
    "Pillar 1: Climate Resilience and Green Technology "
    "(e.g., carbon capture, sustainable energy, climate modeling)",
    "Pillar 2: Regenerative Agriculture and Biodiversity "
    "(e.g., soil health, agri-robotics, non-GMO seed development)",
    "Pillar 3: Equitable Access to Resources "
    "(e.g., water systems, sustainable infrastructure, low-cost housing models)",
    "Pillar 4: Systemic Reform and Social Justice "
    "(e.g., labor rights, veteran support, orphan/ages support, immigrant resources)",
]

# --- Mock Job Sources (Used by job_finder.py) ---
# In a real app, these would hold credentials or endpoints for external job APIs.
MOCK_JOB_SOURCES = [
    {"name": "EcoJobs Central", "api_url": "mock_url/eco"},
    {"name": "Impact Career Hub", "api_url": "mock_url/impact"},
    {"name": "Veteran Tech Leads", "api_url": "mock_url/veteran"}
]

# --- Other Settings ---
MAX_JOB_LEADS = 50
CACHE_EXPIRY_HOURS = 24
