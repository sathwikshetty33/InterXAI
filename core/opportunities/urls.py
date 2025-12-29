from django.urls import path
from . import views

urlpatterns = [
    # Opportunities
    path('list/', views.OpportunityListView.as_view(), name='opportunity_list'),
    path('detail/<int:opportunity_id>/', views.OpportunityDetailView.as_view(), name='opportunity_detail'),
    
    # Matches
    path('matches/', views.OpportunityMatchListView.as_view(), name='match_list'),
    path('matches/<int:match_id>/', views.OpportunityMatchDetailView.as_view(), name='match_detail'),
    path('scan/', views.ScanOpportunitiesView.as_view(), name='scan_opportunities'),
    
    # Applications
    path('applications/', views.ApplicationListView.as_view(), name='application_list'),
    path('applications/<int:application_id>/', views.ApplicationDetailView.as_view(), name='application_detail'),
    
    # Preferences
    path('preferences/', views.UserApplicationPreferencesView.as_view(), name='application_preferences'),
    
    # Saved
    path('saved/', views.SavedOpportunityView.as_view(), name='saved_list'),
    path('saved/<int:opportunity_id>/', views.SavedOpportunityView.as_view(), name='saved_detail'),
]
