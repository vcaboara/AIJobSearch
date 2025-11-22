import os
import json
import time
from typing import Dict, Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types

# --- Configuration ---
# The API Key is fetched from the environment variable GEMINI_API_KEY.
# This is often managed by the runtime environment (like Canvas) or Docker setup.
try:
    API_KEY = os.environ.get("GEMINI_API_KEY", "")
    if not API_KEY:
        print("Warning: GEMINI_API_KEY environment variable not set. Using default empty string.")

    # Initialize the Gemini client
    # The client will automatically pick up the API key from the environment
    client = genai.Client(api_key=API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# --- Application Setup ---
app = FastAPI(
    title="AI Job Lead Analyzer API",
    description="Backend service for analyzing job descriptions using the Gemini API.",
)

# IMPORTANT: Allowing all origins for development and deployment in an isolated environment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---


class JobAnalysisRequest(BaseModel):
    """Schema for the incoming job analysis request."""
    job_title: str
    company: str
    job_details: str


class AnalysisResult(BaseModel):
    """Schema for the structured analysis result returned by Gemini."""
    pillar: str = types.Field(
        description="The primary AIF Pillar the job aligns with (e.g., 'Pillar 1: Climate Resilience').")
    relevance_score: int = types.Field(
        description="A score from 1 (low) to 10 (high) indicating job relevance to the pillar.")
    justification: str = types.Field(
        description="A brief, one-sentence explanation of the score and pillar choice.")


# --- Gemini System Instruction ---
SYSTEM_PROMPT = """
You are a specialized AI Financial Analyst working for the Arboreum Impact Foundation (AIF).
Your task is to analyze job leads against AIF's mandates and structure the output in JSON format.

AIF Mandates (Pillars):
1. Pillar 1: Climate Resilience
2. Pillar 2: Sustainable Agriculture
3. Pillar 3: Orphanages/Youth Support
4. Pillar 4: Systemic Reform (including Immigrant and Veteran Support)

Your analysis MUST be based on the provided job details, job title, and company.
You MUST respond ONLY with a single JSON object that strictly adheres to the provided schema.
Do not include any text, markdown formatting (like ```json), or explanations outside of the JSON object.
"""

# --- API Router Definition (THE FIX IS HERE) ---
# FIX: Define the router correctly at the application root or, for clarity and matching the frontend,
# ensure the main path is defined correctly.


@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_job_lead(request_data: JobAnalysisRequest):
    """
    Analyzes a job lead against AIF pillars using the Gemini API and returns structured JSON data.
    """
    if not client:
        return {"error": "Gemini client not initialized. Check API key."}

    user_query = f"""
    Analyze the following job lead against the AIF Mandates:
    - Job Title: {request_data.job_title}
    - Company: {request_data.company}
    - Job Details: {request_data.job_details}

    Determine the single best fitting AIF Pillar and provide a relevance score (1-10) and justification.
    """

    # Structured output configuration
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=AnalysisResult,
    )

    # Implement exponential backoff for robustness
    MAX_RETRIES = 5
    for attempt in range(MAX_RETRIES):
        try:
            print(f"Sending request to Gemini (Attempt {attempt + 1})...")

            # Use gemini-2.5-flash for structured data and analysis
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[user_query],
                config=config,
            )

            # The response text contains the JSON string
            json_string = response.text.strip()

            # Validate and return the parsed JSON
            result_data = json.loads(json_string)
            print("Gemini response successful.")
            return AnalysisResult(**result_data)

        except (genai.errors.APIError, json.JSONDecodeError, AttributeError) as e:
            if attempt < MAX_RETRIES - 1:
                wait_time = 2 ** attempt
                print(
                    f"API or JSON Error on attempt {attempt + 1}: {e}. Retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"Fatal error after {MAX_RETRIES} attempts: {e}")
                # For a critical failure, return a 500 status error
                raise Exception(
                    "Failed to get structured analysis from Gemini after multiple retries.") from e

# --- Root Endpoint (Health Check) ---


@app.get("/")
def read_root():
    """Simple health check endpoint."""
    return {"message": "AI Job Lead Analyzer API is running. Use /api/analyze for job analysis."}
