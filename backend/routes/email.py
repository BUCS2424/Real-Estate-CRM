from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from database import db
from utils.auth import get_current_user
from models.user import UserRole
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()

class SMTPSettings(BaseModel):
    host: str
    port: int = 587
    username: str
    password: str
    encryption: str = "tls"  # tls, ssl, none
    from_name: str
    from_email: str
    reply_to: Optional[str] = None

class SendEmailRequest(BaseModel):
    to_email: str
    to_name: Optional[str] = None
    subject: str
    body_html: str
    body_text: Optional[str] = None

# ============ SMTP SETTINGS ENDPOINTS ============

@router.get("/smtp-settings")
async def get_smtp_settings(current_user: dict = Depends(get_current_user)):
    """Get SMTP settings (admins only)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings:
        return {
            "host": "",
            "port": 587,
            "username": "",
            "password": "",
            "encryption": "tls",
            "from_name": "Hidden Haven Realty",
            "from_email": "",
            "reply_to": "",
            "configured": False
        }
    
    # Mask password for security
    masked_password = ""
    if settings.get("password"):
        masked_password = "••••••••"
    
    return {
        "host": settings.get("host", ""),
        "port": settings.get("port", 587),
        "username": settings.get("username", ""),
        "password": masked_password,
        "encryption": settings.get("encryption", "tls"),
        "from_name": settings.get("from_name", "Hidden Haven Realty"),
        "from_email": settings.get("from_email", ""),
        "reply_to": settings.get("reply_to", ""),
        "configured": bool(settings.get("host") and settings.get("username"))
    }

@router.post("/smtp-settings")
async def save_smtp_settings(settings_data: dict, current_user: dict = Depends(get_current_user)):
    """Save SMTP settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get existing settings to preserve password if not changed
    existing = await db.smtp_settings.find_one({}, {"_id": 0})
    
    update_data = {
        "host": settings_data.get("host", ""),
        "port": int(settings_data.get("port", 587)),
        "username": settings_data.get("username", ""),
        "encryption": settings_data.get("encryption", "tls"),
        "from_name": settings_data.get("from_name", "Hidden Haven Realty"),
        "from_email": settings_data.get("from_email", ""),
        "reply_to": settings_data.get("reply_to", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    
    # Only update password if it's not the masked placeholder
    password = settings_data.get("password", "")
    if password and password != "••••••••":
        update_data["password"] = password
    elif existing and existing.get("password"):
        update_data["password"] = existing["password"]
    
    await db.smtp_settings.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "SMTP settings saved"}

@router.post("/smtp-settings/test")
async def test_smtp_connection(test_email: dict, current_user: dict = Depends(get_current_user)):
    """Test SMTP connection by sending a test email"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    to_email = test_email.get("email")
    if not to_email:
        raise HTTPException(status_code=400, detail="Test email address required")
    
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("host"):
        raise HTTPException(status_code=400, detail="SMTP not configured")
    
    try:
        # Create test message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Test Email from Hidden Haven Realty CRM"
        msg["From"] = f"{settings.get('from_name', 'CRM')} <{settings.get('from_email', settings['username'])}>"
        msg["To"] = to_email
        
        text_content = "This is a test email to verify your SMTP settings are working correctly."
        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #b8860b;">SMTP Test Successful!</h2>
            <p>This is a test email to verify your SMTP settings are working correctly.</p>
            <p>If you received this email, your email configuration is properly set up.</p>
            <hr style="border: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">Sent from Hidden Haven Realty CRM</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))
        
        # Determine SSL/TLS settings
        use_tls = settings.get("encryption") == "tls"
        start_tls = settings.get("encryption") == "tls"
        
        # Send email
        await aiosmtplib.send(
            msg,
            hostname=settings["host"],
            port=settings.get("port", 587),
            username=settings["username"],
            password=settings["password"],
            start_tls=start_tls,
            use_tls=(settings.get("encryption") == "ssl")
        )
        
        return {"success": True, "message": f"Test email sent to {to_email}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send: {str(e)}")

# ============ SEND EMAIL ENDPOINT ============

@router.post("/send")
async def send_email(request: SendEmailRequest, current_user: dict = Depends(get_current_user)):
    """Send an email using configured SMTP settings"""
    
    # Get SMTP settings
    settings = await db.smtp_settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("host"):
        raise HTTPException(status_code=400, detail="SMTP not configured. Please configure email settings first.")
    
    # Get user's signature
    user_id = current_user.get("id", str(current_user.get("_id", "")))
    signature = await db.user_signatures.find_one({"user_id": user_id}, {"_id": 0})
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = request.subject
        msg["From"] = f"{settings.get('from_name', 'Hidden Haven Realty')} <{settings.get('from_email', settings['username'])}>"
        msg["To"] = request.to_email
        
        if settings.get("reply_to"):
            msg["Reply-To"] = settings["reply_to"]
        
        # Build email body with signature
        html_body = request.body_html
        
        # Append signature if available
        if signature:
            signature_html = build_signature_html(signature)
            html_body += signature_html
        
        # Create plain text version
        text_body = request.body_text or strip_html(request.body_html)
        if signature:
            text_body += build_signature_text(signature)
        
        msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        
        # Send email
        await aiosmtplib.send(
            msg,
            hostname=settings["host"],
            port=settings.get("port", 587),
            username=settings["username"],
            password=settings["password"],
            start_tls=(settings.get("encryption") == "tls"),
            use_tls=(settings.get("encryption") == "ssl")
        )
        
        # Log sent email
        await db.sent_emails.insert_one({
            "to_email": request.to_email,
            "to_name": request.to_name,
            "subject": request.subject,
            "sent_by": user_id,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"success": True, "message": f"Email sent to {request.to_email}"}
    except aiosmtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=400, detail="SMTP authentication failed. Check your credentials.")
    except aiosmtplib.SMTPConnectError:
        raise HTTPException(status_code=400, detail="Could not connect to SMTP server. Check host and port.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send email: {str(e)}")

def build_signature_html(signature: dict) -> str:
    """Build HTML signature from user signature data"""
    if signature.get("customHtml"):
        return f"<br><br>{signature['customHtml']}"
    
    parts = ['<br><br><div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px;">']
    
    if signature.get("name"):
        parts.append(f'<p style="margin: 0; font-weight: bold; color: #b8860b;">{signature["name"]}</p>')
    if signature.get("title"):
        parts.append(f'<p style="margin: 2px 0; color: #666;">{signature["title"]}</p>')
    if signature.get("company"):
        parts.append(f'<p style="margin: 8px 0 0 0; font-weight: bold;">{signature["company"]}</p>')
    if signature.get("phone"):
        parts.append(f'<p style="margin: 4px 0 0 0;">📞 {signature["phone"]}</p>')
    if signature.get("email"):
        parts.append(f'<p style="margin: 4px 0 0 0;">✉️ {signature["email"]}</p>')
    if signature.get("website"):
        parts.append(f'<p style="margin: 4px 0 0 0;">🌐 <a href="{signature["website"]}" style="color: #b8860b;">{signature["website"]}</a></p>')
    
    parts.append('</div>')
    return ''.join(parts)

def build_signature_text(signature: dict) -> str:
    """Build plain text signature"""
    parts = ['\n\n--\n']
    
    if signature.get("name"):
        parts.append(f'{signature["name"]}\n')
    if signature.get("title"):
        parts.append(f'{signature["title"]}\n')
    if signature.get("company"):
        parts.append(f'{signature["company"]}\n')
    if signature.get("phone"):
        parts.append(f'Phone: {signature["phone"]}\n')
    if signature.get("email"):
        parts.append(f'Email: {signature["email"]}\n')
    if signature.get("website"):
        parts.append(f'{signature["website"]}\n')
    
    return ''.join(parts)

def strip_html(html: str) -> str:
    """Simple HTML to plain text conversion"""
    import re
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html)
    # Replace HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    return text.strip()
