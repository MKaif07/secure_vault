from rest_framework import serializers
from .models import File, AuditLog, FileVersion

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