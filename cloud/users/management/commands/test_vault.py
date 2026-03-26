from django.core.management.base import BaseCommand
from secure_cloud.services.crypto_service import CryptoService

class Command(BaseCommand):
    help = 'Tests the AES-256-GCM Encryption Service'

    def handle(self, *args, **kwargs):
        crypto = CryptoService()
        data = b"SRS Requirement: Secure AES-256 Storage"
        
        # Test Logic
        dek = crypto.generate_dek()
        nonce, ciphertext = crypto.encrypt_file_data(data, dek)
        wrapped_dek = crypto.encrypt_dek(dek)
        
        # Verify
        unwrapped_dek = crypto.decrypt_dek(wrapped_dek)
        decrypted = crypto.decrypt_file_data(ciphertext, unwrapped_dek, nonce)
        
        if data == decrypted:
            self.stdout.write(self.style.SUCCESS('✅ Cryptography Engine Verified!'))
        else:
            self.stdout.write(self.style.ERROR('❌ Integrity Check Failed!'))