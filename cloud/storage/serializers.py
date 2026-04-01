from rest_framework import serializers
from .models import File, AuditLog, FileVersion, FileShare
from django.contrib.auth import get_user_model
from time import timezone

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'username', 'action', 'file_id', 'ip_address', 'timestamp']


class FileVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileVersion
        fields = ['version_number', 'created_at', 'file_size'] # add file_size to model if desired

class FileDetailSerializer(serializers.ModelSerializer):
    versions = FileVersionSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = File
        fields = ['id', 'display_name', 'owner_name', 'upload_date', 'versions']

class FileSummarySerializer(serializers.ModelSerializer):
    version_count = serializers.SerializerMethodField()
    last_upload = serializers.DateTimeField(source='upload_date', format="%Y-%m-%d %H:%M")

    class Meta:
        model = File
        fields = ['id', 'display_name', 'last_upload', 'version_count']

    def get_version_count(self, obj):
        return obj.versions.count()
    
class FileVersionSerializer(serializers.ModelSerializer):
    # We add a human-readable size and date
    uploaded_at = serializers.DateTimeField(source='created_at', format="%Y-%m-%d %H:%M")
    
    class Meta:
        model = FileVersion
        fields = ['version_number', 'uploaded_at']

class FileDetailSerializer(serializers.ModelSerializer):
    # This 'versions' field matches the 'related_name' in our FileVersion model
    versions = FileVersionSerializer(many=True, read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = File
        fields = ['id', 'display_name', 'owner_username', 'upload_date', 'versions']

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')

    def create(self, validated_data):
        # Create user with hashed password
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'USER') # Defaults to USER per your RBAC
        )
        return user
    
class FileShareSerializer(serializers.ModelSerializer):
    expires_in_hours = serializers.IntegerField(write_only=True, min_value=1, max_value=168) # Max 1 week

    class Meta:
        model = FileShare
        fields = ['id', 'file', 'shared_with', 'expires_in_hours', 'access_token', 'expires_at']
        read_only_fields = ['id', 'access_token', 'expires_at']

    def create(self, validated_data):
        hours = validated_data.pop('expires_in_hours')
        validated_data['expires_at'] = timezone.now() + timezone.timedelta(hours=hours)
        return super().create(validated_data)