from django.urls import path
from . import views

urlpatterns = [
    path('create-interview/', views.CustomInterviewView.as_view(), name='create_interview'),
    path('interview-session/<int:id>/', views.InterviewSessionView.as_view(), name='initialize_interview_session'),
    path('edit-interview/<int:id>/', views.CustomInterviewView.as_view(), name='edit_interview'),
    path('get-interviews/', views.getInterview.as_view(), name='get_interview'),
    path('get-interview/<int:id>/', views.CustomInterviewView.as_view(), name='get_interview_by_id'),
    path('get-all-interviews/', views.GetAllInterviewsView.as_view(), name='get_all_interviews'),
    path('apply-interview/<int:id>/', views.ApplicationView.as_view(), name='apply_interview'),
    path('get-applications/<int:id>/', views.ApplicationView.as_view(), name='get_interviews'),
    path('update-application/<int:id>/',views.ApplicationView.as_view(),name='update_appliation'),
    path('interview-session-initializer/<int:id>/', views.InterviewSessionInitializerView.as_view(), name='interview_session_initializer'),
    path('leaderboard/<int:id>/',views.LeaderBoardView.as_view(), name='leaderboard'),
    path('cheated/<int:id>/',views.CheatingDetection.as_view(),name="cheating_updater"),
    path('get-dsa-questions/<int:id>/', views.SessionDsaQuestions.as_view(), name='get_dsa_questions'),
    path('add-dsa-scores/<int:id>/<int:dsa_id>/',views.SessionDsaQuestions.as_view(), name='add_dsa_scores'),
    path('get-coding-questions/<int:id>/', views.SessionCodingQuestions.as_view(), name='get_coding_questions'),
    path('add-coding-scores/<int:id>/<int:coding_q_id>/', views.SessionCodingQuestions.as_view(), name='add_coding_scores'),
    path('coding-assistance/<int:id>/<int:coding_q_id>/', views.CodingAssistance.as_view(), name='coding_assistance'),
    path('res-question/<int:id>/',views.resumeQuestion.as_view(),name='resume_question'),
    path('interview-images/<int:id>/', views.InterviewImagesView.as_view(), name='interview_images'),
    path('candidate-decision/<int:session_id>/', views.CandidateDecisionView.as_view(), name='candidate_decision'),
    path('continue-session/<int:session_id>/', views.ContinueInterviewSession.as_view(), name='continue-session'),
    path('update-session-status/<int:session_id>/', views.UpdateSessionStatus.as_view(), name='update-session-status'),
    path('groq-proxy/', views.GroqProxyView.as_view(), name='groq_proxy'),
]