from django.urls import path
from .views import FileUploadView, FileDownloadView, AuditLogListView, ShareFileView, RevokeShareView, SharedWithMeListView, FileDetailView, FileListView

urlpatterns = [
    path('', FileListView.as_view(), name='file-list'),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('download/<uuid:file_id>/', FileDownloadView.as_view(), name='file-download'),
    path('share/<uuid:file_id>/', ShareFileView.as_view(), name='file-share'),
    path('share/<uuid:file_id>/revoke/<str:recipient_email>/', RevokeShareView.as_view(), name='revoke-share'),
    path('shared-with-me/', SharedWithMeListView.as_view(), name='shared-with-me'),
    path('file/<uuid:file_id>/', FileDetailView.as_view(), name='file-detail'),
    path('logs/', AuditLogListView.as_view(), name='audit-logs'),
]