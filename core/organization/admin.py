from django.contrib import admin
from .models import organization, OrgUsers


# Register organization model
admin.site.register(organization)


# Register OrgUsers with custom admin
@admin.register(OrgUsers)
class OrgUsersAdmin(admin.ModelAdmin):
    list_display = ('user', 'org', 'role', 'joined_at', 'is_active')
    list_filter = ('role', 'is_active', 'org')
    search_fields = ('user__username', 'user__email', 'org__orgname')
    ordering = ('-joined_at',)