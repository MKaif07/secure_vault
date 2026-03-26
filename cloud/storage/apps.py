from django.apps import AppConfig


class StorageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'storage'

    def ready(self):
        # This imports the signals when the app is ready
        import storage.signals
        