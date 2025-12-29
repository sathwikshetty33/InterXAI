from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Avg

from .models import RejectionFeedback, FeedbackInsight, SkillProgress, ReadinessAssessment, FeedbackActionLog
from .serializers import (
    RejectionFeedbackSerializer, RejectionFeedbackCreateSerializer,
    FeedbackInsightSerializer, SkillProgressSerializer, SkillProgressUpdateSerializer,
    ReadinessAssessmentSerializer, ReadinessCheckRequestSerializer,
    FeedbackActionLogSerializer, InsightAddressSerializer
)
from utils.FeedbackAnalyzer import FeedbackAnalyzer


class RejectionFeedbackView(APIView):
    """Manage rejection feedback entries"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        feedbacks = RejectionFeedback.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = RejectionFeedbackSerializer(feedbacks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Record and analyze rejection feedback"""
        serializer = RejectionFeedbackCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create feedback record
            feedback = RejectionFeedback.objects.create(
                user=request.user,
                feedback_type=serializer.validated_data['feedback_type'],
                raw_feedback=serializer.validated_data.get('raw_feedback', '')
            )
            
            # Link to application or interview if provided
            if 'application_id' in serializer.validated_data:
                from opportunities.models import Application
                app = Application.objects.filter(
                    id=serializer.validated_data['application_id'],
                    user=request.user
                ).first()
                if app:
                    feedback.application = app
            
            if 'interview_session_id' in serializer.validated_data:
                from interview.models import InterviewSession
                session = InterviewSession.objects.filter(
                    id=serializer.validated_data['interview_session_id'],
                    Application__user=request.user
                ).first()
                if session:
                    feedback.interview_session = session
            
            # Analyze feedback using AI
            analyzer = FeedbackAnalyzer()
            analysis = analyzer.evaluate({
                'feedback_type': feedback.feedback_type,
                'raw_feedback': feedback.raw_feedback,
                'user_history': list(
                    RejectionFeedback.objects.filter(user=request.user)
                    .values('feedback_type', 'ai_analyzed_feedback')[:10]
                )
            })
            
            feedback.ai_analyzed_feedback = analysis.get('analysis', {})
            feedback.severity = analysis.get('severity', 'medium')
            feedback.is_processed = True
            feedback.save()
            
            # Create insights if new patterns found
            for insight_data in analysis.get('new_insights', []):
                insight, created = FeedbackInsight.objects.get_or_create(
                    user=request.user,
                    insight_type=insight_data['type'],
                    title=insight_data['title'],
                    defaults={
                        'pattern_description': insight_data.get('description', ''),
                        'recommended_actions': insight_data.get('actions', []),
                        'related_skills': insight_data.get('skills', []),
                        'priority': insight_data.get('priority', 'medium')
                    }
                )
                if not created:
                    insight.occurrences += 1
                    insight.save()
                insight.source_feedbacks.add(feedback)
            
            return Response({
                'feedback': RejectionFeedbackSerializer(feedback).data,
                'insights_generated': len(analysis.get('new_insights', []))
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FeedbackInsightView(APIView):
    """Get and manage feedback insights"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        priority = request.query_params.get('priority', None)
        addressed = request.query_params.get('addressed', None)
        
        queryset = FeedbackInsight.objects.filter(user=request.user)
        
        if priority:
            queryset = queryset.filter(priority=priority)
        if addressed is not None:
            queryset = queryset.filter(addressed=addressed == 'true')
        
        insights = queryset.order_by('-priority', '-occurrences')[:20]
        serializer = FeedbackInsightSerializer(insights, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, insight_id):
        """Mark insight as addressed"""
        insight = get_object_or_404(FeedbackInsight, id=insight_id, user=request.user)
        
        serializer = InsightAddressSerializer(data=request.data)
        if serializer.is_valid():
            insight.addressed = True
            insight.addressed_at = timezone.now()
            insight.save()
            
            # Log the action
            FeedbackActionLog.objects.create(
                user=request.user,
                insight=insight,
                action_type='insight_addressed',
                action_description=serializer.validated_data.get('action_taken', 'Insight marked as addressed'),
                automated=False
            )
            
            return Response(FeedbackInsightSerializer(insight).data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SkillProgressView(APIView):
    """Track and update skill progress"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        skill_name = request.query_params.get('skill', None)
        
        queryset = SkillProgress.objects.filter(user=request.user)
        if skill_name:
            queryset = queryset.filter(skill__icontains=skill_name)
        
        progress = queryset.order_by('skill')
        serializer = SkillProgressSerializer(progress, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Update skill progress with new score"""
        serializer = SkillProgressUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        skill = serializer.validated_data['skill']
        score = serializer.validated_data['score']
        source = serializer.validated_data['source']
        note = serializer.validated_data.get('note', '')
        
        progress, created = SkillProgress.objects.get_or_create(
            user=request.user,
            skill=skill,
            defaults={
                'current_score': score,
                'progress_history': []
            }
        )
        
        # Add to history
        progress.progress_history.append({
            'date': timezone.now().isoformat(),
            'score': score,
            'source': source,
            'note': note
        })
        
        # Calculate improvement rate (points per week)
        if len(progress.progress_history) >= 2:
            first = progress.progress_history[0]
            last = progress.progress_history[-1]
            days_diff = (timezone.now() - timezone.datetime.fromisoformat(first['date'].replace('Z', '+00:00'))).days
            if days_diff > 0:
                progress.improvement_rate = (last['score'] - first['score']) / (days_diff / 7)
        
        progress.current_score = score
        progress.last_assessment_source = source
        
        # Update level based on score
        if score >= 90:
            progress.current_level = 'expert'
        elif score >= 75:
            progress.current_level = 'advanced'
        elif score >= 50:
            progress.current_level = 'intermediate'
        elif score >= 25:
            progress.current_level = 'beginner'
        else:
            progress.current_level = 'novice'
        
        progress.save()
        
        return Response(SkillProgressSerializer(progress).data, status=status.HTTP_200_OK)


class ReadinessAssessmentView(APIView):
    """Check readiness for a target role"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, target_role=None):
        """Get existing assessments"""
        if target_role:
            assessment = ReadinessAssessment.objects.filter(
                user=request.user, target_role__iexact=target_role
            ).order_by('-assessed_at').first()
            if not assessment:
                return Response({'error': 'No assessment found'}, status=status.HTTP_404_NOT_FOUND)
            return Response(ReadinessAssessmentSerializer(assessment).data, status=status.HTTP_200_OK)
        
        assessments = ReadinessAssessment.objects.filter(user=request.user).order_by('-assessed_at')[:10]
        serializer = ReadinessAssessmentSerializer(assessments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Perform new readiness assessment"""
        serializer = ReadinessCheckRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            target_role = serializer.validated_data['target_role']
            
            # Get user's skill progress
            skill_progress = SkillProgress.objects.filter(user=request.user)
            skill_scores = {sp.skill: sp.current_score for sp in skill_progress}
            
            # Get mock interview performance
            from interview.models import InterviewSession
            mock_sessions = InterviewSession.objects.filter(
                Application__user=request.user,
                status='completed'
            ).order_by('-end_time')[:10]
            
            mock_avg_score = mock_sessions.aggregate(Avg('overallScore'))['overallScore__avg']
            
            # Get skill profile
            from career.models import UserSkillProfile
            profile = UserSkillProfile.objects.filter(user=request.user).first()
            
            # Use AI to assess readiness
            analyzer = FeedbackAnalyzer()
            result = analyzer.assess_readiness({
                'target_role': target_role,
                'current_skills': profile.skills if profile else [],
                'skill_scores': skill_scores,
                'mock_interview_avg': mock_avg_score,
                'experience_years': profile.experience_years if profile else 0
            })
            
            # Create or update assessment
            assessment, created = ReadinessAssessment.objects.update_or_create(
                user=request.user,
                target_role=target_role,
                defaults={
                    'overall_readiness_score': result.get('readiness_score', 0),
                    'skill_scores': result.get('skill_scores', {}),
                    'recommended_improvements': result.get('improvements', []),
                    'mock_interviews_completed': mock_sessions.count(),
                    'mock_interview_avg_score': mock_avg_score,
                    'ready_to_apply': result.get('ready_to_apply', False),
                    'ai_recommendation': result.get('recommendation', '')
                }
            )
            
            return Response(ReadinessAssessmentSerializer(assessment).data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FeedbackActionLogView(APIView):
    """View feedback action history"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        logs = FeedbackActionLog.objects.filter(user=request.user).order_by('-created_at')[:20]
        serializer = FeedbackActionLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UpdateRoadmapFromFeedbackView(APIView):
    """Trigger roadmap update based on feedback insights"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            from career.models import LearningRoadmap
            
            # Get unaddressed insights
            insights = FeedbackInsight.objects.filter(
                user=request.user, addressed=False
            ).order_by('-priority')[:5]
            
            if not insights:
                return Response({
                    'message': 'No unaddressed insights to process'
                }, status=status.HTTP_200_OK)
            
            # Get active roadmaps
            roadmaps = LearningRoadmap.objects.filter(user=request.user, status='active')
            
            updates_made = []
            
            for insight in insights:
                for skill in insight.related_skills:
                    for roadmap in roadmaps:
                        # Check if skill gap already in roadmap
                        if skill not in roadmap.skill_gaps:
                            roadmap.skill_gaps.append(skill)
                            updates_made.append(f"Added {skill} to {roadmap.target_role} roadmap")
                        
                        roadmap.save()
            
            # Log the action
            if updates_made:
                FeedbackActionLog.objects.create(
                    user=request.user,
                    action_type='roadmap_update',
                    action_description=f"Updated roadmaps based on {len(insights)} insights: {', '.join(updates_made)}",
                    automated=True
                )
            
            return Response({
                'message': 'Roadmaps updated based on feedback',
                'updates': updates_made
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
