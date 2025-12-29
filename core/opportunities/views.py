from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import Opportunity, OpportunityMatch, Application, UserApplicationPreferences, SavedOpportunity
from .serializers import (
    OpportunitySerializer, OpportunityListSerializer, OpportunityMatchSerializer,
    OpportunityMatchListSerializer, ApplicationSerializer, ApplicationCreateSerializer,
    ApplicationStatusUpdateSerializer, UserApplicationPreferencesSerializer,
    SavedOpportunitySerializer, OpportunityMatchUpdateSerializer
)
from utils.OpportunityMatcher import OpportunityMatcher


class OpportunityListView(APIView):
    """List and search opportunities"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = Opportunity.objects.filter(status='active')
        
        # Filter by type
        opp_type = request.query_params.get('type', None)
        if opp_type:
            queryset = queryset.filter(type=opp_type)
        
        # Filter by location
        location = request.query_params.get('location', None)
        if location:
            queryset = queryset.filter(Q(location__icontains=location) | Q(remote=True))
        
        # Filter by remote
        remote = request.query_params.get('remote', None)
        if remote == 'true':
            queryset = queryset.filter(remote=True)
        
        # Filter by experience level
        experience = request.query_params.get('experience', None)
        if experience:
            queryset = queryset.filter(experience_level=experience)
        
        # Search in title and company
        search = request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(company__icontains=search)
            )
        
        opportunities = queryset.order_by('-created_at')[:50]
        serializer = OpportunityListSerializer(opportunities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OpportunityDetailView(APIView):
    """Get opportunity details"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, opportunity_id):
        opportunity = get_object_or_404(Opportunity, id=opportunity_id)
        
        # Check if user has a match for this opportunity
        match = OpportunityMatch.objects.filter(
            user=request.user, opportunity=opportunity
        ).first()
        
        data = OpportunitySerializer(opportunity).data
        if match:
            data['match'] = OpportunityMatchSerializer(match).data
        
        return Response(data, status=status.HTTP_200_OK)


