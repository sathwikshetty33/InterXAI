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
]