import React, { useState, useEffect } from 'react';

// --- Constant Data (Moved outside to prevent exhaustive-deps warning) ---
const mockLeads = [
  { id: 1, title: "AI/ML Engineer - Platform", company: "Arboreum Corp", status: "Active", link: "#", mandate: "Pillar 1: Climate Resilience" },
  { id: 2, title: "DevOps Specialist - Infrastructure", company: "Impact Fund X", status: "Closed", link: "#", mandate: "Pillar 4: Systemic Reform (Immigrant Support)" },
  { id: 3, title: "Data Scientist - Agricultural Robotics", company: "Tech for Good Initiative", status: "Pending", link: "#", mandate: "Pillar 2: Sustainable Agriculture" },
];
// ------------------------------------------------------------------------

const App = () => {
  const [jobLeads, setJobLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  // Removed 'setError' as it was unused
  const [error,] = useState(null);

  useEffect(() => {
    // Simulate fetching data from the backend API
    setLoading(true);
    setTimeout(() => {
      setJobLeads(mockLeads);
      setLoading(false);
    }, 1000);
    // Dependency array is now empty because 'mockLeads' is an external constant
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 ring-green-600/20';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 ring-yellow-600/20';
      case 'Closed':
        return 'bg-red-100 text-red-800 ring-red-600/20';
      default:
        return 'bg-gray-100 text-gray-800 ring-gray-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="py-6 mb-8 border-b-4 border-emerald-500 rounded-b-xl shadow-lg bg-white">
          <h1 className="text-4xl font-extrabold text-gray-900 text-center tracking-tight">
            AI Job Lead Tracker
          </h1>
          <p className="text-center text-emerald-600 mt-2 text-lg font-medium">
            Aligning Opportunities with AIF Mandates (Climate, Agriculture, Systemic Reform)
          </p>
        </header>

        <main>
          {error && (
            <div className="p-4 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm">
              Error loading data: {error}
            </div>
          )}

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Current Opportunities
            </h2>
            <button
              className="px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-700 transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50"
            >
              + Add New Lead
            </button>
          </div>

          <div className="bg-white shadow-2xl rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-gray-500">
                <svg className="animate-spin h-6 w-6 text-emerald-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading leads...
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {jobLeads.map((lead) => (
                  <div key={lead.id} className="p-6 hover:bg-emerald-50 transition duration-100 flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 md:space-x-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xl font-semibold text-gray-900">{lead.title}</p>
                      <p className="text-sm text-gray-500 mb-2">{lead.company}</p>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                        {lead.mandate}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase ring-1 ring-inset ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                      <a
                        href={lead.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-800 font-medium transition duration-150 ease-in-out flex items-center text-sm"
                      >
                        View <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;