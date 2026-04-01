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
            file_data = file_obj.read()
            actual_size = len(file_data)

            # 5. Create the Version record linked to our file_record
            FileVersion.objects.create(
                file=file_record,
                version_number=version_num,
                storage_path=storage_path,
                checksum=file_checksum,
                file_nonce=nonce,
                encrypted_dek=wrapped_dek,
                file_size=actual_size
            )

            return file_record

        except Exception as e:
            # If the file was partially created but DB failed, this helps debugging
            print(f"CRITICAL UPLOAD ERROR: {str(e)}")
            raise e
    
    def download_and_decrypt(self, user, file_id, version_number=None):
        print("=== DOWNLOAD DEBUG START ===")
        print("User:", user)
        print("File ID:", file_id)
        print("Version:", version_number)

        try:
            # 1. Permission Check (OWNER OR SHARED USER)
            file_record = File.objects.get(
                Q(id=file_id, owner=user) |
                Q(id=file_id, shares__shared_with=user, shares__is_revoked=False)
            )

            # 2. Get Version
            if version_number:
                version = file_record.versions.filter(
                    version_number=version_number
                ).first()
            else:
                version = file_record.versions.order_by('-version_number').first()

            if not version:
                print("❌ No version found")
                return None, None

            print("✅ Version found:", version.version_number)
            print("Storage path:", version.storage_path)

            # 3. Check file exists
            if not os.path.exists(version.storage_path):
                print("❌ File not found on disk")
                return None, None

            # 4. Read file ONCE
            with open(version.storage_path, 'rb') as f:
                ciphertext = f.read()

            # 5. Integrity Check
            current_checksum = self.crypto.generate_checksum(ciphertext)
            print("DB Checksum:", version.checksum)
            print("File Checksum:", current_checksum)

            if current_checksum != version.checksum:
                print("🚨 CRITICAL: Integrity failure!")
                return None, None

            # 6. Decrypt
            try:
                dek = self.crypto.decrypt_dek(version.encrypted_dek.encode('utf-8'))
                decrypted_data = self.crypto.decrypt_file_data(
                    ciphertext,
                    dek,
                    version.file_nonce
                )
            except Exception as e:
                print("❌ Decryption failed:", str(e))
                return None, None

            print("✅ Decryption successful")
            return decrypted_data, file_record.display_name

        except File.DoesNotExist:
            print("❌ File not found or no permission")
            return None, None

        except Exception as e:
            print("❌ Unexpected error:", str(e))
            return None, None