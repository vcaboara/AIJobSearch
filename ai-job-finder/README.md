# AI Job Finder (Local Flask Application)
This application uses a Python Flask backend to reliably interact with the Gemini API, bypassing the strict network constraints of the Canvas environment which were causing the persistent `401 Unauthorized` errors.

To run this application, you must set up a Python environment and provide your own Gemini API key.

1. Prerequisites
   * Python 3.11+
   * A Gemini API Key (get one from Google AI Studio)
1. Setup Instructions
    1. Create a Virtual Environment (Recommended)
        ```
        python -m venv venv
        source venv/bin/activate  # On Windows, use: venv\Scripts\activate
        ```
    1. Install Dependencies
       You will need Flask, the google-genai SDK, and python-dotenv for managing the API key.
       ```
       python -m pip install -U pip
       # and
       python -m pip install Flask google-genai python-dotenv
        # or
       python -m pip install -r requirements.txt
       ```
    1. Create Files
       Ensure you have the following directory structure and files:
       ```
       ai-job-finder/
       ├── app.py          # Python backend logic
       ├── .env            # Environment variable file (create this)
       └── templates/
           └── index.html  # Frontend interface
       ```
    1. Configure API Key
        Create a file named `.env` in the root directory (`ai-job-finder/`) and add your API key:
        ```
        # .env file
        GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
        ```
        Replace "YOUR_GEMINI_API_KEY_HERE" with your actual key.
1. Running the Application
   1. Start the Flask ServerFrom the root directory (ai-job-finder/), run the Python application:
        ```
        python app.py
        ```
        You should see output indicating the server is running, likely on `http://127.0.0.1:5000/`.
   1. Access the Application: Open your web browser and navigate to the address shown in your console (e.g., `http://127.0.0.1:5000/`).
   1. Test the Grounded Search Enter a query like "latest sustainable agriculture jobs" or "impact investing roles" and click "Search Jobs." The Python backend will now reliably call the Gemini API with the Google Search tool enabled.

Key Application Details
* API Model: `gemini-2.5-flash` is used for its speed and capability in structured output.
* Search Grounding: The API call explicitly uses the `tools=[{"google_search": {}}]` configuration to ensure results are based on up-to-date web information.
* Structured Output: The `response_schema` is used to force the model to return a predictable JSON array of job objects, making the parsing reliable.