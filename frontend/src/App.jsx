import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  serverTimestamp,
  setLogLevel
} from 'firebase/firestore';

// --- Global Variable Access & Config ---
// IMPORTANT: These variables are provided by the Canvas environment.
// The apiKey is left empty, and the Canvas environment is expected to proxy the request.
const apiKey = "";
// CRITICAL: We use the Canvas proxy endpoint for Gemini to ensure authentication works.
const API_BASE_URL = typeof window.API_BASE_URL !== 'undefined' ? window.API_BASE_URL : 'https://generativelanguage.googleapis.com';
const GEMINI_API_ENDPOINT = `${API_BASE_URL}/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent`;

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : undefined;

const AIF_PILLARS = [
  "Climate & Environmental Impact",
  "Systemic Reform (Native American, Immigrants, Rural Agriculture)",
  "Vulnerable Populations (Orphanages, Veterans Support)"
];

const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState(null);

  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState({ type: 'default', message: '', visible: false });

  // Form State
  const [leadTitle, setLeadTitle] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadDescription, setLeadDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchStatus, setSearchStatus] = useState({ type: 'default', message: '', visible: false });

  // --- FIREBASE INITIALIZATION & AUTHENTICATION (Runs once) ---
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing. Cannot initialize data tracker.");
      setIsAuthReady(true);
      return;
    }

    try {
      // setLogLevel('debug'); 
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firestoreAuth = getAuth(app);

      setDb(firestoreDb);

      const authenticate = async () => {
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firestoreAuth, initialAuthToken);
          } else {
            await signInAnonymously(firestoreAuth);
          }
        } catch (e) {
          console.error("Authentication Error:", e);
          setError("Failed to authenticate with Firebase.");
        }
      };

      const unsubscribe = onAuthStateChanged(firestoreAuth, (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Fallback for environments where token isn't provided (like local)
          setUserId(`anonymous_${crypto.randomUUID()}`);
        }
        setIsAuthReady(true);
      });

      authenticate();
      return () => unsubscribe();

    } catch (e) {
      console.error("Firebase Init Error:", e);
      setError("Failed to initialize Firebase components. Check your local setup.");
      setIsAuthReady(true);
    }
  }, []);

  // Helper to get collection reference
  const getOpportunitiesCollectionRef = useCallback(() => {
    if (!db || !userId) return null;
    // Private data path: /artifacts/{appId}/users/{userId}/opportunities
    return collection(db, `artifacts/${appId}/users/${userId}/opportunities`);
  }, [db, userId]);

  // --- FIRESTORE REAL-TIME DATA LISTENER (Runs when ready) ---
  useEffect(() => {
    if (!isAuthReady || !userId || !db) return;

    const opportunitiesCollectionRef = query(getOpportunitiesCollectionRef());

    console.log("Starting Firestore Real-time Listener...");

    const unsubscribe = onSnapshot(opportunitiesCollectionRef, (snapshot) => {
      const updatedOpportunities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      updatedOpportunities.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setLeads(updatedOpportunities);
      setError(null);
    }, (dbError) => {
      console.error("Error listening to Firestore (Check security rules):", dbError);
      setError("Error loading data: Check console for security rule errors.");
    });

    return () => unsubscribe();

  }, [isAuthReady, userId, db, getOpportunitiesCollectionRef]);

  // --- UTILITY FUNCTIONS ---

  const updateStatus = useCallback((setter, type, message, duration = 3000) => {
    setter({ type, message, visible: true });
    if (duration > 0) {
      const timer = setTimeout(() => setter(prev => ({ ...prev, visible: false })), duration);
      return () => clearTimeout(timer); // Cleanup function
    }
  }, []);

  const resetModal = (prefill = {}) => {
    setLeadTitle(prefill.title || '');
    setLeadCompany(prefill.company || '');
    setLeadDescription(prefill.description || '');
    setModalOpen(true);
    setAnalysisStatus({ type: 'default', message: '', visible: false });
  };

  const handleStatusUpdate = async (id, currentStatus) => {
    if (!db || !userId) {
      updateStatus(setAnalysisStatus, 'error', "Database not connected.", 2000);
      return;
    }

    const newStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
    const docRef = doc(db, `artifacts/${appId}/users/${userId}/opportunities`, id);

    try {
      await updateDoc(docRef, {
        status: newStatus
      });
      updateStatus(setAnalysisStatus, 'success', `Status updated to ${newStatus}.`, 1500);
    } catch (updateError) {
      console.error("Error updating opportunity status:", updateError);
      updateStatus(setAnalysisStatus, 'error', `Failed to update status: ${updateError.message}`, 3000);
    }
  };


  // --- GEMINI API CALLER (Handles all API logic, including backoff) ---
  const runGeminiQuery = async (payload) => {
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // IMPORTANT: Use the dedicated proxy URL
        const response = await fetch(GEMINI_API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          return await response.json();
        }

        // If it's a 401, throw immediately to avoid needless retries
        if (response.status === 401) {
          throw new Error(`API failed with status 401 (Unauthorized). Please ensure the Canvas environment is correctly providing the API key.`);
        }

        const errorText = await response.text();
        throw new Error(`API failed with status: ${response.status}. Details: ${errorText.substring(0, 100)}...`);

      } catch (error) {
        lastError = error;
        console.error(`Attempt ${i + 1} failed:`, error);

        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError; // Throw the final error after all retries
  };


  // --- GEMINI API FUNCTIONS ---

  const handleAnalyzeAndSave = async () => {
    if (!leadTitle || !leadCompany || !leadDescription) {
      updateStatus(setAnalysisStatus, 'error', "Please fill in all fields (Title, Company, Description).", 3000);
      return;
    }

    if (!isAuthReady || !userId || !db) {
      updateStatus(setAnalysisStatus, 'error', "Database connection not ready. Please wait.", 3000);
      return;
    }

    setIsAnalyzing(true);
    updateStatus(setAnalysisStatus, 'info', "Sending data to Gemini for AIF analysis...");

    try {
      const systemPrompt = `You are a specialized Impact Job Analyst. Analyze the provided job lead against the Arboreum Impact Foundation's (AIF) mission pillars: ${AIF_PILLARS.join('; ')}. 

            Determine:
            1. The single best fitting AIF Pillar (or 'Other' if none fit).
            2. A relevance score from 1 (low) to 10 (high) based on the AIF mission.
            3. A one-sentence justification.

            Format the entire response as a JSON object.

            Expected JSON Schema:
            {
              "pillar": "AIF Pillar Name or 'Other'",
              "relevance_score": 1 to 10 integer,
              "justification": "A concise justification."
            }
            `;

      const userQuery = `Analyze this job posting:
            Title: ${leadTitle}
            Company: ${leadCompany}
            Description: ${leadDescription}`;

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              "pillar": { "type": "STRING", "description": "The best AIF Pillar name or 'Other'." },
              "relevance_score": { "type": "NUMBER", "description": "Relevance score (1-10)." },
              "justification": { "type": "STRING", "description": "One-sentence justification." }
            },
            required: ["pillar", "relevance_score", "justification"]
          }
        }
      };

      const result = await runGeminiQuery(payload);

      const jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonString) {
        throw new Error('AI returned no structured content.');
      }

      const analysis = JSON.parse(jsonString);

      // Save data to Firestore
      const leadToSave = {
        title: leadTitle,
        company: leadCompany,
        description: leadDescription,
        status: "ACTIVE",
        pillar: analysis.pillar || 'Other',
        relevance_score: analysis.relevance_score || 'N/A',
        justification: analysis.justification || 'No justification provided.',
        createdAt: serverTimestamp(),
        userId: userId,
      };

      await addDoc(getOpportunitiesCollectionRef(), leadToSave);

      updateStatus(setAnalysisStatus, 'success', "Analysis and save successful! Lead added to the tracker.", 1500);
      setTimeout(() => setModalOpen(false), 1500);

    } catch (error) {
      console.error("AIF Analysis Failed:", error);
      updateStatus(setAnalysisStatus, 'error', `Analysis Failed: ${error.message}`, 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJobSearch = async () => {
    if (!searchQuery.trim()) {
      updateStatus(setSearchStatus, 'error', "Please enter a search query.", 3000);
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    updateStatus(setSearchStatus, 'info', "Using AI-powered search to find relevant job listings...");

    try {
      const systemPrompt = `You are a professional job search assistant. Find the five most recent and highly relevant job listings based on the user's query. Prioritize roles in technology, impact, or adjacent fields, providing clear, structured results. You MUST use the Google Search tool for grounding your answer.
            
            Format your response as a JSON array of objects.

            Expected JSON Schema:
            [
              {
                "title": "Job Title",
                "company": "Company Name",
                "summary": "1-2 sentence summary of the job and key requirements.",
                "url": "Source URL of the job post."
              }
            ]
            `;

      const userQuery = `Find five highly relevant job listings for the query: "${searchQuery}". Focus on recent postings that are likely hiring. Provide the title, company, a brief summary, and the source URL.`;

      const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                "title": { "type": "STRING" },
                "company": { "type": "STRING" },
                "summary": { "type": "STRING" },
                "url": { "type": "STRING" }
              },
              required: ["title", "company", "summary", "url"]
            }
          }
        }
      };

      const result = await runGeminiQuery(payload);

      const jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonString) {
        updateStatus(setSearchStatus, 'error', 'Search failed: The AI could not find structured results. Try a different query.', 5000);
        setSearchResults([]);
        return;
      }

      const jobs = JSON.parse(jsonString);
      setSearchResults(jobs);
      updateStatus(setSearchStatus, 'success', `Search completed! Found ${jobs.length} potential leads.`, 3000);

    } catch (searchError) {
      console.error("Job Search Error:", searchError);
      updateStatus(setSearchStatus, 'error', `Search failed: ${searchError.message}.`, 5000);
    } finally {
      setIsSearching(false);
    }
  };

  // --- RENDER HELPERS ---
  const LeadCard = ({ lead }) => {
    const statusClasses = {
      ACTIVE: "bg-green-600/20 text-green-400 border-green-500",
      CLOSED: "bg-red-600/20 text-red-400 border-red-500",
    };

    return (
      <div className="bg-gray-800 p-4 rounded-xl shadow-lg border-l-4 border-gray-700 hover:border-violet-500 transition-all duration-300 flex justify-between items-start mb-4">
        <div className="flex-grow">
          <h3 className="text-xl font-semibold text-white">{lead.title} - {lead.company}</h3>

          {lead.pillar && (
            <p className="text-sm mt-1 text-violet-300 font-medium">
              <span className="text-violet-400">AIF Pillar:</span> {lead.pillar}
            </p>
          )}

          {lead.relevance_score && (
            <p className="text-xs text-gray-400 mt-0.5">
              <span className="font-semibold text-violet-300">AIF Score:</span> {lead.relevance_score}/10
            </p>
          )}

          {lead.justification && (
            <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs text-gray-300 max-h-24 overflow-y-auto">
              <span className="font-semibold text-violet-300">Justification: </span>
              {lead.justification}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end space-y-2 ml-4 flex-shrink-0">
          <span className={`px-3 py-1 text-xs font-bold rounded-full border ${statusClasses[lead.status] || statusClasses.ACTIVE}`}>
            {lead.status}
          </span>
          <button
            onClick={() => handleStatusUpdate(lead.id, lead.status)}
            className="text-sm text-blue-400 hover:text-blue-300 transition"
            disabled={!isAuthReady}
          >
            {lead.status === "ACTIVE" ? "Mark Closed" : "Mark Active"}
          </button>
        </div>
      </div>
    );
  };

  const StatusDisplay = ({ status }) => {
    if (!status.visible) return null;

    let baseClasses = "text-sm p-3 mt-3 rounded-lg border ";
    let textClasses = "text-gray-300";

    if (status.type === 'error') {
      baseClasses += "bg-red-900/30 border-red-700";
      textClasses = "text-red-300";
    } else if (status.type === 'success') {
      baseClasses += "bg-green-900/30 border-green-700";
      textClasses = "text-green-300";
    } else if (status.type === 'info') {
      baseClasses += "bg-yellow-900/30 border-yellow-700";
      textClasses = "text-yellow-300";
    } else {
      baseClasses += "bg-gray-700 border-gray-600";
    }

    return (
      <div className={`${baseClasses} ${textClasses}`}>
        {status.message}
      </div>
    );
  };

  const SearchResults = useMemo(() => {
    if (searchResults.length === 0) {
      return (
        <div className="text-center text-gray-400 p-4">
          {isSearching ? 'Loading...' : 'Enter a query above to find new job leads (e.g., "Senior React Developer remote").'}
        </div>
      );
    }

    return searchResults.map((job, index) => (
      <div key={index} className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="md:w-3/4">
          <h4 className="text-lg font-bold text-violet-300">{job.title}</h4>
          <p className="text-sm text-gray-300 mb-2">{job.company}</p>
          <p className="text-xs text-gray-400 italic">{job.summary}</p>
        </div>
        <div className="md:w-1/4 flex flex-col items-stretch md:items-end space-y-2 mt-3 md:mt-0">
          <a href={job.url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline text-right"
          >
            View Listing
          </a>
          <button
            onClick={() => resetModal({
              title: job.title,
              company: job.company,
              description: `Job Summary: ${job.summary}. (Paste the full job description here for a complete AIF analysis.)`
            })}
            className="px-3 py-1 text-xs bg-green-600 rounded font-semibold hover:bg-green-500 transition-all shadow-md shadow-green-600/30"
          >
            Analyze Lead (AIF)
          </button>
        </div>
      </div>
    ));
  }, [searchResults]);


  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10">
      <script src="https://cdn.tailwindcss.com"></script>
      <style jsx="true">{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                    background-color: #0d1117;
                }
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
                ::-webkit-scrollbar-track { background: #1f2937; }
            `}</style>

      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2">AI-Assisted Job Search & Lead Tracker</h1>
        <p className="text-violet-400 text-lg italic">
          Find, analyze, and track opportunities with the power of AI.
        </p>
        <p id="user-id-display" className="text-sm text-gray-500 mt-2">
          User ID: {isAuthReady ? (userId || "Error/Anonymous") : "Loading..."}
        </p>
        {error && <div className="text-sm text-red-400 mt-2 p-2 bg-red-900/30 rounded-lg border border-red-700">{error}</div>}
      </header>

      <div className="max-w-4xl mx-auto space-y-12">

        {/* Job Finder Section - GENERAL SEARCH */}
        <section className="bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
          <h2 className="text-2xl font-bold text-violet-400 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 17l5 5"></path><path d="M19 10a7 7 0 10-14 0 7 7 0 0014 0z"></path></svg>
            1. Find General Job Leads (AI-Assisted Search)
          </h2>
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
            <input
              type="text"
              placeholder="E.g., 'Senior Software Engineer remote' or 'Product Manager FinTech'"
              className="flex-grow p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500 focus:border-violet-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJobSearch()}
              disabled={isSearching}
            />
            <button
              onClick={handleJobSearch}
              disabled={isSearching || !isAuthReady}
              className={`px-6 py-3 rounded-lg font-semibold transition-all shadow-md shadow-violet-600/30 flex items-center justify-center ${isSearching ? 'bg-violet-700 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-500'
                }`}
            >
              <svg className={`w-5 h-5 ${isSearching ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {isSearching ? (
                  <>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </>
                ) : (
                  <>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </>
                )}
              </svg>
              <span className="ml-2">{isSearching ? 'Searching...' : 'Search'}</span>
            </button>
          </div>

          <StatusDisplay status={searchStatus} setter={setSearchStatus} />

          <div className="mt-6 space-y-4 max-h-96 overflow-y-auto">
            {SearchResults}
          </div>
        </section>

        {/* Lead Tracker Section - AIF ANALYSIS */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
              2. Track & Analyze Leads (AIF Evaluation)
            </h2>
            <button
              onClick={() => resetModal()}
              disabled={!isAuthReady}
              className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all shadow-md shadow-green-600/30 ${isAuthReady ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 cursor-not-allowed'
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Manually Add Lead
            </button>
          </div>

          {/* Leads Container */}
          <div className="space-y-4">
            {!isAuthReady && (
              <div className="flex items-center justify-center p-10 bg-gray-800/50 rounded-xl">
                <svg className="animate-spin h-6 w-6 mr-3 text-violet-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xl">Connecting to Data...</span>
              </div>
            )}
            {isAuthReady && leads.length === 0 && (
              <div className="text-center p-10 bg-gray-800/50 rounded-xl text-gray-400">
                No leads tracked yet. Find a job using the search bar above or click "Manually Add Lead."
              </div>
            )}
            {isAuthReady && leads.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </section>
      </div>

      {/* Modal for New Lead */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl p-6 relative">
            <h2 className="text-2xl font-bold text-white mb-4">Analyze Job Lead (AIF Alignment)</h2>
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              disabled={isAnalyzing}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job Title (e.g., Data Scientist)"
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500 focus:border-violet-500"
                value={leadTitle}
                onChange={(e) => setLeadTitle(e.target.value)}
                disabled={isAnalyzing}
              />
              <input
                type="text"
                placeholder="Company/Organization (e.g., Tech For Good)"
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500 focus:border-violet-500"
                value={leadCompany}
                onChange={(e) => setLeadCompany(e.target.value)}
                disabled={isAnalyzing}
              />
              <textarea
                placeholder="Paste the FULL Job Description or key mission highlights here for AIF analysis..."
                rows="6"
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 resize-none focus:ring-violet-500 focus:border-violet-500"
                value={leadDescription}
                onChange={(e) => setLeadDescription(e.target.value)}
                disabled={isAnalyzing}
              ></textarea>

              <StatusDisplay status={analysisStatus} setter={setAnalysisStatus} />

              <button
                onClick={handleAnalyzeAndSave}
                disabled={isAnalyzing || !isAuthReady}
                className={`w-full flex items-center justify-center p-3 rounded-lg font-bold transition-all duration-200 shadow-md ${isAnalyzing || !isAuthReady
                    ? 'bg-green-700 cursor-not-allowed shadow-none'
                    : 'bg-green-600 hover:bg-green-500 shadow-green-600/40'
                  }`}
              >
                <svg className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''} mr-2`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {isAnalyzing ? (
                    <>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </>
                  ) : (
                    <>
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </>
                  )}
                </svg>
                <span>{isAnalyzing ? 'Analyzing with Gemini...' : 'Analyze and Save Lead'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;