from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .serializers import FileSerializer, AuditLogSerializer, FileDetailSerializer, FileSummarySerializer
from secure_cloud.services.file_service import FileService
from django.http import HttpResponse
from .models import AuditLog, File, FileShare
from django.contrib.auth import get_user_model
from django.db.models import Q
from users.models import User
from rest_framework import status, generics, viewsets, filters
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import action
from .serializers import UserSerializer, FileShareSerializer
from django.utils import timezone

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

class UserMeView(APIView):
    """
    Returns the current user's profile. 
    Useful for the frontend to verify identity and role.
    """
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

import logging

logger = logging.getLogger(__name__)

class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        # uploaded_file = next(iter(request.FILES.values()), None)
        if not uploaded_file:
            return Response({"error": "No file provided"}, status=400)

        service = FileService()
        file_record = service.upload_and_encrypt(request.user, uploaded_file)
        print(f"--- Upload Started for ID: {file_record} ---")
        AuditLog.objects.create(
            user=request.user,
            action='UPLOAD',
            file_id=str(file_record.id),
            ip_address=request.META.get('REMOTE_ADDR')
        )
        print(f"--- Log created for ID: {file_record} ---")
        print(f"--- Succesfully uploaded: {file_record} ---")
        return Response({
            "message": "File uploaded and encrypted successfully",
            "file_id": file_record.id
        }, status=201)
    
class FileDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file_metadata = self.get_object(id=file_id)
            token = request.query_params.get('token')

            #check ownership
            is_owner = file_metadata.owner == request.user

            #check share
            is_shared = FileShare.objects.filter(
                file=file_metadata,
                shared_with = request.user,
                is_revoked=False
            ).filter(
                Q(expires_at__gt=timezone.now | Q(expires_at__isnull=True))
            ).exists()

            if not (is_owner or is_shared):
                    logger.warning(f"Unauthorized download attempt on {file_id} by {request.user}")
                    return Response({"error": "Access denied: You do not own this file or the share has expired."}, status=403)
            
            print(f"--- Download Started for ID: {file_id} ---")
            version_num = request.query_params.get('v')
            service = FileService()

            file_bytes, filename = service.download_and_decrypt(request.user, file_id, version_number=version_num)
            
            if not file_bytes:
                print(f"--- Download Failed for ID: {file_id} ---")
                return Response({"error": "File not found or access denied"}, status=404)

            AuditLog.objects.create(
                user=request.user,
                action='DOWNLOAD',
                file_id=str(file_id),
                ip_address=request.META.get('REMOTE_ADDR')
            )
            print(f"--- Log created successfully: {file_id} ---")

            # Send the file back to the browser
            response = HttpResponse(file_bytes, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return Response({"error": "File record not found"}, status=404)
    
from rest_framework import generics
from rest_framework.permissions import IsAdminUser

class AuditLogListView(generics.ListAPIView):
    """
    API endpoint to view audit logs. Restricted to Staff/Admins only.
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]


User = get_user_model()

class ShareFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        target_email = request.data.get('email')
        access_level = request.data.get('access_level', 'VIEWER')

        try:
            file_to_share = File.objects.get(id=file_id, owner=request.user)
            recipient = User.objects.get(email=target_email)
            
            share, created = FileShare.objects.update_or_create(
                file=file_to_share,
                shared_with=recipient,
                defaults={'shared_by': request.user, 'access_level': access_level}
            )

            # LOG THIS ACTION
            AuditLog.objects.create(
                user=request.user,
                action='SHARE_CREATED',
                file_id=str(file_id),
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({"message": f"File shared with {target_email}"}, status=201)

        except File.DoesNotExist:
            return Response({"error": "File not found or you don't own it"}, status=404)
        except User.DoesNotExist:
            return Response({"error": "User with this email not found"}, status=404)
        
# class FileListView(generics.ListAPIView):
#     permission_classes = [IsAuthenticated]
#     serializer_class = FileDetailSerializer

#     def get_queryset(self):
#         # Return files owned by user OR shared with user
#         return File.objects.filter(owner=self.request.user).distinct()
    
class MyFilesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Files I own
        owned_files = File.objects.filter(owner=request.user)
        
        # Files shared WITH me
        shared_files = File.objects.filter(shares__shared_with=request.user)
        
        # Combine and serialize
        all_files = (owned_files | shared_files).distinct().order_by('-upload_date')
        serializer = FileSummarySerializer(all_files, many=True)
        
        return Response(serializer.data)
    
class RevokeShareView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id, share_id):
        try:
            # Ensure only the owner of the file can delete the share
            share = FileShare.objects.get(id=share_id, file__id=file_id, file__owner=request.user)
            share.delete()
            
            # Log the revocation
            AuditLog.objects.create(
                user=request.user,
                action='SHARE_REVOKED',
                file_id=str(file_id),
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response({"message": "Access revoked successfully"}, status=204)
        except FileShare.DoesNotExist:
            return Response({"error": "Share record not found"}, status=404)

from rest_framework import status

class RevokeShareView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, file_id, recipient_email):
        """
        Deletes a share record based on the file ID and the recipient's email.
        """
        try:
            # 1. Find the file and ensure the requester is the OWNER
            file_obj = File.objects.get(id=file_id, owner=request.user)
            
            # 2. Find the specific share record for the recipient
            share = FileShare.objects.get(file=file_obj, shared_with__email=recipient_email)
            
            # 3. Delete the record (Revoke Access)
            share.delete()

            # 4. Audit the revocation
            AuditLog.objects.create(
                user=request.user,
                action='ACCESS_REVOKED',
                file_id=str(file_id),
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                "message": f"Access revoked for {recipient_email}"
            }, status=status.HTTP_204_NO_CONTENT)

        except File.DoesNotExist:
            return Response({"error": "File not found or permission denied"}, status=404)
        except FileShare.DoesNotExist:
            return Response({"error": "No share record found for this user"}, status=404)
        
class SharedWithMeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Query files where the user is in the 'shared_with' field of the FileShare model
        shared_files = File.objects.filter(shares__shared_with=request.user).distinct()
        
        # We can reuse the FileSummarySerializer we planned earlier
        serializer = FileSummarySerializer(shared_files, many=True)
        
        return Response(serializer.data)
    
class FileDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            # Security Check: Only owner or authorized shared users
            file_obj = File.objects.get(
                Q(id=file_id, owner=request.user) | 
                Q(id=file_id, shares__shared_with=request.user)
            )
            
            serializer = FileDetailSerializer(file_obj)
            return Response(serializer.data)

        except File.DoesNotExist:
            return Response({"error": "File not found"}, status=404)
        
from rest_framework import generics, filters
from django_filters.rest_framework import DjangoFilterBackend

class FileListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FileSummarySerializer
    
    # Enable Search and Filtering
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Define which fields can be searched/filtered
    search_fields = ['display_name'] 
    ordering_fields = ['upload_date', 'display_name']
    ordering = ['-upload_date'] # Default: Newest first

    def get_queryset(self):
        # Only show files I own OR files shared with me
        return File.objects.filter(
            Q(owner=self.request.user) | 
            Q(shares__shared_with=self.request.user)
        ).distinct()
    
class AuditLogListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated] # Or IsAdminUser
    serializer_class = AuditLogSerializer # Make sure you have this serializer
    queryset = AuditLog.objects.all().order_by('-timestamp')
    
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['action', 'user__username']
    search_fields = ['file_id', 'ip_address']

class FileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    # Filtering and Search Setup
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['display_name']
    ordering_fields = ['upload_date', 'display_name']

    def get_queryset(self):
        """
        SECURITY: Users can only see files they own OR files shared with them.
        """
        return File.objects.filter(
            Q(owner=self.request.user) | 
            Q(shares__shared_with=self.request.user)
        ).distinct().order_by('-upload_date')

    def get_serializer_class(self):
        if self.action == 'list':
            return FileSummarySerializer
        return FileDetailSerializer

    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """
        COMPLETE SECURE RETRIEVAL LOGIC
        Checks ownership, share status, and expiration before decryption.
        """
        try:
            file_metadata = self.get_object() # Fetches by ID + get_queryset security
            token = request.query_params.get('token')

            # 1. Access Control Logic
            is_owner = file_metadata.owner == request.user
            
            # Check if a valid, unrevoked, and unexpired share exists
            is_shared = FileShare.objects.filter(
                file=file_metadata,
                shared_with=request.user,
                is_revoked=False
            ).filter(
                Q(expires_at__gt=timezone.now()) | Q(expires_at__isnull=True)
            ).exists()

            # If user provided a specific share token, validate that too
            if token:
                is_shared = is_shared and FileShare.objects.filter(access_token=token).exists()

            if not (is_owner or is_shared):
                return Response({"error": "ACCESS DENIED: Unauthorized or Link Expired"}, status=403)

            # 2. Cryptographic Retrieval via Service
            service = FileService()
            version_num = request.query_params.get('v')
            
            # This calls your AES-256 GCM decryption logic
            file_bytes, filename = service.download_and_decrypt(
                request.user, 
                file_metadata.id, 
                version_number=version_num
            )

            if not file_bytes:
                return Response({"error": "DECRYPTION FAILURE: Payload missing on disk"}, status=404)

            # 3. Audit Logging
            AuditLog.objects.create(
                user=request.user,
                action='DOWNLOAD',
                file_id=str(file_metadata.id),
                ip_address=request.META.get('REMOTE_ADDR')
            )

            # 4. Binary Stream Response
            response = HttpResponse(file_bytes, content_type='application/octet-stream')
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response

        except File.DoesNotExist:
            return Response({"error": "File not found"}, status=404)

    @action(detail=True, methods=['post'], url_path='share')
    def share(self, request, pk=None):
        """
        Logic to create a new share record for a recipient.
        """
        file_obj = self.get_object()
        if file_obj.owner != request.user:
            return Response({"error": "Only the owner can share this file"}, status=403)

        serializer = FileShareSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(file=file_obj, shared_by=request.user)
            
            AuditLog.objects.create(
                user=request.user,
                action='SHARE_CREATED',
                file_id=str(file_obj.id),
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)