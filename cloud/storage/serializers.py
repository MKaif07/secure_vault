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
    
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import FileShare

User = get_user_model()

class FileShareSerializer(serializers.ModelSerializer):
    # We accept email from the frontend, but it's not a field in the model
    email = serializers.EmailField(write_only=True)
    
    class Meta:
        model = FileShare
        fields = ['email', 'expires_at', 'access_token', 'is_revoked']
        read_only_fields = ['access_token', 'is_revoked']

    def validate_email(self, value):
        """Check if the recipient user actually exists in the system."""
        try:
            return User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient user with this email not found.")

    def create(self, validated_data):
        # Swap the 'email' field for the 'shared_with' User object
        recipient_user = validated_data.pop('email')
        validated_data['shared_with'] = recipient_user
        return super().create(validated_data)