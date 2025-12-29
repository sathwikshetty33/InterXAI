from django.urls import path
from . import views

urlpatterns = [
    # Skill Profile
    path('profile/', views.UserSkillProfileView.as_view(), name='skill_profile'),
    path('profile/scan/', views.ProfileScanView.as_view(), name='profile_scan'),
    
    # Market Trends
    path('trends/', views.MarketTrendsView.as_view(), name='market_trends'),
    
    # Learning Roadmaps
    path('roadmap/', views.LearningRoadmapView.as_view(), name='roadmap_list'),
    path('roadmap/<int:roadmap_id>/', views.LearningRoadmapView.as_view(), name='roadmap_detail'),
    path('roadmap/<int:roadmap_id>/progress/', views.RoadmapProgressView.as_view(), name='roadmap_progress'),
    
    # Skill Gap Analysis
    path('skill-gap/', views.SkillGapAnalysisView.as_view(), name='skill_gap'),
    
    # Learning Resources
    path('resources/', views.LearningResourceView.as_view(), name='learning_resources'),
    
    # Matched Interviews (based on skills)
    path('matched-interviews/', views.MatchedInterviewsView.as_view(), name='matched_interviews'),
]
