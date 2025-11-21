import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- API Keys and Credentials ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")
if GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
    print("Warning: GEMINI_API_KEY not set in environment. Using placeholder.")

# --- Gemini Model Configuration ---
GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-09-2025"
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL_NAME}:generateContent"

# --- AIF Mandate Pillars (Long lines wrapped) ---
AIF_MANDATES = [
    "Pillar 1: Climate Resilience",
    "Pillar 2: Sustainable Agriculture",
    "Pillar 3: Regenerative Infrastructure",
    (
        "Pillar 4: Systemic Reform (Including Immigrants, "
        "Orphans/Ages, Veterans, and Native American support)"
    ),
]

# --- Job Finder Configuration (Mock Example, Long lines wrapped) ---
MOCK_JOB_SOURCES = [
    {
        "name": "EcoJobs Central",
        "url": (
            "https://www.ecojobscentral.com/api/v1/jobs?mandate=climate-tech"
            "&sort=date"
        ),
        "parser": "parse_ecojobs"
    },
    {
        "name": "Impact Career Hub",
        "url": (
            "https://www.impacthub.org/api/jobs?keywords=ai,sustainability"
            "&location=remote"
        ),
        "parser": "parse_impacthub"
    },
    {
        "name": "Veteran Tech Leads",
        "url": (
            "https://www.veterantechleads.com/jobs?focus=reform&level=senior"
            "&page=1"
        ),
        "parser": "parse_veteran_tech"
    },
]

# --- Other Settings ---
MAX_JOB_LEADS = 50
CACHE_EXPIRY_HOURS = 24
