from rest_framework import serializers
from .models import UserSkillProfile, MarketTrend, LearningRoadmap, LearningResource, RoadmapProgress


class UserSkillProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = UserSkillProfile
        fields = [
            'id', 'username', 'skills', 'interests', 'target_roles',
            'experience_years', 'education', 'certifications',
            'github_username', 'leetcode_username', 'linkedin_url',
            'last_profile_scan', 'profile_completeness', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_profile_scan']


class UserSkillProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSkillProfile
        fields = [
            'skills', 'interests', 'target_roles', 'experience_years',
            'education', 'certifications', 'github_username',
            'leetcode_username', 'linkedin_url'
        ]


class MarketTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketTrend
        fields = ['id', 'skill_category', 'trend_data', 'region', 'source', 'fetched_at']


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = [
            'id', 'title', 'url', 'description', 'type', 'skill_tags',
            'difficulty', 'duration_hours', 'source', 'is_free', 'rating'
        ]


class RoadmapProgressSerializer(serializers.ModelSerializer):
    resource = LearningResourceSerializer(read_only=True)
    
    class Meta:
        model = RoadmapProgress
        fields = ['id', 'milestone_index', 'resource', 'status', 'started_at', 'completed_at', 'notes']


class LearningRoadmapSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    progress_records = RoadmapProgressSerializer(many=True, read_only=True)
    
    class Meta:
        model = LearningRoadmap
        fields = [
            'id', 'username', 'target_role', 'current_readiness_score',
            'target_readiness_score', 'milestones', 'skill_gaps', 'ai_reasoning',
            'estimated_duration_weeks', 'status', 'generated_at', 'updated_at',
            'progress_records'
        ]
        read_only_fields = ['id', 'generated_at', 'updated_at', 'progress_records']


class LearningRoadmapCreateSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=100)
    include_current_skills = serializers.BooleanField(default=True)
    target_readiness_score = serializers.FloatField(default=80, min_value=0, max_value=100)


class SkillGapAnalysisSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=100)
    

class ProfileScanResultSerializer(serializers.Serializer):
    skills = serializers.ListField(child=serializers.DictField())
    experience_years = serializers.IntegerField()
    education = serializers.DictField()
    certifications = serializers.ListField(child=serializers.CharField())
    profile_completeness = serializers.IntegerField()
    recommendations = serializers.ListField(child=serializers.CharField())
