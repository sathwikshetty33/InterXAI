from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import login, authenticate, logout
from django.utils import timezone
from datetime import  timedelta
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from organization.models import *
from .serializers import *  
import json
from users.models import *
from django.shortcuts import get_object_or_404

class Organization(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]
    def get_authenticators(self):
        if self.request.method == 'GET':
            return []  # Disable authentication for GET
        return super().get_authenticators()

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return super().get_permissions()
    @method_decorator(csrf_exempt)
    def post(self, request):
        user = request.user
        org = organization.objects.filter(org=user).first()
        if org:
            return Response({"error": "User is already an organization"}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_authenticated:
            serializer = OrganizationRegistrationSerializer(data=request.data)
            if serializer.is_valid():
                orgname = serializer.validated_data.get('orgname')
                address = serializer.validated_data.get('address')
                photo = serializer.validated_data.get('photo')
                description = serializer.validated_data.get('Description')
                org = organization.objects.create(
                    org=user,
                    orgname=orgname,
                    address=address,
                    photo=photo,
                    Description=description
                )
                org.save()
                return Response({"message": "Organization created successfully",
                                 "organization": OrganizationSerializer(org).data}, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"error": "User is not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)
    
    def get(self, request, id):
        org = get_object_or_404(organization, id=id)
        serializer = OrganizationSerializer(org)
        return Response(serializer.data, status=status.HTTP_200_OK)
    def put(self, request):
        user = request.user
        org = organization.objects.filter(org=user).first()
        if not org:
            return Response({"error": "User is not an organization"}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = OrganizationRegistrationSerializer(org, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Organization updated successfully", "organization": serializer.data}, status=status.HTTP_200_OK)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class isOrganization(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        user = request.user
        if organization.objects.filter(org=user).exists():
            return Response({"is_organization": True}, status=status.HTTP_200_OK)
        else:
            return Response({"is_organization": False}, status=status.HTTP_200_OK)
class getOrganizationId(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        user = request.user
        org = organization.objects.filter(org=user).first()
        if org:
            return Response({"organization_id": org.id}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "User is not an organization"}, status=status.HTTP_400_BAD_REQUEST)

class checkOrganization(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request,id):
        try:
            org = organization.objects.get(id=id)
            if org.org != request.user:
                return Response({"error": "You do not have permission to view this organization"}, status=status.HTTP_403_FORBIDDEN)
        except organization.DoesNotExist:
            return Response({"is_organization": False}, status=status.HTTP_404_NOT_FOUND)
        return Response({"is_organization": True}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CompanyRegisterAPIView(APIView):
    """Register a new company (creates user + organization in one step)"""
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        # Get user data
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Get organization data
        orgname = request.data.get('orgname')
        address = request.data.get('address', '')
        photo = request.data.get('photo', '')
        description = request.data.get('description', '')
        
        # Validate required fields
        if not username or not email or not password:
            return Response({
                'success': False,
                'error': 'Username, email, and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not orgname:
            return Response({
                'success': False,
                'error': 'Organization name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username already exists
        if User.objects.filter(username=username).exists():
            return Response({
                'success': False,
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({
                'success': False,
                'error': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            
            # Create user profile
            UserProfile.objects.create(user=user)
            
            # Create organization
            org = organization.objects.create(
                org=user,
                orgname=orgname,
                address=address,
                photo=photo,
                Description=description
            )
            
            # Create authentication token
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'message': 'Company registered successfully',
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'email': user.email,
                'organization_id': org.id,
                'organization_name': org.orgname
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Rollback user creation if org creation fails
            try:
                User.objects.filter(username=username).delete()
            except:
                pass
            return Response({
                'success': False,
                'error': f'Registration failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)