from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AuditLog, File, FileVersion
from users.models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    # What columns to show in the list view
    list_display = ('timestamp', 'user', 'action', 'file_id', 'ip_address')
    
    # Filter by date or user for quick investigation
    list_filter = ('action', 'timestamp', 'user')
    
    # Search by File UUID or User email
    search_fields = ('file_id', 'user__email', 'ip_address')
    
    # SECURITY: Prevent admins from changing or deleting logs
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    # Only allow superusers to delete if absolutely necessary
    def has_delete_permission(self, request, obj=None): return False

    # Make fields read-only in the detail view
    readonly_fields = ('timestamp', 'user', 'action', 'file_id', 'ip_address')


class FileVersionInline(admin.TabularInline):
    model = FileVersion
    extra = 0
    readonly_fields = ('version_number', 'storage_path', 'created_at')
    can_delete = False

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'owner', 'upload_date', 'get_version_count')
    list_filter = ('owner', 'upload_date')
    search_fields = ('display_name', 'owner__username')
    inlines = [FileVersionInline]

    def get_version_count(self, obj):
        return obj.versions.count()
    get_version_count.short_description = 'Versions'