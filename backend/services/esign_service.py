"""
eSign Service — PDF overlay/merging for signed documents
"""
import os
import io
import base64
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ESIGN_DIR = os.path.join(BASE_DIR, "static", "esign")


def _get_signed_path(request_id: str) -> str:
    signed_dir = os.path.join(ESIGN_DIR, "signed")
    os.makedirs(signed_dir, exist_ok=True)
    return os.path.join(signed_dir, f"{request_id}.pdf")


def _get_template_path(template_id: str) -> str:
    return os.path.join(ESIGN_DIR, "templates", template_id, "original.pdf")


async def create_signed_pdf(
    request_id: str,
    template_id: str,
    field_values: Dict[str, Any],
    signature_data: Optional[str],  # base64 PNG
    typed_signature: Optional[str],
    fields: list,
    signer_name: str,
    signed_at: str,
) -> Optional[str]:
    """
    Overlay field values and signature onto the original PDF.
    Returns the URL path to the signed PDF.
    """
    try:
        from PyPDF2 import PdfReader, PdfWriter
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from PIL import Image as PILImage

        original_path = _get_template_path(template_id)
        if not os.path.exists(original_path):
            return None

        reader = PdfReader(original_path)
        writer = PdfWriter()

        # Group fields by page
        fields_by_page: Dict[int, list] = {}
        for field in fields:
            page_num = field.get("page", 1)
            fields_by_page.setdefault(page_num, []).append(field)

        for page_idx in range(len(reader.pages)):
            page_num = page_idx + 1
            orig_page = reader.pages[page_idx]
            media_box = orig_page.mediabox
            page_w = float(media_box.width)
            page_h = float(media_box.height)

            page_fields = fields_by_page.get(page_num, [])

            if not page_fields:
                writer.add_page(orig_page)
                continue

            # Create overlay
            overlay_buf = io.BytesIO()
            c = rl_canvas.Canvas(overlay_buf, pagesize=(page_w, page_h))

            for field in page_fields:
                fid = field.get("id")
                ftype = field.get("type")
                # Convert % positions to absolute pixels
                x = (field.get("x", 0) / 100) * page_w
                y_pct = field.get("y", 0) / 100
                fw = (field.get("width", 10) / 100) * page_w
                fh = (field.get("height", 5) / 100) * page_h
                # PDF y is from bottom; convert from top-origin %
                y = page_h - (y_pct * page_h) - fh

                value = field_values.get(fid, "")

                if ftype == "signature" and signature_data:
                    # Draw signature image
                    try:
                        sig_bytes = base64.b64decode(
                            signature_data.split(",")[-1]
                        )
                        sig_buf = io.BytesIO(sig_bytes)
                        c.drawImage(
                            sig_buf, x, y, width=fw, height=fh,
                            preserveAspectRatio=True, mask="auto"
                        )
                    except Exception:
                        c.setFont("Helvetica-Oblique", 12)
                        c.setFillColor(colors.HexColor("#1a3a6b"))
                        c.drawString(x + 2, y + fh / 2 - 6, typed_signature or signer_name)

                elif ftype == "initials":
                    initials = "".join(p[0].upper() for p in (signer_name or "").split() if p)
                    c.setFont("Helvetica-BoldOblique", 14)
                    c.setFillColor(colors.HexColor("#1a3a6b"))
                    c.drawString(x + 2, y + fh / 2 - 7, initials)

                elif ftype == "date":
                    date_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
                    c.setFont("Helvetica", 10)
                    c.setFillColor(colors.black)
                    c.drawString(x + 2, y + fh / 2 - 5, date_str)

                elif ftype == "text" and value:
                    c.setFont("Helvetica", 10)
                    c.setFillColor(colors.black)
                    c.drawString(x + 2, y + fh / 2 - 5, str(value))

                elif ftype == "fullname":
                    c.setFont("Helvetica", 10)
                    c.setFillColor(colors.black)
                    c.drawString(x + 2, y + fh / 2 - 5, signer_name)

                elif ftype == "email":
                    c.setFont("Helvetica", 10)
                    c.setFillColor(colors.black)
                    c.drawString(x + 2, y + fh / 2 - 5, str(value))

                elif ftype == "checkbox" and value:
                    c.setFont("Helvetica-Bold", 12)
                    c.setFillColor(colors.HexColor("#1a3a6b"))
                    c.drawString(x + fw / 2 - 4, y + fh / 2 - 6, "✓")

            c.save()
            overlay_buf.seek(0)

            # Merge overlay with original page
            overlay_reader = PdfReader(overlay_buf)
            if overlay_reader.pages:
                overlay_page = overlay_reader.pages[0]
                orig_page.merge_page(overlay_page)

            writer.add_page(orig_page)

        signed_path = _get_signed_path(request_id)

        # ── Add HHR signing stamp + doc code overlay via PyMuPDF ───────────
        import hashlib, hmac as _hmac, fitz as _fitz

        HHR_SECRET = b"HiddenHavenRealty2026$SecureKey$"

        # Unique doc code for this signed instance
        sig_payload = f"{request_id}:{signed_at}".encode()
        sig_hash = _hmac.new(HHR_SECRET, sig_payload, hashlib.sha256).hexdigest()[:10].upper()
        signed_doc_code = f"HHR-SIGNED-{sig_hash}"

        tmp_path = signed_path + ".tmp"
        with open(tmp_path, "wb") as f:
            writer.write(f)

        # Add signing metadata stamp to the first page
        try:
            stamp_doc = _fitz.open(tmp_path)
            pg = stamp_doc[0]
            # Green "ELECTRONICALLY SIGNED" watermark stamp
            pg.insert_text(
                (30, 40),
                f"✓ ELECTRONICALLY SIGNED — {signed_at[:10]}",
                fontsize=9,
                color=(0.05, 0.5, 0.15),
                fontname="helv",
            )
            pg.insert_text(
                (30, 52),
                f"Doc Code: {signed_doc_code}  |  Signed by: {signer_name}",
                fontsize=7,
                color=(0.2, 0.2, 0.2),
                fontname="helv",
            )
            stamp_doc.save(tmp_path + "2", garbage=4)
            stamp_doc.close()
            os.replace(tmp_path + "2", tmp_path)
        except Exception as stamp_err:
            print(f"[eSign] Stamp skipped: {stamp_err}")

        # ── AES-256 encrypt ─────────────────────────────────────────────────
        # Owner pw = HMAC of request_id (only HHR can unprotect/edit)
        # User pw  = empty (anyone can open & print; editing blocked)
        owner_pw = _hmac.new(HHR_SECRET, request_id.encode(), hashlib.sha256).hexdigest()[:24]

        try:
            enc_doc = _fitz.open(tmp_path)
            enc_doc.save(
                signed_path,
                encryption=_fitz.PDF_ENCRYPT_AES_256,
                owner_pw=owner_pw,
                user_pw="",
                permissions=(
                    _fitz.PDF_PERM_PRINT |
                    _fitz.PDF_PERM_PRINT_HQ |
                    _fitz.PDF_PERM_ACCESSIBILITY
                ),
                garbage=4,
                deflate=True,
            )
            enc_doc.close()
            os.remove(tmp_path)
            print(f"[eSign] AES-256 encrypted: {request_id} — {signed_doc_code}")
        except Exception as enc_err:
            print(f"[eSign] Encryption skipped ({enc_err})")
            import shutil
            shutil.move(tmp_path, signed_path)

        return f"/api/static/esign/signed/{request_id}.pdf"

    except Exception as e:
        print(f"PDF signing error: {e}")
        return None
