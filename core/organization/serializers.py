from rest_framework import serializers
from django.contrib.auth.models import User
from organization.models import *
from users.models import *


class OrganizationRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    orgname = serializers.CharField(max_length=100)
    address = serializers.CharField(max_length=255)
    photo = serializers.CharField(max_length=255)
    Description = serializers.CharField(max_length=1000)
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance



class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = organization
        fields = '__all__'
        read_only_fields = ('org',)


class OrgUsersSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    org_name = serializers.CharField(source='org.orgname', read_only=True)
    
    class Meta:
        model = OrgUsers
        fields = ['id', 'org', 'user', 'username', 'email', 'org_name', 'role', 'joined_at', 'is_active']
        read_only_fields = ['id', 'joined_at']


class OrgMembershipSerializer(serializers.ModelSerializer):
    """Serializer for user's org memberships view"""
    org_id = serializers.IntegerField(source='org.id', read_only=True)
    org_name = serializers.CharField(source='org.orgname', read_only=True)
    org_photo = serializers.CharField(source='org.photo', read_only=True)
    is_central = serializers.BooleanField(source='org.is_central', read_only=True)
    
    class Meta:
        model = OrgUsers
        fields = ['id', 'org_id', 'org_name', 'org_photo', 'is_central', 'role', 'joined_at', 'is_active']