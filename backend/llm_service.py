import json
import requests
from typing import Dict, Any
from config import GEMINI_API_KEY, GEMINI_API_URL, AIF_MANDATES

# System instruction to guide the model's behavior
SYSTEM_INSTRUCTION = (
    "You are an expert AI Analyst for the Arboreum Impact Foundation (AIF). "
    "Your task is to analyze job descriptions and determine their relevance and alignment "
    "with the AIF Mandates. Output a concise JSON object."
)

# JSON Schema for the structured output (required for the Gemini API call)
JSON_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "job_title": {"type": "STRING", "description": "The exact title of the job."},
        "company": {"type": "STRING", "description": "The hiring company name."},
        "pillar_alignment": {
            "type": "STRING",
            "description": "The specific AIF Pillar this job aligns with best."
        },
        "relevance_score": {
            "type": "INTEGER",
            "description": "A score from 1 (low) to 10 (high) for mandate relevance."
        },
        "summary": {
            "type": "STRING",
            "description": "A 2-sentence summary of why the job fits the mandate."
        }
    },
    "required": ["job_title", "company", "pillar_alignment", "relevance_score", "summary"],
    "propertyOrdering": [
        "job_title", "company", "pillar_alignment", "relevance_score", "summary"
    ]
}


def analyze_job_description(job_description: str) -> Dict[str, Any]:
    """
    Analyzes a job description using the Gemini API for AIF mandate alignment.

    Args:
        job_description: The text content of the job posting.

    Returns:
        A dictionary containing the structured analysis results.
    """
    print("Calling Gemini API for analysis...")

    # The prompt includes the list of mandates from config.py
    prompt = (
        f"Analyze the following job description and determine its alignment "
        f"with one of the AIF Mandates: {', '.join(AIF_MANDATES)}. "
        f"Job Description: \n---\n{job_description}\n---\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "systemInstruction": SYSTEM_INSTRUCTION,
        "config": {
            "responseMimeType": "application/json",
            "responseSchema": JSON_SCHEMA
        }
    }

    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(
            GEMINI_API_URL,
            headers=headers,
            params={"key": GEMINI_API_KEY},
            data=json.dumps(payload),
            timeout=15
        )
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        # The response is expected to be JSON containing the model's JSON string output
        result = response.json()
        model_output_text = result['candidates'][0]['content']['parts'][0]['text']

        # Parse the JSON string outputted by the model
        return json.loads(model_output_text)

    except requests.exceptions.RequestException as e:
        print(f"API Request failed: {e}")
        return {"error": f"API Request failed: {e}"}
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return {"error": f"An unexpected error occurred: {e}"}
