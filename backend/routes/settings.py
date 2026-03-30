from fastapi import APIRouter, Depends, HTTPException, Query, Response
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, List
from database import db
from models.settings import SettingsUpdate, SettingsResponse, GeneralSettingsModel
from models.user import UserRole
from utils.auth import get_current_user
from security.guards import scrub_text, has_suspicious_injection_pattern

router = APIRouter()

AGENT_RULES_PATH = Path("/app/AGENT_RULES.md")


def _sanitize_for_json(value: Any):
    if isinstance(value, dict):
        return {k: _sanitize_for_json(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_json(v) for v in value]
    if type(value).__name__ == "ObjectId":
        return str(value)
    return value


def _extract_rules_from_markdown(markdown_text: str) -> List[str]:
    rules: List[str] = []
    for raw_line in (markdown_text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        if line.startswith("```"):
            continue

        # numbered rules
        if ". " in line and line[0].isdigit():
            parts = line.split(". ", 1)
            if len(parts) == 2 and parts[1].strip():
                rules.append(parts[1].strip())

    return rules


def _serialize_rules_markdown(rules: List[str]) -> str:
    lines = [
        "# AGENT_RULES.md",
        "",
        "## Critical Rules for Any Agent Working in This Codebase",
        "",
    ]
    for index, rule in enumerate(rules, start=1):
        lines.append(f"{index}. {rule}")
    lines.append("")
    return "\n".join(lines)


def _clean_rules_payload(raw_rules: Any) -> List[str]:
    if not isinstance(raw_rules, list):
        raise HTTPException(status_code=400, detail="rules must be a list")

    cleaned_rules: List[str] = []
    for item in raw_rules:
        if not isinstance(item, str):
            continue
        clean = scrub_text(item)
        clean = clean.strip()
        if not clean:
            continue
        if has_suspicious_injection_pattern(clean):
            raise HTTPException(status_code=400, detail="Suspicious rule content blocked")
        cleaned_rules.append(clean)

    if not cleaned_rules:
        raise HTTPException(status_code=400, detail="At least one rule is required")

    return cleaned_rules


@router.get("/ai-rules")
async def get_ai_rules(current_user: dict = Depends(get_current_user)):
    """Get editable AI rules list for developer settings."""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    doc = await db.settings.find_one({"type": "ai_rules"}, {"_id": 0})
    if doc and isinstance(doc.get("rules"), list) and doc.get("rules"):
        return _sanitize_for_json(doc)

    source_rules: List[str] = []
    if AGENT_RULES_PATH.exists():
        source_rules = _extract_rules_from_markdown(AGENT_RULES_PATH.read_text(encoding="utf-8", errors="ignore"))

    if not source_rules:
        source_rules = ["Only make requested changes."]

    now = datetime.now(timezone.utc).isoformat()
    bootstrap_doc = {
        "type": "ai_rules",
        "rules": source_rules,
        "source_file": str(AGENT_RULES_PATH),
        "updated_at": now,
        "updated_by": str(current_user.get("id", ""))
    }

    await db.settings.update_one(
        {"type": "ai_rules"},
        {"$set": bootstrap_doc},
        upsert=True
    )
    return bootstrap_doc


@router.put("/ai-rules")
async def update_ai_rules(payload: dict, current_user: dict = Depends(get_current_user)):
    """Save editable AI rules and sync AGENT_RULES.md"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")

    rules = _clean_rules_payload(payload.get("rules"))
    now = datetime.now(timezone.utc).isoformat()

    update_doc = {
        "type": "ai_rules",
        "rules": rules,
        "source_file": str(AGENT_RULES_PATH),
        "updated_at": now,
        "updated_by": str(current_user.get("id", ""))
    }

    await db.settings.update_one(
        {"type": "ai_rules"},
        {"$set": update_doc},
        upsert=True
    )

    AGENT_RULES_PATH.write_text(_serialize_rules_markdown(rules), encoding="utf-8")
    return _sanitize_for_json({"message": "AI rules saved", **update_doc})


@router.get("/ai-rules/file")
async def get_ai_rules_file():
    """Public read-only AGENT_RULES.md text endpoint for quick developer reference."""
    if not AGENT_RULES_PATH.exists():
        return Response(content="# AGENT_RULES.md\n\nNo rules file found.\n", media_type="text/markdown")
    return Response(content=AGENT_RULES_PATH.read_text(encoding="utf-8", errors="ignore"), media_type="text/markdown")

@router.get("", response_model=SettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return SettingsResponse(**settings)

@router.put("", response_model=SettingsResponse)
async def update_settings(settings: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": settings.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    updated = await db.settings.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return SettingsResponse(**updated)

@router.get("/general")
async def get_general_settings(current_user: dict = Depends(get_current_user)):
    """Get general application settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.general_settings.find_one({}, {"_id": 0})
    if not settings:
        return GeneralSettingsModel().model_dump()
    return settings

@router.get("/branding")
async def get_public_branding():
    """Get public branding settings (no auth required)"""
    settings = await db.general_settings.find_one({}, {"_id": 0})
    
    print(f"[DEBUG] Branding settings from DB: {settings}")
    
    # Return only branding-related fields for public access
    default_branding = {
        "siteName": "Hidden Haven Realty",
        "logoUrl": "",
        "logoLinkUrl": "/",
        "dashboardLogoUrl": "",
        "dashboardLogoLinkUrl": "/dashboard",
        "faviconUrl": "",
        "pwaIconUrl": "",
    }
    
    if not settings:
        print("[DEBUG] No settings found, returning defaults")
        return default_branding
    
    result = {
        "siteName": settings.get("siteName", default_branding["siteName"]),
        "logoUrl": settings.get("logoUrl", default_branding["logoUrl"]),
        "logoLinkUrl": settings.get("logoLinkUrl", default_branding["logoLinkUrl"]),
        "dashboardLogoUrl": settings.get("dashboardLogoUrl", default_branding["dashboardLogoUrl"]),
        "dashboardLogoLinkUrl": settings.get("dashboardLogoLinkUrl", default_branding["dashboardLogoLinkUrl"]),
        "faviconUrl": settings.get("faviconUrl", default_branding["faviconUrl"]),
        "pwaIconUrl": settings.get("pwaIconUrl", default_branding["pwaIconUrl"]),
    }
    print(f"[DEBUG] Returning branding: {result}")
    return result

@router.put("/general")
async def update_general_settings(settings_data: dict, current_user: dict = Depends(get_current_user)):
    """Update general application settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_data["updated_by"] = current_user["id"]
    
    await db.general_settings.update_one(
        {},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"message": "Settings saved successfully", "data": settings_data}

# ============ TELNYX SETTINGS ============

@router.get("/telnyx")
async def get_telnyx_settings(current_user: dict = Depends(get_current_user)):
    """Get Telnyx SMS settings"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    if not settings:
        return {"apiKey": "", "phoneNumber": ""}
    
    # Mask API key for security
    masked_key = ""
    if settings.get("apiKey"):
        key = settings["apiKey"]
        masked_key = key[:8] + "..." + key[-4:] if len(key) > 12 else "***"
    
    return {
        "apiKey": masked_key,
        "phoneNumber": settings.get("phoneNumber", "")
    }

@router.post("/telnyx")
async def save_telnyx_settings(settings_data: dict, current_user: dict = Depends(get_current_user)):
    """Save Telnyx SMS settings"""
    import os
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Only save if new key provided (not masked)
    update_data = {
        "phoneNumber": settings_data.get("phoneNumber", ""),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["id"]
    }
    
    # Check if apiKey is a real key (not masked)
    api_key = settings_data.get("apiKey", "")
    if api_key and "..." not in api_key and api_key != "***":
        update_data["apiKey"] = api_key
        # Also update environment variable for current session
        os.environ["TELNYX_API_KEY"] = api_key
    
    if update_data.get("phoneNumber"):
        os.environ["TELNYX_PHONE_NUMBER"] = update_data["phoneNumber"]
    
    await db.telnyx_settings.update_one(
        {},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Telnyx settings saved"}

@router.post("/telnyx/test")
async def test_telnyx_connection(current_user: dict = Depends(get_current_user)):
    """Test Telnyx connection"""
    import os
    import telnyx
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get settings from DB
    settings = await db.telnyx_settings.find_one({}, {"_id": 0})
    api_key = settings.get("apiKey") if settings else os.environ.get("TELNYX_API_KEY")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key configured")
    
    try:
        telnyx.api_key = api_key
        # Try to list phone numbers to verify connection
        telnyx.PhoneNumber.list(page_size=1)
        return {"success": True, "message": "Connection successful!"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

@router.post("/smtp/test-send")
async def test_smtp_send(
    test_email: str = Query(..., description="Email address to send test to"),
    current_user: dict = Depends(get_current_user)
):
    """Send a test email to verify SMTP configuration"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.utils import formataddr, formatdate
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get SMTP settings
    smtp_settings = await db.settings.find_one({"type": "smtp"}, {"_id": 0})
    
    if not smtp_settings or not smtp_settings.get('host'):
        raise HTTPException(status_code=400, detail="SMTP not configured. Go to Settings > SMTP to configure.")
    
    try:
        # Connect to SMTP server
        if smtp_settings.get('use_ssl'):
            server = smtplib.SMTP_SSL(smtp_settings['host'], smtp_settings.get('port', 465), timeout=30)
        else:
            server = smtplib.SMTP(smtp_settings['host'], smtp_settings.get('port', 587), timeout=30)
            if smtp_settings.get('use_tls', True):
                server.starttls()
        
        # Login
        server.login(smtp_settings['username'], smtp_settings['password'])
        
        # Create test email
        from_email = smtp_settings.get('from_email', smtp_settings['username'])
        from_name = smtp_settings.get('from_name', 'Hidden Haven Realty')
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Test Email from Hidden Haven Realty CRM'
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = test_email
        msg['Date'] = formatdate(localtime=True)
        
        html_content = f"""
        <html>
        <body style="font-family: Georgia, serif; color: #1a2744; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1a2744; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #d4a646; margin: 0;">Hidden Haven Realty</h1>
            </div>
            <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5;">
                <h2 style="color: #1a2744;">SMTP Test Successful!</h2>
                <p>If you're reading this, your SMTP configuration is working correctly.</p>
                <p><strong>From:</strong> {from_email}</p>
                <p><strong>To:</strong> {test_email}</p>
                <p><strong>Server:</strong> {smtp_settings['host']}:{smtp_settings.get('port', 587)}</p>
                <p><strong>Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            <div style="background: #1a2744; padding: 10px; text-align: center; border-radius: 0 0 8px 8px;">
                <p style="color: #888; font-size: 12px; margin: 0;">Hidden Haven Realty CRM</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send
        server.send_message(msg)
        server.quit()
        
        return {
            "success": True,
            "message": f"Test email sent successfully to {test_email}",
            "from_email": from_email,
            "smtp_host": smtp_settings['host']
        }
        
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(status_code=400, detail=f"SMTP Authentication failed: {str(e)}")
    except smtplib.SMTPConnectError as e:
        raise HTTPException(status_code=400, detail=f"Could not connect to SMTP server: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP test failed: {str(e)}")



# ============ MORTGAGE RATES SETTINGS ============

@router.get("/mortgage-rates")
async def get_mortgage_rates():
    """Get mortgage rate settings (public - used by calculator)"""
    settings = await db.mortgage_rates.find_one({}, {"_id": 0})
    
    # Return defaults if no settings exist
    if not settings:
        return {
            "conventional_30yr": 6.875,
            "conventional_20yr": 6.625,
            "conventional_15yr": 6.125,
            "conventional_10yr": 5.875,
            "fha_30yr": 6.500,
            "fha_15yr": 5.875,
            "va_30yr": 6.250,
            "va_15yr": 5.750,
            "usda_30yr": 6.375,
            "property_tax_rate": 1.1,
            "insurance_rate": 0.35,
            "pmi_rate_under_10": 1.0,
            "pmi_rate_10_to_20": 0.5,
            "fha_mip_upfront": 1.75,
            "fha_mip_annual": 0.85,
            "va_funding_fee": 2.15,
            "usda_guarantee_fee": 1.0,
            "usda_annual_fee": 0.35
        }
    
    return settings

@router.post("/mortgage-rates")
async def save_mortgage_rates(rates: dict, current_user: dict = Depends(get_current_user)):
    """Save mortgage rate settings (admin only)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Add metadata
    rates["last_updated"] = datetime.now(timezone.utc).isoformat()
    rates["updated_by"] = current_user.get("email") or current_user.get("sub")
    rates["auto_updated"] = False  # Mark as manually updated
    
    await db.mortgage_rates.update_one(
        {},
        {"$set": rates},
        upsert=True
    )
    
    return {"message": "Mortgage rates saved successfully"}


@router.post("/mortgage-rates/fetch-fred")
async def fetch_mortgage_rates_from_fred(current_user: dict = Depends(get_current_user)):
    """Manually trigger a fetch of mortgage rates from FRED API (admin only)"""
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    from services.mortgage_rates_service import update_mortgage_rates_from_fred
    
    result = await update_mortgage_rates_from_fred(db)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=400, 
            detail=result.get("message", "Failed to fetch rates from FRED")
        )
    
    return result


@router.get("/mortgage-rates/status")
async def get_mortgage_rates_status(current_user: dict = Depends(get_current_user)):
    """Get the status of mortgage rate automation (admin only)"""
    import os
    
    if current_user["role"] not in [UserRole.SUPERUSER, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if FRED API key is configured
    fred_key = os.environ.get("FRED_API_KEY")
    fred_configured = bool(fred_key)
    
    # Get current rates info
    rates = await db.mortgage_rates.find_one({}, {"_id": 0})
    
    # Get scheduler info from app state if available
    next_update = None
    try:
        from server import scheduler
        from services.mortgage_rates_service import get_next_update_time
        next_update = get_next_update_time(scheduler)
    except Exception:
        pass
    
    return {
        "fred_api_configured": fred_configured,
        "fred_api_key_masked": f"{fred_key[:8]}...{fred_key[-4:]}" if fred_key and len(fred_key) > 12 else None,
        "auto_update_enabled": True,  # Scheduler runs if FRED key exists
        "update_interval": "Every 2 weeks",
        "last_updated": rates.get("last_updated") if rates else None,
        "last_updated_by": rates.get("updated_by") if rates else None,
        "data_source": rates.get("data_source") if rates else None,
        "was_auto_updated": rates.get("auto_updated", False) if rates else False,
        "next_scheduled_update": next_update
    }
