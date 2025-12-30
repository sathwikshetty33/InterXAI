import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import {
  Loader2, Target, BookOpen, Briefcase, 
  ChevronRight, RefreshCw, Sparkles, BarChart3,
  AlertCircle, Zap, Brain, Plus, X,
  Upload, FileText, Save, User, ExternalLink, Search
} from "lucide-react";
import { toast } from 'react-toastify';

// Profile Editor Component - Simplified
function ProfileEditor({ profile, setProfile, API_URL }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [newTargetRole, setNewTargetRole] = useState("");
  const [skills, setSkills] = useState([]);
  const [targetRoles, setTargetRoles] = useState([]);
  const [experienceYears, setExperienceYears] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  useEffect(() => {
    if (profile) {
      setSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setTargetRoles(Array.isArray(profile.target_roles) ? profile.target_roles : []);
      setExperienceYears(profile.experience_years || 0);
    }
  }, [profile]);

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    const skill = { skill: newSkill.trim(), level: skillLevel, verified: false };
    setSkills(prev => [...prev, skill]);
    setNewSkill("");
  };

  const handleRemoveSkill = (index) => {
    setSkills(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTargetRole = () => {
    if (!newTargetRole.trim()) return;
    if (targetRoles.includes(newTargetRole.trim())) return;
    setTargetRoles(prev => [...prev, newTargetRole.trim()]);
    setNewTargetRole("");
  };

  const handleRemoveTargetRole = (role) => {
    setTargetRoles(prev => prev.filter(r => r !== role));
  };

  const handleSave = async () => {
    const token = getAuthToken();
    setSaving(true);
    
    try {
      const res = await fetch(`${API_URL}/career/profile/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ 
          skills, 
          target_roles: targetRoles,
          experience_years: experienceYears 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should not exceed 5MB");
      return;
    }
    
    setUploadingResume(true);
    const token = getAuthToken();
    
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result?.split(',')[1];
          if (!base64) {
            toast.error("Failed to read file");
            setUploadingResume(false);
            return;
          }
          
          const res = await fetch(`${API_URL}/career/profile/scan/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Token ${token}`,
            },
            body: JSON.stringify({ 
              resume_base64: base64,
              filename: file.name 
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.profile) {
              setProfile(data.profile);
              setSkills(Array.isArray(data.profile.skills) ? data.profile.skills : []);
            }
            toast.success(data.message || "Resume scanned!");
          } else {
            const errData = await res.json().catch(() => ({}));
            toast.error(errData.error || "Failed to scan resume");
          }
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("Error processing resume");
        }
        setUploadingResume(false);
      };
      
      reader.onerror = () => {
        toast.error("Error reading file");
        setUploadingResume(false);
      };
      
      reader.readAsDataURL(file);
    } catch {
      toast.error("Error uploading resume");
      setUploadingResume(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          Skill Profile
        </h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm flex items-center gap-2"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Skills & Resume */}
        <div className="space-y-4">
          {/* Resume Upload */}
          <div className="bg-white/5 rounded-lg p-4 border border-dashed border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Upload Resume (PDF) - AI will extract your skills
            </h3>
            <label className="block">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-lg cursor-pointer transition-colors">
                {uploadingResume ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="text-purple-300">Scanning resume...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300">Choose PDF Resume</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Manual Skill Input */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Add Skills Manually</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && isEditing && handleAddSkill()}
                placeholder="e.g., Python, React"
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                disabled={!isEditing}
              />
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
                disabled={!isEditing}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <button
                onClick={handleAddSkill}
                disabled={!isEditing || !newSkill.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            {/* Skills List */}
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {skills.map((skill, index) => (
                <span 
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                    skill.level === 'advanced' ? 'bg-green-500/20 text-green-400' :
                    skill.level === 'intermediate' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {typeof skill === 'string' ? skill : (skill.name || skill.skill || 'Unknown')}
                  {isEditing && (
                    <button onClick={() => handleRemoveSkill(index)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {skills.length === 0 && (
                <span className="text-gray-500 text-sm">No skills added yet. Upload resume or add manually.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Target Roles & Experience */}
        <div className="space-y-4">
          {/* Target Roles */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Target Roles (for job matching)</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTargetRole}
                onChange={(e) => setNewTargetRole(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && isEditing && handleAddTargetRole()}
                placeholder="e.g., Full Stack Developer"
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                disabled={!isEditing}
              />
              <button
                onClick={handleAddTargetRole}
                disabled={!isEditing || !newTargetRole.trim()}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role, index) => (
                <span key={index} className="px-3 py-1 rounded-full text-sm bg-purple-500/20 text-purple-400 flex items-center gap-2">
                  {role}
                  {isEditing && (
                    <button onClick={() => handleRemoveTargetRole(role)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {targetRoles.length === 0 && (
                <span className="text-gray-500 text-sm">Add target roles to find matching opportunities</span>
              )}
            </div>
          </div>

          {/* Experience */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Years of Experience</h3>
            <input
              type="number"
              min="0"
              max="50"
              value={experienceYears}
              onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


export default function CareerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [insights, setInsights] = useState([]);
  const [rejectionFeedback, setRejectionFeedback] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [externalJobs, setExternalJobs] = useState([]);
  const [searchingJobs, setSearchingJobs] = useState(false);
  const [jobSearchError, setJobSearchError] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboardData();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Fetch skill profile
      const profileRes = await fetch(`${API_URL}/career/profile/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }

      // Fetch roadmaps
      const roadmapsRes = await fetch(`${API_URL}/career/roadmap/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (roadmapsRes.ok) {
        const data = await roadmapsRes.json();
        setRoadmaps(data);
      }

      // Fetch skill-matched interviews (curated for user)
      const matchedRes = await fetch(`${API_URL}/career/matched-interviews/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (matchedRes.ok) {
        const data = await matchedRes.json();
        setOpportunities(data.slice(0, 5));  // Top 5 matches
      }

      // Fetch insights
      const insightsRes = await fetch(`${API_URL}/feedback/insights/?addressed=false`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (insightsRes.ok) {
        const data = await insightsRes.json();
        setInsights(data.slice(0, 3));
      }

      // Fetch rejection feedback with AI analysis
      const rejectionRes = await fetch(`${API_URL}/feedback/rejections/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (rejectionRes.ok) {
        const data = await rejectionRes.json();
        setRejectionFeedback(data.slice(0, 5));  // Show latest 5
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanProfile = async () => {
    const token = getAuthToken();
    setScanning(true);
    
    try {
      const res = await fetch(`${API_URL}/career/profile/scan/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        toast.success("Profile scanned successfully!");
      } else {
        toast.error("Failed to scan profile");
      }
    } catch {
      toast.error("Error scanning profile");
    } finally {
      setScanning(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!targetRole.trim()) {
      toast.error("Please enter a target role");
      return;
    }

    const token = getAuthToken();
    setGeneratingRoadmap(true);

    try {
      const res = await fetch(`${API_URL}/career/roadmap/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ target_role: targetRole }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoadmaps(prev => [data, ...prev]);
        setTargetRole("");
        toast.success("Roadmap generated!");
      } else {
        toast.error("Failed to generate roadmap");
      }
    } catch {
      toast.error("Error generating roadmap");
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const handleSearchExternalJobs = async () => {
    const token = getAuthToken();
    if (!token) return;

    setSearchingJobs(true);
    setJobSearchError(null);
    
    try {
      const response = await fetch(`${API_URL}/career/external-jobs/`, {
        headers: { Authorization: `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setExternalJobs(data.jobs || []);
          if (data.jobs?.length === 0) {
            toast.info("No external jobs found matching your profile");
          } else {
            toast.success(`Found ${data.jobs.length} matching opportunities!`);
          }
        } else {
          setJobSearchError(data.error || "Failed to search jobs");
        }
      } else {
        setJobSearchError("Failed to connect to job search service");
      }
    } catch {
      setJobSearchError("Error searching for jobs");
    } finally {
      setSearchingJobs(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Career Co-Pilot Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Your AI-powered career development companion</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={handleScanProfile}
              disabled={scanning}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Scan Profile
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Skills Tracked</p>
                <p className="text-2xl font-bold">{profile?.skills?.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Active Roadmaps</p>
                <p className="text-2xl font-bold">{roadmaps.filter(r => r.status === 'active').length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Matched Jobs</p>
                <p className="text-2xl font-bold">{opportunities.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Action Items</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Skill Profile Editor - NEW SECTION */}
        <ProfileEditor 
          profile={profile} 
          setProfile={setProfile} 
          API_URL={API_URL} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Roadmaps & Generate */}
          <div className="lg:col-span-2 space-y-6">
            {/* Generate New Roadmap */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Generate Learning Roadmap
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Enter target role (e.g., Full Stack Developer)"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 placeholder-gray-400"
                />
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={generatingRoadmap}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {generatingRoadmap ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Generate
                </button>
              </div>
            </div>

            {/* Active Roadmaps */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  Your Learning Roadmaps
                </h2>
                <Link to="/roadmaps" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              
              {roadmaps.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No roadmaps yet. Generate one above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roadmaps.slice(0, 3).map((roadmap) => (
                    <div key={roadmap.id} className="bg-white/5 rounded-lg p-4 border border-gray-200 hover:border-purple-500/50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{roadmap.target_role}</h3>
                          <p className="text-sm text-gray-600">{roadmap.estimated_duration_weeks} weeks estimated</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          roadmap.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          roadmap.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-600'
                        }`}>
                          {roadmap.status}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Readiness</span>
                          <span>{Math.round(roadmap.current_readiness_score)}%</span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                            style={{ width: `${roadmap.current_readiness_score}%` }}
                          />
                        </div>
                      </div>
                      
                      <Link 
                        to={`/roadmap/${roadmap.id}`}
                        className="mt-3 text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        View Roadmap <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback Insights */}
            {insights.length > 0 && (
              <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    Action Items
                  </h2>
                  <Link to="/feedback" className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div key={insight.id} className="bg-white/5 rounded-lg p-4 border-l-4 border-amber-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">{insight.pattern_description.slice(0, 100)}...</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          insight.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                          insight.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Application Decisions & AI Feedback */}
            {rejectionFeedback.length > 0 && (
              <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Application Feedback
                  </h2>
                </div>
                
                <div className="space-y-4">
                  {rejectionFeedback.map((feedback) => (
                    <div key={feedback.id} className="bg-white/5 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{feedback.opportunity_title}</h4>
                          <p className="text-sm text-purple-400">{feedback.company_name}</p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                          Not Selected
                        </span>
                      </div>
                      
                      {/* AI Analysis */}
                      {feedback.ai_analyzed_feedback && (
                        <div className="space-y-3">
                          {/* Summary */}
                          {feedback.ai_analyzed_feedback.summary && (
                            <p className="text-sm text-gray-300">{feedback.ai_analyzed_feedback.summary}</p>
                          )}
                          
                          {/* Strengths */}
                          {feedback.ai_analyzed_feedback.strengths && feedback.ai_analyzed_feedback.strengths.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-green-400 mb-1">✓ Strengths</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {feedback.ai_analyzed_feedback.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-green-400">•</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Improvement Areas */}
                          {feedback.ai_analyzed_feedback.improvement_areas && feedback.ai_analyzed_feedback.improvement_areas.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-amber-400 mb-1">↑ Areas to Improve</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {feedback.ai_analyzed_feedback.improvement_areas.map((a, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-amber-400">•</span> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Action Items */}
                          {feedback.ai_analyzed_feedback.action_items && feedback.ai_analyzed_feedback.action_items.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-blue-400 mb-1">→ Next Steps</h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {feedback.ai_analyzed_feedback.action_items.map((item, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-blue-400">{i + 1}.</span> {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Encouragement */}
                          {feedback.ai_analyzed_feedback.encouragement && (
                            <p className="text-xs text-purple-300 italic mt-2">
                              💪 {feedback.ai_analyzed_feedback.encouragement}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Fallback if no AI analysis */}
                      {!feedback.ai_analyzed_feedback && feedback.raw_feedback && (
                        <p className="text-sm text-gray-600">{feedback.raw_feedback}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Opportunities */}
          <div className="space-y-6">
            {/* Matched Opportunities */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-green-400" />
                  Matched Interviews
                </h2>
                <button
                  onClick={() => fetchDashboardData()}
                  disabled={scanning}
                  className="text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No matched interviews yet.</p>
                  <p className="text-xs mt-1">Add skills to your profile to get personalized matches!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map((interview) => (
                    <div key={interview.id} className="bg-white/5 rounded-lg p-4 border border-gray-200 hover:border-green-500/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">{interview.post}</h4>
                          <p className="text-xs text-gray-600">{interview.org_name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          interview.match_score >= 80 ? 'bg-green-500/20 text-green-400' :
                          interview.match_score >= 60 ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-600'
                        }`}>
                          {interview.match_score}% match
                        </span>
                      </div>
                      {interview.match_reasons && interview.match_reasons.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-green-400 italic">{interview.match_reasons[0]}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <span>{interview.experience} exp</span>
                        <span>•</span>
                        <span>Deadline: {new Date(interview.submissionDeadline).toLocaleDateString()}</span>
                      </div>
                      <Link 
                        to={`/interview/${interview.id}`}
                        className="mt-2 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        View & Apply <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              
              <Link 
                to="/interview"
                className="mt-4 block w-full text-center py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
              >
                View All Interviews
              </Link>
            </div>

            {/* Skills Summary */}
            {profile?.skills?.length > 0 && (
              <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  Top Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.slice(0, 10).map((skill, index) => (
                    <span 
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm ${
                        skill.level === 'advanced' ? 'bg-green-500/20 text-green-400' :
                        skill.level === 'intermediate' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-600'
                      }`}
                    >
                      {typeof skill === 'string' ? skill : (skill.name || skill.skill || 'Unknown')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Job Opportunities */}
            <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-blue-500" />
                  External Opportunities
                </h2>
                <button
                  onClick={handleSearchExternalJobs}
                  disabled={searchingJobs}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
                >
                  {searchingJobs ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Searching...</>
                  ) : (
                    <><Search className="w-4 h-4" /> Find Jobs</>
                  )}
                </button>
              </div>
              
              {jobSearchError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {jobSearchError}
                </div>
              )}
              
              {externalJobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Click "Find Jobs" to search external opportunities</p>
                  <p className="text-xs mt-1">Powered by Tavily - searches LinkedIn, Indeed, Glassdoor & more</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {externalJobs.map((job, index) => (
                    <a
                      key={index}
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 hover:bg-blue-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{job.title}</h4>
                          <p className="text-xs text-blue-600">{job.source}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          job.match_score >= 60 ? 'bg-green-100 text-green-600' :
                          job.match_score >= 30 ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {Math.round(job.match_score)}% match
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{job.snippet}</p>
                      {job.skills_matched?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.skills_matched.slice(0, 4).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                              ✓ {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
