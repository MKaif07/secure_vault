import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from django.conf import settings
import base64
import hashlib

class CryptoService:
    def __init__(self):
        # In production, this should be a 32-byte hex string in your .env
        self.master_key = self._get_master_key()

    def _get_master_key(self):
        """Retrieves or derives the Master KEK from settings."""
        key = getattr(settings, "MASTER_ENCRYPTION_KEY", "fallback-secret-do-not-use-in-prod")
        return key.encode()

    def generate_dek(self):
        """Generates a random 256-bit key for a specific file."""
        return AESGCM.generate_key(bit_length=256)

    def get_streaming_cipher(self, dek):
        """
        Creates a stateful cipher context for streaming large files.
        """
        # 12-byte Nonce is standard and recommended for AES-GCM
        nonce = os.urandom(12)
        
        # Create the Cipher object
        cipher = Cipher(
            algorithms.AES(dek), 
            modes.GCM(nonce), 
            backend=default_backend()
        )
        
        # Create the 'encryptor' context which holds the state
        encryptor = cipher.encryptor()
        
        return encryptor, nonce
    
    def get_streaming_decryptor(self, dek, nonce):
        """
        Creates a stateful AES-GCM decryption context for large files.
        """
        # 1. Initialize the Cipher with the same algorithm and mode used in encryption
        cipher = Cipher(
            algorithms.AES(dek), 
            modes.GCM(nonce), 
            backend=default_backend()
        )
        
        # 2. Return the DECRYPTOR context (this is the attribute that was missing)
        return cipher.decryptor()
    
    def encrypt_dek(self, dek):
        """Encrypts the DEK using the Master KEK so we can store it safely."""
        # For simplicity in this phase, we use AESGCM for the KEK too
        aesgcm = AESGCM(self.master_key)
        nonce = os.urandom(12)
        encrypted_dek = aesgcm.encrypt(nonce, dek, None)
        # Store nonce + encrypted_dek together
        return base64.b64encode(nonce + encrypted_dek)

    def decrypt_dek(self, wrapped_dek_b64):
        """Decrypts the DEK using the Master KEK."""
        data = base64.b64decode(wrapped_dek_b64)
        nonce = data[:12]
        ciphertext = data[12:]
        aesgcm = AESGCM(self.master_key)
        return aesgcm.decrypt(nonce, ciphertext, None)

    def encrypt_file_data(self, file_bytes, dek):
        """Encrypts the actual file content."""
        aesgcm = AESGCM(dek)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, file_bytes, None)
        return nonce, ciphertext

    def decrypt_file_data(self, ciphertext, dek, nonce):
        """Decrypts the actual file content."""
        aesgcm = AESGCM(dek)
        return aesgcm.decrypt(nonce, ciphertext, None)
    
    def generate_checksum(self, data_bytes):
        """SHA-256 hash of provided bytes"""
        return hashlib.sha256(data_bytes).hexdigest()
    
