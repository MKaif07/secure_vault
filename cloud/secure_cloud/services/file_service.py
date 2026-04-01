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

    def upload_and_encrypt(self, user, uploaded_file):
        # 1. Check if a file with this name already exists for THIS user
        existing_file = File.objects.filter(owner=user, display_name=uploaded_file.name).first()

        if existing_file:
            # Re-use the existing file record
            file_record = existing_file
            # Find the latest version number and increment it
            try :
                last_version_obj = file_record.versions.latest('version_number')
                new_version_number = last_version_obj.version_number + 1
            except FileVersion.DoesNotExist:
                new_version_number = 1
        else:
            # Create the top-level File record ONLY if it doesn't exist
            file_record = File.objects.create(
                owner=user,
                display_name=uploaded_file.name,
            )
            new_version_number = 1

        # 2. Cryptography Setup
        dek = self.crypto.generate_dek()
        wrapped_dek = self.crypto.encrypt_dek(dek)
        
        # 3. Read and Encrypt content
        uploaded_file.seek(0) 
        file_data = uploaded_file.read()
        nonce, ciphertext = self.crypto.encrypt_file_data(file_data, dek)

        file_checksum = self.crypto.generate_checksum(ciphertext)
        print(f"DEBUG: Generated Checksum during upload: {file_checksum}")
                
        # 4. Physical Storage
        # We use the version number in the filename to distinguish blobs
        storage_filename = f"{file_record.id}_v{new_version_number}.enc"
        storage_path = os.path.join(self.storage_base, storage_filename)
        
        with open(storage_path, 'wb') as f:
            f.write(ciphertext)

        # 5. Create the Version record linked to our file_record
        FileVersion.objects.create(
            file=file_record,
            version_number=new_version_number,
            storage_path=storage_path,
            encrypted_dek=wrapped_dek.decode('utf-8'),
            file_nonce=nonce,
            checksum=file_checksum
        )

        return file_record
    
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