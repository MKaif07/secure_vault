import os
from django.db.models.signals import post_delete
from django.dispatch import receiver
from .models import FileVersion

@receiver(post_delete, sender=FileVersion)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    if instance.storage_path:
        if os.path.isfile(instance.storage_path):
            try:
                os.remove(instance.storage_path)
                print(f"--- Janitor: Successfully removed {instance.storage_path} ---")
            except Exception as e:
                print(f"--- Janitor Error: {str(e)} ---")