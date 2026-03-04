# ── A2G Phone & SMS Module — Backend Routes ─────────────────────────────────
# FastAPI + Motor (MongoDB) + Telnyx WebRTC + aiohttp

# ─── Models ───────────────────────────────────────────────────────────────
class MessageSend(BaseModel):
    to: str
    text: str

class CallLogCreate(BaseModel):
    remote_number: str
    direction: str  # inbound, outbound
    duration: int = 0
    status: str = "completed"
    recording_url: Optional[str] = None

class CallLogResponse(BaseModel):
    id: str
    remote_number: str
    direction: str
    duration: int
    status: str
    created_at: str
    contact_name: Optional[str] = None
    notes: Optional[str] = None
    transcript: Optional[str] = None
    recording_url: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    from_number: str
    to_number: str
    text: str
    direction: str
    status: str
    created_at: str

class SmsProviderTelnyx(BaseModel):
    enabled: bool = True
    api_key: str = ""
    phone_number: str = ""
    messaging_profile_id: str = ""

class SmsProviderTwilio(BaseModel):
    enabled: bool = False
    account_sid: str = ""
    auth_token: str = ""
    phone_number: str = ""

class SmsProviderVonage(BaseModel):
    enabled: bool = False
    api_key: str = ""
    api_secret: str = ""
    phone_number: str = ""

class SmsProviderTextbelt(BaseModel):
    enabled: bool = False
    api_key: str = ""
    api_url: str = "https://textbelt.com/text"  # Can be self-hosted

class SmsProviderTextbeltOS(BaseModel):
    """Textbelt Open Source - uses carrier email-to-SMS gateways (free)"""
    enabled: bool = False
    server_url: str = "http://localhost:9090/text"  # Self-hosted server URL
    # SMTP settings for the self-hosted server
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_secure: bool = True  # Use TLS

class SmsProviderTextbeltSelf(BaseModel):
    """Self-hosted Textbelt server from GitHub"""
    enabled: bool = False
    server_url: str = ""  # e.g., https://your-server.com/text
    api_key: str = ""  # Optional API key if configured

class SmsProviderPythonGateway(BaseModel):
    """Python Email-to-SMS Gateway (uses SMTP config from textbelt settings)"""
    enabled: bool = False
    use_smtp_config: bool = True  # Uses SMTP config from Textbelt Server section

class SmsProviderSettings(BaseModel):
    active_provider: str = "python_gateway"
    telnyx: SmsProviderTelnyx = SmsProviderTelnyx()
    twilio: SmsProviderTwilio = SmsProviderTwilio()
    vonage: SmsProviderVonage = SmsProviderVonage()
    textbelt: SmsProviderTextbelt = SmsProviderTextbelt()
    textbelt_os: SmsProviderTextbeltOS = SmsProviderTextbeltOS()
    textbelt_self: SmsProviderTextbeltSelf = SmsProviderTextbeltSelf()


# ─── Telnyx Credentials (save/get SIP + API key) ──────────────────────────
# TELNYX CREDENTIALS
# ========================
def normalize_phone_number(phone: str) -> str:
    """Normalize phone number to E.164 format"""
    if not phone:
        return ""
    # Remove any non-digit characters except +
    normalized = ''.join(c for c in phone if c.isdigit() or c == '+')
    if not normalized.startswith('+') and len(normalized) >= 10:
        # Assume US number
        if len(normalized) == 10:
            normalized = '+1' + normalized
        elif len(normalized) == 11 and normalized.startswith('1'):
            normalized = '+' + normalized
    return normalized

