from django.urls import path
from . import views

urlpatterns = [
    path('create-org/', views.Organization.as_view(), name='organization_create'),
    path('register/', views.CompanyRegisterAPIView.as_view(), name='company_register'),
    path('org/<int:id>/', views.Organization.as_view(), name='organization_detail'),
    path('update/', views.Organization.as_view(), name='organization_update'),
    path('get-org-id/', views.getOrganizationId.as_view(), name='organization_get'),
    path('is-org/', views.isOrganization.as_view(), name='organization_check'),
    path('check-org/<int:id>/', views.checkOrganization.as_view(), name='organization_check_status'),
    
    # Org membership endpoints
    path('join/', views.JoinOrganization.as_view(), name='join_organization'),
    path('leave/<int:org_id>/', views.LeaveOrganization.as_view(), name='leave_organization'),
    path('my-orgs/', views.MyOrganizations.as_view(), name='my_organizations'),
    path('list-all/', views.ListOrganizations.as_view(), name='list_organizations'),
    path('members/<int:org_id>/', views.OrganizationMembers.as_view(), name='organization_members'),
    path('bulk-import/', views.BulkImportStudents.as_view(), name='bulk_import_students'),
]