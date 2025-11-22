import os
import json
import re  # Import regex for JSON cleanup
from flask import Flask, request, jsonify, render_template
from google import genai
from google.genai import types
from google.genai.errors import APIError
from dotenv import load_dotenv

# Load environment variables from .env file (for local testing)
load_dotenv()

app = Flask(__name__)

# --- Configuration ---
# The API key must be set as an environment variable (e.g., in a .env file or your shell)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY environment variable is NOT set. API calls will fail.")

# Initialize the Gemini client
try:
    # Client initialization is fine as it uses the key environment variable
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    client = None

# AIF Mission Pillars for Context (Provided by user context)
AIF_PILLARS = [
    "Climate & Environmental Impact",
    "Systemic Reform (Native American, Immigrants, Rural Agriculture)",
    "Vulnerable Populations (Orphanages, Veterans Support)"
]


# Utility function to clean the JSON response (model often wraps JSON in markdown fences)
def clean_json_string(text):
    """Removes markdown fences (```json...```) and leading/trailing whitespace."""
    text = text.strip()
    # Remove markdown code fences if present (robustly handles ```json or just ```)
    if text.startswith('```'):
        # Find the first newline after the starting ```
        start = text.find('\n')
        if start != -1:
            text = text[start:].strip()
        else:
            # Handle case where ``` is the only content
            text = text[3:].strip()

    if text.endswith('```'):
        text = text[:-len('```')]

    # Attempt to remove any preamble like 'Here are the results:'
    # This uses a simple check to see if the first character is not a [ or {
    if text and text[0] not in ['[', '{']:
        try:
            # Find the start of the actual JSON structure
            json_start = min(
                text.find('['),
                text.find('{')
            )
            if json_start > 0:
                text = text[json_start:]
        except:
            pass  # Keep original text if find() fails

    return text.strip()


@app.route('/')
def index():
    """Renders the main search interface."""
    return render_template('index.html')


@app.route('/search', methods=['POST'])
def search_jobs():
    """
    Handles the grounded job search using Google Search as a tool.
    """
    if not client:
        return jsonify({"error": "Gemini client not initialized. Check GEMINI_API_KEY."}), 503

    data = request.json
    search_query = data.get('query', '')

    if not search_query:
        return jsonify({"error": "Search query cannot be empty."}), 400

    print(f"Received search query: {search_query}")

    # CRITICAL FIX: Use the model that supports Google Search Grounding with tools
    GROUNDED_MODEL = 'gemini-2.5-flash-preview-09-2025'

    try:
        # 1. Define the System Instruction for persona and output format
        # We MUST instruct the model to output ONLY the raw JSON array since we cannot use response_mime_type with tools.
        system_prompt = f"""You are a specialized Job Search Analyst for an impact fund. Find the five most recent and highly relevant job listings based on the user's query. Prioritize roles related to the Arboreum Impact Foundation (AIF) mission pillars, which include: {AIF_PILLARS}. 
        
        You MUST use the Google Search tool for grounding your answer.
        
        Your entire response MUST be a raw JSON array of objects, and nothing else. DO NOT include any introductory text, markdown fences (```json or ```), or explanations outside of the JSON array itself.
        
        JSON Structure:
        [
          {{
            "title": "Job Title",
            "company": "Company Name",
            "summary": "1-2 sentence summary of the job and key requirements.",
            "url": "Source URL of the job post."
          }}
        ]
        """

        # 2. Define the user prompt
        user_prompt = f"Find five highly relevant job listings for the query: '{search_query}'. Focus on recent postings that align with high social or environmental impact goals. Provide the title, company, a brief summary, and the source URL."

        # 3. Call the API with Search Tool
        response = client.models.generate_content(
            model=GROUNDED_MODEL,  # <-- CORRECTED MODEL
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=[{"google_search": {}}],  # Enable Grounded Search
            ),
        )

        # 4. Clean and parse the raw text response
        raw_json_text = clean_json_string(response.text)

        # Log the text before parsing for debugging if issues persist
        print(
            f"Raw text received from AI (pre-clean): {response.text[:200]}...")
        print(f"Text used for JSON parsing (clean): {raw_json_text[:200]}...")

        try:
            jobs = json.loads(raw_json_text)
            # Ensure the output is an array
            if not isinstance(jobs, list):
                raise ValueError("AI response was not a valid JSON array.")

        except (json.JSONDecodeError, ValueError) as e:
            print(f"Failed to decode or validate JSON response. Error: {e}")
            return jsonify({"error": "AI returned malformed or non-array content. Raw response logged to console. Please try a more specific query."}), 500

        return jsonify({"jobs": jobs, "message": f"Search successful. Found {len(jobs)} leads."})

    except APIError as e:
        print(f"Gemini API Error: {e}")
        return jsonify({"error": f"Gemini API failed: {e.message}"}), 500
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({"error": "An unexpected server error occurred."}), 500


if __name__ == '__main__':
    # Create the 'templates' folder if it doesn't exist (needed for Flask's render_template)
    if not os.path.exists('templates'):
        os.makedirs('templates')
    # Run the Flask app
    app.run(debug=True, port=5000)
