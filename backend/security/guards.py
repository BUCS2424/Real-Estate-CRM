import ipaddress
import re
from typing import Any, Dict, Iterable
from urllib.parse import urlparse


SUSPICIOUS_TEXT_PATTERNS = [
    r"<script",
    r"javascript:",
    r"onerror=",
    r"onload=",
    r"\$where",
    r"\$function",
    r"\{\{",
    r"\}\}",
]


def has_suspicious_injection_pattern(value: str) -> bool:
    text = (value or "").lower()
    return any(re.search(pattern, text) for pattern in SUSPICIOUS_TEXT_PATTERNS)


def scrub_text(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    text = value.replace("\x00", "").strip()
    text = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"javascript:\s*", "", text, flags=re.IGNORECASE)
    return text


def filter_mass_assignment(payload: Dict[str, Any], allowed_fields: Iterable[str]) -> Dict[str, Any]:
    allowed = set(allowed_fields)
    return {k: v for k, v in (payload or {}).items() if k in allowed}


def is_public_safe_url(url: str) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    host = (parsed.hostname or "").lower()
    if not host:
        return False
    if host in {"localhost", "127.0.0.1", "::1"}:
        return False

    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            return False
    except ValueError:
        # Hostname, not raw IP: still block obvious local networks
        if host.endswith(".local"):
            return False

    return True
