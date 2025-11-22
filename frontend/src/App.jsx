import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Loader2, Send } from "lucide-react";

// --- Mock Components for Context (Replace with your real components) ---
const OpportunityCard = ({ title, company, pillar, status, score }) => (
  <div className="bg-white/5 p-4 rounded-xl shadow-lg mb-4 flex justify-between items-center transition duration-300 hover:bg-white/10 border border-white/10">
    <div>
      <h3 className="text-xl font-semibold text-green-300">{title}</h3>
      <p className="text-sm text-gray-400">{company}</p>
      <span className="text-xs font-medium text-purple-300">{pillar}</span>
    </div>
    <div className="text-right">
      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${status === 'ACTIVE' ? 'bg-green-600 text-white' : status === 'PENDING' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}`}>
        {status}
      </span>
      {score && <p className="text-sm text-gray-300 mt-1">Relevance Score: {score}</p>}
      <button className="text-sm text-green-400 hover:text-green-300 mt-1">View Details</button>
    </div>
  </div>
);

const Modal = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4 border-b border-green-700/50 pb-2">{title}</h2>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white" onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
        {children}
      </div>
    </div>
  );
};

const InputField = ({ label, value, onChange, placeholder, type = 'text', rows = 1 }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
    {rows > 1 ? (
      <textarea
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 transition duration-150"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    ) : (
      <input
        type={type}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-green-500 focus:border-green-500 transition duration-150"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    )}
  </div>
);

// --- Main App Component ---
export default function App() {
  const [opportunities, setOpportunities] = useState([
    { id: 1, title: "AI/ML Engineer - Platform", company: "Arboreum Corp", pillar: "Pillar 1: Climate Resilience", status: "ACTIVE", score: "8/10" },
    { id: 2, title: "DevOps Specialist - Infrastructure", company: "Impact Fund X", pillar: "Pillar 4: Systemic Reform (Immigrant Support)", status: "CLOSED", score: null },
    { id: 3, title: "Data Scientist - Agricultural Robotics", company: "Tech for Good Initiative", pillar: "Pillar 2: Sustainable Agriculture", status: "PENDING", score: "9/10" },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("DevOps Engineer");
  const [company, setCompany] = useState("Tech For Good");
  const [jobDetails, setJobDetails] = useState("CICD\nJenkins\nPython\ngroovy\nAWS\nautomation");
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle the analysis request
  const handleAnalyze = useCallback(async () => {
    if (!jobTitle || !company || !jobDetails) {
      window.alert("Please fill in all job details.");
      return;
    }

    setIsLoading(true);

    const payload = {
      job_title: jobTitle,
      company: company,
      job_details: jobDetails,
    };

    // *************** FIX: Changed to a directory-relative path (removed leading /) ***************
    // This should resolve the 'Failed to parse URL' error in the execution environment.
    const analysisUrl = "api/analyze";

    console.log("Attempting to fetch from:", analysisUrl);

    try {
      const response = await fetch(analysisUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // If the connection was successful but the server returned an error (4xx or 5xx)
        throw new Error(`HTTP error! status: ${response.status} (${response.statusText}). URL: ${analysisUrl}. Check backend logs.`);
      }

      const data = await response.json();

      // Handle successful analysis (e.g., update opportunities list)
      console.log("Analysis successful:", data);

      // For now, just show a success message
      window.alert("Analysis successful! Check console for full analysis data.");
      setIsModalOpen(false);

    } catch (error) {
      console.error("Fetch/Analysis Failed:", error);
      let errorMessage = error.message;

      // Specific error handling for network issues
      if (errorMessage.includes('Failed to parse URL') || errorMessage.includes('Failed to fetch') || error.message === 'TypeError: Failed to fetch') {
        errorMessage = `Network Error: Could not establish a connection using path ${analysisUrl}. Please ensure: 1) The 'backend' Docker container is running, and 2) The 'vite.config.js' proxy is correctly set up.`;
      }

      // Use window.alert for visibility 
      window.alert(`Analysis Failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [jobTitle, company, jobDetails]);

  const handleNewLeadClick = () => {
    setIsModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-inter">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center py-6 mb-8 border-b border-green-700/50">
          <h1 className="text-4xl font-extrabold text-green-400 tracking-tight">
            AI Job Lead Tracker
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            Aligning Opportunities with AIF Mandates (Climate, Agriculture, Systemic Reform)
          </p>
        </header>

        {/* Main Content */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Current Opportunities</h2>
          <button
            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition duration-150"
            onClick={handleNewLeadClick}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Lead
          </button>
        </div>

        {/* Opportunity List */}
        <div className="space-y-4">
          {opportunities.map(op => (
            <OpportunityCard key={op.id} {...op} />
          ))}
        </div>
      </div>

      {/* Analysis Modal */}
      <Modal
        title="Analyze New Job Lead"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          <InputField
            label="Job Title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g., Data Scientist"
          />
          <InputField
            label="Company/Organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g., Arboreum Corp"
          />
          <InputField
            label="Job Description Highlights"
            value={jobDetails}
            onChange={(e) => setJobDetails(e.target.value)}
            placeholder="e.g., Python, ML models, AWS, Climate research"
            rows={6}
          />

          <div className="pt-4">
            <button
              className={`w-full flex items-center justify-center font-bold py-3 px-4 rounded-xl shadow-lg transition duration-200 ${isLoading ? 'bg-green-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'
                }`}
              onClick={handleAnalyze}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing with Gemini...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Analyzing with Gemini...
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}