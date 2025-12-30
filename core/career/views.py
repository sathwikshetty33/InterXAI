from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import UserSkillProfile, MarketTrend, LearningRoadmap, LearningResource, RoadmapProgress
from .serializers import (
    UserSkillProfileSerializer, UserSkillProfileUpdateSerializer,
    MarketTrendSerializer, LearningRoadmapSerializer, LearningRoadmapCreateSerializer,
    LearningResourceSerializer, RoadmapProgressSerializer, SkillGapAnalysisSerializer,
    ProfileScanResultSerializer
)
from utils.ProfileAnalyzer import ProfileAnalyzer
from utils.RoadmapGenerator import RoadmapGenerator


class UserSkillProfileView(APIView):
    """Get or update user's skill profile"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        profile, created = UserSkillProfile.objects.get_or_create(user=request.user)
        serializer = UserSkillProfileSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def put(self, request):
        profile, created = UserSkillProfile.objects.get_or_create(user=request.user)
        serializer = UserSkillProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(UserSkillProfileSerializer(profile).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileScanView(APIView):
    """Analyze user profile and resume to extract skills using AI"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            import base64
            import io
            from interview.models import Application
            
            resume_text = ""
            
            # Check if base64 resume was sent from frontend
            resume_base64 = request.data.get('resume_base64', None)
            if resume_base64:
                try:
                    # Decode base64 to bytes
                    pdf_bytes = base64.b64decode(resume_base64)
                    
                    # Try to extract text from PDF using PyPDF2 or pdfplumber
                    try:
                        import pdfplumber
                        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                            for page in pdf.pages:
                                text = page.extract_text()
                                if text:
                                    resume_text += text + "\n"
                    except ImportError:
                        # Fallback: Try PyPDF2
                        try:
                            from PyPDF2 import PdfReader
                            reader = PdfReader(io.BytesIO(pdf_bytes))
                            for page in reader.pages:
                                resume_text += page.extract_text() + "\n"
                        except ImportError:
                            # If no PDF library available, just store the raw data note
                            resume_text = "[PDF uploaded but no PDF parser available. Install pdfplumber: pip install pdfplumber]"
                except Exception as e:
                    print(f"Error processing PDF: {e}")
                    resume_text = ""
            
            # Fallback: Get user's latest resume from applications
            if not resume_text:
                latest_app = Application.objects.filter(user=request.user).order_by('-applied_at').first()
                resume_text = latest_app.extratedResume if latest_app and latest_app.extratedResume else ""
            
            # Get profile for GitHub/LeetCode info
            profile, _ = UserSkillProfile.objects.get_or_create(user=request.user)
            
            # If we have resume text, analyze with AI
            if resume_text and len(resume_text) > 50:
                analyzer = ProfileAnalyzer()
                result = analyzer.evaluate({
                    'resume_text': resume_text,
                    'github_username': profile.github_username or "",
                    'leetcode_username': profile.leetcode_username or "",
                    'existing_skills': profile.skills or []
                })
                
                # Update profile with extracted skills
                profile.skills = result.get('skills', [])
                profile.experience_years = result.get('experience_years', profile.experience_years or 0)
                profile.education = result.get('education', profile.education or {})
                profile.certifications = result.get('certifications', profile.certifications or [])
                profile.profile_completeness = result.get('profile_completeness', 0)
                profile.last_profile_scan = timezone.now()
                profile.save()
                
                return Response({
                    'message': 'Profile scanned successfully',
                    'profile': UserSkillProfileSerializer(profile).data,
                    'recommendations': result.get('recommendations', [])
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'No resume data found to scan. Please upload a resume or apply to an interview first.',
                    'profile': UserSkillProfileSerializer(profile).data,
                    'recommendations': ['Upload a resume to extract your skills automatically']
                }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MarketTrendsView(APIView):
    """Get market trends for skills relevant to user"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        region = request.query_params.get('region', 'global')
        skill_category = request.query_params.get('skill', None)
        
        queryset = MarketTrend.objects.filter(is_active=True, region=region)
        if skill_category:
            queryset = queryset.filter(skill_category__icontains=skill_category)
        
        trends = queryset.order_by('-fetched_at')[:20]
        serializer = MarketTrendSerializer(trends, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LearningRoadmapView(APIView):
    """Manage user's learning roadmaps"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, roadmap_id=None):
        if roadmap_id:
            roadmap = get_object_or_404(LearningRoadmap, id=roadmap_id, user=request.user)
            serializer = LearningRoadmapSerializer(roadmap)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        roadmaps = LearningRoadmap.objects.filter(user=request.user)
        serializer = LearningRoadmapSerializer(roadmaps, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Generate a new personalized learning roadmap"""
        serializer = LearningRoadmapCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get user profile
            profile, _ = UserSkillProfile.objects.get_or_create(user=request.user)
            
            # Generate roadmap using AI
            generator = RoadmapGenerator()
            result = generator.evaluate({
                'target_role': serializer.validated_data['target_role'],
                'current_skills': profile.skills,
                'experience_years': profile.experience_years,
                'education': profile.education,
                'target_readiness': serializer.validated_data.get('target_readiness_score', 80)
            })
            
            # Enrich milestones with real learning resources from Tavily
            milestones = result.get('milestones', [])
            try:
                from .resource_searcher import TavilyResourceSearcher
                resource_searcher = TavilyResourceSearcher()
                milestones = resource_searcher.enrich_milestones_with_resources(milestones)
                print(f"✅ Enriched {len(milestones)} milestones with Tavily resources")
            except Exception as e:
                print(f"⚠️ Resource enrichment failed: {e}")
                # Continue with AI-generated resources
            
            # Create roadmap
            roadmap = LearningRoadmap.objects.create(
                user=request.user,
                target_role=serializer.validated_data['target_role'],
                current_readiness_score=result.get('current_readiness_score', 0),
                target_readiness_score=serializer.validated_data.get('target_readiness_score', 80),
                milestones=milestones,
                skill_gaps=result.get('skill_gaps', []),
                ai_reasoning=result.get('reasoning', ''),
                estimated_duration_weeks=result.get('estimated_duration_weeks', 12)
            )
            
            return Response(LearningRoadmapSerializer(roadmap).data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, roadmap_id):
        """Update roadmap progress"""
        roadmap = get_object_or_404(LearningRoadmap, id=roadmap_id, user=request.user)
        
        # Update specific fields
        if 'status' in request.data:
            roadmap.status = request.data['status']
        if 'milestones' in request.data:
            roadmap.milestones = request.data['milestones']
        if 'current_readiness_score' in request.data:
            roadmap.current_readiness_score = request.data['current_readiness_score']
        
        roadmap.save()
        return Response(LearningRoadmapSerializer(roadmap).data, status=status.HTTP_200_OK)
    
    def delete(self, request, roadmap_id):
        roadmap = get_object_or_404(LearningRoadmap, id=roadmap_id, user=request.user)
        roadmap.delete()
        return Response({'message': 'Roadmap deleted'}, status=status.HTTP_204_NO_CONTENT)


class SkillGapAnalysisView(APIView):
    """Analyze skill gaps for a target role"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SkillGapAnalysisSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            profile, _ = UserSkillProfile.objects.get_or_create(user=request.user)
            
            generator = RoadmapGenerator()
            result = generator.analyze_skill_gap({
                'target_role': serializer.validated_data['target_role'],
                'current_skills': profile.skills,
                'experience_years': profile.experience_years
            })
            
            return Response({
                'target_role': serializer.validated_data['target_role'],
                'current_readiness': result.get('current_readiness', 0),
                'skill_gaps': result.get('skill_gaps', []),
                'strengths': result.get('strengths', []),
                'recommendations': result.get('recommendations', [])
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LearningResourceView(APIView):
    """Get curated learning resources"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        skill = request.query_params.get('skill', None)
        difficulty = request.query_params.get('difficulty', None)
        resource_type = request.query_params.get('type', None)
        
        queryset = LearningResource.objects.all()
        
        if skill:
            queryset = queryset.filter(skill_tags__contains=[skill])
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if resource_type:
            queryset = queryset.filter(type=resource_type)
        
        resources = queryset[:50]
        serializer = LearningResourceSerializer(resources, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RoadmapProgressView(APIView):
    """Update progress on roadmap milestones"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, roadmap_id):
        roadmap = get_object_or_404(LearningRoadmap, id=roadmap_id, user=request.user)
        
        milestone_index = request.data.get('milestone_index')
        new_status = request.data.get('status', 'in_progress')
        
        progress, created = RoadmapProgress.objects.get_or_create(
            roadmap=roadmap,
            milestone_index=milestone_index
        )
        
        progress.status = new_status
        if new_status == 'in_progress' and not progress.started_at:
            progress.started_at = timezone.now()
        elif new_status == 'completed':
            progress.completed_at = timezone.now()
        
        if 'notes' in request.data:
            progress.notes = request.data['notes']
        
        progress.save()
        
        # Update milestone status in roadmap
        milestones = roadmap.milestones
        if milestone_index < len(milestones):
            milestones[milestone_index]['status'] = new_status
            roadmap.milestones = milestones
            roadmap.save()
        
        return Response(RoadmapProgressSerializer(progress).data, status=status.HTTP_200_OK)


class MatchedInterviewsView(APIView):
    """Get curated interviews matched to user's skills and interests"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            from interview.models import Custominterviews, Application
            
            # Get user's skill profile
            profile, _ = UserSkillProfile.objects.get_or_create(user=request.user)
            user_skills = [s.get('name', s.get('skill', str(s))) if isinstance(s, dict) else str(s) for s in (profile.skills or [])]
            target_roles = profile.target_roles or []
            experience_years = profile.experience_years or 0
            
            # Get interviews user hasn't applied to yet
            applied_ids = Application.objects.filter(user=request.user).values_list('interview_id', flat=True)
            available_interviews = Custominterviews.objects.exclude(
                id__in=applied_ids
            ).filter(
                submissionDeadline__gt=timezone.now()
            ).select_related('org')
            
            if not available_interviews.exists():
                return Response([], status=status.HTTP_200_OK)
            
            # Score each interview based on skill match
            scored_interviews = []
            for interview in available_interviews:
                score = self._calculate_match_score(
                    interview, user_skills, target_roles, experience_years
                )
                scored_interviews.append({
                    'id': interview.id,
                    'post': interview.post,
                    'org_name': interview.org.orgname if interview.org else 'Unknown',
                    'description': interview.desc[:200] + '...' if len(interview.desc) > 200 else interview.desc,
                    'experience': interview.experience,
                    'duration': interview.duration,
                    'submissionDeadline': interview.submissionDeadline.isoformat(),
                    'startTime': interview.startTime.isoformat(),
                    'endTime': interview.endTime.isoformat(),
                    'match_score': score,
                    'match_reasons': self._get_match_reasons(interview, user_skills, target_roles)
                })
            
            # Sort by match score (highest first)
            scored_interviews.sort(key=lambda x: x['match_score'], reverse=True)
            
            return Response(scored_interviews, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _calculate_match_score(self, interview, user_skills, target_roles, experience_years):
        """Calculate match score based on skills, role, and experience"""
        score = 50  # Base score
        
        interview_text = f"{interview.post} {interview.desc}".lower()
        user_skills_lower = [s.lower() for s in user_skills]
        
        # +5 for each matching skill (max +30)
        skill_matches = sum(1 for skill in user_skills_lower if skill in interview_text)
        score += min(skill_matches * 5, 30)
        
        # +15 if role matches target roles
        for role in target_roles:
            if role.lower() in interview_text:
                score += 15
                break
        
        # Experience matching (+10 if match, -10 if underqualified)
        try:
            required_exp = int(''.join(filter(str.isdigit, interview.experience)) or 0)
            if experience_years >= required_exp:
                score += 10
            elif required_exp - experience_years <= 2:
                score += 5  # Slightly underqualified
        except:
            pass
        
        return min(score, 100)
    
    def _get_match_reasons(self, interview, user_skills, target_roles):
        """Get reasons why this interview matches the user"""
        reasons = []
        interview_text = f"{interview.post} {interview.desc}".lower()
        
        # Check skill matches
        matching_skills = [s for s in user_skills if s.lower() in interview_text]
        if matching_skills:
            reasons.append(f"Skills match: {', '.join(matching_skills[:3])}")
        
        # Check role match
        for role in target_roles:
            if role.lower() in interview_text:
                reasons.append(f"Matches target role: {role}")
                break
        
        if not reasons:
            reasons.append("General opportunity")
        
        return reasons


class ExternalJobSearchView(APIView):
    """Search for external job opportunities using Tavily API"""
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Search for jobs matching user's skills.
        Query params:
        - target_role: Optional specific role to search for
        - max_results: Number of results (default 10)
        """
        from .external_jobs import TavilyJobSearcher
        
        # Get user's skill profile
        try:
            profile = UserSkillProfile.objects.get(user=request.user)
            skills = profile.skills or []
            target_roles = profile.target_roles or []
        except UserSkillProfile.DoesNotExist:
            skills = []
            target_roles = []
        
        # Get query parameters
        target_role = request.query_params.get('target_role')
        if not target_role and target_roles:
            target_role = target_roles[0] if isinstance(target_roles, list) else target_roles
        
        max_results = int(request.query_params.get('max_results', 10))
        
        # Flatten skills if they're objects
        skill_list = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_list.append(skill.get('name', skill.get('skill', '')))
            else:
                skill_list.append(str(skill))
        
        # Search for jobs
        searcher = TavilyJobSearcher()
        result = searcher.search_jobs(
            skills=skill_list,
            target_role=target_role,
            max_results=max_results
        )
        
        return Response(result, status=status.HTTP_200_OK)
