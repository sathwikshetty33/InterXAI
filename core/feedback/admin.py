from django.contrib import admin
from .models import RejectionFeedback, FeedbackInsight, SkillProgress, ReadinessAssessment, FeedbackActionLog


@admin.register(RejectionFeedback)
class RejectionFeedbackAdmin(admin.ModelAdmin):
    list_display = ('user', 'feedback_type', 'severity', 'is_processed', 'created_at')
    list_filter = ('feedback_type', 'severity', 'is_processed')
    search_fields = ('user__username',)


@admin.register(FeedbackInsight)
class FeedbackInsightAdmin(admin.ModelAdmin):
    list_display = ('user', 'insight_type', 'title', 'priority', 'occurrences', 'addressed')
    list_filter = ('insight_type', 'priority', 'addressed')
    search_fields = ('user__username', 'title')


@admin.register(SkillProgress)
class SkillProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'skill', 'current_level', 'target_level', 'current_score', 'last_updated')
    list_filter = ('current_level', 'target_level')
    search_fields = ('user__username', 'skill')


@admin.register(ReadinessAssessment)
class ReadinessAssessmentAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_role', 'overall_readiness_score', 'ready_to_apply', 'assessed_at')
    list_filter = ('ready_to_apply',)
    search_fields = ('user__username', 'target_role')


@admin.register(FeedbackActionLog)
class FeedbackActionLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action_type', 'automated', 'created_at')
    list_filter = ('action_type', 'automated')
