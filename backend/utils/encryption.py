import os
from cryptography.fernet import Fernet


def get_fernet() -> Fernet:
    key = os.environ.get("ENCRYPTION_KEY")
    if not key:
        raise ValueError("ENCRYPTION_KEY is not configured")
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_value(value: str) -> str:
    if not value:
        return ""
    return get_fernet().encrypt(value.encode()).decode()


def decrypt_value(value: str) -> str:
    if not value:
        return ""
    return get_fernet().decrypt(value.encode()).decode()
