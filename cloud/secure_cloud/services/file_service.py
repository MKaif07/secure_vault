import os
from django.conf import settings
from storage.models import File, FileVersion
from secure_cloud.services.crypto_service import CryptoService
from django.db.models import Q
from django.utils import timezone
import hashlib

class FileService:
    def __init__(self):
        self.crypto = CryptoService()
        self.storage_base = os.path.join(settings.BASE_DIR, 'vault_storage')
        
        if not os.path.exists(self.storage_base):
            os.makedirs(self.storage_base)

    def upload_and_encrypt(self, user, file_obj, existing_file_id=None):
        try:
            # 1. Database Record & Versioning Logic (UNCHANGED)
            if existing_file_id:
                file_record = File.objects.get(id=existing_file_id)
                last_version = file_record.versions.order_by('-version_number').first()
                version_num = (last_version.version_number + 1) if last_version else 1
            else:
                file_record = File.objects.create(
                    owner=user, 
                    display_name=file_obj.name
                )
                version_num = 1

            # 2. Cryptography Setup
            dek = self.crypto.generate_dek()
            wrapped_dek = self.crypto.encrypt_dek(dek)
            if isinstance(wrapped_dek, bytes):
                wrapped_dek = wrapped_dek.decode('utf-8')
            
            # 3. Physical Storage Setup
            storage_filename = f"{file_record.id}_v{version_num}.enc"
            storage_path = os.path.join(self.storage_base, storage_filename)
            os.makedirs(self.storage_base, exist_ok=True)

            # 4. STREAMING ENCRYPTION (The 2.5GB Fix)
            # We initialize the cipher once for the whole file
            encryptor, nonce = self.crypto.get_streaming_cipher(dek)
            sha256_hasher = hashlib.sha256()

            actual_size = 0
            file_obj.seek(0)
            
            with open(storage_path, 'wb') as f_out:
                for chunk in file_obj.chunks(65536): # 64KB chunks
                    actual_size += len(chunk)
                    
                    # A. Update the Checksum with the ORIGINAL (plaintext) chunk
                    # If you want to verify the ENCRYPTED file later, hash 'encrypted_chunk' instead
                    sha256_hasher.update(chunk)
                    
                    # B. Encrypt and write to disk
                    encrypted_chunk = encryptor.update(chunk)
                    f_out.write(encrypted_chunk)

                # 2. Finalize both processes
                encryptor.finalize()
                file_checksum = sha256_hasher.hexdigest() # This is your final hash string
                tag = encryptor.tag

            # 6. Create the Version record (UNCHANGED)
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
            print(f"CRITICAL UPLOAD ERROR: {str(e)}")
            # Cleanup: if upload fails, remove the partial file from disk
            if 'storage_path' in locals() and os.path.exists(storage_path):
                os.remove(storage_path)
            raise e
    
    def download_and_decrypt(self, user, file_id, version_number=None):
        try:
            # 1. Permission Check (UNCHANGED)
            file_record = File.objects.get(
                Q(id=file_id, owner=user) |
                Q(id=file_id, shares__shared_with=user, shares__is_revoked=False)
            )

            # 2. Get Version (UNCHANGED)
            if version_number:
                version = file_record.versions.filter(version_number=version_number).first()
            else:
                version = file_record.versions.order_by('-version_number').first()

            if not version or not os.path.exists(version.storage_path):
                return None, None

            # 3. Decrypt the DEK
            dek = self.crypto.decrypt_dek(version.encrypted_dek.encode('utf-8'))

            # 4. THE STREAMING GENERATOR
            def file_stream_generator():
                # Initialize the streaming decryptor
                decryptor = self.crypto.get_streaming_decryptor(
                    dek, 
                    version.file_nonce
                )
                
                with open(version.storage_path, 'rb') as f:
                    # Read 64KB chunks of ciphertext from disk
                    while True:
                        chunk = f.read(65536)
                        if not chunk:
                            break
                        
                        # Decrypt chunk and "yield" it to the response
                        decrypted_chunk = decryptor.update(chunk)
                        yield decrypted_chunk
                    
                    # Finalize (important for GCM tag verification)
                    decryptor.finalize()

            return file_stream_generator(), file_record.display_name

        except Exception as e:
            print(f"STREAMING DOWNLOAD ERROR: {str(e)}")
            return None, None