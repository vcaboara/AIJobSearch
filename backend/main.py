"""
Backend API for managing job leads and interacting with the AI generator.
Uses FastAPI to create endpoints for retrieving job leads and triggering AI
generation.
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

# Initialize the FastAPI application
app = FastAPI(
    title="AI Job Lead Backend",
    description=("API for managing job leads and interacting with the AI "
                 "generator."),  # Wrapped description for E501
    version="1.0.0"
)

# --- Mock Database Structure ---


class JobLead(BaseModel):
    id: int
    title: str
    company: str
    status: str
    link: str
    mandate: str  # Explicitly include AIF Mandate alignment


# Mock data
db: List[JobLead] = [
    JobLead(id=1, title="AI/ML Engineer - Platform", company="Arboreum Corp",
            status="Active", link="#", mandate="Pillar 1: Climate Resilience"),
    JobLead(id=2, title="DevOps Specialist - Infrastructure", company="Impact Fund X",
            status="Closed", link="#", mandate="Pillar 4: Systemic Reform"),
    JobLead(id=3, title="Data Scientist - Agricultural Robotics", company="Tech for Good Initiative",
            status="Pending", link="#", mandate="Pillar 2: Sustainable Agriculture"),
]

# --- API Endpoints ---


@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the AI Job Lead Backend. Check /docs for endpoints."}


@app.get("/api/leads", response_model=List[JobLead], tags=["Job Leads"])
async def get_job_leads():
    """Retrieve all stored job leads."""
    return db


@app.post("/api/generate-lead", tags=["AI Generation"])
async def generate_lead(prompt: str):
    """Placeholder to trigger AI generation of a new job lead."""
    # This will be updated later to call the Gemini API
    return {"status": "success", "message": f"AI generation triggered for prompt: '{prompt}'"}


@app.get("/api/mandates", tags=["AIF Mandates"])
async def get_aif_mandates():
    """Return the list of AIF Mandates (Pillars)."""
    return [
        "Pillar 1: Climate Resilience",
        "Pillar 2: Sustainable Agriculture",
        "Pillar 3: Regenerative Infrastructure",
        ("Pillar 4: Systemic Reform (Including Immigrants, Orphans/Ages, "
         "Veterans)")  # Wrapped list item for E501
    ]
