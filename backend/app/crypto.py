import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# We look for a 32-byte base64 encoded string in the environment.
# If not present, we use a fallback for local development.
# In a real staging/prod, this MUST be set in the .env file.
SECRET_KEY = os.getenv("ENCRYPTION_KEY")
APP_ENV = os.getenv("APP_ENV", "development")

if not SECRET_KEY:
    if APP_ENV != "development":
        raise ValueError("ENCRYPTION_KEY must be set in the environment for non-development environments.")
    # A standard 32-byte url-safe base64 fallback key for local dev ONLY.
    # Generated via Fernet.generate_key()
    SECRET_KEY = b'xLzP9_20vjB9W7yCqkZ9Z27_2V8VzO9ZmVwzvT-q4R8='
elif isinstance(SECRET_KEY, str):
    SECRET_KEY = SECRET_KEY.encode('utf-8')

fernet = Fernet(SECRET_KEY)

def encrypt(text: str) -> str:
    """Encrypts a plaintext string and returns a utf-8 string."""
    if not text:
        return ""
    encrypted_bytes = fernet.encrypt(text.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt(encrypted_text: str) -> str:
    """Decrypts an encrypted utf-8 string and returns the plaintext."""
    if not encrypted_text:
        return ""
    decrypted_bytes = fernet.decrypt(encrypted_text.encode('utf-8'))
    return decrypted_bytes.decode('utf-8')
