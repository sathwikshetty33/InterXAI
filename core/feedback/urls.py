from django.urls import path
from . import views

urlpatterns = [
    # Rejection Feedback
    path('rejections/', views.RejectionFeedbackView.as_view(), name='rejection_list'),
    
    # Insights
    path('insights/', views.FeedbackInsightView.as_view(), name='insight_list'),
    path('insights/<int:insight_id>/', views.FeedbackInsightView.as_view(), name='insight_detail'),
    
    # Skill Progress
    path('skill-progress/', views.SkillProgressView.as_view(), name='skill_progress'),
    
    # Readiness Assessment
    path('readiness/', views.ReadinessAssessmentView.as_view(), name='readiness_list'),
    path('readiness/<str:target_role>/', views.ReadinessAssessmentView.as_view(), name='readiness_detail'),
    
    # Action Logs
    path('action-logs/', views.FeedbackActionLogView.as_view(), name='action_logs'),
    
    # Update Roadmap from Feedback
    path('update-roadmap/', views.UpdateRoadmapFromFeedbackView.as_view(), name='update_roadmap'),
]
