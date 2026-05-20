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
        with open(signed_path, "wb") as f:
            writer.write(f)

        return f"/api/static/esign/signed/{request_id}.pdf"

    except Exception as e:
        print(f"PDF signing error: {e}")
        return None
