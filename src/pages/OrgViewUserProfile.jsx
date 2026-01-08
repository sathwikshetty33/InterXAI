import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Github, ExternalLink, Calendar, Briefcase, 
  GraduationCap, Code, Bot, Send, X, Loader2,
  Building
} from 'lucide-react';
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import { getAuthToken } from '../utils/handleToken';

const API_URL = import.meta.env.VITE_API_URL;

// Reusable SkillCard component
const SkillCard = ({ skill }) => {
  const name = typeof skill === 'string' ? skill : skill.name || skill.skill || skill;
  return (
    <div className="px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-lg border border-indigo-200 text-sm font-medium hover:shadow-sm transition-all">
      {name}
    </div>
  );
};

// Chatbot Modal Component
const ChatbotModal = ({ isOpen, onClose, userData, onSend, messages, loading, input, setInput, chatEndRef }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
              <Bot size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">AI Assistant</h3>
              <p className="text-gray-600 text-sm">Ask about {userData?.user?.username || 'this user'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                msg.role === 'user' ? 'bg-indigo-100' : 'bg-gradient-to-br from-indigo-500 to-purple-600'
              }`}>
                {msg.role === 'user' ? <User size={16} className="text-indigo-600" /> : <Bot size={16} className="text-white" />}
              </div>
              <div className={`max-w-[75%] p-4 rounded-2xl ${
                msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border p-4 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSend()}
              placeholder="Ask about skills, experience, or fit..."
              className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OrgViewUserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const token = getAuthToken();
      if (!token) { navigate('/login'); return; }
  
      try {
        const res = await fetch(`${API_URL}/users/org-user-detail/${userId}/`, {
          headers: { Authorization: `Token ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setUserData(data);
          setChatMessages([{
            role: 'assistant',
            content: `Hello! I can help you analyze ${data.user?.username}'s profile. Ask me about their skills, experience, or fit for specific roles.`
          }]);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const parseResumeData = (extractedResume) => {
    if (!extractedResume) return null;
    
    // Check if it's a JSON string first
    try {
      const parsed = typeof extractedResume === 'string' ? JSON.parse(extractedResume) : extractedResume;
      if (typeof parsed === 'object' && parsed !== null && !parsed.raw) {
        return parsed; // It was valid JSON data
      }
    } catch {
      // Not JSON, likely Markdown
    }

    const content = typeof extractedResume === 'string' ? extractedResume : extractedResume.raw;
    if (!content || typeof content !== 'string') return { raw: content };

    // Parse Markdown content
    const sections = {};
    const lines = content.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        const sectionName = trimmed.replace('### ', '').trim().toLowerCase();
        currentSection = sectionName;
        sections[sectionName] = [];
      } else if (currentSection && trimmed) {
        // Remove markdown bullets and clean up
        const cleaned = trimmed.replace(/^-\s*/, '').replace(/\*\*/g, '').trim();
        if (cleaned) {
          sections[currentSection].push(cleaned);
        }
      }
    });

    return {
      skills: sections['skills'] || [],
      experience: sections['experience'] || [],
      education: sections['education'] || [],
      projects: sections['projects'] || [],
      achievements: sections['achievements'] || [],
      certifications: sections['certifications'] || [],
      raw: content
    };
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const token = getAuthToken();
      
      // Build context from all applications
      const allResumes = userData.applications?.map(app => app.extratedResume || '').join('\n\n');
      const allFeedback = userData.applications?.map(app => 
        `${app.interview?.post}: ${app.feedback || 'No feedback'} (Score: ${app.score})`
      ).join('\n');

      const response = await fetch(`${API_URL}/interview/groq-proxy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping recruiters evaluate a candidate.

USER: ${userData.user?.username}
EMAIL: ${userData.user?.email}
GITHUB: ${userData.profile?.github || 'Not provided'}
LEETCODE: ${userData.profile?.leetcode || 'Not provided'}
BIO: ${userData.profile?.bio || 'Not provided'}

RESUME DATA:
${allResumes || 'No resume data available'}

INTERVIEW HISTORY & FEEDBACK:
${allFeedback || 'No interview history'}

Provide helpful, concise answers about this candidate's qualifications, skills, and potential fit for roles.`
            },
            ...chatMessages.filter(m => m.role !== 'system').map(m => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })),
            { role: 'user', content: userMessage }
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7
        })
      });

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response. Please try again.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-white p-6 rounded-xl shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span>Loading user profile...</span>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">User not found</h2>
          <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const { user, profile, applications } = userData;
  
  // Aggregate resume data from all applications
  const aggregatedResumeData = applications?.reduce((acc, app) => {
    const parsed = parseResumeData(app.extratedResume);
    if (parsed) {
      if (parsed.skills) acc.skills = [...new Set([...acc.skills, ...(Array.isArray(parsed.skills) ? parsed.skills : [parsed.skills])])];
      if (parsed.experience) acc.experience = [...acc.experience, ...(Array.isArray(parsed.experience) ? parsed.experience : [parsed.experience])];
      if (parsed.education) acc.education = [...acc.education, ...(Array.isArray(parsed.education) ? parsed.education : [parsed.education])];
      if (parsed.projects) acc.projects = [...acc.projects, ...(Array.isArray(parsed.projects) ? parsed.projects : [parsed.projects])];
      if (parsed.achievements) acc.achievements = [...acc.achievements, ...(Array.isArray(parsed.achievements) ? parsed.achievements : [parsed.achievements])];
      if (parsed.certifications) acc.certifications = [...acc.certifications, ...(Array.isArray(parsed.certifications) ? parsed.certifications : [parsed.certifications])];
    }
    return acc;
  }, { skills: [], experience: [], education: [], projects: [], achievements: [], certifications: [] });

  const tabs = ['overview', 'skills', 'experience', 'education', 'projects', 'interviews'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
              {profile?.photo ? (
                <img src={profile.photo} alt={user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={40} className="text-white" />
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-600">
                <span className="flex items-center gap-1"><Mail size={16} /> {user.email}</span>
                {profile?.github && (
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center gap-1 text-gray-700 hover:text-indigo-600">
                    <Github size={16} /> {profile.github} <ExternalLink size={12} />
                  </a>
                )}
                {profile?.leetcode && (
                  <a href={`https://leetcode.com/${profile.leetcode}`} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-gray-700 hover:text-orange-600">
                    <Code size={16} /> {profile.leetcode} <ExternalLink size={12} />
                  </a>
                )}
                <span className="flex items-center gap-1"><Calendar size={16} /> Joined {new Date(user.date_joined).toLocaleDateString()}</span>
              </div>
              {profile?.bio && <p className="mt-4 text-gray-600">{profile.bio}</p>}
            </div>

            <button
              onClick={() => setChatOpen(true)}
              className="self-start px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl flex items-center gap-2 hover:shadow-lg transition-all"
            >
              <Bot size={20} /> AI Chat
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border mb-6">
          <div className="flex flex-wrap gap-2 p-4 border-b">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border">
                  <h3 className="font-semibold text-gray-800 mb-2">Applications</h3>
                  <p className="text-3xl font-bold text-indigo-600">{applications?.length || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border">
                  <h3 className="font-semibold text-gray-800 mb-2">Avg Score</h3>
                  <p className="text-3xl font-bold text-emerald-600">
                    {applications?.length 
                      ? (applications.reduce((sum, a) => sum + (a.score || 0), 0) / applications.length).toFixed(1) 
                      : '0'}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border">
                  <h3 className="font-semibold text-gray-800 mb-2">Skills</h3>
                  <p className="text-3xl font-bold text-amber-600">{aggregatedResumeData.skills?.length || 0}</p>
                </div>
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="flex flex-wrap gap-3">
                {aggregatedResumeData.skills?.length > 0 ? (
                  aggregatedResumeData.skills.map((skill, idx) => <SkillCard key={idx} skill={skill} />)
                ) : (
                  <p className="text-gray-500">No skills data available</p>
                )}
              </div>
            )}

            {activeTab === 'experience' && (
              <div className="space-y-4">
                {aggregatedResumeData.experience?.length > 0 ? (
                  aggregatedResumeData.experience.map((exp, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border">
                      <div className="flex items-start gap-3">
                        <Briefcase className="text-indigo-600 mt-1" size={20} />
                        <div>
                          <h4 className="font-semibold text-gray-900">{exp.title || exp.raw || exp}</h4>
                          {exp.organization && <p className="text-gray-600">{exp.organization}</p>}
                          {exp.period && <p className="text-sm text-gray-500">{exp.period}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No experience data available</p>
                )}
              </div>
            )}

            {activeTab === 'education' && (
              <div className="space-y-4">
                {aggregatedResumeData.education?.length > 0 ? (
                  aggregatedResumeData.education.map((edu, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border">
                      <div className="flex items-start gap-3">
                        <GraduationCap className="text-emerald-600 mt-1" size={20} />
                        <div>
                          <h4 className="font-semibold text-gray-900">{edu.title || edu.raw || edu}</h4>
                          {edu.organization && <p className="text-gray-600">{edu.organization}</p>}
                          {edu.period && <p className="text-sm text-gray-500">{edu.period}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No education data available</p>
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-4">
                {aggregatedResumeData.projects?.length > 0 ? (
                  aggregatedResumeData.projects.map((proj, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border">
                      <div className="flex items-start gap-3">
                        <Code className="text-purple-600 mt-1" size={20} />
                        <div>
                          <h4 className="font-semibold text-gray-900">{typeof proj === 'string' ? proj.split('|')[0] : proj.title || proj}</h4>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No project data available</p>
                )}
              </div>
            )}

            {activeTab === 'interviews' && (
              <div className="space-y-4">
                {applications?.length > 0 ? (
                  applications.map((app, idx) => (
                    <div key={idx} className="bg-white border rounded-xl p-6 hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900">{app.interview?.post}</h4>
                          <p className="text-gray-600 flex items-center gap-2">
                            <Building size={16} /> {app.interview?.org_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            app.final_decision === 'accepted' ? 'bg-green-100 text-green-700' :
                            app.final_decision === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {app.final_decision}
                          </span>
                          <span className="text-lg font-bold text-indigo-600">{app.score?.toFixed(1) || '0'}/10</span>
                        </div>
                      </div>
                      
                      {app.session && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                          <div className="text-center p-2 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-500">Resume</p>
                            <p className="font-bold text-blue-600">{app.session.Resumescore || '-'}</p>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-500">Coding</p>
                            <p className="font-bold text-green-600">{app.session.CodingScore || '-'}</p>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-500">Dev</p>
                            <p className="font-bold text-purple-600">{app.session.Devscore || '-'}</p>
                          </div>
                          <div className="text-center p-2 bg-orange-50 rounded-lg">
                            <p className="text-xs text-gray-500">DSA</p>
                            <p className="font-bold text-orange-600">{app.session.DsaScore || '-'}</p>
                          </div>
                        </div>
                      )}

                      {app.feedback && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600"><strong>Feedback:</strong> {app.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No interview history</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {/* Chatbot Modal */}
      <ChatbotModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        userData={userData}
        messages={chatMessages}
        loading={chatLoading}
        input={chatInput}
        setInput={setChatInput}
        onSend={sendChatMessage}
        chatEndRef={chatEndRef}
      />
    </div>
  );
}
