import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

class File(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    display_name = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name

class FileVersion(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='versions')
    version_number = models.PositiveIntegerField()
    
    # Storage
    storage_path = models.CharField(max_length=512) 
    
    # Encryption Metadata
    # We store the encrypted DEK and the Nonce used for this specific version
    encrypted_dek = models.TextField() # Base64 string from our crypto service
    file_nonce = models.BinaryField()  # Raw bytes for the file encryption nonce
    
    created_at = models.DateTimeField(auto_now_add=True)
    checksum = models.CharField(max_length=64, editable=False, null=True)

    class Meta:
        unique_together = ('file', 'version_number')

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50) # 'UPLOAD', 'DOWNLOAD', 'VIEW'
    file_id = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Audit Logs"
        ordering = ['-timestamp'] # Newest first

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"
    
class FileShare(models.Model):
    # Primary Key
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Links
    file = models.ForeignKey('File', on_delete=models.CASCADE, related_name='shares')
    shared_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='shared_files')
    shared_with = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_files', null=True, blank=True)
    
    access_token = models.UUIDField(unique=True, default=uuid.uuid4, editable=False)
    
    expires_at = models.DateTimeField(default=timezone.now)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_active(self):
        # Ensure timezone is imported from django.utils
        return not self.is_revoked and self.expires_at > timezone.now()

    def __str__(self):
        return f"Share: {self.file.display_name} -> {self.shared_with or 'Public Link'}"