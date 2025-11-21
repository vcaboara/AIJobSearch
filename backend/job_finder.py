"""
Backend worker that uses Google Gemini API to find job leads based on user resume and query,
and saves them to Firebase Firestore.
"""
import os
import json
from datetime import datetime

# Firebase imports (assuming you install firebase-admin via requirements.txt)
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("Firebase Admin SDK not found. "
          "Please ensure 'firebase-admin' is in requirements.txt and installed.")
    exit()

# Google GenAI imports (assuming you install google-genai via requirements.txt)
try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Google GenAI SDK not found. "
          "Please ensure 'google-genai' is in requirements.txt and installed.")
    exit()

# --- CONSTANTS AND CONFIGURATION ---

# The Gemini API Key is essential and must be passed via environment variable
API_KEY = os.getenv("GEMINI_API_KEY")

# Firebase Credentials JSON string (passed via environment variable)
FIREBASE_CREDS_JSON = os.getenv("FIREBASE_CREDENTIALS")

# Model and schema details
MODEL_NAME = "gemini-2.5-flash-preview-09-2025"
SYSTEM_INSTRUCTION = (
    "You are a sophisticated Job Finder AI specializing in DevOps and Automation roles. "
    "Your task is to use Google Search to find relevant, open job postings that match "
    "the user's profile and query, and strictly adhere to any specified filtering constraints "
    "(like ESG or industry focus). "
    "You MUST return the results as a clean JSON array."
)
# Define the JSON Schema for structured output
JOB_RESPONSE_SCHEMA = {
    "type": "ARRAY",
    "description": "A list of relevant job postings found via Google Search.",
    "items": {
        "type": "OBJECT",
        "properties": {
            "title": {"type": "STRING", "description": "The exact job title."},
            "company": {"type": "STRING", "description": "The name of the hiring company."},
            "location": {"type": "STRING", "description": "The job's listed city and state."},
            "summary": {"type": "STRING",
                        "description": "A 1-2 sentence summary of the primary "
                        "responsibilities and qualifications."},
            "link": {"type": "STRING", "description": "The direct URL to the job posting."}
        },
        "required": ["title", "company", "location", "summary", "link"]
    }
}
# --- FIREBASE INITIALIZATION ---


def init_firebase():
    """Initializes Firebase Admin SDK using credentials from environment variable."""
    if not FIREBASE_CREDS_JSON:
        print("ERROR: FIREBASE_CREDENTIALS environment variable is not set.")
        return None

    try:
        # Load the credentials from the JSON string
        creds_dict = json.loads(FIREBASE_CREDS_JSON)
        cred = credentials.Certificate(creds_dict)

        # Initialize the app if it hasn't been already
        if not firebase_admin._apps:
            firebase_admin.initialize_app(cred)

        # Get the Firestore client
        return firestore.client()
    except Exception as e:
        print(
            f"ERROR: Failed to initialize Firebase. Check FIREBASE_CREDENTIALS format. Error: {e}")
        return None

# --- GEMINI API CALLER ---


def generate_job_leads(db, user_query, user_resume):
    """
    Calls the Gemini API to search for jobs based on query and resume.

    Args:
        db: Firestore client instance.
        user_query (str): The specific search query.
        user_resume (str): The text content of the user's resume.
    """
    if not API_KEY:
        print("ERROR: GEMINI_API_KEY is not set.")
        return

    try:
        client = genai.Client(api_key=API_KEY)

        full_prompt = (
            f"Given the following user RESUME and their desired JOB QUERY, "
            f"use Google Search to find 5 to 8 open job leads that are a strong fit. "
            f"The results must strictly adhere to the provided JSON schema. "
            f"\n\n--- RESUME ---\n{user_resume}"
            f"\n\n--- JOB QUERY ---\n{user_query}"
        )

        print(f"Executing search with query: {user_query}")

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                # Enable Google Search grounding
                tools=[{"google_search": {}}],
                # Enforce JSON output format
                response_mime_type="application/json",
                response_schema=types.Schema(**JOB_RESPONSE_SCHEMA),
            ),
            # Set the system instruction/persona
            system_instruction=SYSTEM_INSTRUCTION
        )

        # The response text should be a JSON string
        raw_json_text = response.text.strip()

        # The model sometimes wraps the JSON in markdown blocks
        if raw_json_text.startswith("```json"):
            raw_json_text = raw_json_text.strip("```json").strip("```").strip()

        # Parse the JSON string into a Python list/dict
        job_leads = json.loads(raw_json_text)

        # Save results to Firestore
        save_to_firestore(db, job_leads)

    except Exception as e:
        print(f"An error occurred during Gemini API call: {e}")

# --- FIRESTORE SAVER ---


def save_to_firestore(db, job_leads):
    """Saves the generated job leads into the Firestore database."""
    # This path must match the public path used in the React UI
    collection_path = "artifacts/job-finder-app/public/data/job_leads"

    print(f"Found {len(job_leads)} job leads. Saving to Firestore...")

    # Simple, unique user ID for this run (for demonstration)
    user_id = "Vincent_P_Caboara"

    for lead in job_leads:
        try:
            # Add a timestamp and user ID for context
            lead['timestamp'] = datetime.now().isoformat()
            lead['userId'] = user_id

            # Using add_doc lets Firestore generate the document ID
            doc_ref = db.collection(collection_path).add(lead)
            print(f"  -> Saved lead: {lead['title']} at {doc_ref[1].id}")

        except Exception as e:
            print(f"  -> ERROR saving lead: {lead['title']}. Error: {e}")

# --- MAIN EXECUTION ---


def main():
    """Main function to initialize and run the job finder."""
    db = init_firebase()
    if not db:
        print("Worker cannot run without successful Firebase initialization. Exiting.")
        return

    # Use the resume text from the user's uploaded file (hardcoded for demonstration)
    user_resume_text = """
    Vincent Pietro Caboara
    Menifee, CA 805.215.6663 vcaboara@gmail.com
    Work Experience
    Configuration Build Engineer, Sony Interactive Entertainment (8/2023 – 04/2025)
    Design, deploy and manage CI/CD systems (primarily Jenkins).
    Integrate source control systems (Git) and automated test frameworks.
    ... [truncated for brevity, but include full text here] ...
    Sr. Software/Automation Engineer CI/CD, Development, Viasat Inc. SAT Apps (4/2021 – 06/2023)
    Automate processes involved with creating and analyzing potential network changes.
    CICD/DevOps: Development pipelines that build, lint, test and deploy docker images
    for multiple code bases. Airflow DAGs.
    Focus:Python, Docker/Compose cross platform support
    Education
    California Polytechnic State University Bachelor of Science in Computer Engineering San Luis Obispo, CA
    """

    # Get the search query from the environment variable set in docker-compose.yml
    default_query = "Sr. DevOps Engineer or CI/CD Architect roles, focusing on AWS, Kubernetes," \
        " and Python"
    query = os.getenv("USER_QUERY", default_query)

    generate_job_leads(db, query, user_resume_text)

    print("\nWorker finished execution.")


if __name__ == "__main__":
    main()
