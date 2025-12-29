from django.contrib import admin
from .models import Opportunity, OpportunityMatch, Application, UserApplicationPreferences, SavedOpportunity


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'type', 'location', 'status', 'deadline')
    list_filter = ('type', 'status', 'remote', 'experience_level')
    search_fields = ('title', 'company', 'description')


@admin.register(OpportunityMatch)
class OpportunityMatchAdmin(admin.ModelAdmin):
    list_display = ('user', 'opportunity', 'match_score', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'opportunity__title')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('user', 'opportunity', 'status', 'auto_applied', 'applied_at')
    list_filter = ('status', 'auto_applied')
    search_fields = ('user__username', 'opportunity__title')


@admin.register(UserApplicationPreferences)
class UserApplicationPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'auto_apply_enabled', 'min_match_score', 'max_applications_per_day')


@admin.register(SavedOpportunity)
class SavedOpportunityAdmin(admin.ModelAdmin):
    list_display = ('user', 'opportunity', 'saved_at')
