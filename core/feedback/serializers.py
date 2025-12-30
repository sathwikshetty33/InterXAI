from rest_framework import serializers
from .models import RejectionFeedback, FeedbackInsight, SkillProgress, ReadinessAssessment, FeedbackActionLog


class RejectionFeedbackSerializer(serializers.ModelSerializer):
    opportunity_title = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()
    
    class Meta:
        model = RejectionFeedback
        fields = [
            'id', 'feedback_type', 'raw_feedback', 'ai_analyzed_feedback',
            'severity', 'is_processed', 'created_at', 'opportunity_title', 'company_name'
        ]
        read_only_fields = ['id', 'ai_analyzed_feedback', 'created_at']
    
    def get_opportunity_title(self, obj):
        if obj.interview_session and obj.interview_session.Application:
            return obj.interview_session.Application.interview.post
        return 'Unknown Position'
    
    def get_company_name(self, obj):
        if obj.interview_session and obj.interview_session.Application:
            return obj.interview_session.Application.interview.org.orgname
        return 'Unknown Company'


class RejectionFeedbackCreateSerializer(serializers.Serializer):
    feedback_type = serializers.ChoiceField(choices=RejectionFeedback.FEEDBACK_TYPE_CHOICES)
    raw_feedback = serializers.CharField(required=False, allow_blank=True)
    application_id = serializers.IntegerField(required=False)
    interview_session_id = serializers.IntegerField(required=False)


class FeedbackInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackInsight
        fields = [
            'id', 'insight_type', 'title', 'pattern_description', 'occurrences',
            'recommended_actions', 'related_skills', 'priority', 'addressed',
            'addressed_at', 'created_at'
        ]


class SkillProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillProgress
        fields = [
            'id', 'skill', 'progress_history', 'current_score', 'current_level',
            'target_level', 'target_score', 'improvement_rate',
            'last_assessment_source', 'last_updated'
        ]


class SkillProgressUpdateSerializer(serializers.Serializer):
    skill = serializers.CharField(max_length=100)
    score = serializers.FloatField(min_value=0, max_value=100)
    source = serializers.CharField(max_length=50)
    note = serializers.CharField(required=False, allow_blank=True)


class ReadinessAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadinessAssessment
        fields = [
            'id', 'target_role', 'overall_readiness_score', 'skill_scores',
            'recommended_improvements', 'mock_interviews_completed',
            'mock_interview_avg_score', 'ready_to_apply', 'ai_recommendation',
            'assessed_at'
        ]


class ReadinessCheckRequestSerializer(serializers.Serializer):
    target_role = serializers.CharField(max_length=100)
    include_recommendations = serializers.BooleanField(default=True)


class FeedbackActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedbackActionLog
        fields = ['id', 'action_type', 'action_description', 'automated', 'created_at']


class FeedbackAnalysisResultSerializer(serializers.Serializer):
    insights = FeedbackInsightSerializer(many=True)
    skill_gaps_identified = serializers.ListField(child=serializers.CharField())
    recommended_actions = serializers.ListField(child=serializers.DictField())
    roadmap_updates_suggested = serializers.BooleanField()


class InsightAddressSerializer(serializers.Serializer):
    insight_id = serializers.IntegerField()
    action_taken = serializers.CharField(max_length=200)
