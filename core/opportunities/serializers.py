from rest_framework import serializers
from .models import Opportunity, OpportunityMatch, Application, UserApplicationPreferences, SavedOpportunity


class OpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'company', 'type', 'description', 'requirements',
            'responsibilities', 'location', 'remote', 'hybrid', 'salary_min',
            'salary_max', 'salary_currency', 'experience_level', 'deadline',
            'source_url', 'source_platform', 'company_logo', 'company_size',
            'status', 'created_at'
        ]


class OpportunityListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing opportunities"""
    class Meta:
        model = Opportunity
        fields = [
            'id', 'title', 'company', 'type', 'location', 'remote',
            'salary_min', 'salary_max', 'experience_level', 'deadline',
            'company_logo', 'status'
        ]


class OpportunityMatchSerializer(serializers.ModelSerializer):
    opportunity = OpportunitySerializer(read_only=True)
    
    class Meta:
        model = OpportunityMatch
        fields = [
            'id', 'opportunity', 'match_score', 'match_reasons', 'skill_gaps',
            'status', 'ai_recommendation', 'priority_rank', 'created_at'
        ]


class OpportunityMatchListSerializer(serializers.ModelSerializer):
    """Lightweight for listing matches"""
    opportunity = OpportunityListSerializer(read_only=True)
    
    class Meta:
        model = OpportunityMatch
        fields = [
            'id', 'opportunity', 'match_score', 'status', 'priority_rank', 'created_at'
        ]


class ApplicationSerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)
    
    class Meta:
        model = Application
        fields = [
            'id', 'opportunity', 'status', 'cover_letter', 'resume_used',
            'auto_applied', 'applied_at', 'response_received_at',
            'response_content', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'applied_at', 'response_received_at']


class ApplicationCreateSerializer(serializers.Serializer):
    opportunity_id = serializers.IntegerField()
    cover_letter = serializers.CharField(required=False, allow_blank=True)
    resume_used = serializers.URLField(required=False)


class ApplicationStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Application.STATUS_CHOICES)
    response_content = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class UserApplicationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserApplicationPreferences
        fields = [
            'auto_apply_enabled', 'min_match_score', 'preferred_opportunity_types',
            'preferred_locations', 'open_to_remote', 'preferred_company_sizes',
            'excluded_companies', 'min_salary', 'max_applications_per_day',
            'notification_frequency'
        ]


class SavedOpportunitySerializer(serializers.ModelSerializer):
    opportunity = OpportunityListSerializer(read_only=True)
    
    class Meta:
        model = SavedOpportunity
        fields = ['id', 'opportunity', 'notes', 'saved_at']


class OpportunityMatchUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OpportunityMatch.STATUS_CHOICES)
