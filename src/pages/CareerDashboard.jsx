import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import {
  Loader2, Target, BookOpen, Briefcase,
  ChevronRight, ChevronDown, RefreshCw, BarChart3,
  AlertCircle, Zap, Brain, Plus, X,
  Upload, FileText, Save, User, ExternalLink, Search,
  Code2, Terminal, Cpu, Globe, Database, Layers, Layout,
  Smartphone, Cloud, Shield, CheckSquare, MessageSquare, MapPin,
  FileCode, Download, Copy, Wand2
} from "lucide-react";
import { toast } from 'react-toastify';

// --- CUSTOM BRAND ICONS (Inline SVGs for specific tools) ---
const BrandIcons = {
  VSCode: () => (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M22 5L17.56 6.48L18 8L17.56 6.48L2 18L4.09 13.56L2.32 18L22 5Z" fill="#007ACC" fillOpacity="0" />
      <path d="M17.56 6.48L22 5L2.32 18L4.09 13.56L9 12L5 3L17.56 6.48Z" fill="#007ACC" stroke="#007ACC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4L20 12L4 20" stroke="#007ACC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Python: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2c-2.3 0-4.4.8-5.3 2.7-.4.9.2 1.3.8 1.3h3v1h-4c-2.7 0-5 2.2-5 5s2.3 5 5 5h3v-1h-3c-1.3 0-2.5-.9-2.9-2.1l-.1-.4c0-.6.4-1.1 1-1.1h5c2.2 0 4-1.8 4-4V6c0-2.2-1.8-4-4-4zm0 1c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" opacity="0.8" />
      <path d="M12 22c2.3 0 4.4-.8 5.3-2.7.4-.9-.2-1.3-.8-1.3h-3v-1h4c2.7 0 5-2.2 5-5s-2.3-5-5-5h-3v1h3c1.3 0 2.5.9 2.9 2.1l.1.4c0 .6-.4 1.1-1 1.1h-5c-2.2 0-4 1.8-4 4v2c0 2.2 1.8 4 4 4zm0-1c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z" opacity="0.8" />
    </svg>
  ),
  React: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  )
};

