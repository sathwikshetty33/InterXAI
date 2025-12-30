import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import {
  Loader2, Target, BookOpen, Briefcase,
  ChevronRight, ChevronDown, RefreshCw, Sparkles, BarChart3,
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

  {/* ================= HEADER ================= */}
  <div className="flex justify-between items-center mb-6">
    <h2 className="text-xl font-semibold flex items-center gap-2 text-black">
      <User className="w-5 h-5 text-blue-500" />
      Skill Profile
      {isEditing && (
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
          Editing
        </span>
      )}
    </h2>

    <div className="flex gap-2">
      {!isEditing ? (
        <button
          onClick={() => setIsEditing(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm text-white"
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

  {/* ================= GRID ================= */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

    {/* ============ LEFT COLUMN ============ */}
    <div className="space-y-5">

      {/* Resume Upload */}
      <div className="bg-gradient-to-br from-blue-500/10 to-transparent rounded-lg p-4 border border-dashed border-blue-500/30">
        <h3 className="text-sm font-medium text-black-300 mb-1 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Upload Resume (PDF)
        </h3>
        <p className="text-xs text-black-400 mb-3">
          AI will extract skills automatically
        </p>

        <label className="block">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleResumeUpload}
            disabled={uploadingResume}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg cursor-pointer transition">
            {uploadingResume ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-blue-400 text-sm">Scanning resume…</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 text-sm">Choose PDF Resume</span>
              </>
            )}
          </div>
        </label>
      </div>

      {/* Manual Skill Input */}
      <div>
        <h3 className="text-sm font-medium text-black-300 mb-2">Add Skills Manually</h3>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isEditing && handleAddSkill()}
            placeholder={isEditing ? "e.g., Python" : "Enable edit mode"}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60"
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
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Skills List */}
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 p-3">
          {skills.map((skill, index) => {
            const level = typeof skill === "string" ? "basic" : skill.level;
            const styles = {
              advanced: "bg-green-500/15 text-green-400 border-green-500/30",
              intermediate: "bg-blue-500/15 text-blue-400 border-blue-500/30",
              basic: "bg-black-500/15 text-black-300 border-black-500/30",
            };

            return (
              <span
                key={index}
                className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition hover:scale-[1.02] ${styles[level]}`}
              >
                <span className={`h-2 w-2 rounded-full ${
                  level === "advanced" ? "bg-green-400" :
                  level === "intermediate" ? "bg-blue-400" : "bg-black-400"
                }`} />
                <span className="font-medium whitespace-nowrap">
                  {typeof skill === "string" ? skill : skill.name || skill.skill}
                </span>
                {isEditing && (
                  <button
                    onClick={() => handleRemoveSkill(index)}
                    className="opacity-0 group-hover:opacity-100 text-black-400 hover:text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            );
          })}

          {skills.length === 0 && (
            <div className="w-full text-center py-6 border border-dashed border-white/20 rounded-lg">
              <p className="text-sm text-black-400">No skills added yet</p>
              <p className="text-xs text-black-500 mt-1">
                Upload a resume or add skills manually
              </p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ============ RIGHT COLUMN ============ */}
    <div className="space-y-5">

      {/* Target Roles */}
      <div>
        <h3 className="text-sm font-medium text-black-300 mb-2">
          Target Roles <span className="text-black-500">(for job matching)</span>
        </h3>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTargetRole}
            onChange={(e) => setNewTargetRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isEditing && handleAddTargetRole()}
            placeholder={isEditing ? "e.g., Backend Developer" : "Enable edit mode"}
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm disabled:opacity-60"
            disabled={!isEditing}
          />
          <button
            onClick={handleAddTargetRole}
            disabled={!isEditing || !newTargetRole.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {targetRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {targetRoles.map((role, index) => (
              <span
                key={index}
                className="group px-3 py-1.5 rounded-full text-sm bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-2"
              >
                {role}
                {isEditing && (
                  <button
                    onClick={() => handleRemoveTargetRole(role)}
                    className="opacity-0 group-hover:opacity-100 text-black-400 hover:text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/20 rounded-lg p-4 text-center">
            <p className="text-sm text-black-400">No target roles added</p>
            <p className="text-xs text-black-500 mt-1">
              Add roles to get better job matches
            </p>
          </div>
        )}
      </div>

      {/* Experience */}
      <div>
        <h3 className="text-sm font-medium text-black-300 mb-2">
          Years of Experience
        </h3>

        {isEditing ? (
          <input
            type="number"
            min="0"
            max="50"
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value) || 0)}
            className="w-28 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm"
          />
        ) : (
          <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm w-fit">
            {experienceYears > 0 ? (
              <span>{experienceYears} years</span>
            ) : (
              <span className="text-black-500 italic">Not specified</span>
            )}
          </div>
        )}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-black-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Career Co-Pilot Dashboard
            </h1>
            <p className="text-black-600 mt-1">Your AI-powered career development companion</p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button
              onClick={handleScanProfile}
              disabled={scanning}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Scan Profile
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-black-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-black-500 text-sm">Skills Tracked</p>
                <p className="text-2xl font-bold text-black-900">{profile?.skills?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-black-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-black-500 text-sm">Active Roadmaps</p>
                <p className="text-2xl font-bold text-black-900">{roadmaps.filter(r => r.status === 'active').length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-black-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-black-500 text-sm">Matched Jobs</p>
                <p className="text-2xl font-bold text-black-900">{opportunities.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-black-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-black-500 text-sm">Action Items</p>
                <p className="text-2xl font-bold text-black-900">{insights.length}</p>
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
            <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black-900">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Generate Learning Roadmap
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Enter target role (e.g., Full Stack Developer)"
                  className="flex-1 px-4 py-2 bg-black-50 border border-black-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-black-900 placeholder-black-400"
                />
                <button
                  onClick={handleGenerateRoadmap}
                  disabled={generatingRoadmap}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center gap-2 text-white"
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
            <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-black-900">
                  <Target className="w-5 h-5 text-green-600" />
                  Your Learning Roadmaps
                </h2>
                <Link to="/roadmaps" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {roadmaps.length === 0 ? (
                <div className="text-center py-8 text-black-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No roadmaps yet. Generate one above!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roadmaps.slice(0, 3).map((roadmap) => (
                    <div key={roadmap.id} className="bg-black-50 rounded-lg p-4 border border-black-200 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-medium text-black-900">{roadmap.target_role}</h3>
                          <p className="text-sm text-black-500">{roadmap.estimated_duration_weeks} weeks estimated</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${roadmap.status === 'active' ? 'bg-green-100 text-green-700' :
                          roadmap.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-black-100 text-black-600'
                          }`}>
                          {roadmap.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-black-500 mb-1">
                          <span>Readiness</span>
                          <span>{Math.round(roadmap.current_readiness_score)}%</span>
                        </div>
                        <div className="h-2 bg-black-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${roadmap.current_readiness_score}%` }}
                          />
                        </div>
                      </div>

                      <Link
                        to={`/roadmap/${roadmap.id}`}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
              <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-black-900">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    Action Items
                  </h2>
                  <Link to="/feedback" className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div key={insight.id} className="bg-black-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-black-900">{insight.title}</h4>
                          <p className="text-sm text-black-600 mt-1">{insight.pattern_description.slice(0, 100)}...</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${insight.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          insight.priority === 'high' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
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
              <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-black-900">
                    <Brain className="w-5 h-5 text-blue-600" />
                    Application Feedback
                  </h2>
                </div>

                <div className="space-y-4">
                  {rejectionFeedback.map((feedback) => (
                    <div key={feedback.id} className="bg-black-50 rounded-lg p-4 border border-black-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-black-900">{feedback.opportunity_title}</h4>
                          <p className="text-sm text-blue-600">{feedback.company_name}</p>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                          Not Selected
                        </span>
                      </div>

                      {/* AI Analysis */}
                      {feedback.ai_analyzed_feedback && (
                        <div className="space-y-3">
                          {/* Summary */}
                          {feedback.ai_analyzed_feedback.summary && (
                            <p className="text-sm text-black-700">{feedback.ai_analyzed_feedback.summary}</p>
                          )}

                          {/* Strengths */}
                          {feedback.ai_analyzed_feedback.strengths && feedback.ai_analyzed_feedback.strengths.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-green-700 mb-1">✓ Strengths</h5>
                              <ul className="text-xs text-black-600 space-y-1">
                                {feedback.ai_analyzed_feedback.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-green-600">•</span> {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Improvement Areas */}
                          {feedback.ai_analyzed_feedback.improvement_areas && feedback.ai_analyzed_feedback.improvement_areas.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-yellow-700 mb-1">↑ Areas to Improve</h5>
                              <ul className="text-xs text-black-600 space-y-1">
                                {feedback.ai_analyzed_feedback.improvement_areas.map((a, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-yellow-600">•</span> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Items */}
                          {feedback.ai_analyzed_feedback.action_items && feedback.ai_analyzed_feedback.action_items.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-blue-700 mb-1">→ Next Steps</h5>
                              <ul className="text-xs text-black-600 space-y-1">
                                {feedback.ai_analyzed_feedback.action_items.map((item, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-blue-600">{i + 1}.</span> {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Encouragement */}
                          {feedback.ai_analyzed_feedback.encouragement && (
                            <p className="text-xs text-blue-700 italic mt-2">
                              💪 {feedback.ai_analyzed_feedback.encouragement}
                            </p>
                          )}

                          {/* Detailed Per-Question Feedback */}
                          {feedback.ai_analyzed_feedback.detailed_feedback && feedback.ai_analyzed_feedback.detailed_feedback.length > 0 && (
                            <div className="mt-4 border-t border-black-200 pt-3">
                              <h5 className="text-xs font-semibold text-black-700 mb-2">📝 Question-by-Question Feedback</h5>
                              <div className="space-y-2">
                                {feedback.ai_analyzed_feedback.detailed_feedback.map((fb, i) => {
                                  const parts = fb.split(' | Feedback: ');
                                  const question = parts[0]?.replace('Q: ', '') || 'Question';
                                  const feedbackText = parts[1] || fb;

                                  return (
                                    <details
                                      key={i}
                                      className="group bg-white rounded-lg border border-black-200 overflow-hidden"
                                    >
                                      <summary className="cursor-pointer px-3 py-2 flex items-center justify-between text-xs font-medium text-black-700 hover:bg-black-50 transition-colors">
                                        <span className="truncate pr-2">{question}</span>
                                        <ChevronDown className="w-4 h-4 flex-shrink-0 text-black-400 group-open:rotate-180 transition-transform" />
                                      </summary>
                                      <div className="px-3 py-3 bg-black-50 border-t border-black-100">
                                        <p className="text-xs text-black-700 leading-relaxed whitespace-pre-wrap">{feedbackText}</p>
                                      </div>
                                    </details>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Scores Summary */}
                          {feedback.ai_analyzed_feedback.scores && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {feedback.ai_analyzed_feedback.scores.dev_score > 0 && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                  Dev: {feedback.ai_analyzed_feedback.scores.dev_score}/10
                                </span>
                              )}
                              {feedback.ai_analyzed_feedback.scores.resume_score > 0 && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                  Resume: {feedback.ai_analyzed_feedback.scores.resume_score}/10
                                </span>
                              )}
                              {feedback.ai_analyzed_feedback.scores.dsa_score > 0 && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                                  DSA: {feedback.ai_analyzed_feedback.scores.dsa_score}/10
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fallback if no AI analysis */}
                      {!feedback.ai_analyzed_feedback && feedback.raw_feedback && (
                        <p className="text-sm text-black-600">{feedback.raw_feedback}</p>
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
            <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-black-900">
                  <Briefcase className="w-5 h-5 text-yellow-600" />
                  Matched Interviews
                </h2>
                <button
                  onClick={() => fetchDashboardData()}
                  disabled={scanning}
                  className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-black-500">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No matched interviews yet.</p>
                  <p className="text-xs mt-1">Add skills to your profile to get personalized matches!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {opportunities.map((interview) => (
                    <div key={interview.id} className="bg-black-50 rounded-lg p-4 border border-black-200 hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-black-900 text-sm">{interview.post}</h4>
                          <p className="text-xs text-black-500">{interview.org_name}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${interview.match_score >= 80 ? 'bg-green-100 text-green-700' :
                          interview.match_score >= 60 ? 'bg-blue-100 text-blue-700' :
                            'bg-black-100 text-black-600'
                          }`}>
                          {interview.match_score}% match
                        </span>
                      </div>
                      {interview.match_reasons && interview.match_reasons.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs text-green-600 italic">{interview.match_reasons[0]}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-xs text-black-500 mb-2">
                        <span>{interview.experience} exp</span>
                        <span>•</span>
                        <span>Deadline: {new Date(interview.submissionDeadline).toLocaleDateString()}</span>
                      </div>
                      <Link
                        to={`/interview/${interview.id}`}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        View & Apply <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to="/interview"
                className="mt-4 block w-full text-center py-2 bg-black-100 hover:bg-black-200 rounded-lg text-sm text-black-700 transition-colors"
              >
                View All Interviews
              </Link>
            </div>

            {/* Skills Summary */}
            {profile?.skills?.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-black-900">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Top Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.slice(0, 10).map((skill, index) => (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-sm ${skill.level === 'advanced' ? 'bg-green-100 text-green-700' :
                        skill.level === 'intermediate' ? 'bg-blue-100 text-blue-700' :
                          'bg-black-100 text-black-600'
                        }`}
                    >
                      {typeof skill === 'string' ? skill : (skill.name || skill.skill || 'Unknown')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Job Opportunities */}
            <div className="bg-white rounded-xl p-6 border border-black-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-black-900">
                  <ExternalLink className="w-5 h-5 text-blue-600" />
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
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                  {jobSearchError}
                </div>
              )}

              {externalJobs.length === 0 ? (
                <div className="text-center py-8 text-black-500">
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
                      className="block bg-black-50 hover:bg-blue-50 rounded-lg p-4 border border-black-200 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-black-900 text-sm">{job.title}</h4>
                          <p className="text-xs text-blue-600">{job.source}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${job.match_score >= 60 ? 'bg-green-100 text-green-700' :
                          job.match_score >= 30 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-black-100 text-black-600'
                          }`}>
                          {Math.round(job.match_score)}% match
                        </span>
                      </div>
                      <p className="text-xs text-black-600 mb-2 line-clamp-2">{job.snippet}</p>
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
