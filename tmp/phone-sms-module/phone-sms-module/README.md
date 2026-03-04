# A2G Phone & SMS Module

## What's included

### Frontend (React + TailwindCSS + shadcn/ui)
| File | Description |
|------|-------------|
| `DialerPage.jsx` | Full-page WebRTC dialer — make/receive calls, mute/hold/forward, call recording |
| `DialerPopup.jsx` | Standalone popup dialer window with **call waiting support** — opens as a separate browser window |
| `MessagesPage.jsx` | SMS conversation threads — send/receive messages |
| `CallHistoryPage.jsx` | Call history log with stats, filters, export |

### Backend (FastAPI + Motor MongoDB)
| File | Description |
|------|-------------|
| `phone_sms_routes.py` | All phone & SMS API endpoints (836 lines) |

---

## Backend Endpoints

### Credentials (Telnyx SIP / API key storage)
- `GET /credentials` — get current user's Telnyx credentials
- `POST /credentials` — save SIP username, SIP password, API key, phone number
- `GET /webrtc/token` — get WebRTC connection info for Telnyx SDK

### Call Logs
- `GET /calls` — list call history
- `POST /calls` — log a call (direction, duration, remote_number)
- `PUT /calls/{id}` — update call (duration, status, recording_url)
- `PUT /calls/{id}/notes` — add notes to a call
- `POST /calls/upload-recording` — upload call recording audio
- `PUT /calls/{id}/recording` — link recording URL

### SMS / Messages
- `GET /messages/conversations` — list conversations grouped by number
- `GET /messages/{phone_number}` — get message thread
- `POST /messages` — send SMS (Telnyx, Twilio, Vonage, Textbelt, or Python email gateway)
- `POST /messages/read` — mark conversation as read

### Webhooks
- `POST /webhooks/sms` — receive incoming SMS from Telnyx
- `POST /webhooks/voice` — receive voice events from Telnyx

---

## Frontend Dependencies
- `@telnyx/webrtc` — WebRTC SDK for browser-based calling
- `react-router-dom` — routing
- `axios` — API client (`apiClient` with auth Bearer token)
- `sonner` — toast notifications
- `lucide-react` — icons
- shadcn/ui components: `Button`, `Input`, `Dialog`, `Badge`, `Card`, `Select`

## Key Features
- **WebRTC calling** via Telnyx SIP credentials
- **Call waiting** — answer/decline second call while on active call
- **Auto call logging** — duration tracked with refs (no stale closure bugs)
- **Call recording** — auto-records calls, uploads to server
- **SMS multi-provider** — Telnyx, Twilio, Vonage, Textbelt, email-to-SMS gateway
- **Conversation threads** — SMS grouped by phone number
- **Popup dialer** — opens in a separate 400×650 window, works across page navigation
- **Inbound call detection** — handles stale closure race conditions via mirror refs

## Environment Variables Required
```
# Backend .env
MONGO_URL=mongodb://...
DB_NAME=your_db
JWT_SECRET=your_secret

# Frontend .env
REACT_APP_BACKEND_URL=https://yourapp.com
```

## Setup Notes
1. User must configure Telnyx credentials via `POST /credentials` (SIP username, password, API key, phone number)
2. Configure Telnyx webhooks to point to your `/api/webhooks/sms` and `/api/webhooks/voice` URLs
3. The `CredentialEncryption` class uses Fernet symmetric encryption — set `ENCRYPTION_KEY` env var or it generates one
