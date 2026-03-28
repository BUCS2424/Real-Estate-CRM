# Contacts Component — Exact Export Bundle

This bundle contains the **exact Contacts component stack** from this app so another AI/dev can install it into a different codebase.

> Export date: 2026-03-26  
> Scope: frontend Contacts UI + backend Contacts API/model + integration snippets

---

## 1) Bundle Contents

```text
contacts_component_exact_2026-03-26/
├── frontend/
│   ├── pages/
│   │   └── ContactsPage.jsx
│   ├── components/
│   │   ├── SmartListModal.jsx
│   │   └── EmailComposerModal.jsx
│   ├── lib/
│   │   └── api.full.js
│   └── routes/
│       └── App.full.js
├── backend/
│   ├── routes/
│   │   └── contacts.py
│   ├── models/
│   │   └── contact.py
│   └── integration-snippets/
│       ├── routes__init__.py
│       └── server.py
└── scripts/
    └── create_zip.sh
```

---

## 2) What this module provides

- Full Contacts page UI (list/search/filter/detail/edit/import/export)
- CSV/vCard import/export flows
- Duplicate handling (`skip|update|create`) + dry-run import mode
- Contact-property linking helpers
- Smart List sending + email composer modal
- SMS endpoints via Telnyx (optional runtime config)

---

## 3) Frontend install (exact)

1. Copy files:
   - `frontend/pages/ContactsPage.jsx` → `src/pages/ContactsPage.jsx`
   - `frontend/components/SmartListModal.jsx` → `src/components/SmartListModal.jsx`
   - `frontend/components/EmailComposerModal.jsx` → `src/components/EmailComposerModal.jsx`

2. API integration:
   - Open `frontend/lib/api.full.js`
   - Copy the `contactsAPI` block into your app’s `src/lib/api.js`.
   - Keep endpoint paths exactly under `/contacts`.

3. Route wiring:
   - Use `frontend/routes/App.full.js` as reference.
   - Add imports and routes:
     - `import { ContactsPage } from './pages/ContactsPage';`
     - `<Route path="/contacts" element={<ContactsPage />} />`
     - `<Route path="/contacts/:id" element={<ContactsPage />} />`

4. Required UI dependencies used by `ContactsPage.jsx`:
   - `react`, `react-router-dom`, `sonner`, `lucide-react`
   - shadcn/ui components: card, button, input, label, checkbox, badge, textarea, tabs, select, dialog

---

## 4) Backend install (exact)

1. Copy files:
   - `backend/models/contact.py` → `backend/models/contact.py`
   - `backend/routes/contacts.py` → `backend/routes/contacts.py`

2. Register router:
   - Use `backend/integration-snippets/routes__init__.py` as reference.
   - Include:
     - `from .contacts import router as contacts_router`
     - `api_router.include_router(contacts_router, prefix="/contacts", tags=["Contacts"])`

3. Auth/role dependencies required by route:
   - `utils.auth.get_current_user`
   - `utils.auth.require_role`
   - `models.user.UserRole`

4. DB requirements:
   - Mongo collections used include: `contacts`, `properties`, `sms_messages`, `telnyx_settings`, `settings`, `email_logs` (and others from smart-list flow).

5. Optional SMS dependency:
   - Python package: `telnyx`
   - Runtime config in DB (`telnyx_settings`) or env vars:
     - `TELNYX_API_KEY`
     - `TELNYX_PHONE_NUMBER`

---

## 5) API surface (key endpoints)

- `POST /api/contacts` create
- `GET /api/contacts` list
- `PUT /api/contacts/{contact_id}` update
- `DELETE /api/contacts/{contact_id}` delete
- `GET /api/contacts/stats/summary`
- `POST /api/contacts/import` (csv/vcf, supports `duplicate_mode`, `dry_run`)
- `GET /api/contacts/export/csv`
- `GET /api/contacts/export/vcard`
- `POST /api/contacts/send-sms` (Telnyx)

---

## 6) Install checklist for another AI (copy/paste)

Use this exact task prompt for another AI:

```text
Install the exact Contacts module from the provided bundle.

Frontend:
- Copy ContactsPage.jsx, SmartListModal.jsx, EmailComposerModal.jsx
- Merge contactsAPI from api.full.js into src/lib/api.js
- Add routes /contacts and /contacts/:id
- Ensure shadcn/ui components + sonner + lucide-react are available

Backend:
- Copy models/contact.py and routes/contacts.py
- Register contacts router at /api/contacts in routes/__init__.py
- Ensure auth dependencies (get_current_user, require_role, UserRole) are wired
- Ensure Mongo collections exist

Do not rename endpoints or field keys.
```

---

## 7) Create zip for transfer

From this bundle directory:

```bash
bash scripts/create_zip.sh
```

This generates:
- `/app/exports/contacts_component_exact_2026-03-26.zip`

---

## 8) Important note

This is an **exact module export** from a larger CRM app. If target app lacks shared utilities/components (auth context, UI kit, API client), wire those first and then integrate Contacts.