// --- SKILL CARD COMPONENT ---
const SkillCard = ({ skill, onClick, onDelete, isEditing }) => {
  const name = typeof skill === 'string' ? skill : skill.name || skill.skill;
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  let brandColor = "bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300";
  let Icon = Code2;

  if (normalizedName.includes('react')) { brandColor = "bg-[#61DAFB]/10 text-[#00A8D6] border-[#61DAFB]/30 hover:border-[#61DAFB]"; Icon = BrandIcons.React; }
  else if (normalizedName.includes('python')) { brandColor = "bg-[#3776AB]/10 text-[#3776AB] border-[#3776AB]/30 hover:border-[#3776AB]"; Icon = BrandIcons.Python; }
  else if (normalizedName.includes('javascript') || normalizedName.includes('js')) { brandColor = "bg-[#F7DF1E]/10 text-[#D4B830] border-[#F7DF1E]/30 hover:border-[#F7DF1E]"; Icon = FileText; }
  else if (normalizedName.includes('typescript') || normalizedName.includes('ts')) { brandColor = "bg-[#3178C6]/10 text-[#3178C6] border-[#3178C6]/30 hover:border-[#3178C6]"; Icon = FileText; }
  else if (normalizedName.includes('vscode')) { brandColor = "bg-[#007ACC]/10 text-[#007ACC] border-[#007ACC]/30 hover:border-[#007ACC]"; Icon = BrandIcons.VSCode; }
  else if (normalizedName.includes('aws') || normalizedName.includes('amazon')) { brandColor = "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30 hover:border-[#FF9900]"; Icon = Cloud; }
  else if (normalizedName.includes('node')) { brandColor = "bg-[#339933]/10 text-[#339933] border-[#339933]/30 hover:border-[#339933]"; Icon = ServerIcon; }
  else if (normalizedName.includes('figma')) { brandColor = "bg-[#F24E1E]/10 text-[#F24E1E] border-[#F24E1E]/30 hover:border-[#F24E1E]"; Icon = Layout; }
  else if (normalizedName.includes('github') || normalizedName.includes('git')) { brandColor = "bg-[#181717]/5 text-[#181717] border-[#181717]/20 hover:border-[#181717]"; Icon = Code2; }
  else if (normalizedName.includes('database') || normalizedName.includes('sql') || normalizedName.includes('mongo')) { brandColor = "bg-[#47A248]/10 text-[#47A248] border-[#47A248]/30 hover:border-[#47A248]"; Icon = Database; }
  else if (normalizedName.includes('docker') || normalizedName.includes('kube')) { brandColor = "bg-[#2496ED]/10 text-[#2496ED] border-[#2496ED]/30 hover:border-[#2496ED]"; Icon = Layers; }

  function ServerIcon(props) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2" /><rect width="20" height="8" x="2" y="14" rx="2" ry="2" /><line x1="6" x2="6.01" y1="6" y2="6" /><line x1="6" x2="6.01" y1="18" y2="18" /></svg> }

  return (
    <div
      onClick={onClick}
      className={`relative group flex items-center gap-3 p-4 rounded-xl border ${brandColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-md cursor-pointer bg-white/50 backdrop-blur-sm`}
    >
      <div className={`p-2 rounded-lg bg-white/80 shadow-sm`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-sm md:text-base leading-tight">{name}</h4>
        {skill.level && !isEditing && (
          <span className="text-[10px] uppercase font-bold opacity-70 tracking-wider">{skill.level}</span>
        )}
      </div>

      {isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 bg-red-100 text-red-500 rounded-full hover:bg-red-200 transition-all"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

// --- PROFILE EDITOR COMPONENT ---
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
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ skills, target_roles: targetRoles, experience_years: experienceYears }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setIsEditing(false);
        toast.success("Profile updated!");
      } else { toast.error("Failed to update"); }
    } catch { toast.error("Error updating"); } finally { setSaving(false); }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Please upload a PDF file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File size should not exceed 5MB"); return; }

    setUploadingResume(true);
    const token = getAuthToken();
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result?.split(',')[1];
        const res = await fetch(`${API_URL}/career/profile/scan/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
          body: JSON.stringify({ resume_base64: base64, filename: file.name }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.profile) { setProfile(data.profile); setSkills(data.profile.skills || []); }
          toast.success("Resume scanned!");
        } else { toast.error("Scan failed"); }
        setUploadingResume(false);
      };
      reader.readAsDataURL(file);
    } catch { toast.error("Upload failed"); setUploadingResume(false); }
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm animate-fade-in-up h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">My Skills & Expertise</h2>
          <p className="text-sm text-slate-500">Manage your technical profile</p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-all shadow-sm">Edit Skills</button>
          ) : (
            <>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 hover:bg-slate-100 rounded-xl text-sm font-medium text-slate-600 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Skills Inputs & Grid */}
        <div className="lg:col-span-8 space-y-6">
          {isEditing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-500 mb-2 font-medium">Auto-Extract from Resume</p>
                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-slate-200 text-indigo-600 text-xs font-bold rounded-lg hover:border-indigo-300 transition-all">
                  {uploadingResume ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Upload className="w-3 h-3 mr-2" />}
                  {uploadingResume ? "Scanning..." : "Upload PDF"}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} disabled={uploadingResume} />
                </label>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <div className="flex gap-2">
                  <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill..." className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
                  <button onClick={handleAddSkill} disabled={!newSkill.trim()} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                <select value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {skills.map((skill, index) => (
              <SkillCard key={index} skill={skill} isEditing={isEditing} onDelete={() => handleRemoveSkill(index)} />
            ))}
            {skills.length === 0 && <div className="col-span-full text-center py-8 text-slate-400 italic">No skills added yet.</div>}
          </div>
        </div>

        {/* Right: Targets & Exp */}
        <div className="lg:col-span-4 space-y-6 lg:border-l lg:border-slate-100 lg:pl-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Target Roles</h3>
            {isEditing && (
              <div className="flex gap-2 mb-3">
                <input type="text" value={newTargetRole} onChange={(e) => setNewTargetRole(e.target.value)} placeholder="e.g. Backend Dev" className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500" />
                <button onClick={handleAddTargetRole} disabled={!newTargetRole.trim()} className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"><Plus className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {targetRoles.map((role, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2">
                  {role}
                  {isEditing && <button onClick={() => handleRemoveTargetRole(role)} className="hover:text-red-500"><X className="w-3 h-3" /></button>}
                </span>
              ))}
              {targetRoles.length === 0 && <span className="text-xs text-slate-400">No roles set.</span>}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Experience</h3>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="50" value={experienceYears} onChange={(e) => setExperienceYears(Number(e.target.value) || 0)} className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none" />
                <span className="text-sm font-medium text-slate-600">Years</span>
              </div>
            ) : (
              <p className="text-xl font-bold text-slate-800">{experienceYears} <span className="text-sm font-normal text-slate-500">Years</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- NEW RESUME AI COMPONENTS ---
const ResumeAI = ({ API_URL }) => {
  const [jobDesc, setJobDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [activeFormat, setActiveFormat] = useState('matex'); // 'matex' or 'nit'

  const handleGenerate = async () => {
    if (!jobDesc.trim()) return toast.error("Please enter a Job Description");

    setGenerating(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/career/generate-resume/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ job_description: jobDesc })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        toast.success("Resume optimized successfully!");
      } else {
        toast.error("Failed to generate. Try again.");
      }
    } catch (e) { toast.error("Error connecting to AI service."); }
    finally { setGenerating(false); }
  };

  const downloadTeX = (latexCode, filename) => {
    const blob = new Blob([latexCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.info("Downloaded .tex file. Upload to Overleaf to compile.");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in-up min-h-[600px]">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-indigo-200" />
            Resume Refactor AI
          </h2>
          <p className="text-indigo-100 mt-2 max-w-xl">
            Identify key requirements from a job description and automatically rewrite your resume tailored to the role. Generates professional LaTeX code ready for Overleaf.
          </p>
        </div>
        {/* Decorative BG */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full translate-y-10 -translate-x-10 blur-2xl"></div>
      </div>

      <div className={`grid grid-cols-1 ${result ? 'lg:grid-cols-12' : 'lg:grid-cols-1'} gap-6 transition-all duration-500 ease-in-out`}>

        {/* INPUT PANEL */}
        <div className={`${result ? 'lg:col-span-5' : 'lg:col-span-1'} bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all duration-500`}>
          <div className="p-6 border-b border-slate-100">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Step 1: Input Job Details</label>
            <p className="text-sm text-slate-600">Paste the full job description below.</p>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-4">
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              className="flex-1 w-full min-h-[200px] p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-y transition-all placeholder:text-slate-400"
              placeholder="Example: 'We are looking for a Senior React Developer with 5+ years of experience in...'"
            />

            <button
              onClick={handleGenerate}
              disabled={generating || !jobDesc.trim()}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2 group"
            >
              {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 group-hover:text-yellow-400 transition-colors" />}
              {generating ? "Analying & Refactoring..." : "Generate Optimized Resume"}
            </button>
          </div>
        </div>

        {/* RESULTS PANEL (Only shows after generation) */}
        {result && (
          <div className="lg:col-span-7 space-y-6 animate-slide-in-right">

            {/* Analysis Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200 mb-2">
                  {result.score || 85}
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Match Score</p>
              </div>

              <div className="sm:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-amber-500" /> Suggestions
                </h4>
                <ul className="space-y-2">
                  {result.tips?.slice(0, 3).map((tip, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">•</span> {tip}
                    </li>
                  )) || <li className="text-xs text-slate-500">Add more keywords from JD.</li>}
                </ul>
              </div>
            </div>

            {/* Editor / Preview Area */}
            <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-800 flex flex-col h-[500px]">
              <div className="flex bg-slate-950/50 border-b border-slate-800 px-2 pt-2">
                {['matex', 'nit'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormat(fmt)}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${activeFormat === fmt
                        ? 'bg-slate-800 text-indigo-400'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                      }`}
                  >
                    {fmt === 'matex' ? 'Standard (Matex)' : 'Academic (NIT)'}
                  </button>
                ))}
              </div>

              <div className="flex-1 relative group bg-[#0d1117]">
                <textarea
                  readOnly
                  value={activeFormat === 'matex' ? result.matex_latex : result.nit_latex}
                  className="w-full h-full p-6 bg-transparent text-slate-300 font-mono text-xs leading-5 outline-none resize-none custom-scrollbar selection:bg-indigo-500/30"
                  spellCheck="false"
                />

                {/* Floating Actions */}
                <div className="absolute bottom-6 right-6 flex gap-3">
                  <button
                    onClick={() => copyToClipboard(activeFormat === 'matex' ? result.matex_latex : result.nit_latex)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-lg flex items-center gap-2 transition-all hover:-translate-y-1"
                  >
                    <Copy className="w-4 h-4 text-indigo-400" /> Copy Code
                  </button>
                  <button
                    onClick={() => downloadTeX(activeFormat === 'matex' ? result.matex_latex : result.nit_latex, `resume_${activeFormat}`)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all hover:-translate-y-1"
                  >
                    <Download className="w-4 h-4" /> Download .tex
                  </button>
                </div>
              </div>
            </div>

            <div className="text-center">
              <a href="https://www.overleaf.com/docs?snip_uri=https://raw.githubusercontent.com/..." target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:text-indigo-600 hover:underline font-medium">
                                How to use: Copy code above -> Paste into Overleaf (New Project)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// --- MAIN PAGE ---

export default function CareerDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("skills"); // Default Tab

  // Data State
  const [profile, setProfile] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [insights, setInsights] = useState([]);
  const [rejectionFeedback, setRejectionFeedback] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [externalJobs, setExternalJobs] = useState([]);
  const [searchingJobs, setSearchingJobs] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      const token = getAuthToken();
      if (!token) { navigate('/login'); return; }

      setLoading(true);
      try {
        const headers = { Authorization: `Token ${token}` };
        const [prof, roads, opps, ins, rejs] = await Promise.all([
          fetch(`${API_URL}/career/profile/`, { headers }),
          fetch(`${API_URL}/career/roadmap/`, { headers }),
          fetch(`${API_URL}/career/matched-interviews/`, { headers }),
          fetch(`${API_URL}/feedback/insights/?addressed=false`, { headers }),
          fetch(`${API_URL}/feedback/rejections/`, { headers })
        ]);

        if (prof.ok) setProfile(await prof.json());
        if (roads.ok) setRoadmaps(await roads.json());
        if (opps.ok) { const d = await opps.json(); setOpportunities(d.slice(0, 5)); }
        if (ins.ok) { const d = await ins.json(); setInsights(d.slice(0, 5)); }
        if (rejs.ok) { const d = await rejs.json(); setRejectionFeedback(d.slice(0, 5)); }

      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleScanProfile = async () => {
    const token = getAuthToken();
    setScanning(true);
    try {
      await fetch(`${API_URL}/career/profile/scan/`, { method: 'POST', headers: { Authorization: `Token ${token}` } });
      toast.success("Rescanning complete!");
      window.location.reload();
    } catch { toast.error("Scan failed"); } finally { setScanning(false); }
  };

  const handleGenerateRoadmap = async () => {
    if (!targetRole.trim()) return toast.error("Enter role");
    setGeneratingRoadmap(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_URL}/career/roadmap/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ target_role: targetRole })
      });
      if (res.ok) {
        const data = await res.json();
        setRoadmaps(prev => [data, ...prev]);
        setTargetRole("");
        toast.success("Generated!");
      }
    } catch { toast.error("Failed"); } finally { setGeneratingRoadmap(false); }
  };

  const handleSearchExternalJobs = async () => {
    const token = getAuthToken();
    if (!token) return;
    setSearchingJobs(true);
    try {
      const res = await fetch(`${API_URL}/career/external-jobs/`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) { setExternalJobs(data.jobs || []); toast.success(`Found ${data.jobs?.length} matches`); }
      }
    } catch { toast.error("Search failed"); } finally { setSearchingJobs(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;

  // --- CONTENT SECTION RENDERS ---
  const renderContent = () => {
    switch (activeTab) {
      case 'skills':
        return <ProfileEditor profile={profile} setProfile={setProfile} API_URL={API_URL} />;

      case 'resume':
        return <ResumeAI API_URL={API_URL} />;

      case 'roadmaps':
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Create New Roadmap</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <button onClick={handleGenerateRoadmap} disabled={generatingRoadmap} className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
                {generatingRoadmap ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Generate
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmaps.map((map, idx) => (
                <Link to={`/roadmap/${map.id}`} key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{map.target_role}</h4>
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${map.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{map.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${map.current_readiness_score}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-indigo-600">{Math.round(map.current_readiness_score)}%</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1"><BookOpen className="w-3 h-3" /> {map.estimated_duration_weeks} Weeks Estimated</p>
                </Link>
              ))}
              {roadmaps.length === 0 && <div className="col-span-2 text-center py-10 text-slate-400 italic">No roadmaps generated yet.</div>}
            </div>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-8 animate-fade-in-up">
            {/* Insights */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Action Items</h3>
              {insights.map((insight, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-amber-400 flex flex-col md:flex-row gap-4 items-start">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0"><Brain className="w-6 h-6" /></div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-bold text-slate-800">{insight.title}</h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded">{insight.priority}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{insight.pattern_description}</p>
                  </div>
                </div>
              ))}
              {insights.length === 0 && <p className="text-slate-400 italic">No pending action items.</p>}
            </div>

            {/* Rejections */}
            {rejectionFeedback.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Application Analysis</h3>
                {rejectionFeedback.map((fb, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-800">{fb.opportunity_title}</h4>
                        <p className="text-sm text-slate-500">{fb.company_name}</p>
                      </div>
                      <span className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold uppercase">Not Selected</span>
                    </div>

                    {fb.ai_analyzed_feedback ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                        <p className="text-sm font-medium text-slate-800">{fb.ai_analyzed_feedback.summary}</p>
                        {fb.ai_analyzed_feedback.improvement_areas && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-500 uppercase">To Improve:</p>
                            <ul className="text-sm text-slate-600 list-disc list-inside">
                              {fb.ai_analyzed_feedback.improvement_areas.map((area, i) => <li key={i}>{area}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 italic">"{fb.raw_feedback}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'jobs':
        return (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Job Matches</h2>
              <button onClick={handleSearchExternalJobs} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2">
                {searchingJobs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Find External
              </button>
            </div>

            <div className="grid gap-4">
              {opportunities.map((job, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-500 transition-all group flex justify-between items-center cursor-pointer">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{job.post}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-medium text-slate-500">{job.org_name}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{job.experience} Exp</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">{job.match_score}% Match</span>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">Internal</p>
                  </div>
                </div>
              ))}

              {externalJobs.map((job, idx) => (
                <a key={idx} href={job.url} target="_blank" rel="noreferrer" className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:bg-white hover:shadow-md transition-all group block">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{job.title}</h4>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{Math.round(job.match_score)}% Match</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mb-2">{job.source} • {job.location || 'Remote'}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{job.snippet}</p>
                </a>
              ))}

              {opportunities.length === 0 && externalJobs.length === 0 && <div className="text-center py-12 text-slate-400">No jobs found yet. Try searching external!</div>}
            </div>
          </div>
        );

      default: return null;
    }
  };

  // Nav Items Configuration
  const navItems = [
    { id: 'skills', label: 'Skills & Profile', icon: CheckSquare },
    { id: 'resume', label: 'Resume AI', icon: FileText },
    { id: 'roadmaps', label: 'Learning Path', icon: BookOpen },
    { id: 'feedback', label: 'Feedback & Actions', icon: MessageSquare },
    { id: 'jobs', label: 'Job Opportunities', icon: Briefcase },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-indigo-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 flex flex-col md:flex-row gap-8">

        {/* --- SIDEBAR NAVIGATION --- */}
        <aside className="w-full md:w-64 shrink-0 space-y-6">
          <div className="px-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-xs font-medium text-slate-500 mt-1">Welcome back, {profile?.name?.split(' ')[0]}</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                  ? 'bg-slate-900 text-white shadow-md transform translate-x-1'
                  : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-300' : 'text-slate-400'}`} />
                {item.label}
                {activeTab === item.id && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
              </button>
            ))}
          </nav>

          {/* Mini Stats in Sidebar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Skills</span>
                <span className="font-bold text-slate-900">{profile?.skills?.length || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Matches</span>
                <span className="font-bold text-slate-900">{opportunities.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Actions</span>
                <span className="font-bold text-slate-900">{insights.length}</span>
              </div>
            </div>
          </div>

          <div className="px-2 pt-4">
            <button onClick={handleScanProfile} disabled={scanning} className="w-full py-2 bg-indigo-50 text-indigo-700 text-xs font-bold uppercase rounded-lg hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2">
              {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Rescan Profile
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="flex-1 min-w-0">
          {/* Header for Mobile only (hidden on desktop to avoid dup) */}
          <div className="md:hidden mb-6">
            <h2 className="text-xl font-bold text-slate-900">{navItems.find(i => i.id === activeTab)?.label}</h2>
          </div>

          {renderContent()}
        </div>

      </main>
      <Footer />
    </div>
  );
}
