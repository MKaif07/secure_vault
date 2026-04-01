import os
from django.conf import settings
from storage.models import File, FileVersion
from secure_cloud.services.crypto_service import CryptoService
from django.db.models import Q
from django.utils import timezone

class FileService:
    def __init__(self):
        self.crypto = CryptoService()
        self.storage_base = os.path.join(settings.BASE_DIR, 'vault_storage')
        
        if not os.path.exists(self.storage_base):
            os.makedirs(self.storage_base)

    def upload_and_encrypt(self, user, file_obj, existing_file_id=None):
        try:
            # 1. Database Record & Versioning Logic
            if existing_file_id:
                file_record = File.objects.get(id=existing_file_id)
                # Find the highest existing version number
                last_version = file_record.versions.order_by('-version_number').first()
                version_num = (last_version.version_number + 1) if last_version else 1
            else:
                # First time upload
                file_record = File.objects.create(
                    owner=user, 
                    display_name=file_obj.name
                )
                version_num = 1

            # 2. Cryptography Setup
            dek = self.crypto.generate_dek()
            # Ensure wrapped_dek is stored as a string or bytes based on your model
            wrapped_dek = self.crypto.encrypt_dek(dek)
            if isinstance(wrapped_dek, bytes):
                wrapped_dek = wrapped_dek.decode('utf-8')
            
            # 3. Read and Encrypt content
            file_obj.seek(0) 
            file_data = file_obj.read()
            nonce, ciphertext = self.crypto.encrypt_file_data(file_data, dek)

            # Generate integrity checksum for the CIPHERTEXT (Harden against bit-flipping)
            file_checksum = self.crypto.generate_checksum(ciphertext)
                    
            # 4. Physical Storage
            # Generate a unique filename using UUID and versioning
            storage_filename = f"{file_record.id}_v{version_num}.enc"
            storage_path = os.path.join(self.storage_base, storage_filename)
            
            # Ensure directory exists
            os.makedirs(self.storage_base, exist_ok=True)
            
            with open(storage_path, 'wb') as f:
                f.write(ciphertext)

            # 5. Create the Version record linked to our file_record
            FileVersion.objects.create(
                file=file_record,
                version_number=version_num,
                storage_path=storage_path,
                checksum=file_checksum,
                file_nonce=nonce,
                encrypted_dek=wrapped_dek
            )

            return file_record

        except Exception as e:
            # If the file was partially created but DB failed, this helps debugging
            print(f"CRITICAL UPLOAD ERROR: {str(e)}")
            raise e
    
    def download_and_decrypt(self, user, file_id, version_number=None):
        try:
            # 1. Permission Check
            file_record = File.objects.get(Q(id=file_id, owner=user))
            # |Q(id=file_id, shares__shared_with=user, shares__access_level='DOWNLOADER'))

            # 2. Get Specific Version or Latest
            if version_number:
                version = file_record.versions.get(version_number=version_number)
            else:
                version = file_record.versions.latest('version_number')
            with open(version.storage_path, 'rb') as f:
                ciphertext = f.read()

            print("VERSION:", version_number)
            current_checksum = self.crypto.generate_checksum(ciphertext)
            print(f"DB Checksum: {version.checksum}")
            print(f"File Checksum: {current_checksum}")
            if current_checksum != version.checksum:
                # Log a high-severity security alert
                print(f"CRITICAL: Integrity failure for file {file_id} version {version_number}!")
                return None, None
            
            # 3. Decrypt (Rest of the logic remains the same)
            dek = self.crypto.decrypt_dek(version.encrypted_dek.encode('utf-8'))
            with open(version.storage_path, 'rb') as f:
                ciphertext = f.read()
            
            decrypted_data = self.crypto.decrypt_file_data(ciphertext, dek, version.file_nonce)
            return decrypted_data, file_record.display_name

        except (File.DoesNotExist, FileVersion.DoesNotExist):
            return None, None