class OpportunityMatchListView(APIView):
    """Get matched opportunities for user"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        match_status = request.query_params.get('status', None)
        min_score = request.query_params.get('min_score', None)
        
        queryset = OpportunityMatch.objects.filter(user=request.user)
        
        if match_status:
            queryset = queryset.filter(status=match_status)
        if min_score:
            queryset = queryset.filter(match_score__gte=float(min_score))
        
        matches = queryset.select_related('opportunity').order_by('-match_score')[:50]
        serializer = OpportunityMatchListSerializer(matches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class OpportunityMatchDetailView(APIView):
    """Get match details or update match status"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, match_id):
        match = get_object_or_404(OpportunityMatch, id=match_id, user=request.user)
        serializer = OpportunityMatchSerializer(match)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, match_id):
        match = get_object_or_404(OpportunityMatch, id=match_id, user=request.user)
        serializer = OpportunityMatchUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            match.status = serializer.validated_data['status']
            match.save()
            return Response(OpportunityMatchSerializer(match).data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ScanOpportunitiesView(APIView):
    """Scan and match opportunities for user"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            from career.models import UserSkillProfile
            
            profile = UserSkillProfile.objects.filter(user=request.user).first()
            if not profile:
                return Response({
                    'error': 'Please complete your skill profile first'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get active opportunities
            opportunities = Opportunity.objects.filter(status='active')[:100]
            
            # Get user preferences
            preferences = UserApplicationPreferences.objects.filter(user=request.user).first()
            
            matcher = OpportunityMatcher()
            matches_created = 0
            
            for opp in opportunities:
                # Skip if already matched
                if OpportunityMatch.objects.filter(user=request.user, opportunity=opp).exists():
                    continue
                
                result = matcher.evaluate({
                    'user_skills': profile.skills,
                    'user_experience': profile.experience_years,
                    'user_preferences': preferences.__dict__ if preferences else {},
                    'opportunity': {
                        'title': opp.title,
                        'requirements': opp.requirements,
                        'experience_level': opp.experience_level,
                        'type': opp.type
                    }
                })
                
                if result.get('match_score', 0) >= (preferences.min_match_score if preferences else 50):
                    OpportunityMatch.objects.create(
                        user=request.user,
                        opportunity=opp,
                        match_score=result['match_score'],
                        match_reasons=result.get('match_reasons', []),
                        skill_gaps=result.get('skill_gaps', []),
                        ai_recommendation=result.get('recommendation', '')
                    )
                    matches_created += 1
            
            return Response({
                'message': f'Scanning complete. Found {matches_created} new matches.',
                'matches_created': matches_created
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ApplicationListView(APIView):
    """List user's applications"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        app_status = request.query_params.get('status', None)
        
        queryset = Application.objects.filter(user=request.user)
        if app_status:
            queryset = queryset.filter(status=app_status)
        
        applications = queryset.select_related('opportunity').order_by('-applied_at')[:50]
        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new application"""
        serializer = ApplicationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        opportunity = get_object_or_404(
            Opportunity, id=serializer.validated_data['opportunity_id']
        )
        
        # Check if already applied
        existing = Application.objects.filter(
            user=request.user, opportunity=opportunity
        ).first()
        if existing:
            return Response({
                'error': 'You have already applied to this opportunity'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get match if exists
        match = OpportunityMatch.objects.filter(
            user=request.user, opportunity=opportunity
        ).first()
        
        application = Application.objects.create(
            user=request.user,
            opportunity=opportunity,
            match=match,
            cover_letter=serializer.validated_data.get('cover_letter', ''),
            resume_used=serializer.validated_data.get('resume_used', ''),
            status='submitted',
            applied_at=timezone.now()
        )
        
        # Update match status if exists
        if match:
            match.status = 'applied'
            match.save()
        
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class ApplicationDetailView(APIView):
    """Get or update application details"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, application_id):
        application = get_object_or_404(Application, id=application_id, user=request.user)
        serializer = ApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request, application_id):
        """Update application status"""
        application = get_object_or_404(Application, id=application_id, user=request.user)
        serializer = ApplicationStatusUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            application.status = serializer.validated_data['status']
            if 'response_content' in serializer.validated_data:
                application.response_content = serializer.validated_data['response_content']
                application.response_received_at = timezone.now()
            if 'notes' in serializer.validated_data:
                application.notes = serializer.validated_data['notes']
            
            application.save()
            return Response(ApplicationSerializer(application).data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserApplicationPreferencesView(APIView):
    """Get or update user's application preferences"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        preferences, _ = UserApplicationPreferences.objects.get_or_create(user=request.user)
        serializer = UserApplicationPreferencesSerializer(preferences)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        preferences, _ = UserApplicationPreferences.objects.get_or_create(user=request.user)
        serializer = UserApplicationPreferencesSerializer(preferences, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SavedOpportunityView(APIView):
    """Manage saved/bookmarked opportunities"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        saved = SavedOpportunity.objects.filter(user=request.user).select_related('opportunity')
        serializer = SavedOpportunitySerializer(saved, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        opportunity_id = request.data.get('opportunity_id')
        opportunity = get_object_or_404(Opportunity, id=opportunity_id)
        
        saved, created = SavedOpportunity.objects.get_or_create(
            user=request.user,
            opportunity=opportunity,
            defaults={'notes': request.data.get('notes', '')}
        )
        
        if not created:
            return Response({
                'message': 'Opportunity already saved'
            }, status=status.HTTP_200_OK)
        
        return Response(SavedOpportunitySerializer(saved).data, status=status.HTTP_201_CREATED)
    
    def delete(self, request, opportunity_id):
        saved = get_object_or_404(
            SavedOpportunity, user=request.user, opportunity_id=opportunity_id
        )
        saved.delete()
        return Response({'message': 'Removed from saved'}, status=status.HTTP_204_NO_CONTENT)