@api_router.post("/settings/credentials")
async def save_credentials(creds: TelnyxCredentials, current_user: dict = Depends(get_current_user)):
    normalized_phone = normalize_phone_number(creds.phone_number)
    normalized_caller_id = normalize_phone_number(creds.outbound_caller_id) if creds.outbound_caller_id else normalized_phone

    # Preserve existing available_caller_ids if the request sends an empty list
    # (regular SettingsPage doesn't manage the pool — only AdminUserSettingsPage does)
    existing = await db.credentials.find_one({"user_id": current_user["id"]}, {"_id": 0})
    preserved_caller_ids = creds.available_caller_ids if creds.available_caller_ids else (
        existing.get("available_caller_ids", []) if existing else []
    )

    encrypted_creds = {
        "user_id": current_user["id"],
        "sip_username": CredentialEncryption.encrypt(creds.sip_username) if creds.sip_username else "",
        "sip_password": CredentialEncryption.encrypt(creds.sip_password) if creds.sip_password else "",
        "api_key": CredentialEncryption.encrypt(creds.api_key) if creds.api_key else "",
        "phone_number": normalized_phone,
        "messaging_profile_id": creds.messaging_profile_id,
        "voice_connection_id": creds.voice_connection_id,
        "outbound_caller_id": normalized_caller_id,
        "available_caller_ids": preserved_caller_ids,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.credentials.update_one(
        {"user_id": current_user["id"]},
        {"$set": encrypted_creds},
        upsert=True
    )
    return {"status": "success", "message": "Credentials saved"}

@api_router.get("/settings/credentials")
async def get_credentials(current_user: dict = Depends(get_current_user)):
    creds = await db.credentials.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not creds:
        return {"sip_username": "", "sip_password": "", "api_key": "", "phone_number": "",
                "messaging_profile_id": "", "voice_connection_id": "", "outbound_caller_id": "",
                "available_caller_ids": []}

    return {
        "sip_username": CredentialEncryption.decrypt(creds.get("sip_username", "")) if creds.get("sip_username") else "",
        "sip_password": CredentialEncryption.decrypt(creds.get("sip_password", "")) if creds.get("sip_password") else "",
        "api_key": CredentialEncryption.decrypt(creds.get("api_key", "")) if creds.get("api_key") else "",
        "phone_number": normalize_phone_number(creds.get("phone_number", "")),
        "messaging_profile_id": creds.get("messaging_profile_id", ""),
        "voice_connection_id": creds.get("voice_connection_id", ""),
        "outbound_caller_id": creds.get("outbound_caller_id", "") or normalize_phone_number(creds.get("phone_number", "")),
        "available_caller_ids": creds.get("available_caller_ids", [])
    }

# ========================
# SOUND SETTINGS
# ========================
class SoundSettings(BaseModel):
    incoming_ringtone: str = "happy-go-lucky"
    sms_notification: str = "sms-notification"
    disconnect_sound: str = "disconnect"

@api_router.get("/settings/sounds")
async def get_sound_settings(current_user: dict = Depends(get_current_user)):
    """Get user's sound settings"""
    settings = await db.user_settings.find_one(
        {"user_id": current_user["id"], "type": "sounds"},
        {"_id": 0}
    )
    
    if not settings:
        return {
            "incoming_ringtone": "happy-go-lucky",
            "sms_notification": "sms-notification",
            "disconnect_sound": "disconnect"
        }
    
    return {
        "incoming_ringtone": settings.get("incoming_ringtone", "happy-go-lucky"),
        "sms_notification": settings.get("sms_notification", "sms-notification"),
        "disconnect_sound": settings.get("disconnect_sound", "disconnect")
    }

@api_router.post("/settings/sounds")
async def save_sound_settings(settings: SoundSettings, current_user: dict = Depends(get_current_user)):
    """Save user's sound settings"""
    await db.user_settings.update_one(
        {"user_id": current_user["id"], "type": "sounds"},
        {"$set": {
            "user_id": current_user["id"],
            "type": "sounds",
            "incoming_ringtone": settings.incoming_ringtone,
            "sms_notification": settings.sms_notification,
            "disconnect_sound": settings.disconnect_sound,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"status": "success"}

# ========================
# CONTACTS
# ========================
@api_router.get("/contacts", response_model=List[ContactResponse])
async def list_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(5000)
    return [_contact_response(c) for c in contacts]

@api_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    c = await db.contacts.find_one({"id": contact_id, "user_id": current_user["id"]}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Contact not found")
    return _contact_response(c)

def _contact_response(c: dict) -> ContactResponse:


# ─── WebRTC Token ──────────────────────────────────────────────────────────
@api_router.get("/webrtc/token")
async def get_webrtc_token(current_user: dict = Depends(get_current_user)):
    """Get WebRTC connection info for the user"""
    creds = await db.credentials.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not creds:
        return {"sip_username": "", "sip_password": "", "configured": False}
    
    # Normalize phone number to E.164 format
    phone_number = creds.get("phone_number", "")
    if phone_number:
        # Remove any non-digit characters except +
        phone_number = ''.join(c for c in phone_number if c.isdigit() or c == '+')
        if not phone_number.startswith('+'):
            phone_number = '+' + phone_number
    
    # Get outbound caller ID, default to phone_number if not set
    outbound_caller_id = creds.get("outbound_caller_id", "") or phone_number
    
    return {
        "sip_username": CredentialEncryption.decrypt(creds.get("sip_username", "")) if creds.get("sip_username") else "",
        "sip_password": CredentialEncryption.decrypt(creds.get("sip_password", "")) if creds.get("sip_password") else "",
        "phone_number": phone_number,
        "outbound_caller_id": outbound_caller_id,
        "voice_connection_id": creds.get("voice_connection_id", ""),
        "available_caller_ids": creds.get("available_caller_ids", []),
        "configured": bool(creds.get("sip_username") and creds.get("sip_password"))
    }

# ========================
# SUPER ADMIN - IDRIVE STORAGE
# ========================
import boto3
from botocore.exceptions import ClientError, NoCredentialsError


# ─── Call Logs ─────────────────────────────────────────────────────────────
async def list_calls(current_user: dict = Depends(get_current_user)):
    import re
    calls = await db.call_logs.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Try to match with contacts using last 10 digits
    contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(500)
    
    # Build contact map with normalized numbers
    contact_map = {}
    for c in contacts:
        contact_clean = re.sub(r'\D', '', c.get("phone_number", ""))
        contact_last_10 = contact_clean[-10:] if len(contact_clean) >= 10 else contact_clean
        contact_map[contact_last_10] = c["name"]
    
    def get_contact_name(number):
        clean = re.sub(r'\D', '', number or "")
        last_10 = clean[-10:] if len(clean) >= 10 else clean
        return contact_map.get(last_10)
    
    return [CallLogResponse(
        id=c["id"],
        remote_number=c["remote_number"],
        direction=c["direction"],
        duration=c.get("duration", 0),
        status=c.get("status", "completed"),
        created_at=c.get("created_at", ""),
        contact_name=get_contact_name(c["remote_number"]),
        notes=c.get("notes"),
        transcript=c.get("transcript"),
        recording_url=c.get("recording_url")
    ) for c in calls]

@api_router.post("/calls", response_model=CallLogResponse)
async def log_call(call: CallLogCreate, current_user: dict = Depends(get_current_user)):
    # Normalize the phone number for lookup
    import re
    clean_number = re.sub(r'\D', '', call.remote_number)
    last_10 = clean_number[-10:] if len(clean_number) >= 10 else clean_number
    
    new_call = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "remote_number": call.remote_number,
        "direction": call.direction,
        "duration": call.duration,
        "status": call.status,
        "recording_url": call.recording_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.call_logs.insert_one(new_call)
    
    # Try to find contact name by matching last 10 digits
    contact = None
    user_contacts = await db.contacts.find({"user_id": current_user["id"]}).to_list(1000)
    for c in user_contacts:
        contact_clean = re.sub(r'\D', '', c.get("phone_number", ""))
        contact_last_10 = contact_clean[-10:] if len(contact_clean) >= 10 else contact_clean
        if contact_last_10 == last_10:
            contact = c
            break
    
    return CallLogResponse(
        id=new_call["id"],
        remote_number=new_call["remote_number"],
        direction=new_call["direction"],
        duration=new_call["duration"],
        status=new_call["status"],
        created_at=new_call["created_at"],
        contact_name=contact["name"] if contact else None,
        notes=None,
        transcript=None,
        recording_url=new_call.get("recording_url")
    )

# ========================
# AI CALL TRANSCRIPTION & SUMMARIZATION
# ========================
class TranscribeCallRequest(BaseModel):
    call_id: str
    audio_url: Optional[str] = None

@api_router.post("/calls/{call_id}/transcribe")
async def transcribe_call(call_id: str, current_user: dict = Depends(get_current_user)):
    """Transcribe a call recording and generate AI summary"""
    
    # Get the call
    call = await db.call_logs.find_one({"id": call_id, "user_id": current_user["id"]})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    recording_url = call.get("recording_url")
    if not recording_url:
        raise HTTPException(status_code=400, detail="No recording available for this call")
    
    # Get OpenAI API key
    api_keys = await db.system_settings.find_one({"type": "api_keys"}, {"_id": 0})
    openai_key = None
    
    if api_keys and api_keys.get("openai_api_key"):
        openai_key = CredentialEncryption.decrypt(api_keys["openai_api_key"])
    
    if not openai_key:
        # Try EMERGENT_LLM_KEY from environment
        openai_key = os.environ.get("EMERGENT_LLM_KEY")
    
    if not openai_key:
        raise HTTPException(status_code=400, detail="OpenAI API key not configured")
    
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText, ChatOpenAI
        
        # Download the recording
        async with aiohttp.ClientSession() as session:
            async with session.get(recording_url) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Failed to download recording")
                audio_data = await resp.read()


# ─── Messages (list + send, all SMS providers) ─────────────────────────────
async def list_messages(current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    
    return [MessageResponse(
        id=m["id"],
        from_number=m["from_number"],
        to_number=m["to_number"],
        text=m["text"],
        direction=m["direction"],
        status=m.get("status", "sent"),
        created_at=m.get("created_at", "")
    ) for m in messages]

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Get unique conversations grouped by phone number"""
    messages = await db.messages.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # Group by remote number
    conversations = {}
    for m in messages:
        # Safely get to_number and from_number with defaults
        to_number = m.get("to_number", "")
        from_number = m.get("from_number", "")
        direction = m.get("direction", "outbound")
        
        # Determine the remote number based on direction
        if direction == "outbound":
            remote = to_number
        else:
            remote = from_number
        
        # Skip messages with missing remote number
        if not remote:
            continue
            
        if remote not in conversations:
            conversations[remote] = {
                "phone_number": remote,
                "last_message": m.get("text", "")[:50] + "..." if len(m.get("text", "")) > 50 else m.get("text", ""),
                "last_timestamp": m.get("created_at", ""),
                "unread_count": 0
            }
    
    # Get contacts for names
    contacts = await db.contacts.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(500)
    contact_map = {c.get("phone_number", ""): c.get("name", "") for c in contacts}
    
    result = []
    for phone, conv in conversations.items():
        conv["contact_name"] = contact_map.get(phone)
        result.append(conv)
    
    return result

@api_router.get("/messages/{phone_number}")
async def get_thread(phone_number: str, current_user: dict = Depends(get_current_user)):
    """Get all messages with a specific phone number"""
    messages = await db.messages.find({
        "user_id": current_user["id"],
        "$or": [
            {"to_number": phone_number},
            {"from_number": phone_number}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(200)
    
    return [MessageResponse(
        id=m["id"],
        from_number=m["from_number"],
        to_number=m["to_number"],
        text=m["text"],
        direction=m["direction"],
        status=m.get("status", "sent"),
        created_at=m.get("created_at", "")
    ) for m in messages]

@api_router.post("/messages/send", response_model=MessageResponse)
async def send_message(msg: MessageSend, current_user: dict = Depends(get_current_user)):
    # Get SMS provider settings
    sms_settings = await db.system_settings.find_one({"type": "sms_provider"}, {"_id": 0})
    active_provider = sms_settings.get("active_provider", "python_gateway") if sms_settings else "python_gateway"
    
    logger.info(f"SMS send request: to={msg.to}, active_provider={active_provider}")
    
    to_number = normalize_phone_number(msg.to)
    message_id = None
    from_number = ""
    
async def send_message(msg: MessageSend, current_user: dict = Depends(get_current_user)):
    # Get SMS provider settings
    sms_settings = await db.system_settings.find_one({"type": "sms_provider"}, {"_id": 0})
    active_provider = sms_settings.get("active_provider", "python_gateway") if sms_settings else "python_gateway"
    
    logger.info(f"SMS send request: to={msg.to}, active_provider={active_provider}")
    
    to_number = normalize_phone_number(msg.to)
    message_id = None
    from_number = ""
    
    try:
        if active_provider == "telnyx":
            # Use Telnyx
            provider_settings = sms_settings.get("telnyx", {}) if sms_settings else {}
            
            # First try admin SMS provider settings, then fall back to user credentials
            if provider_settings.get("api_key"):
                api_key = CredentialEncryption.decrypt(provider_settings.get("api_key", ""))
                from_number = normalize_phone_number(provider_settings.get("phone_number", ""))
                messaging_profile_id = provider_settings.get("messaging_profile_id", "")
            else:
                # Fall back to user's credentials
                creds = await db.credentials.find_one({"user_id": current_user["id"]}, {"_id": 0})
                if not creds or not creds.get("api_key"):
                    raise HTTPException(status_code=400, detail="SMS provider not configured. Please set up in Super Admin.")
                api_key = CredentialEncryption.decrypt(creds["api_key"])
                from_number = normalize_phone_number(creds.get("phone_number", ""))
                messaging_profile_id = creds.get("messaging_profile_id", "")
            
            if not from_number:
                raise HTTPException(status_code=400, detail="Phone number not configured")
            
            logger.info(f"Sending SMS via Telnyx: from={from_number}, to={to_number}, profile_id={messaging_profile_id}")
            
            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {"from": from_number, "to": to_number, "text": msg.text}
                if messaging_profile_id:
                    payload["messaging_profile_id"] = messaging_profile_id
                
                logger.info(f"Telnyx SMS payload: {payload}")
                
                async with session.post("https://api.telnyx.com/v2/messages", json=payload, headers=headers) as response:
                    if response.status not in [200, 201, 202]:
                        error_text = await response.text()
                        logger.error(f"Telnyx SMS failed: {error_text}")
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {error_text}")
                    result = await response.json()
                    message_id = result.get("data", {}).get("id", str(uuid.uuid4()))
        
        elif active_provider == "twilio":
            # Use Twilio
            provider_settings = sms_settings.get("twilio", {}) if sms_settings else {}
            account_sid = provider_settings.get("account_sid", "")
            auth_token = CredentialEncryption.decrypt(provider_settings.get("auth_token", "")) if provider_settings.get("auth_token") else ""
            from_number = normalize_phone_number(provider_settings.get("phone_number", ""))
            
            if not account_sid or not auth_token:
                raise HTTPException(status_code=400, detail="Twilio credentials not configured")
            
            async with aiohttp.ClientSession() as session:
                auth = aiohttp.BasicAuth(account_sid, auth_token)
                async with session.post(
                    f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
                    auth=auth,
                    data={"From": from_number, "To": to_number, "Body": msg.text}
                ) as response:
                    if response.status != 201:
                        error_text = await response.text()
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {error_text}")
                    result = await response.json()
                    message_id = result.get("sid", str(uuid.uuid4()))
        
        elif active_provider == "vonage":
            # Use Vonage
            provider_settings = sms_settings.get("vonage", {}) if sms_settings else {}
            api_key = provider_settings.get("api_key", "")
            api_secret = CredentialEncryption.decrypt(provider_settings.get("api_secret", "")) if provider_settings.get("api_secret") else ""
            from_number = provider_settings.get("phone_number", "")
            
            if not api_key or not api_secret:
                raise HTTPException(status_code=400, detail="Vonage credentials not configured")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://rest.nexmo.com/sms/json",
                    data={
                        "api_key": api_key,
                        "api_secret": api_secret,
                        "from": from_number,
                        "to": to_number.replace("+", ""),
                        "text": msg.text,
                    }
                ) as response:
                    result = await response.json()
                    if result.get("messages", [{}])[0].get("status") != "0":
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {result}")
                    message_id = result.get("messages", [{}])[0].get("message-id", str(uuid.uuid4()))
        
        elif active_provider == "textbelt":
            # Use Textbelt
            provider_settings = sms_settings.get("textbelt", {}) if sms_settings else {}
            api_key = CredentialEncryption.decrypt(provider_settings.get("api_key", "")) if provider_settings.get("api_key") else ""
            api_url = provider_settings.get("api_url", "https://textbelt.com/text")
            from_number = "Textbelt"  # Textbelt doesn't use a from number
            
            if not api_key:
                raise HTTPException(status_code=400, detail="Textbelt API key not configured")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    api_url,
                    data={
                        "phone": to_number.replace("+", ""),
                        "message": msg.text,
                        "key": api_key,
                    }
                ) as response:
                    result = await response.json()
                    if not result.get("success"):
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {result.get('error', result)}")
                    message_id = result.get("textId", str(uuid.uuid4()))
        
        elif active_provider == "textbelt_os":
            # Textbelt Open Source - uses self-hosted server with carrier gateways
            provider_settings = sms_settings.get("textbelt_os", {}) if sms_settings else {}
            server_url = provider_settings.get("server_url", "http://localhost:9090/text")
            from_number = "Textbelt OS"  # No from number for carrier gateway
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    server_url,
                    json={
                        "number": to_number.replace("+", ""),
                        "message": msg.text,
                    }
                ) as response:
                    result = await response.json()
                    if not result.get("success"):
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {result.get('error', result)}")
                    message_id = str(uuid.uuid4())
        
        elif active_provider == "textbelt_self":
            # Self-hosted Textbelt server from GitHub
            provider_settings = sms_settings.get("textbelt_self", {}) if sms_settings else {}
            server_url = provider_settings.get("server_url", "")
            api_key = provider_settings.get("api_key", "")
            
            if not server_url:
                raise HTTPException(status_code=400, detail="Textbelt Self server URL not configured")
            
            from_number = "Textbelt Self"
            
            async with aiohttp.ClientSession() as session:
                payload = {
                    "phone": to_number.replace("+", ""),
                    "message": msg.text,
                }
                # Add API key if configured
                if api_key:
                    payload["key"] = api_key
                    
                async with session.post(server_url, data=payload) as response:
                    result = await response.json()
                    if not result.get("success"):
                        raise HTTPException(status_code=400, detail=f"Failed to send message: {result.get('error', result)}")
                    message_id = result.get("textId", str(uuid.uuid4()))
        
        elif active_provider == "python_gateway":
            # Python Email-to-SMS Gateway (no Node.js required)
            from_number = "Email Gateway"
            
            # Get SMTP config from textbelt_smtp settings
            smtp_settings = await db.system_settings.find_one({"type": "textbelt_smtp"}, {"_id": 0})
            
            if not smtp_settings:
                raise HTTPException(status_code=400, detail="SMTP not configured. Go to Super Admin > Textbelt Server to configure.")
            
            # Decrypt password if encrypted
            smtp_pass = smtp_settings.get("pass_", "")
            if smtp_pass:
                try:
                    smtp_pass = CredentialEncryption.decrypt(smtp_pass)
                except:
                    pass  # Already decrypted
            
            result = await send_sms_via_email(
                phone=to_number,
                message=msg.text,
                smtp_host=smtp_settings.get("host", "smtp.gmail.com"),
                smtp_port=smtp_settings.get("port", 587),
                smtp_user=smtp_settings.get("user", ""),
                smtp_pass=smtp_pass,
                smtp_secure=smtp_settings.get("secure", False),
                from_email=smtp_settings.get("from_email", ""),
                carrier=None  # Auto-detect
            )
            
            if not result.get("success"):
                raise HTTPException(status_code=400, detail=f"Failed to send message: {result.get('error', 'Unknown error')}")
            
            message_id = str(uuid.uuid4())
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown SMS provider: {active_provider}")
            
    except aiohttp.ClientError as e:
        logger.error(f"SMS API connection error: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to SMS provider")
    
    # Store message
    new_msg = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "from_number": from_number,
        "to_number": msg.to,
        "text": msg.text,
        "direction": "outbound",
        "status": "sent",
        "provider": active_provider,
        "provider_message_id": message_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(new_msg)
    
    return MessageResponse(
        id=new_msg["id"],
        from_number=new_msg["from_number"],
        to_number=new_msg["to_number"],
        text=new_msg["text"],
        direction=new_msg["direction"],
        status=new_msg["status"],
        created_at=new_msg["created_at"]
    )

# ========================
# WEBHOOKS
# ========================
async def run_sms_automations(user_id: str, from_number: str, message: str):
    """Placeholder — run any enabled SMS automations for this user."""


# ─── Telnyx Webhooks ───────────────────────────────────────────────────────
# WEBHOOKS
# ========================
async def run_sms_automations(user_id: str, from_number: str, message: str):
    """Placeholder — run any enabled SMS automations for this user."""
    pass


@api_router.post("/webhooks/sms")
async def sms_webhook(request: Request):
    """Handle incoming SMS from Telnyx"""
    try:
        body = await request.json()
        data = body.get("data", {})
        payload = data.get("payload", {})
        
        from_number = payload.get("from", {}).get("phone_number", "")
        to_number = payload.get("to", [{}])[0].get("phone_number", "")
        text = payload.get("text", "")
        
        # Find user by their phone number
        creds = await db.credentials.find_one({"phone_number": to_number}, {"_id": 0})
        if not creds:
            logger.warning(f"No user found for phone number: {to_number}")
            return {"status": "ignored"}
        
        user_id = creds["user_id"]

        # Store incoming message
        new_msg = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "from_number": from_number,
            "to_number": to_number,
            "text": text,
            "direction": "inbound",
            "status": "received",
            "telnyx_id": data.get("id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.messages.insert_one(new_msg)

        # ── Trigger SMS automations ───────────────────────────────────────────
        asyncio.create_task(run_sms_automations(user_id, from_number, text))

        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error"}

@api_router.post("/webhooks/voice")
async def voice_webhook(request: Request):
    """Handle voice events from Telnyx"""
    try:
        body = await request.json()
        logger.info(f"Voice webhook received: {body}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Voice webhook error: {e}")
        return {"status": "error"}


# ── SMS Bridge (Android companion app) ───────────────────────────────────────

class SmsBridgeIncoming(BaseModel):
    from_number: str
    to_number: str
    message: str

@api_router.get("/sms-bridge/download")
async def download_bridge_apk(
    token: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
):
    """Download the A2G SMS Bridge Android project zip."""
    raw_token = token or (credentials.credentials if credentials else None)
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    zip_path = ROOT_DIR / "uploads" / "a2g-sms-bridge.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Bridge project not found")
    return FileResponse(path=str(zip_path), media_type="application/zip", filename="a2g-sms-bridge.zip",
        headers={"Content-Disposition": "attachment; filename=a2g-sms-bridge.zip"})

@api_router.get("/downloads/contacts-module")
async def download_contacts_module(
    token: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
):
    """Download the A2G Contacts Module zip."""
    raw_token = token or (credentials.credentials if credentials else None)
    if not raw_token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(raw_token, SECRET_KEY, algorithms=[ALGORITHM])
        if not payload.get("sub"):
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    zip_path = ROOT_DIR / "uploads" / "contacts-module.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(zip_path), media_type="application/zip", filename="contacts-module.zip",
        headers={"Content-Disposition": "attachment; filename=contacts-module.zip"})

@api_router.get("/sms-bridge/ping")
async def sms_bridge_ping(current_user: dict = Depends(get_current_user)):
    """Health check for the Android bridge app."""
    await db.sms_bridge_devices.update_one(
