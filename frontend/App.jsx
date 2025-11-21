import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Send } from 'lucide-react'; // Using Lucide for icons

// Configuration (Read from environment variables, typically via Vite/Docker)
// Removed problematic import.meta.env access to resolve compilation warning.
// We rely on the hosting environment (Canvas/Vite) to inject necessary globals.
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

// Mock data (matches the data structure from the analysis)
const initialOpportunities = [
  {
    id: 1,
    title: "AI/ML Engineer - Platform",
    company: "Arboreum Corp",
    pillar_alignment: "Pillar 1: Climate Resilience",
    relevance_score: 9,
    summary: "Developing predictive models for climate impact and optimizing green tech deployment.",
    status: "ACTIVE",
  },
  {
    id: 2,
    title: "DevOps Specialist - Infrastructure",
    company: "Impact Fund X",
    pillar_alignment: "Pillar 4: Systemic Reform (Immigrant Support)",
    relevance_score: 6,
    summary: "While general infrastructure, the role focuses on low-cost, scalable deployment crucial for non-profit partners.",
    status: "CLOSED",
  },
  {
    id: 3,
    title: "Data Scientist - Agricultural Robotics",
    company: "Tech for Good Initiative",
    pillar_alignment: "Pillar 2: Sustainable Agriculture",
    relevance_score: 8,
    summary: "Building models to improve resource efficiency in regenerative farming practices.",
    status: "PENDING",
  },
];

// --- Sub-Components ---

// Component for the Input Modal
const JobInputModal = ({ isOpen, onClose, onSubmit }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!jobDescription || !title || !company) {
      setError("Please provide a Title, Company, and Job Description.");
      return;
    }
    setIsSubmitting(true);
    // Reset state after submission attempt, regardless of success
    onSubmit({ title, company, jobDescription })
      .finally(() => setIsSubmitting(false));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analyze New Job Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Input Fields */}
          <input
            type="text"
            placeholder="Job Title (e.g., Senior Data Scientist)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
          <input
            type="text"
            placeholder="Company Name (e.g., Tech for Good Initiative)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500"
            required
          />
          <textarea
            placeholder="Paste the full job description here (including responsibilities, requirements, and mission statement)."
            rows="8"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            required
          />

          {error && (
            <p className="text-sm text-red-400 p-2 border border-red-500 bg-red-900/20 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            className={`w-full flex items-center justify-center p-3 rounded-lg font-bold text-white transition-colors ${isSubmitting ? 'bg-emerald-600/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/30'
              }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin mr-2" />
                Analyzing with Gemini...
              </>
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Submit for Analysis
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};


// Component for displaying a single Job Card
const OpportunityCard = ({ opportunity }) => {
  const { title, company, pillar_alignment, relevance_score, summary, status } = opportunity;

  const statusColors = {
    ACTIVE: 'bg-green-500/10 text-green-400 border-green-500',
    CLOSED: 'bg-red-500/10 text-red-400 border-red-500',
    PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500',
  };

  const scoreColor = relevance_score >= 8 ? 'text-green-400' : relevance_score >= 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
      <div className="flex-grow">
        <h3 className="text-xl font-semibold text-white mb-1">{title} - {company}</h3>
        <p className="text-sm font-medium text-emerald-400 mb-2">{pillar_alignment}</p>

        {/* Expanded View of Analysis */}
        <div className="mt-3 bg-gray-700 p-4 rounded-lg">
          <p className="text-sm font-semibold text-gray-300">Relevance Score: <span className={`${scoreColor} font-bold`}>{relevance_score}/10</span></p>
          <p className="text-sm text-gray-400 mt-1 italic leading-snug">{summary}</p>
        </div>
      </div>

      <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col items-start sm:items-end space-y-2">
        <div className={`text-xs font-bold px-3 py-1 rounded-full border ${statusColors[status]}`}>
          {status}
        </div>
        <button className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center transition">
          View Details
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1 lucide lucide-external-link"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
        </button>
      </div>
    </div>
  );
};


// --- Main App Component ---

const App = () => {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Function to handle the form submission and call the backend
  const handleAnalysisSubmit = async ({ title, company, jobDescription }) => {
    setLoading(true);
    // Do not close modal immediately, wait for success or failure to ensure user sees feedback
    // setIsModalOpen(false); // Removed this line

    // Construct the payload for the backend API
    const payload = {
      title: title,
      company: company,
      job_description: jobDescription,
    };

    try {
      // NOTE: Using window.fetch for direct API calls
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Add new job lead to the state
      const newLead = {
        id: Date.now(), // Unique ID
        title: result.job_title || title,
        company: result.company || company,
        pillar_alignment: result.pillar_alignment || 'Unassigned',
        relevance_score: result.relevance_score || 0,
        summary: result.summary || 'Analysis incomplete or failed.',
        status: 'ACTIVE',
      };

      setOpportunities((prev) => [newLead, ...prev]);

      // Close modal on SUCCESS
      setIsModalOpen(false);

    } catch (error) {
      console.error("Analysis Failed:", error);
      // Show error message to user, do not use alert()
      alert(`Failed to analyze job: ${error.message}. Please check the backend console for details.`);
      // Keep modal open to allow user to try again or edit input
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <header className="py-8 text-center">
          <h1 className="text-4xl font-extrabold text-white">AI Job Lead Tracker</h1>
          <p className="text-md text-emerald-400 mt-2">
            Aligning Opportunities with AIF Mandates (Climate, Agriculture, Systemic Reform)
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Current Opportunities</h2>
          <button
            onClick={() => setIsModalOpen(true)} // CRITICAL FIX: The button handler is correctly set here
            className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 shadow-md shadow-emerald-500/30"
          >
            <Plus size={20} className="mr-1" />
            Add New Lead
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center p-4 bg-gray-800 rounded-lg mb-6">
            <Loader2 size={24} className="animate-spin text-emerald-500 mr-3" />
            <p className="text-lg font-medium text-emerald-300">Processing new job lead analysis...</p>
          </div>
        )}

        {/* Opportunity List */}
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}

          {opportunities.length === 0 && !loading && (
            <div className="text-center p-12 bg-gray-800 rounded-xl text-gray-500 border border-dashed border-gray-700">
              <p>No leads found. Click 'Add New Lead' to start your analysis!</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Modal Component */}
      <JobInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAnalysisSubmit}
      />
    </div>
  );
};

export default App;