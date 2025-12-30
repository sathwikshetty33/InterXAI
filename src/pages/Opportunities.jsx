import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import { 
  Loader2, Briefcase, MapPin, Timer, DollarSign, 
  Bookmark, Send, Filter, Search, Building, 
  ChevronDown, ExternalLink, CheckCircle, X, Star
} from "lucide-react";
import { toast } from 'react-toastify';

export default function Opportunities() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState([]);
  const [matches, setMatches] = useState([]);
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState("matches");
  const [filters, setFilters] = useState({
    type: "",
    remote: false,
    minScore: 0,
    search: ""
  });
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [applying, setApplying] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Fetch matches
      const matchesRes = await fetch(`${API_URL}/opportunities/matches/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (matchesRes.ok) {
        setMatches(await matchesRes.json());
      }

      // Fetch applications
      const appsRes = await fetch(`${API_URL}/opportunities/applications/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (appsRes.ok) {
        setApplications(await appsRes.json());
      }

      // Fetch all opportunities
      const oppsRes = await fetch(`${API_URL}/opportunities/list/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (oppsRes.ok) {
        setOpportunities(await oppsRes.json());
      }

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (opportunityId) => {
    const token = getAuthToken();
    setApplying(true);

    try {
      const res = await fetch(`${API_URL}/opportunities/applications/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });

      if (res.ok) {
        toast.success("Application submitted!");
        fetchData();
        setSelectedOpp(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to apply");
      }
    } catch (error) {
      toast.error("Error applying");
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async (opportunityId) => {
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/opportunities/saved/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ opportunity_id: opportunityId }),
      });

      if (res.ok) {
        toast.success("Opportunity saved!");
      }
    } catch (error) {
      toast.error("Error saving opportunity");
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'job': return 'bg-blue-500/20 text-blue-400';
      case 'internship': return 'bg-green-500/20 text-green-400';
      case 'hackathon': return 'bg-purple-500/20 text-purple-400';
      case 'fellowship': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'submitted': return 'bg-blue-500/20 text-blue-400';
      case 'shortlisted': return 'bg-green-500/20 text-green-400';
      case 'interview_scheduled': return 'bg-purple-500/20 text-purple-400';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      case 'offer_received': return 'bg-amber-500/20 text-amber-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const filteredMatches = matches.filter(m => {
    if (filters.type && m.opportunity?.type !== filters.type) return false;
    if (filters.remote && !m.opportunity?.remote) return false;
    if (filters.minScore && m.match_score < filters.minScore) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!m.opportunity?.title.toLowerCase().includes(search) &&
          !m.opportunity?.company.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Opportunities
            </h1>
            <p className="text-gray-400 mt-1">AI-matched jobs, internships, and hackathons</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          {[
            { id: 'matches', label: 'Matched', count: matches.length },
            { id: 'applications', label: 'Applications', count: applications.length },
            { id: 'browse', label: 'Browse All', count: opportunities.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab.label}
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/10">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or company..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-400"
            />
          </div>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 text-white"
          >
            <option value="">All Types</option>
            <option value="job">Jobs</option>
            <option value="internship">Internships</option>
            <option value="hackathon">Hackathons</option>
            <option value="fellowship">Fellowships</option>
          </select>

          <button
            onClick={() => setFilters(prev => ({ ...prev, remote: !prev.remote }))}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 border transition-colors ${
              filters.remote 
                ? 'bg-green-500/20 border-green-500 text-green-400' 
                : 'bg-white/10 border-white/20 text-gray-400'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Remote Only
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'matches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMatches.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-400">
                <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No matching opportunities found</p>
              </div>
            ) : (
              filteredMatches.map((match) => (
                <div 
                  key={match.id} 
                  className="bg-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer"
                  onClick={() => setSelectedOpp(match)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <Building className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{match.opportunity?.title}</h3>
                        <p className="text-sm text-gray-400">{match.opportunity?.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="text-amber-400 font-medium">{Math.round(match.match_score)}%</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(match.opportunity?.type)}`}>
                      {match.opportunity?.type}
                    </span>
                    {match.opportunity?.remote && (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                        Remote
                      </span>
                    )}
                    <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {match.opportunity?.location}
                    </span>
                  </div>
                  
                  {match.skill_gaps?.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Skills to develop:</p>
                      <div className="flex flex-wrap gap-1">
                        {match.skill_gaps.slice(0, 3).map((skill, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs rounded bg-red-500/10 text-red-400">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApply(match.opportunity?.id); }}
                      className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Apply
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSave(match.opportunity?.id); }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Send className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No applications yet</p>
              </div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                        <Building className="w-6 h-6 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{app.opportunity?.title}</h3>
                        <p className="text-sm text-gray-400">{app.opportunity?.company}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(app.status)}`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opportunities.map((opp) => (
              <div key={opp.id} className="bg-white/5 backdrop-blur-xl rounded-xl p-5 border border-white/10 hover:border-purple-500/50 transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{opp.title}</h3>
                    <p className="text-sm text-gray-400">{opp.company}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(opp.type)}`}>
                    {opp.type}
                  </span>
                  {opp.remote && (
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      Remote
                    </span>
                  )}
                  <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {opp.location}
                  </span>
                </div>
                
                {opp.salary_min && opp.salary_max && (
                  <p className="text-sm text-gray-400 flex items-center gap-1 mb-3">
                    <DollarSign className="w-4 h-4" />
                    {opp.salary_currency} {opp.salary_min.toLocaleString()} - {opp.salary_max.toLocaleString()}
                  </p>
                )}
                
                <button
                  onClick={() => handleApply(opp.id)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedOpp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedOpp.opportunity?.title}</h2>
                  <p className="text-gray-400">{selectedOpp.opportunity?.company}</p>
                </div>
                <button
                  onClick={() => setSelectedOpp(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-amber-400">{Math.round(selectedOpp.match_score)}%</span>
                <span className="text-gray-400">Match Score</span>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Why this matches you:</h4>
                  <ul className="space-y-1">
                    {selectedOpp.match_reasons?.map((reason, i) => (
                      <li key={i} className="text-sm text-green-400 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {selectedOpp.skill_gaps?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Skills to develop:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOpp.skill_gaps.map((skill, i) => (
                        <span key={i} className="px-3 py-1 text-sm rounded-full bg-red-500/10 text-red-400">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedOpp.ai_recommendation && (
                  <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                    <h4 className="text-sm font-medium text-purple-400 mb-1">AI Recommendation:</h4>
                    <p className="text-sm text-gray-300">{selectedOpp.ai_recommendation}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleApply(selectedOpp.opportunity?.id)}
                  disabled={applying}
                  className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Apply Now
                </button>
                <a
                  href={selectedOpp.opportunity?.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Original
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
}
