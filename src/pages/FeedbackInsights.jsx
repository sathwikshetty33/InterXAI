import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import {
  Loader2, AlertCircle, CheckCircle, TrendingUp,
  BarChart3, Target, ChevronRight, RefreshCw,
  Lightbulb, ArrowUpRight
} from "lucide-react";
import { toast } from 'react-toastify';

export default function FeedbackInsights() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [skillProgress, setSkillProgress] = useState([]);
  const [rejections, setRejections] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [showAddressed, setShowAddressed] = useState(false);
  const [updatingRoadmap, setUpdatingRoadmap] = useState(false);

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
      const [insightsRes, progressRes, rejectionsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/feedback/insights/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`${API_URL}/feedback/skill-progress/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`${API_URL}/feedback/rejections/`, { headers: { Authorization: `Token ${token}` } }),
        fetch(`${API_URL}/feedback/action-logs/`, { headers: { Authorization: `Token ${token}` } }),
      ]);

      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (progressRes.ok) setSkillProgress(await progressRes.json());
      if (rejectionsRes.ok) setRejections(await rejectionsRes.json());
      if (logsRes.ok) setActionLogs(await logsRes.json());

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressInsight = async (insightId, action) => {
    const token = getAuthToken();

    try {
      const res = await fetch(`${API_URL}/feedback/insights/${insightId}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({ insight_id: insightId, action_taken: action }),
      });

      if (res.ok) {
        toast.success("Insight marked as addressed!");
        fetchData();
      }
    } catch (error) {
      toast.error("Error updating insight");
    }
  };

  const handleUpdateRoadmap = async () => {
    const token = getAuthToken();
    setUpdatingRoadmap(true);

    try {
      const res = await fetch(`${API_URL}/feedback/update-roadmap/`, {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message);
      }
    } catch (error) {
      toast.error("Error updating roadmap");
    } finally {
      setUpdatingRoadmap(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-yellow-500 bg-yellow-50';
      case 'medium': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getInsightTypeIcon = (type) => {
    switch (type) {
      case 'skill_gap': return <Target className="w-5 h-5" />;
      case 'technical': return <BarChart3 className="w-5 h-5" />;
      case 'communication': return <Lightbulb className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const filteredInsights = insights.filter(i => showAddressed || !i.addressed);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Feedback & Insights
            </h1>
            <p className="text-gray-500 mt-1">Transform rejections into growth opportunities</p>
          </div>
          <button
            onClick={handleUpdateRoadmap}
            disabled={updatingRoadmap}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 mt-4 md:mt-0"
          >
            {updatingRoadmap ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Update Roadmaps from Feedback
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column - Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Insights Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  Action Items ({filteredInsights.length})
                </h2>
                <label className="flex items-center gap-2 text-sm text-gray-500">
                  <input
                    type="checkbox"
                    checked={showAddressed}
                    onChange={(e) => setShowAddressed(e.target.checked)}
                    className="rounded"
                  />
                  Show addressed
                </label>
              </div>

              {filteredInsights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-green-600" />
                  <p>No pending action items!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className={`rounded-lg p-4 border-l-4 ${getPriorityColor(insight.priority)} ${insight.addressed ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${insight.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                            insight.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                            {getInsightTypeIcon(insight.insight_type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-white">{insight.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{insight.pattern_description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                            {insight.occurrences}x
                          </span>
                          {insight.addressed && (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </div>

                      {insight.related_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3 ml-11">
                          {insight.related_skills.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {insight.recommended_actions?.length > 0 && (
                        <div className="ml-11 mb-3">
                          <p className="text-xs text-gray-500 mb-1">Recommended actions:</p>
                          <ul className="space-y-1">
                            {insight.recommended_actions.slice(0, 2).map((action, i) => (
                              <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-purple-400" />
                                {action.action || action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!insight.addressed && (
                        <div className="ml-11 flex gap-2">
                          <button
                            onClick={() => handleAddressInsight(insight.id, "Working on it")}
                            className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                          >
                            Mark as Addressed
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Rejections */}
            {rejections.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Recent Rejections
                </h2>
                <div className="space-y-3">
                  {rejections.slice(0, 5).map((rejection) => (
                    <div key={rejection.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                          {rejection.feedback_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(rejection.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {rejection.raw_feedback && (
                        <p className="text-sm text-gray-400">{rejection.raw_feedback.slice(0, 150)}...</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Skill Progress */}
          <div className="space-y-6">
            {/* Skill Progress */}
            <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Skill Progress
              </h2>

              {skillProgress.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No skill data yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {skillProgress.map((skill) => (
                    <div key={skill.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-white">{skill.skill}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">{skill.current_level}</span>
                          {skill.improvement_rate > 0 && (
                            <span className="text-xs text-green-400 flex items-center">
                              <ArrowUpRight className="w-3 h-3" />
                              +{skill.improvement_rate.toFixed(1)}/wk
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${skill.current_score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{Math.round(skill.current_score)}%</span>
                        <span>Target: {skill.target_level}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Logs */}
            {actionLogs.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-semibold mb-4">Recent Actions</h2>
                <div className="space-y-3">
                  {actionLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="p-1.5 rounded bg-purple-500/20">
                        <CheckCircle className="w-3 h-3 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-white">{log.action_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
