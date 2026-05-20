"""
eSign Service — PDF generation for signed documents
Produces a pixel-perfect output matching the original form layout.
Uses PyMuPDF (fitz) to insert text and images directly on the template pages.
"""
import os
import io
import base64
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ESIGN_DIR = os.path.join(BASE_DIR, "static", "esign")
HHR_SECRET = b"HiddenHavenRealty2026$SecureKey$"

# ── Page dimensions (standard US Letter) ────────────────────────────────────
PAGE_W = 612.0
PAGE_H = 792.0


def _get_signed_path(request_id: str) -> str:
    d = os.path.join(ESIGN_DIR, "signed")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, f"{request_id}.pdf")


def _get_template_path(template_id: str) -> str:
    return os.path.join(ESIGN_DIR, "templates", template_id, "original.pdf")


def _img_y_to_pdf(img_y: float) -> float:
    """Convert image-space y (from top) to PDF y (from bottom)."""
    return PAGE_H - img_y


def _pct_to_pt(x_pct: float, y_pct: float, w_pct: float, h_pct: float):
    """Convert percentage field coords to PDF absolute points."""
    x = x_pct / 100 * PAGE_W
    y_top = y_pct / 100 * PAGE_H          # from top
    w = w_pct / 100 * PAGE_W
    h = h_pct / 100 * PAGE_H
    y_pdf = PAGE_H - y_top - h            # PDF y from bottom (bottom of field box)
    return x, y_pdf, w, h


async def create_signed_pdf(
    request_id: str,
    template_id: str,
    field_values: Dict[str, Any],
    signature_data: Optional[str],    # base64 PNG from canvas draw
    typed_signature: Optional[str],   # typed name
    fields: List[dict],
    signer_name: str,
    signed_at: str,
) -> Optional[str]:
    """
    Generate a signed PDF that looks exactly like the original filled form.

    Strategy:
    1. Open the blank template (Jesse Silva data already removed).
    2. For every template field: insert text / image / checkmark at the
       precise absolute position calculated from the stored % coordinates.
    3. Stamp an "electronically signed" banner + unique doc code.
    4. AES-256 encrypt to prevent editing.
    5. Save and return the static URL path.
    """
    try:
        import fitz

        template_path = _get_template_path(template_id)
        if not os.path.exists(template_path):
            print(f"[eSign] Template PDF not found: {template_path}")
            return None

        doc = fitz.open(template_path)

        # ── Resolve signature image ──────────────────────────────────────────
        sig_img_bytes: Optional[bytes] = None
        if signature_data:
            raw = signature_data.split(",")[-1]
            try:
                sig_img_bytes = base64.b64decode(raw)
            except Exception:
                pass

        typed_sig_text = typed_signature or signer_name or ""

        # ── Process every template field ────────────────────────────────────
        for field in fields:
            page_idx = field.get("page", 1) - 1
            if page_idx < 0 or page_idx >= len(doc):
                continue

            page = doc[page_idx]
            ftype = field.get("type", "text")
            fid   = field.get("id", "")
            fx, fy, fw, fh = _pct_to_pt(
                field.get("x", 0), field.get("y", 0),
                field.get("width", 10), field.get("height", 4),
            )

            # Resolved value
            value = field_values.get(fid)
            if field.get("prefill_from") == "today" and not value:
                value = datetime.now(timezone.utc).strftime("%B %d, %Y")
            if field.get("prefill_from") == "signer_name" and not value:
                value = signer_name
            if field.get("prefill_from") == "signer_email" and not value:
                value = field_values.get("signer_email", "")

            # ── Text fields ─────────────────────────────────────────────────
            if ftype in ("text", "fullname", "email", "date"):
                text_val = str(value).strip() if value else ""
                if not text_val:
                    continue
                # Baseline = middle of field box
                baseline_y = fy + fh / 2 + 3.5  # slight upward offset looks natural
                page.insert_text(
                    (fx + 2, baseline_y),
                    text_val,
                    fontname="helv",
                    fontsize=9.5,
                    color=(0, 0, 0),
                )

            # ── Checkbox ────────────────────────────────────────────────────
            elif ftype == "checkbox":
                if value:
                    cx = fx + fw / 2
                    cy = fy + fh / 2 + 4
                    page.insert_text(
                        (cx - 4, cy),
                        "✓",
                        fontname="helv",
                        fontsize=10,
                        color=(0.05, 0.28, 0.45),
                    )

            # ── Initials ────────────────────────────────────────────────────
            elif ftype == "initials":
                initials = "".join(p[0].upper() for p in signer_name.split() if p)[:3]
                if sig_img_bytes:
                    # Use a small crop of the signature image
                    rect = fitz.Rect(fx, fy, fx + fw, fy + fh)
                    page.insert_image(rect, stream=sig_img_bytes, keep_proportion=True)
                elif typed_sig_text:
                    page.insert_text(
                        (fx + 2, fy + fh / 2 + 4),
                        initials,
                        fontname="helv",
                        fontsize=10,
                        color=(0.05, 0.28, 0.45),
                    )

            # ── Signature ───────────────────────────────────────────────────
            elif ftype == "signature":
                if sig_img_bytes:
                    rect = fitz.Rect(fx, fy, fx + fw, fy + fh)
                    page.insert_image(rect, stream=sig_img_bytes, keep_proportion=True)
                elif typed_sig_text:
                    # Render typed name in a script-like font appearance
                    page.insert_text(
                        (fx + 4, fy + fh / 2 + 6),
                        typed_sig_text,
                        fontname="tibo",    # Times Bold Italic — closest to script
                        fontsize=14,
                        color=(0.05, 0.28, 0.45),
                    )

        # ── Page 1 stamp: "ELECTRONICALLY SIGNED" banner ───────────────────
        sig_payload  = f"{request_id}:{signed_at}".encode()
        sig_hash     = hmac.new(HHR_SECRET, sig_payload, hashlib.sha256).hexdigest()[:10].upper()
        signed_code  = f"HHR-SIGNED-{sig_hash}"
        signed_date  = datetime.now(timezone.utc).strftime("%B %d, %Y %I:%M %p UTC")

        p1 = doc[0]
        # Small tasteful banner — bottom-left, above our footer strip
        p1.insert_text(
            (12, 25),
            f"✓ Electronically Signed  {signed_date}   {signed_code}",
            fontname="helv",
            fontsize=7,
            color=(0.05, 0.5, 0.15),
        )

        # ── Encrypt with AES-256 ────────────────────────────────────────────
        owner_pw = hmac.new(HHR_SECRET, request_id.encode(), hashlib.sha256).hexdigest()[:24]
        signed_path = _get_signed_path(request_id)

        doc.save(
            signed_path,
            encryption=fitz.PDF_ENCRYPT_AES_256,
            owner_pw=owner_pw,
            user_pw="",
            permissions=(fitz.PDF_PERM_PRINT | fitz.PDF_PERM_PRINT_HQ | fitz.PDF_PERM_ACCESSIBILITY),
            garbage=4,
            deflate=True,
        )
        doc.close()

        print(f"[eSign] Signed PDF generated: {request_id} — {signed_code}")
        return f"/api/static/esign/signed/{request_id}.pdf"

    except Exception as e:
        print(f"[eSign] PDF generation error: {e}")
        import traceback
        traceback.print_exc()
        return None
