import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getAuthToken } from "../utils/handleToken";
import Header from '../components/ui/header';
import Footer from '../components/ui/footer';
import { 
  Loader2, Target, ChevronLeft, CheckCircle, Circle, 
  Clock, BookOpen, ExternalLink, Play, Award
} from "lucide-react";
import { toast } from 'react-toastify';

export default function RoadmapDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState(null);
  const [updatingMilestone, setUpdatingMilestone] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetchRoadmap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchRoadmap = async () => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/career/roadmap/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoadmap(data);
      } else {
        toast.error("Failed to load roadmap");
        navigate('/career');
      }
    } catch {
      toast.error("Error loading roadmap");
      navigate('/career');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMilestone = async (milestoneIndex) => {
    const token = getAuthToken();
    if (!token || !roadmap) return;

    setUpdatingMilestone(milestoneIndex);
    
    try {
      const milestone = roadmap.milestones[milestoneIndex];
      const newCompleted = !milestone.completed;
      
      const response = await fetch(`${API_URL}/career/roadmap/${id}/progress/`, {
        method: 'POST',
        headers: { 
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          milestone_index: milestoneIndex,
          completed: newCompleted
        })
      });
      
      if (response.ok) {
        // Update local state
        setRoadmap(prev => {
          const updated = { ...prev };
          updated.milestones[milestoneIndex].completed = newCompleted;
          
          // Recalculate readiness score
          const completed = updated.milestones.filter(m => m.completed).length;
          updated.current_readiness_score = (completed / updated.milestones.length) * 100;
          
          return updated;
        });
        
        toast.success(newCompleted ? "Milestone completed!" : "Milestone uncompleted");
      } else {
        toast.error("Failed to update milestone");
      }
    } catch {
      toast.error("Error updating milestone");
    } finally {
      setUpdatingMilestone(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!roadmap) {
    return null;
  }

  const completedCount = roadmap.milestones?.filter(m => m.completed).length || 0;
  const totalMilestones = roadmap.milestones?.length || 0;
  const progressPercent = totalMilestones > 0 ? (completedCount / totalMilestones) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          to="/career" 
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Career Dashboard
        </Link>

        {/* Roadmap Header */}
        <div className="bg-white shadow-md rounded-xl p-6 border border-gray-200 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold">{roadmap.target_role}</h1>
              </div>
              <p className="text-gray-600">
                {roadmap.estimated_duration_weeks} weeks estimated • {roadmap.milestones?.length || 0} milestones
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              roadmap.status === 'active' ? 'bg-green-100 text-green-700' :
              roadmap.status === 'completed' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {roadmap.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{completedCount}/{totalMilestones} milestones ({Math.round(progressPercent)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {progressPercent >= 100 && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <Award className="w-5 h-5" />
              <span className="font-medium">🎉 Congratulations! You've completed this roadmap!</span>
            </div>
          )}
        </div>

        {/* Milestones */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Learning Milestones
          </h2>
          
          {roadmap.milestones?.map((milestone, index) => (
            <div 
              key={index}
              className={`bg-white shadow-sm rounded-xl p-5 border transition-all ${
                milestone.completed 
                  ? 'border-green-200 bg-green-50/50' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleMilestone(index)}
                  disabled={updatingMilestone === index}
                  className={`mt-0.5 flex-shrink-0 ${
                    milestone.completed ? 'text-green-500' : 'text-gray-400 hover:text-purple-500'
                  }`}
                >
                  {updatingMilestone === index ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : milestone.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1">
                  <h3 className={`font-medium text-lg ${
                    milestone.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {milestone.title || milestone.name || `Milestone ${index + 1}`}
                  </h3>
                  
                  {milestone.description && (
                    <p className="text-gray-600 text-sm mt-1">{milestone.description}</p>
                  )}

                  {/* Skills */}
                  {milestone.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {milestone.skills.map((skill, i) => (
                        <span 
                          key={i} 
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Resources */}
                  {milestone.resources?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500">Resources:</p>
                      {milestone.resources.slice(0, 3).map((resource, i) => (
                        <a
                          key={i}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {resource.title || resource.name || 'Learning Resource'}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Duration */}
                  {milestone.duration && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{milestone.duration}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {(!roadmap.milestones || roadmap.milestones.length === 0) && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">No milestones found for this roadmap.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
