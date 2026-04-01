from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuditLogListView, FileViewSet, AuditLogViewSet
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'', FileViewSet, basename='file')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')


urlpatterns = [
    path('', include(router.urls)),
]