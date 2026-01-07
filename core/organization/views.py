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


class JoinOrganization(APIView):
    """User joins an organization (college)"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        org_id = request.data.get('org_id')
        role = request.data.get('role', 'student')
        
        if not org_id:
            return Response({
                'success': False,
                'error': 'Organization ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            org = organization.objects.get(id=org_id)
        except organization.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Organization not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is the org admin
        if org.org == request.user:
            return Response({
                'success': False,
                'error': 'You are the admin of this organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if already a member
        if OrgUsers.objects.filter(org=org, user=request.user).exists():
            return Response({
                'success': False,
                'error': 'You are already a member of this organization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate role
        if role not in ['student', 'faculty']:
            role = 'student'
        
        # Create membership
        membership = OrgUsers.objects.create(
            org=org,
            user=request.user,
            role=role
        )
        
        return Response({
            'success': True,
            'message': f'Successfully joined {org.orgname}',
            'membership': OrgUsersSerializer(membership).data
        }, status=status.HTTP_201_CREATED)


class LeaveOrganization(APIView):
    """User leaves an organization"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def delete(self, request, org_id):
        try:
            membership = OrgUsers.objects.get(org_id=org_id, user=request.user)
            org_name = membership.org.orgname
            membership.delete()
            return Response({
                'success': True,
                'message': f'Successfully left {org_name}'
            }, status=status.HTTP_200_OK)
        except OrgUsers.DoesNotExist:
            return Response({
                'success': False,
                'error': 'You are not a member of this organization'
            }, status=status.HTTP_404_NOT_FOUND)


class MyOrganizations(APIView):
    """Get all organizations the user is a member of"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request):
        memberships = OrgUsers.objects.filter(user=request.user, is_active=True)
        serializer = OrgMembershipSerializer(memberships, many=True)
        
        # Also check if user is an org admin
        admin_org = organization.objects.filter(org=request.user).first()
        
        return Response({
            'success': True,
            'memberships': serializer.data,
            'is_org_admin': admin_org is not None,
            'admin_org_id': admin_org.id if admin_org else None
        }, status=status.HTTP_200_OK)


class ListOrganizations(APIView):
    """List all available organizations for joining"""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        orgs = organization.objects.all().order_by('-is_central', 'orgname')
        serializer = OrganizationSerializer(orgs, many=True)
        return Response({
            'success': True,
            'organizations': serializer.data
        }, status=status.HTTP_200_OK)


class OrganizationMembers(APIView):
    """Get all members of an organization (for org admins)"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def get(self, request, org_id):
        try:
            org = organization.objects.get(id=org_id)
        except organization.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Organization not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Only org admin can view members
        if org.org != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to view members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        members = OrgUsers.objects.filter(org=org).select_related('user')
        
        # Build member list with profile info
        member_list = []
        for member in members:
            profile = UserProfile.objects.filter(user=member.user).first()
            member_list.append({
                'id': member.id,
                'user_id': member.user.id,
                'username': member.user.username,
                'email': member.user.email,
                'role': member.role,
                'joined_at': member.joined_at,
                'is_active': member.is_active,
                'profile_id': profile.id if profile else None,
            })
        
        return Response({
            'success': True,
            'org_name': org.orgname,
            'member_count': len(member_list),
            'members': member_list
        }, status=status.HTTP_200_OK)

    def delete(self, request, org_id):
        """Remove a member from the organization"""
        member_id = request.data.get('member_id')
        
        if not member_id:
            return Response({
                'success': False,
                'error': 'Member ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            org = organization.objects.get(id=org_id)
        except organization.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Organization not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Only org admin can remove members
        if org.org != request.user:
            return Response({
                'success': False,
                'error': 'You do not have permission to remove members'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            member = OrgUsers.objects.get(id=member_id, org=org)
            username = member.user.username
            member.delete()
            return Response({
                'success': True,
                'message': f'Successfully removed {username} from {org.orgname}'
            }, status=status.HTTP_200_OK)
        except OrgUsers.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Member not found'
            }, status=status.HTTP_404_NOT_FOUND)


class BulkImportStudents(APIView):
    """Bulk import students from Excel file (for org admins)"""
    permission_classes = [IsAuthenticated]
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        import pandas as pd
        from io import BytesIO
        
        # Check if user is an org admin
        org = organization.objects.filter(org=request.user).first()
        if not org:
            return Response({
                'success': False,
                'error': 'You are not an organization admin'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get the uploaded file
        excel_file = request.FILES.get('file')
        if not excel_file:
            return Response({
                'success': False,
                'error': 'No file uploaded. Please upload an Excel file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check file extension
        if not excel_file.name.endswith(('.xlsx', '.xls', '.csv')):
            return Response({
                'success': False,
                'error': 'Invalid file format. Please upload .xlsx, .xls, or .csv file.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Read the file
            file_content = excel_file.read()
            
            if excel_file.name.endswith('.csv'):
                df = pd.read_csv(BytesIO(file_content))
            else:
                df = pd.read_excel(BytesIO(file_content))
            
            # Validate columns
            required_columns = ['username', 'email', 'password']
            missing_columns = [col for col in required_columns if col.lower() not in [c.lower() for c in df.columns]]
            
            if missing_columns:
                return Response({
                    'success': False,
                    'error': f'Missing required columns: {", ".join(missing_columns)}. Required: username, email, password'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Normalize column names
            df.columns = [c.lower() for c in df.columns]
            
            # Track results
            created_count = 0
            skipped_count = 0
            errors = []
            
            role = request.data.get('role', 'student')
            if role not in ['student', 'faculty']:
                role = 'student'
            
            for index, row in df.iterrows():
                username = str(row['username']).strip()
                email = str(row['email']).strip()
                password = str(row['password']).strip()
                
                # Validate row data
                if not username or not email or not password or username == 'nan' or email == 'nan':
                    errors.append(f"Row {index + 2}: Missing data")
                    skipped_count += 1
                    continue
                
                # Check if user already exists
                if User.objects.filter(username=username).exists():
                    errors.append(f"Row {index + 2}: Username '{username}' already exists")
                    skipped_count += 1
                    continue
                
                if User.objects.filter(email=email).exists():
                    errors.append(f"Row {index + 2}: Email '{email}' already registered")
                    skipped_count += 1
                    continue
                
                try:
                    # Create user
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        password=password
                    )
                    
                    # Create user profile
                    UserProfile.objects.create(user=user)
                    
                    # Add to organization
                    OrgUsers.objects.create(
                        org=org,
                        user=user,
                        role=role
                    )
                    
                    created_count += 1
                    
                except Exception as e:
                    errors.append(f"Row {index + 2}: Error creating user - {str(e)}")
                    skipped_count += 1
            
            return Response({
                'success': True,
                'message': f'Bulk import completed',
                'created_count': created_count,
                'skipped_count': skipped_count,
                'total_rows': len(df),
                'errors': errors[:20] if errors else []  # Return first 20 errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'success': False,
                'error': f'Error processing file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)