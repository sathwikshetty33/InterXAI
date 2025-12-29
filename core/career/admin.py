from django.contrib import admin
from .models import UserSkillProfile, MarketTrend, LearningRoadmap, LearningResource

@admin.register(UserSkillProfile)
class UserSkillProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'experience_years', 'last_profile_scan', 'updated_at')
    search_fields = ('user__username',)

@admin.register(MarketTrend)
class MarketTrendAdmin(admin.ModelAdmin):
    list_display = ('skill_category', 'region', 'source', 'fetched_at')
    list_filter = ('region', 'source')

@admin.register(LearningRoadmap)
class LearningRoadmapAdmin(admin.ModelAdmin):
    list_display = ('user', 'target_role', 'current_readiness_score', 'generated_at')
    search_fields = ('user__username', 'target_role')

@admin.register(LearningResource)
class LearningResourceAdmin(admin.ModelAdmin):
    list_display = ('title', 'type', 'difficulty', 'source')
    list_filter = ('type', 'difficulty', 'source')
