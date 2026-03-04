# Fusion Builder All In One CRM - PRD

## Original Problem Statement
Build a unified workspace platform called "Fusion Builder All In One CRM" for real estate professionals with:
- CRM with lead scoring and contact management
- Tasks and Kanban management
- AI Article Writer with CRM context
- Comprehensive drag-and-drop system with physics-based UI
- Role-based permissions (Super User, Admin, Client)
- Dark/Light theme toggle
- Settings accessible from user menu

## User Persona
- **Target:** Real estate professionals - agents, brokers, property managers
- **Super User:** mel@a2gdesigns.com (God access)
- **Need:** Unified platform to manage leads, deals, tasks, and content generation

## Core Requirements (Static)
1. JWT-based authentication with 3 roles
2. CRM module with contacts, lead scoring, tags
3. Deal pipeline with Kanban view
4. Task management with Kanban view
5. AI-powered content generation using Emergent LLM Key
6. Settings with theme toggle
7. User menu with Settings cog

## What's Been Implemented (January 14, 2025)

### Backend (FastAPI + MongoDB)
- ✅ JWT authentication with 3 role levels
- ✅ User management endpoints
- ✅ Contacts CRUD with lead scoring
- ✅ Deals CRUD with stage management
- ✅ Tasks CRUD with status updates
- ✅ Articles CRUD for saved content
- ✅ AI content generation endpoint (GPT-5.2 via Emergent LLM Key)
- ✅ Dashboard statistics endpoint
- ✅ Settings management
- ✅ Seed data with superuser (mel@a2gdesigns.com)

### Frontend (React + Tailwind + Shadcn)
- ✅ Login/Register pages with real estate theme
- ✅ Dashboard with stats, pipeline overview, recent contacts/tasks
- ✅ Contacts page with search, filter, CRUD dialogs
- ✅ Deals Pipeline - Kanban board with drag-and-drop (framer-motion + dnd-kit)
- ✅ Tasks Manager - Kanban board with drag-and-drop
- ✅ AI Writer with context selection, templates, content generation
- ✅ Settings page with theme toggle
- ✅ User menu dropdown with Settings cog (as requested)
- ✅ Admin Users page (superuser only)
- ✅ Light/Dark theme with persistence
- ✅ Responsive design

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Core authentication flow
- [x] Contact management
- [x] Deal pipeline
- [x] Task management
- [x] AI Writer integration

### P1 - High Priority (Next Phase)
- [ ] Email integration for sending AI-generated content
- [ ] Calendar integration for appointments
- [ ] Property database integration
- [ ] Automated triggers (deal stage → task creation)
- [ ] Document attachments

### P2 - Medium Priority
- [ ] Advanced reporting & analytics
- [ ] Export to CSV/PDF
- [ ] Bulk operations
- [ ] Custom fields for contacts/deals
- [ ] Team collaboration features

## Technical Stack
- **Backend:** FastAPI, Motor (async MongoDB), JWT, bcrypt
- **Frontend:** React 19, Tailwind CSS, Shadcn UI, framer-motion, dnd-kit
- **Database:** MongoDB
- **AI:** OpenAI GPT-5.2 via Emergent LLM Key
- **Fonts:** Playfair Display (headings), Manrope (body), JetBrains Mono (code)

## Next Tasks
1. Complete booking notifications (email, SMS, desktop, PWA)
2. Implement backend for placeholder settings pages
3. Add email sending capability for AI-generated content
4. Implement automated task triggers based on deal stages

---

## Update: January 14, 2026 - Booking System & UI Enhancement

### New Features Added:
- **Canary Yellow Button Hover** - Bright yellow (#FFE547) with dark text on primary blue buttons only
- **Booking Calendar Page** - Full booking management for agents
- **Create Booking Modal** with:
  - Select existing lead OR enter new contact
  - Date & Time picker
  - Duration selection (15 min to 2 hours)
  - **Video Call Options**: No video, SaysMe Meet (auto-generate link), Zoom (custom link)
  - Notes field
- **Public Booking Page** for clients to book appointments
- **Bookings** added to main navigation sidebar

### Booking Features:
- Calendar view with booked/blocked date indicators
- List view for all bookings
- Availability settings (weekly schedule)
- Block specific dates
- Copy shareable booking link
- Booking status management (pending, confirmed, cancelled, completed)

---

## Update: January 14, 2025 - Settings Enhancement

### New Features Added:
- **Comprehensive Settings Page** with left sidebar menu
- **Accordion-style navigation** for Admin, Support, SEO sections
- **Developer Settings** with direct navigation

### Settings Structure:

#### Admin (Accordion)
- Admin Reports - Generate system reports
- Audit Log - Track all system activities
- Roles & Permissions - Manage user roles with permission matrix
- Glossary Manager - Manage terms and definitions
- Online Staff - Monitor staff activity
- Database Backup - Configure backups
- Custom Fields - Add custom fields to modules
- Staff Management - Manage team members

#### Support (Accordion)
- Error Reports - Monitor system errors
- Push Alerts - Send notifications
- Storage - Manage file storage

#### SEO Dashboard (Accordion)
- Sitemap & Submit - Manage sitemaps
- Meta Information - SEO meta tags
- Structured Data - JSON-LD schema

#### Developer Settings (Direct links)
- General Settings - Site configuration
- Email / SMTP - Email delivery settings
- Custom Code - Add custom JS/CSS
- System Messages - **WYSIWYG editor** with:
  - Rich text formatting (Bold, Italic, Underline, Strikethrough)
  - Text color and Highlight color picker
  - Heading levels (H1, H2, H3, Paragraph)
  - Text alignment (Left, Center, Right, Justify)
  - Lists (Bullet, Numbered)
  - Blockquotes
  - Template variables support

---

## Update: January 14-15, 2026 - Real Estate Landing Page & Lead Management

### Public-Facing Website:
- ✅ **Luxury Landing Page** - "Fusion Luxury Estates" with dark navy blue (#0a1628) and gold/amber theme
- ✅ **Property Carousel** - Scrolling display of luxury listings from database
- ✅ **Property Detail Pages** - Dynamic pages for each listing
- ✅ **Dual Lead Capture Forms** - Separate flows for Buyers (auction access) and Sellers (off-market listings)

### Lead Management System:
- ✅ **Lead Capture API** - Public endpoint for website forms
- ✅ **Admin Leads Page** - `/leads` route with:
  - Statistics cards (Total, Buyers, Sellers, New)
  - Filterable tabs (All, Buyers, Sellers)
  - Status management (New, Contacted, Qualified, Converted, Lost)
  - Lead detail modal with notes
  - Search and filter functionality

### Phone & Email Verification (MOCKED):
- ✅ **PhoneVerification Component** - Reusable verification with send/verify flow
- ✅ **EmailVerification Component** - Reusable verification with send/verify flow
- ✅ **Backend Mock System** - Codes logged to server (replace with Twilio/SendGrid later)
- ✅ Clean UI - No "test" wording visible to users

### AI Real Estate Features:
- ✅ **Address Lookup AI** - Uses web search + LLM to fetch real property data when adding listings

### Branding Updates:
- ✅ Removed all "Emergent" branding
- ✅ Footer now shows "Powered By: A2G"
- ✅ Removed demo credentials from login page
- ✅ Canary yellow button hovers with dark text

---

## Prioritized Backlog (Updated)

### P0 - Verified Complete
- [x] Lead capture from landing page
- [x] Admin leads management page
- [x] Phone/email verification (mocked)
- [x] Property listings with AI lookup
- [x] PWA settings and service worker
- [x] Property submission workflow for sellers

### P1 - High Priority (Next)
- [ ] Booking notifications (email, SMS, desktop)
- [ ] Lead auction/bidding system for buyers
- [ ] Connect AI writer to CRM context

### P2 - Medium Priority
- [x] Backend refactor (split server.py into routers) - DONE
- [ ] Dark mode toggle implementation
- [ ] Storage/media management in admin settings

### Recently Completed (January 15, 2026)
- [x] Mailing List Management with import/export
- [x] Dynamic Branding System (logos, favicon, site name)

### Recently Completed (February 3, 2026)
- [x] Contacts Import/Export with Apple vCard (.vcf) support
- [x] CSV import/export for Contacts
- [x] Filter-based export (by category: buyer/seller, by status: active/lead/inactive)
- [x] **Landing Page Generator** - Create stunning property landing pages from CRM listings
  - Select from CRM listings
  - Add multiple videos (YouTube/Vimeo/iDrive upload)
  - Photo gallery, virtual tour embed, map, agent info
  - Contact form submissions → Leads in CRM
  - Luxury dark theme for $1M+ / Modern light theme for others
  - Preview URL: https://hiddenhavenrealty.com/[property-slug]
- [x] **Media Library System** - Full file management for properties
  - Sidebar shows all property folders by address
  - Default subfolders: gallery, videos, documents (auto-created)
  - Grid and List view toggle
  - File actions: Preview, Download, Delete, Rename (3-dot menu)
  - Create custom folders
  - Upload files to any folder
  - Search files within folders
  - Storage folders tied to properties (deleted when property deleted)

### P3 - Future Backlog
- [ ] Automated task generation from deals
- [ ] Multi-item drag-and-drop on Kanban boards
- [ ] Advanced reporting & analytics

---

## Update: January 15, 2026 - Contacts Redesign & Newsletter System

### Contacts Page Redesign:
- ✅ Changed from grid cards to list/table view
- ✅ Category filter tabs (All, Buyers, Sellers)
- ✅ Stats cards for total, buyers, sellers counts
- ✅ Table with Contact, Category, Details, Status, Score, Added, Actions
- ✅ Category badges with icons (shopping cart for buyers, home for sellers)

### Newsletter System:
- ✅ **Newsletter Center** at `/newsletter` with:
  - Compose tab with WYSIWYG editor (TipTap)
  - All Newsletters list
  - Templates management
  - Auto-Triggers for automated emails
  - Archive tab for sent newsletters
- ✅ **WYSIWYG Editor Features**:
  - Bold, Italic, Underline
  - H1, H2 headings
  - Bullet and numbered lists
  - Text alignment
  - Link and Image insertion
- ✅ **Recipient Targeting**: All Contacts, Buyers Only, Sellers Only
- ✅ **Scheduling**: Optional datetime picker for scheduled sending
- ✅ **Templates**: Save and reuse newsletter templates
- ✅ **Auto-Triggers**: Automated emails on events:
  - New Lead Captured
  - New Listing Added
  - Lead Converted
  - Booking Confirmed
- ✅ **Public Newsletter Archive** at `/newsletter-archive`
- ✅ Footer link to Newsletter Archive on landing page

### Additional Features:
- ✅ Convert Lead to Contact with category (buyer/seller)
- ✅ Showcase Listings page at `/showcase`
- ✅ Download as Word document in AI Writer
- ✅ Email and SMS consent checkboxes on forms

---

## Update: January 15, 2026 - PWA & Seller Workflow

### PWA Implementation:
- ✅ Created manifest.json with app metadata and icons
- ✅ Service worker (sw.js) for offline caching
- ✅ PWA Settings page at `/settings/developer/pwa`
- ✅ Install banner component for prompting installation
- ✅ Generated app icons in multiple sizes (72-512px)
- ✅ Push notification support (permission handling)
- ✅ Online/offline status indicators

### Property Submission Workflow:
- ✅ Enhanced seller form on landing page with:
  - Property address, city, state
  - Property type, bedrooms, bathrooms, sqft
  - Asking price and selling timeline
  - Optional description field
- ✅ Backend endpoint `/api/public/property-submissions`
- ✅ Admin Property Submissions page at `/property-submissions`
- ✅ Status workflow: Pending → Reviewing → Approved → Converted
- ✅ Convert approved submissions to property listings
- ✅ Sidebar navigation updated

---

## Update: January 15, 2026 - Design System Enhancement

### Site-Wide Luxury Design Elements Applied:
Applied the design language from the About (Sheila Desautels) page across all public-facing pages.

#### Key Design Elements:
- **Decorative Rings** - Pulsing circular borders around icons/images
- **Corner Accents** - L-shaped amber borders at page corners
- **Glowing Effects** - Ambient amber blur backgrounds
- **Golden Frames** - Gradient borders around profile images
- **Floating Dots** - Animated amber dots for visual interest
- **Section Dividers** - Gradient backgrounds between sections
- **Card Hover Effects** - Border color transitions and glow effects

#### Pages Updated:

1. **Login Page** (`/login`):
   - Dark navy theme with amber accents
   - Corner accent borders on all 4 corners
   - Floating decorative dots with animation
   - Glowing background blur effects
   - Decorative rings around card
   - "Back to Home" navigation link
   - Branded "Fusion CRM" logo with golden gradient
   - "Powered By: A2G" footer

2. **Register Page** (`/register`):
   - Same design system as Login page
   - Consistent corner accents and decorations

3. **Showcase/Public Listings Page** (`/showcase`):
   - Enhanced hero section with "EXCLUSIVE COLLECTION" label
   - Italicized "Off Market" in title
   - Corner accent decorations
   - Decorative floating dots
   - Enhanced filter sidebar with glow effect
   - Improved empty state with decorative rings
   - Full footer with navigation links

4. **Property Detail Page** (`/property/[id]`):
   - Background decorative blur elements
   - Enhanced stat cards with hover glow effects
   - Icon containers with background styling
   - Enhanced sidebar contact card with corner accents
   - Improved inquiry modal with corner decorations
   - Full footer with navigation links

5. **Newsletter Archive Page** (`/newsletter-archive`):
   - Fixed header with sticky navigation
   - "STAY INFORMED" label with italic "Archive" title
   - Decorative rings around mail icon
   - Animated floating dots
   - Enhanced empty state with pulsing rings
   - Newsletter cards with hover glow effects
   - Full footer with navigation links

#### Design Consistency:
- All public pages now share the same luxurious aesthetic
- Consistent footer across all pages with brand, navigation, and attribution
- Unified color scheme: Dark navy (#0a1628), Amber/Gold (#fbbf24)
- Consistent typography: Serif fonts for headings, clean body text

---

## Update: January 15, 2026 - Backend Refactor

### Major Backend Architecture Overhaul:
Refactored the monolithic `server.py` (2,676 lines) into a clean, modular architecture.

#### New Structure:
```
/app/backend/
├── server.py          (165 lines - main app entry point)
├── database.py        (MongoDB connection module)
├── models/            (Pydantic models)
│   ├── __init__.py
│   ├── user.py
│   ├── contact.py
│   ├── deal.py
│   ├── task.py
│   ├── article.py
│   ├── booking.py
│   ├── newsletter.py
│   ├── property.py
│   ├── storage.py
│   └── settings.py
├── routes/            (FastAPI routers)
│   ├── __init__.py    (Router aggregation)
│   ├── auth.py
│   ├── contacts.py
│   ├── deals.py
│   ├── tasks.py
│   ├── articles.py
│   ├── bookings.py
│   ├── newsletters.py
│   ├── properties.py
│   ├── leads.py
│   ├── storage.py
│   ├── settings.py
│   ├── users.py
│   ├── notifications.py
│   └── dashboard.py
└── utils/             (Shared utilities)
    ├── __init__.py
    └── auth.py        (JWT, password hashing)
```

#### Benefits:
- **94% reduction** in main server.py size (2,676 → 165 lines)
- Clear separation of concerns
- Easier to maintain and extend
- Each module is independently testable
- Better code organization following FastAPI best practices

#### All Endpoints Preserved:
- Authentication (/api/auth/*)
- Contacts CRUD (/api/contacts/*)
- Deals Pipeline (/api/deals/*)
- Tasks Management (/api/tasks/*)
- Articles & AI Writer (/api/articles/*)
- Booking System (/api/bookings/*, /api/public/booking/*)
- Newsletter System (/api/newsletters/*)
- Property Listings (/api/properties/*, /api/public/properties/*)
- Leads Management (/api/leads/*)
- Storage Providers (/api/storage/*)
- Settings (/api/settings/*)
- User Management (/api/users/*)
- Notifications (/api/notifications/*)
- Dashboard Stats (/api/dashboard/*)

---

### Storage Provider Management:
Added a comprehensive storage provider management system with support for 5 different cloud storage services:

#### Providers Implemented:
1. **Google Drive** - OAuth-based cloud storage
   - Credentials: Client ID, Client Secret, Refresh Token
   - Settings: Folder ID, Service Account option
   
2. **iDrive** - S3-compatible cloud backup
   - Credentials: Access Key, Secret Key
   - Settings: Bucket, Region, Endpoint URL
   
3. **cPanel** - FTP/SFTP hosting storage
   - Credentials: Username, Password, API Token
   - Settings: Host, Port, Directory, SFTP option
   
4. **pCloud** - European cloud storage
   - Credentials: Access Token, Client ID
   - Settings: Folder ID, Data Location (US/EU)
   
5. **Custom CDN** - S3-compatible custom storage
   - Credentials: API Key, API Secret
   - Settings: Endpoint URL, Bucket, Public URL, Region

#### Features:
- ✅ Collapsible provider cards with configuration panels
- ✅ Credentials input with show/hide toggle for passwords
- ✅ Provider-specific settings fields
- ✅ Active/Inactive toggle per provider
- ✅ Set Default Provider functionality
- ✅ Test Connection button (mock implementation)
- ✅ Status badges (Setup Required / Configured)
- ✅ Stats overview (Total, Configured, Active counts)
- ✅ Getting Started guide with setup instructions
- ✅ Credentials stored securely (masked in UI)
- ✅ Admin-only access (Super Admin + Admins)

#### Backend Endpoints:
- `GET /api/storage/providers` - List all providers
- `GET /api/storage/providers/{id}` - Get single provider
- `PUT /api/storage/providers/{id}` - Update provider config
- `POST /api/storage/providers/{id}/test` - Test connection
- `POST /api/storage/providers/{id}/set-default` - Set as default
- `GET /api/storage/default` - Get default provider

#### Database Collection:
- `storage_providers` - Stores provider configurations with encrypted credentials

---

## Update: January 15, 2026 - Mailing List Management & Dynamic Branding

### Mailing List Management System:
- ✅ **Mailing Lists Page** at `/mailing-lists` with:
  - Stats cards (Total Lists, Total Subscribers, VIP Lists, Quick Import)
  - Create/Edit/Delete mailing lists with name, description, category
  - Add/Remove individual subscribers manually
  - Search and filter subscribers within a list
  - Category support: General, Buyers, Sellers, VIP, Custom
- ✅ **Import/Export Functionality**:
  - Import subscribers from CSV file (flexible column naming)
  - Import subscribers from existing Contacts
  - Import subscribers from existing Leads
  - Export subscribers to CSV file
  - Duplicate detection during import
- ✅ **Backend API Endpoints**:
  - `GET /api/mailing-lists` - List all mailing lists
  - `POST /api/mailing-lists` - Create new list
  - `GET /api/mailing-lists/{id}` - Get list with subscribers
  - `PUT /api/mailing-lists/{id}` - Update list
  - `DELETE /api/mailing-lists/{id}` - Delete list
  - `POST /api/mailing-lists/{id}/subscribers` - Add subscriber
  - `DELETE /api/mailing-lists/{id}/subscribers/{subscriber_id}` - Remove subscriber
  - `POST /api/mailing-lists/{id}/import` - Import from CSV
  - `GET /api/mailing-lists/{id}/export` - Export to CSV
  - `POST /api/mailing-lists/{id}/import-from-contacts` - Import from contacts
  - `POST /api/mailing-lists/{id}/import-from-leads` - Import from leads

### Contacts Import/Export API (New - Feb 3, 2026)
- `POST /api/contacts/import` - Import from vCard (.vcf) or CSV file
  - Query params: `category` (optional) - assign category to all imported contacts
  - Supports Apple vCard VERSION:3.0 format
  - Flexible CSV column mapping (email, first_name, last_name, phone, company, etc.)
  - Duplicate detection by email
- `GET /api/contacts/export/vcard` - Export contacts as Apple-compatible vCard (.vcf)
  - Query params: `category` (buyer/seller), `status` (active/lead/inactive), `tags`
- `GET /api/contacts/export/csv` - Export contacts as CSV spreadsheet
  - Query params: `category`, `status`, `tags`

### Landing Page Generator API (New - Feb 3, 2026)
- `GET /api/landing-pages/available-listings` - Get listings without landing pages
- `POST /api/landing-pages` - Create landing page from listing
- `GET /api/landing-pages` - List all landing pages
- `GET /api/landing-pages/{id}` - Get specific landing page
- `PUT /api/landing-pages/{id}` - Update landing page
- `DELETE /api/landing-pages/{id}` - Delete landing page
- `POST /api/landing-pages/{id}/publish` - Publish page
- `POST /api/landing-pages/{id}/unpublish` - Unpublish page
- `POST /api/landing-pages/{id}/upload-video` - Upload video to iDrive
- `POST /api/landing-pages/{id}/upload-image` - Upload image to iDrive
- **Public (no auth):**
  - `GET /api/landing-pages/public/{slug}` - Get published page by slug
  - `POST /api/landing-pages/public/{slug}/contact` - Submit contact form (creates Lead)

**Features:**
- Auto theme selection: 'luxury' (dark navy + gold) for $1M+, 'modern' (clean light) for others
- Slug auto-generated from address-city-state format
- Preview URL: `https://hiddenhavenrealty.com/[slug]`
- Multiple video support: YouTube, Vimeo, or upload to iDrive
- Photo gallery with lightbox
- Virtual tour embed (Matterport)
- Google Maps location
- Agent info with photo
- Contact form → Leads in CRM

### Dynamic Branding System:
- ✅ **BrandingContext** (`/app/frontend/src/contexts/BrandingContext.js`):
  - Global state management for branding settings
  - Auto-fetches branding from public endpoint on app load
  - Dynamically updates favicon and page title
  - Provides `refreshBranding()` function for after settings save
- ✅ **Public Branding Endpoint**:
  - `GET /api/settings/branding` - Returns public branding (no auth required)
  - Returns: siteName, logoUrl, logoLinkUrl, dashboardLogoUrl, dashboardLogoLinkUrl, faviconUrl, pwaIconUrl
- ✅ **Updated Components**:
  - Sidebar - Uses dynamic dashboard logo
  - LandingPage - Uses dynamic public logo
  - LoginPage - Uses dynamic dashboard logo
  - GeneralSettings - Triggers branding refresh on save

---

## Update: February 3, 2026 - Drag-and-Drop Upload Implementation

### Completed:
- ✅ **Drag-and-Drop Upload Feature** in Media Library
  - Created reusable `DropZone.jsx` component (`/app/frontend/src/components/DropZone.jsx`)
  - File type detection (image, video, document, other) with icons
  - File size validation with configurable max size (default 100MB)
  - Visual drag-over effects with animated upload icon
  - File preview list showing selected files before upload
  - Individual file removal from queue
  - Progress indicators during upload
  - Success/error status per file
  - "Upload All" button with progress tracking
- ✅ **MediaLibraryPage Integration**
  - DropZone displayed in empty folder state
  - Upload modal with DropZone for adding files
  - Proper error handling for uploads
- ✅ **Code Quality Fixes**
  - Fixed lint errors in LandingPage.jsx (unescaped apostrophes)
  - Fixed broken syntax in MediaLibraryPage.jsx (duplicate code blocks removed)

### DropZone Component API:
```jsx
<DropZone
  onUpload={async (file) => { /* upload logic */ }}
  accept="*/*"           // File types to accept
  multiple={true}        // Allow multiple files
  maxSize={104857600}    // Max file size in bytes (100MB)
  disabled={false}       // Disable the component
  compact={false}        // Compact mode for smaller spaces
  showPreview={true}     // Show file preview list
/>
```

### Known Limitations:
- **iDrive Integration**: File uploads require iDrive credentials to be configured in Developer Settings. Without credentials, uploads will fail with "iDrive storage not configured" error.
- **Phone/Email Verification**: Remains mocked (verification codes logged to server).

---

### Updated Prioritized Backlog:

#### P0 - Completed
- [x] Drag-and-drop upload for Media Library
- [x] Lint error fixes

#### P1 - High Priority (Next)
- [ ] Build Buyer Lead Page
- [ ] Build Seller Lead Page
- [ ] Extend drag-and-drop to Landing Page Generator (video/image uploads)
- [ ] Booking notifications (email, SMS, desktop)
- [ ] Dark mode toggle functionality

#### P2 - Medium Priority
- [ ] Lead auction/bidding system for buyers
- [ ] Contact sync via iCloud Drive
- [ ] Extend property-folder storage for main listing images
- [ ] Refactor large page components (LandingPage, NewsletterPage, ContactsPage, LandingPagesPage)
- [ ] Stabilize Property Lookup Scrapers (Hillsborough/Pinellas)

#### P3 - Future Backlog
- [ ] Advanced reporting & analytics
- [ ] Multi-item drag-and-drop on Kanban boards
- [ ] Automated task generation from deals
- [ ] TMS Integration (needs TMS name from user)
- [ ] MLS API integration (needs credentials from user)

---

## Update: February 4, 2026 - Property Leads Management System

### New Feature: Property Leads
A comprehensive property-centric lead management system for managing leads imported from CSV or created manually.

#### Backend Implementation
- **Model:** `/app/backend/models/property_lead.py`
  - PropertyLeadCreate, PropertyLeadUpdate, PropertyLeadNote Pydantic models
  - Fields: address, city, state, zip, county, property details (beds, baths, sqft), value info, tax collector data, owner info, status, priority, tags, marketing data
- **Routes:** `/app/backend/routes/property_leads.py`
  - GET `/api/property-leads` - List with filters (status, priority, city) and pagination
  - GET `/api/property-leads/stats` - Statistics dashboard
  - GET `/api/property-leads/{id}` - Single lead detail
  - POST `/api/property-leads` - Create new lead
  - PUT `/api/property-leads/{id}` - Update lead
  - DELETE `/api/property-leads/{id}` - Delete lead
  - POST `/api/property-leads/{id}/notes` - Add note
  - DELETE `/api/property-leads/{id}/notes/{note_id}` - Delete note
  - POST `/api/property-leads/{id}/pull-owner-info` - Fetch tax records from county scrapers
  - POST `/api/property-leads/import-csv` - CSV import with flexible column mapping
  - GET `/api/property-leads/export/csv` - Export to CSV

#### Frontend Implementation
- **List Page:** `/app/frontend/src/pages/PropertyLeadsPage.jsx`
  - Stats cards (Total, New, Qualified, With Owner, With Value)
  - Search by address/city/owner/parcel
  - Status filter (All, New, Contacted, Qualified, Nurturing, Converted)
  - Priority filter (All, Urgent, High, Medium, Low)
  - Lead cards with quick actions
  - Import CSV modal with file upload
  - Add Property modal for manual entry
- **Detail Page:** `/app/frontend/src/pages/PropertyLeadDetailPage.jsx`
  - Left sidebar: Property card, Quick Stats, Owner Info (when available), Tags
  - Tabbed content: Overview, Notes, Activity
  - Overview tab: Property Details, Value Indicator, Tax Collector Data
  - Pull Owner Info button to fetch county tax records
  - Edit Property modal
  - Notes management (add/delete)
  - Activity log

#### Navigation
- Added "Property Leads" to sidebar with MapPinHouse icon
- Routes: `/property-leads` (list), `/property-leads/:id` (detail)

#### Features Tested & Verified
- List page with stats cards and filters ✅
- Manual lead creation via Add Property modal ✅
- CSV import functionality ✅
- Detail page with tabbed layout ✅
- Pull Owner Info from county scrapers ✅
- Notes and Activity tracking ✅
- Edit functionality ✅

---

## Update: February 4, 2026 - Marketing & Brochure System

### New Feature: 1-Click Brochure Maker & Marketing Workflow

A comprehensive marketing system for property leads that automates brochure generation, landing page creation, and email outreach.

#### Backend Implementation
- **Lead Scoring Service:** `/app/backend/services/brochure_generator.py`
  - `calculate_lead_score()` - Scores leads 0-100 based on data completeness
  - Categories: Address (15pts), Property (20pts), Value (20pts), Owner (25pts), Tax (10pts), Status (10pts)
  - Ratings: Excellent (80+), Good (60+), Fair (40+), Needs Data (<40)

- **Brochure Generator:** `/app/backend/services/brochure_generator.py`
  - `generate_single_page_brochure()` - 8.5x11 flyer with full property details
  - `generate_postcard_brochure()` - 6x4 postcard for direct mail
  - `generate_trifold_brochure()` - Landscape tri-fold layout
  - Features: Personalized owner name, property details, value display, QR code to landing page, agent contact info

- **Marketing Routes:** `/app/backend/routes/property_lead_marketing.py`
  - `GET /{lead_id}/score` - Get lead quality score
  - `POST /{lead_id}/brochure/generate` - Download brochure PDF
  - `POST /{lead_id}/brochure/preview` - Preview brochure inline
  - `POST /{lead_id}/brochure/email` - Email brochure to owner
  - `POST /{lead_id}/create-listing` - Create listing + landing page from lead
  - `POST /{lead_id}/publish-landing-page` - Publish the landing page
  - `POST /{lead_id}/upload-video` - Add walkthrough video
  - `POST /{lead_id}/marketing-workflow` - Run full automated workflow

#### Frontend Implementation
- **Marketing Tab:** Added to `/app/frontend/src/pages/PropertyLeadDetailPage.jsx`
  - Lead Score Card with visual breakdown
  - Brochure Generator with 3 template options
  - Property Landing Page management
  - Video upload section
  - 1-Click Marketing Workflow button

- **API Functions:** Added to `/app/frontend/src/lib/api.js`
  - `propertyLeadsAPI.getScore()`
  - `propertyLeadsAPI.generateBrochure()`
  - `propertyLeadsAPI.emailBrochure()`
  - `propertyLeadsAPI.createListing()`
  - `propertyLeadsAPI.publishLandingPage()`
  - `propertyLeadsAPI.uploadVideo()`
  - `propertyLeadsAPI.runMarketingWorkflow()`

#### Dependencies Added
- `reportlab` - PDF generation
- `qrcode` - QR code generation for brochures
- `pillow` - Image processing

#### Marketing Workflow Steps
1. **Create Listing** - Auto-generate listing from lead data
2. **Create Landing Page** - Generate property landing page with slug
3. **Add Video** - User records themselves with brochure, uploads video
4. **Publish Landing Page** - Make page publicly accessible
5. **Generate Brochure** - Create PDF with QR code linking to landing page
6. **Email to Owner** - Send personalized email with brochure attachment and landing page link

#### Features Tested & Verified
- Lead scoring calculates correctly ✅
- PDF brochure generation works (flyer template) ✅
- Marketing tab displays all components ✅
- API endpoints respond correctly ✅

---

## Update: February 4, 2026 - Task Notifications & Edit Feature

### New Features: Task Management Enhancements

#### Backend Changes
- **Task Model Update:** `/app/backend/models/task.py`
  - Added `TaskUpdate` model for PUT updates
  - Added `TaskNotificationSettings` model with fields:
    - `enabled` (bool)
    - `remind_before_hours` (int) - 1, 2, 6, 12, 24, 48, 72 hours
    - `remind_on_due` (bool)
    - `email_notification` (bool)

- **Task Routes Update:** `/app/backend/routes/tasks.py`
  - `PUT /api/tasks/{id}` - Full task update endpoint
  - `GET /api/tasks/{id}` - Get single task
  - `GET /api/tasks/due/today` - Get tasks due today
  - `GET /api/tasks/due/upcoming` - Get tasks due in next X days
  - Automatic notification creation on task create/update/status change/delete

#### Frontend Changes
- **TasksPage.jsx:**
  - Added Edit button in task card dropdown menu
  - Edit dialog with all task fields + notification settings
  - Notification settings section in Create dialog
  - Bell icon on task cards indicating notifications enabled
  - Fixed SelectItem empty value error

- **API Functions:** `/app/frontend/src/lib/api.js`
  - `tasksAPI.get(id)`
  - `tasksAPI.update(id, data)`
  - `tasksAPI.getDueToday()`
  - `tasksAPI.getUpcoming(days)`

#### Features Tested & Verified
- Task creation with notifications ✅
- Task update via Edit dialog ✅
- Status change creates notification ✅
- Notification settings persist ✅
- Bell icon displays on cards with notifications ✅

---

## Update: February 4, 2026 - Property Data Scraper (Generate Button)

### New Feature: Property Data Generation from Real Estate Websites

#### Backend Implementation
- **Property Scraper Service:** `/app/backend/services/property_scraper.py`
  - Multi-source scraper for Zillow, Redfin, and Realtor.com
  - Extracts: price, bedrooms, bathrooms, sqft, lot size, year built, property type, description
  - Scrapes property listing images (up to 30 images)
  - Generates Google Street View links
  - Combines data from all sources (first found wins)
  - Deduplicates images across sources
  - Handles rate limiting with delays and rotating user agents

- **API Endpoints Added:** `/app/backend/routes/property_lead_marketing.py`
  - `POST /api/property-leads/{id}/generate-data` - Scrape property data from all sources
  - `POST /api/property-leads/{id}/convert-to-showcase` - Convert lead to showcase listing with scraped images
  - `POST /api/property-leads/listings/{id}/generate-data` - Scrape data for existing listings

#### Frontend Implementation
- **Generate Property Data Card:** Added to Marketing tab in PropertyLeadDetailPage
  - Blue-themed card with "Generate" button
  - Displays sources found (Zillow, Redfin, Realtor.com badges)
  - Shows source URLs with external links
  - Image preview grid (first 4 images)
  - "View All" button opens images modal
  - Google Street View link
  - "Convert to Showcase Listing" button
  - Last scraped timestamp

- **Images Modal:** Full-screen gallery of all scraped images
  - Grid view with source badges
  - External link to view original
  - "Convert to Showcase" action

- **API Functions:** Added to `/app/frontend/src/lib/api.js`
  - `propertyLeadsAPI.generateData(id)`
  - `propertyLeadsAPI.convertToShowcase(id)`
  - `listingsAPI.generateData(id)`

#### Data Flow
1. User clicks "Generate" on Property Lead
2. Backend scrapes Zillow, Redfin, Realtor.com concurrently
3. Data is combined (price, beds, baths, sqft, etc.)
4. Images are collected and deduplicated
5. Lead is updated with scraped data
6. User can "Convert to Showcase" to create a full listing with images

#### Limitations
- Real estate websites may block scrapers (403/429 errors)
- Results vary based on property availability on each platform
- Some properties may not be found on any source

---


## Update: February 4, 2026 - Property Lookup Page Enhancement

### Bug Fix: Blank Property Lookup Page
Fixed a JSX syntax error in `/app/frontend/src/pages/PropertyLookupPage.jsx` that was causing the page to render blank.
- **Root Cause:** Missing closing brace `}` on line 863 for the conditional rendering block
- **Error:** `SyntaxError: Expected corresponding JSX closing tag for <>.`
- **Fix:** Added the missing `}` after the Property Leads view conditional block

### New Feature: Data Source Selector on Property Lookup Page
Added a dropdown/toggle to switch between two data sources on the Property Lookup page:

#### Data Sources
1. **County Records** (default) - Search county tax records
   - Address input with county dropdown (Hillsborough, Pinellas, Pasco)
   - Recent searches section with clickable history
   - Search results list with property details
   - Assign to Listing functionality

2. **Property Leads** - View imported CSV leads
   - List of all imported property leads
   - Search/filter by address, city, owner name, zip
   - Lead details panel when clicked
   - Quick actions: View Full Details, Refresh
   - Navigation to full lead detail page

#### UI Changes
- Two data source buttons at top of page with icons (Database, Users)
- Visual highlight (amber border/background) on selected source
- Dynamic content switching based on selection
- Consistent card layouts across both views

#### Files Modified
- `/app/frontend/src/pages/PropertyLookupPage.jsx` - Added data source state, leads fetching, and conditional rendering

#### Features Tested & Verified
- Page renders without blank page error ✅
- Data Source selector shows both options ✅
- County Records view works with search, county dropdown, recent searches ✅
- Property Leads view shows leads list with search filtering ✅
- Lead details panel displays when lead selected ✅
- View Full Details navigates to lead detail page ✅
- Switching between views works correctly ✅

---

## Current Status (February 4, 2026)

### Working Features
- Property Leads Management (list + detail pages)
- 1-Click Brochure Maker with lead scoring
- Task Edit & Notifications
- Property Lookup with County Records & Property Leads views

### Known Issues
- **Web Scraper Blocked (P1):** Zillow/Redfin/Realtor.com are returning 403/429 errors. Direct scraping is unreliable - recommend professional API solution.
- **iDrive e2 Storage (P1):** Invalid credentials - blocked on user providing new credentials.
- **Deployment Workflow (P1):** Manual data seeding process needs proper automation.

### Upcoming Tasks (P1)
- Build Buyer Lead Page
- Build Seller Lead Page
- "Convert Listing to Lead" feature from showcase listings
- Implement robust scraping solution (professional API)

### Backlog
- TMS Integration
- Advanced Lead Management (auction/bidding)
- Advanced Reporting & Analytics
- Booking Notifications (email, SMS, desktop)
- PWA "Don't Ask Again" cookie (waiting for user icon asset)


---

## Update: February 4, 2026 - Media Library Dropdown Menu Enhancement

### Feature: 3-Dot Dropdown Menu for Media Files

Added a unified 3-dot dropdown menu for all files in the Media Library with consistent actions.

#### UI Changes
- **Site Images:** Replaced inline buttons with dropdown menu on hover
- **Property Folder Files:** Updated dropdown to match Site Images (removed Download, added Get URL)
- **List View:** Same dropdown menu pattern for consistency

#### Dropdown Menu Options
1. **Preview** - Opens image/video preview modal
2. **Rename** - Opens rename dialog with current filename pre-filled
3. **Get URL** - Copies file URL to clipboard (shows toast "URL copied to clipboard!")
4. **Delete** - Removes file (with confirmation)

#### Backend Changes
- Added `PUT /api/site-images/{filename}/rename` endpoint for renaming site images
- Security: Path traversal protection on all file operations

#### Frontend Changes
- Updated `/app/frontend/src/pages/MediaLibraryPage.jsx`:
  - Replaced inline buttons with DropdownMenu component for Site Images
  - Added `Get URL` option to property folder file dropdowns
  - Consistent 4-option menu across all file types
  - Images use `object-cover` for proper rendering in grid boxes
- Added `renameSiteImage()` to `/app/frontend/src/lib/api.js`

#### Files Modified
- `/app/frontend/src/pages/MediaLibraryPage.jsx`
- `/app/frontend/src/lib/api.js`
- `/app/backend/server.py`

#### Features Tested & Verified
- Media Library page loads with folder sidebar ✅
- Site Images grid shows proper image rendering ✅
- 3-dot dropdown menu appears on hover ✅
- All 4 options work correctly ✅
- Backend rename API with security checks ✅


---

## Update: February 4, 2026 - Lead Scoring Rules System

### Feature: Lead Scoring Configuration in Developer Settings

Built a comprehensive Lead Scoring Rules system that allows configuring rules to automatically score incoming leads based on data quality.

#### Key Features
1. **Points-Based Scoring** - Each rule adds/subtracts points from lead score
2. **AI Verification** - Optional AI validation of data before scoring (email format, phone validity, etc.)
3. **Two Lead Types** - Separate rule sets for Property/Seller leads and Buyer leads
4. **Category-Based Organization** - Rules grouped by: Contact Info, Property Details, Value Info, Location, Owner Info, Source, Preferences, Qualification, Engagement

#### Backend Implementation
- **Model:** `/app/backend/models/lead_scoring.py`
  - `ScoringRuleCreate`, `ScoringRuleUpdate` - Pydantic models
  - `SCORING_FIELD_DEFINITIONS` - Available fields per lead type
  - `OPERATOR_DEFINITIONS` - Comparison operators (exists, equals, greater_than, etc.)

- **Service:** `/app/backend/services/lead_scoring_service.py`
  - `evaluate_condition()` - Checks single condition
  - `evaluate_rule()` - Checks all conditions (AND logic)
  - `verify_data_with_ai()` - AI verification using GPT-4o-mini
  - `calculate_lead_score()` - Main scoring function
  - `DEFAULT_PROPERTY_SELLER_RULES` - 12 default rules
  - `DEFAULT_BUYER_RULES` - 9 default rules

- **Routes:** `/app/backend/routes/lead_scoring.py`
  - `GET /api/lead-scoring/rules` - List rules with filters
  - `POST /api/lead-scoring/rules` - Create rule
  - `PUT /api/lead-scoring/rules/{id}` - Update rule
  - `DELETE /api/lead-scoring/rules/{id}` - Delete rule
  - `POST /api/lead-scoring/rules/{id}/toggle` - Toggle active status
  - `POST /api/lead-scoring/score/property-lead/{id}` - Score property lead
  - `POST /api/lead-scoring/score/buyer-lead/{id}` - Score buyer lead
  - `POST /api/lead-scoring/score/batch` - Batch scoring
  - `GET /api/lead-scoring/fields` - Get field definitions
  - `GET /api/lead-scoring/operators` - Get operators
  - `GET /api/lead-scoring/stats` - Get statistics
  - `POST /api/lead-scoring/seed-defaults` - Seed default rules

#### Frontend Implementation
- **Settings Page:** `/app/frontend/src/pages/settings/developer/LeadScoringSettings.jsx`
  - Stats cards (Total Rules, Active Rules, Scored Leads)
  - Tabs for Property/Seller vs Buyer leads
  - Collapsible category sections
  - Rule cards with toggle, edit, delete actions
  - Create/Edit Rule modal with condition builder
  - AI verification toggle per rule
  - Priority setting

- **API Functions:** `/app/frontend/src/lib/api.js`
  - `leadScoringAPI` object with all CRUD methods

#### Default Rules Seeded
**Property/Seller (12 rules):**
- Has Owner Email (+15 pts, AI verified)
- Has Owner Phone (+15 pts, AI verified)
- Has Owner Name (+10 pts)
- High Value Property $500k+ (+20 pts)
- Luxury Property $1M+ (+30 pts)
- Has Property Details (+10 pts)
- Large Home 4+ beds (+10 pts)
- Has Pool (+5 pts)
- Waterfront Property (+15 pts)
- Non-Homestead/Investor (+10 pts)
- Absentee Owner (+10 pts)
- Target City - Tampa (+5 pts, inactive)

**Buyer (9 rules):**
- Has Email (+10 pts, AI verified)
- Has Phone (+10 pts, AI verified)
- Pre-Approved Buyer (+25 pts)
- Cash Buyer (+30 pts)
- High Budget $500k+ (+20 pts)
- Luxury Buyer $1M+ (+30 pts)
- Ready to Buy (+15 pts)
- Wants Waterfront (+10 pts)
- Active Searcher (+15 pts)

#### Scoring Algorithm
```
total_score = sum of matched rule points
max_possible = sum of active positive-point rules
percentage = (total_score / max_possible) * 100
rating = excellent (80%+) | good (60-79%) | fair (40-59%) | poor (<40%)
```

#### Tests & Verification
- All 18 backend API tests passed ✅
- All frontend features working ✅
- Test file: `/app/backend/tests/test_lead_scoring.py`
- 21 rules seeded successfully


---

## Update: February 4, 2026 - Deal Pipeline View Toggle

### Feature: Kanban & List View Toggle for Deal Pipeline

Enhanced the Deal Pipeline page with a view toggle to switch between Kanban board and List/Table view with sortable columns.

#### View Toggle
- **Kanban View** (default): Cards arranged in 5 stage columns with drag-and-drop
- **List View**: Table format with sortable column headers and drag-to-reorder rows

#### Kanban View Features
- 5 stage columns: Leads, Qualified, Proposal, Negotiation, Closed Won
- Drag-and-drop cards between columns to change stage
- Visual feedback during drag (rotation, shadow, opacity)
- Uses @dnd-kit library for smooth drag interactions
- Framer Motion animations for card transitions

#### List View Features
- Sortable columns: Deal, Stage, Value, Contact, Property, Created
- Click column header to sort (toggles asc/desc)
- Amber arrow indicator on active sort column
- Drag rows to reorder
- Inline stage dropdown to change stage without modal
- 3-dot menu with Edit/Delete options

#### Stats Summary Cards
- Shows count and total value for each stage
- Updates automatically when deals move between stages

#### Backend Updates
- Added `PUT /api/deals/{id}` endpoint for full deal update
- Updated Deal model to include `property_address` and `updated_at` fields
- Made `contact_id` optional

#### Files Modified
- `/app/frontend/src/pages/DealsPage.jsx` - Complete rewrite with dual views
- `/app/frontend/src/lib/api.js` - Added `dealsAPI.update()` function
- `/app/backend/routes/deals.py` - Added PUT update endpoint
- `/app/backend/models/deal.py` - Added property_address, made contact_id optional

#### Tests & Verification
- All 15 backend API tests passed ✅
- All frontend features verified ✅
- Test file: `/app/backend/tests/test_deals.py`

---

## Update: February 5, 2026 - Unified CSV Import System

### Feature: Unified CSV Import Modal

Completed the unified CSV import system that allows users to choose the destination (Listings or Property Leads) when importing CSV data.

#### Implementation Details
- **PropertyLeadsPage**: Added unified import modal with destination toggle
  - Default destination: "Property Leads"
  - Can toggle to "Listings" to import to public showcase
- **ListingsPage**: Already had the unified import modal
  - Default destination: "Listings"
  - Can toggle to "Property Leads" to import to CRM

#### Modal UI Features
- Destination toggle buttons with icons (Users for Property Leads, Home for Listings)
- Dynamic description text based on selected destination
- File upload input with styled button
- Expected CSV columns info box
- Import result display with success/skip counts
- Cancel and Import action buttons
- Import button disabled until file is selected

#### Files Modified
- `/app/frontend/src/pages/PropertyLeadsPage.jsx`
  - Added `listingsAPI` import
  - Added `importDestination` state (default: 'leads')
  - Updated `handleImport` to route to correct API based on destination
  - Replaced old import modal with unified modal matching ListingsPage

#### Tests & Verification
- All 14 frontend tests passed ✅
- Modal opens correctly on both pages
- Destination toggle works correctly
- Default destinations are context-appropriate
- File input and button states work correctly
- Test report: `/app/test_reports/iteration_12.json`

---

## Update: February 9, 2026 - In-App Email Composer with Signatures

### Feature: Email Composer Modal with User Signatures

Added a comprehensive in-app email composer that intercepts email actions and provides a rich composition experience with automatic signature appending.

#### Implementation Details

**Signature Settings Page:** `/app/frontend/src/pages/settings/profile/SignatureSettings.jsx`
- Located at Settings > Profile > Email Signature
- Fields: Full Name, Title/Position, Phone, Email, Company, Website, Custom HTML
- Save Signature and Show Preview buttons
- Auto-generated signature preview from fields
- Optional custom HTML for advanced signatures

**Backend Endpoints:** `/app/backend/routes/users.py`
- `GET /api/users/me/signature` - Fetch current user's signature
- `POST /api/users/me/signature` - Save/update signature

**Email Composer Integration:**
- **ContactsPage:** Blue email icon on contact cards, opens WYSIWYG email composer
- **PropertyLeadsPage:** Email icon appears when lead has owner_email
- **SellerLeadsPage:** Email icon on leads with email addresses
- Modal displays: recipient info, subject field, WYSIWYG rich text editor, signature preview
- **USES SYSTEM SMTP** - Emails are sent directly from the CRM via configured SMTP

#### Files Modified
- `/app/frontend/src/pages/ContactsPage.jsx` - Uses EmailComposerModal component
- `/app/frontend/src/pages/PropertyLeadsPage.jsx` - Uses EmailComposerModal component
- `/app/frontend/src/pages/SellerLeadsPage.jsx` - Uses EmailComposerModal component
- `/app/frontend/src/components/EmailComposerModal.jsx` - **NEW** Reusable WYSIWYG email composer using Tiptap
- `/app/frontend/src/pages/settings/developer/EmailSettings.jsx` - **UPDATED** Full SMTP configuration page
- `/app/backend/routes/email.py` - **NEW** SMTP settings and email sending endpoints

#### Backend Endpoints Added
- `GET /api/email/smtp-settings` - Get SMTP configuration
- `POST /api/email/smtp-settings` - Save SMTP configuration
- `POST /api/email/smtp-settings/test` - Send test email
- `POST /api/email/send` - Send email via SMTP with automatic signature appending

#### Tests & Verification
- SMTP settings page loads and saves correctly ✅
- Email composer modal opens with WYSIWYG editor (Tiptap) ✅
- Shows "SMTP Not Configured" warning when SMTP is not set up ✅
- Signature is fetched and displayed in preview ✅
- Email icon visible on Contacts, Property Leads, Seller Leads pages ✅

---

## Update: February 9, 2026 - SkyReels V3 Video Generation Integration

### Feature: AI Video Generator Page

Integrated SkyReels V3 API via PiAPI for AI video generation from images.

#### Implementation Details

**Backend Service:** `/app/backend/services/skyreels_service.py`
- Supports multiple providers: Vyro/Imagine API, PiAPI, SkyReels Direct
- Image-to-video generation with customizable prompts
- Async task status polling for long-running video generation
- Configurable aspect ratios (9:16, 16:9, 1:1)

**Backend Routes:** `/app/backend/routes/skyreels.py`
- `POST /api/skyreels/generate` - Generate video from image URL
- `POST /api/skyreels/generate-with-image` - Generate video with uploaded image
- `POST /api/skyreels/property-video` - Generate property introduction video
- `GET /api/skyreels/status/{task_id}` - Check video generation status
- `GET /api/skyreels/history` - Get user's video generation history
- `GET /api/skyreels/config` - Check if API is configured

**Frontend Page:** `/app/frontend/src/pages/VideoGeneratorPage.jsx`
- Source Image input (URL or file upload)
- Prompt customization for video generation
- Aspect ratio selector (Portrait/Landscape/Square)
- Real-time generation status with progress tracking
- Generation history with timestamps
- API configuration status banner

**Sidebar Integration:**
- Added "Video Generator" to Tools menu in sidebar
- Uses Video icon from lucide-react

#### Environment Variables
- `SKYREELS_API_KEY` - API key for SkyReels/PiAPI/Vyro

#### Files Created/Modified
- `/app/backend/services/skyreels_service.py` - SkyReels service class
- `/app/backend/routes/skyreels.py` - API routes
- `/app/backend/routes/__init__.py` - Router registration
- `/app/backend/server.py` - Added dotenv loading for .env file support
- `/app/frontend/src/pages/VideoGeneratorPage.jsx` - **NEW** Video generator page
- `/app/frontend/src/App.js` - Added route for /video-generator
- `/app/frontend/src/components/layout/Sidebar.jsx` - Added Video Generator to Tools menu

#### API Key Status
- User provided API key has been saved but returned "Invalid api key" from both Vyro and PiAPI
- User needs to verify the API key or provide a valid one from:
  - PiAPI: https://piapi.ai/workspace/skyreels
  - Imagine.art/Vyro: https://www.imagine.art/api/home
  - SkyReels.ai: https://www.skyreels.ai/document

#### Tests & Verification
- Config endpoint returns API configured status ✅
- Video generator page renders correctly ✅
- Generation history displays past attempts ✅
- Sidebar navigation works ✅


### APIFree.ai Integration Details (Updated)

**Provider:** APIFree.ai (https://api.apifree.ai)
**Model:** skywork-ai/skyreels-v3/pro/single-avatar

**Endpoints Used:**
- `POST /v1/video/submit` - Submit video generation request
- `GET /v1/video/{request_id}/status` - Check generation status
- `GET /v1/video/{request_id}/result` - Get final video URL

**Request Format:**
```json
{
  "model": "skywork-ai/skyreels-v3/pro/single-avatar",
  "first_frame_image": "URL to avatar image",
  "audios": ["URL to audio file"],
  "prompt": "Description of video content"
}
```

**Async Workflow:**
1. Submit request → receive request_id
2. Poll status endpoint until status = "success"
3. Get result with video URL

**Status Values:**
- `queuing` - Request in queue
- `processing` - Video being generated
- `success` - Complete, video ready
- `error` - Generation failed


---

## Update: February 9, 2026 - Property Images Gallery

### Feature: Property Lead Image Gallery

Added a dedicated image gallery for each property lead that persists permanently with the property.

#### Implementation Details

**Backend Routes:** `/app/backend/routes/property_leads.py`
- `GET /api/property-leads/{lead_id}/images` - Get all images for a property
- `POST /api/property-leads/{lead_id}/images/upload` - Upload single image
- `POST /api/property-leads/{lead_id}/images/upload-multiple` - Upload multiple images
- `GET /api/property-leads/{lead_id}/images/file/{filename}` - Serve image file
- `DELETE /api/property-leads/{lead_id}/images/{image_id}` - Delete an image
- `PUT /api/property-leads/{lead_id}/images/reorder` - Reorder images

**Storage:** Images stored locally at `/app/backend/static/property-images/{lead_id}/`

**Frontend Component:** `/app/frontend/src/components/PropertyImagesGallery.jsx`
- Drag & drop upload support
- Multi-file upload
- Image preview with zoom
- Delete functionality
- Grid layout with thumbnails

**Integration:** Added to Marketing tab on Property Lead Detail page

#### Database Schema
Images stored in `property_leads.gallery_images[]` array:
```json
{
  "id": "uuid",
  "filename": "unique_filename.jpg",
  "original_name": "user_uploaded_name.jpg",
  "url": "/api/property-leads/{lead_id}/images/file/{filename}",
  "size": 12345,
  "content_type": "image/jpeg",
  "uploaded_by": "User Name",
  "uploaded_at": "ISO timestamp"
}
```

#### Files Created/Modified
- `/app/backend/routes/property_leads.py` - Added image endpoints
- `/app/frontend/src/components/PropertyImagesGallery.jsx` - **NEW** Gallery component
- `/app/frontend/src/lib/api.js` - Added image API methods
- `/app/frontend/src/pages/PropertyLeadDetailPage.jsx` - Added gallery to Marketing tab


---

## Update: February 10, 2026 - Contact Detail Display Fix

### Bug Fix: Contact Detail Panel Not Showing iPhone Import Data

The contact detail view (side panel when clicking a contact) was not displaying the correct information from imported iPhone contacts CSV.

#### Problem
The `ContactDetail` component in `/app/frontend/src/pages/ContactsPage.jsx` was only displaying basic fields (`name`, `email`, `phone`, `company`) and missing the iPhone-specific fields that were imported (e.g., `display_name`, `mobile_phone`, `home_phone`, `business_phone`, `email_2`, `email_3`, `organization`, `job_title`, etc.).

#### Solution
Updated the `ContactDetail` component to:
1. **Use fallback display name logic**: `display_name` → `name` → `first_name + last_name` → `organization`
2. **Show multiple email addresses**: Display `email`, `email_2`, `email_3` with copy buttons
3. **Show multiple phone numbers with labels**: Mobile, Home, Work (using `mobile_phone`, `home_phone`, `business_phone` fields)
4. **Display organization/company**: Uses both `company` and `organization` fields
5. **Show job title**: From `job_title` or `position` fields
6. **Show department** when available
7. **Display address information**: Home and Business addresses in a new Addresses card
8. **Additional fields in Quick Info**: Birthday, website when available
9. **Fixed sidebar buttons**: Call and Email buttons now use the correct primary phone/email

#### Files Modified
- `/app/frontend/src/pages/ContactsPage.jsx` - Updated `ContactDetail` component

#### Verified Working
- ✅ Display name shows correctly for iPhone-imported contacts
- ✅ Multiple emails display with copy buttons
- ✅ Multiple phone numbers display with type labels (Mobile, Home, Work)
- ✅ Company/Organization displays correctly
- ✅ Job title displays when available
- ✅ Call and Email buttons use the best available contact info
- ✅ Timeline shows source as "iphone_import"

---

## Current Pending Issues

### P0 - Critical
1. **Bookings Data Loss** - User's booking data was wiped. Root cause unknown. Investigation needed.
2. **Unreliable Production Deployments** - Manual process causing data discrepancies.

### P1 - High Priority
1. **Web Scrapers Broken** - Zillow, Redfin, Realtor.com blocking requests (403/429). BLOCKED - needs paid API.
2. **iDrive e2 Storage** - Invalid credentials. BLOCKED - awaiting user.

### P2 - Medium Priority
1. **SMTP Not Configured** - User needs to add credentials in Settings → Developer → Email Settings.
2. **PWA "Don't Ask Again" Cookie** - Not implemented yet.

---

## Upcoming Tasks

### P1 - Next Up
1. Build Buyer Lead Page
2. Complete Foldable Brochure Design (blocked on inside panel design)

### P2 - Future
1. TMS Integration
2. Advanced Lead Management (auction/bidding system)
3. Advanced Reporting & Analytics
4. Contact Sync via iCloud Drive
5. Booking Notifications (email, SMS, desktop)



---

## Update: February 11, 2026 - MLS Integration & Moderation Queue Complete

### Feature: Property Lead Moderation Queue

Completed the Property Leads page enhancement with a tabbed interface supporting both lead management and a moderation queue for website-submitted leads.

### Feature: Jacquie Lawson Card Integration

**Description:** Full integration for sending animated greeting cards to CRM contacts via Jacquie Lawson's subscription service.

**Backend Implementation:**
- `POST /api/jacquie-lawson/config` - Save JL credentials and settings
- `GET /api/jacquie-lawson/config` - Get configuration
- `POST /api/jacquie-lawson/test` - Test login credentials
- `GET /api/jacquie-lawson/stats` - Get card sending statistics
- `POST /api/jacquie-lawson/send` - Send card (immediate or scheduled)
- `GET /api/jacquie-lawson/queue` - Get scheduled cards
- `GET /api/jacquie-lawson/history` - Get sent card history
- `GET /api/jacquie-lawson/upcoming-occasions` - Get contacts with upcoming birthdays/anniversaries
- Browser automation service using Playwright for card sending

**Frontend Implementation:**
- **Settings Page** (`/settings/developer/jacquie-lawson`):
  - Account Credentials tab (email, password, sender name)
  - Automation Settings tab (toggle auto-send for birthdays, anniversaries, home purchase anniversaries)
  - Default Cards tab (set default card URLs per occasion)
- **Contact Detail Page:**
  - "Quick Actions" card with pink "Send Greeting Card" button
  - Shows Important Dates (birthday, anniversary, home purchase anniversary)
  - Send Card Modal with occasion selector, card URL input, personal message, scheduling

**Contact Model Updated:**
- Added `home_purchase_anniversary` date field
- Added `contact_type` field (buyer/seller)
- Edit tab now has date pickers for Birthday, Anniversary, Home Purchase Anniversary

**Files Created:**
- `/app/frontend/src/pages/settings/developer/JacquieLawsonSettings.jsx`
- `/app/backend/routes/jacquie_lawson.py`
- `/app/backend/services/jacquie_lawson_service.py`

**Files Modified:**
- `/app/frontend/src/pages/ContactsPage.jsx` - Added Quick Actions card and Send Card modal
- `/app/backend/models/contact.py` - Added new date fields
- `/app/backend/routes/__init__.py` - Registered JL router
- `/app/frontend/src/App.js` - Added JL settings route
- `/app/frontend/src/components/layout/SettingsLayout.jsx` - Added JL menu item

#### Implementation Details

**Backend Endpoints (Already Implemented):**
- `POST /api/property-leads/submit` - Public endpoint for website form submissions (no auth required)
  - Creates leads with `moderation_status: "pending_review"`
  - Captures: address, city, state, zip, owner info, message
- `GET /api/property-leads/moderation/pending` - Get all pending leads
- `GET /api/property-leads/moderation/stats` - Get moderation statistics (pending, approved_today, rejected_today, by_source)
- `POST /api/property-leads/moderation/{lead_id}/approve` - Approve a pending lead
- `POST /api/property-leads/moderation/{lead_id}/reject` - Reject a pending lead with optional reason

**Frontend UI (Completed):**
- **Tabbed Interface** on PropertyLeadsPage with:
  - "All Leads" tab - Shows approved leads with search/filters
  - "Moderation Queue" tab - Shows pending website submissions
- **Moderation Queue Features:**
  - Pending lead cards showing address, location, owner info, submission message
  - "Pending Review" and "Website Form" badges
  - "Approve" button (green) - Approves and moves to main leads
  - "Reject" button (red) - Opens rejection dialog with optional reason
  - "All Caught Up!" empty state when no pending leads
- **Stats Cards** - Updated to show "Pending Review" count with orange highlight

**MLS Integration Scaffolding:**
- `GET /api/mls/status` - Check MLS API configuration status
- `GET /api/mls/search` - Search MLS properties (returns mock data until configured)
- `POST /api/property-leads/from-mls` - Create lead from MLS data
- **MLS Import Modal** in PropertyLeadsPage with:
  - Search filters (city, zip, price range, bedrooms, status)
  - Property result cards with import button
  - Note: Returns mock data until Bridge API credentials are provided

#### Files Modified
- `/app/frontend/src/pages/PropertyLeadsPage.jsx` - Complete with moderation queue UI
- `/app/frontend/src/lib/api.js` - mlsAPI and moderationAPI functions already present
- `/app/backend/routes/property_leads.py` - Moderation endpoints implemented
- `/app/backend/routes/mls.py` - MLS placeholder routes
- `/app/backend/services/mls_service.py` - MLS service with mock data

#### Tests & Verification
- Public submission endpoint works ✅
- Moderation stats endpoint returns correct counts ✅
- Approve endpoint changes status to "approved" ✅
- Reject endpoint changes status to "rejected" with reason ✅
- Moderation Queue tab displays pending leads correctly ✅
- Approve/Reject buttons function correctly ✅

#### MLS Integration Status
- **BLOCKED**: Awaiting Bridge API credentials from user
- Mock data is returned for search functionality
- Once credentials are provided, the integration will use Stellar MLS via Bridge API

---

## Current Status (February 11, 2026)

### Completed Today
- ✅ Property Leads Moderation Queue UI fully functional
- ✅ Public submission endpoint working
- ✅ Approve/Reject workflow tested and verified
- ✅ MLS Integration scaffolding complete (awaiting credentials)
- ✅ **MLS Settings Page** added to Developer Settings menu (`/settings/developer/mls`)
  - Connection status display
  - API Configuration form (MLS Name, Dataset ID, API Key, API Secret, Server Token)
  - Enable/Disable toggle
  - Auto-sync option with interval configuration
  - Test Connection button
  - Setup instructions

### Known Issues (Unchanged)
- **P0:** Bookings data loss (not investigated)
- **P0:** Unreliable production deployments
- **P1:** Web scrapers blocked (awaiting user decision on paid API)
- **P1:** iDrive e2 storage credentials invalid
- **P2:** SMTP not configured
- **P2:** PWA "Don't Ask Again" cookie not implemented

### Upcoming Tasks
1. **P0:** MLS Integration activation (blocked on Bridge API credentials)
2. **P1:** Build Buyer Lead Page
3. **P1:** Complete Foldable Brochure Design (blocked on inside panel design)
4. **P2:** Refactor ContactsPage.jsx (2000+ lines → smaller components)

### Backlog
- TMS Integration
- Advanced Lead Management (auction/bidding)
- Advanced Reporting & Analytics
- Contact Sync via iCloud Drive
- Booking Notifications (email, SMS, desktop)



---

## Update: February 17, 2026 - Automated Mortgage Rate Updates (FRED API)

### Feature: Automated Mortgage Rate Fetching

Implemented automatic mortgage rate updates using the Federal Reserve Economic Data (FRED) API. Rates are now fetched automatically every 2 weeks, eliminating the need for manual updates.

#### Backend Implementation

**New Service:** `/app/backend/services/mortgage_rates_service.py`
- `fetch_fred_rate()` - Fetches a single rate from FRED API
- `fetch_all_rates()` - Fetches all available rates and estimates others
- `update_mortgage_rates_from_fred()` - Main update function
- Fetches 30-year and 15-year conventional rates directly from FRED
- Estimates FHA, VA, USDA rates based on typical market spreads

**Scheduler Integration:** `/app/backend/server.py`
- Added APScheduler with AsyncIOScheduler
- Background job runs every 2 weeks
- Initial fetch on startup if no FRED rates exist
- Graceful shutdown of scheduler

**New Endpoints:** `/app/backend/routes/settings.py`
- `POST /api/settings/mortgage-rates/fetch-fred` - Manual trigger for FRED fetch (admin only)
- `GET /api/settings/mortgage-rates/status` - Get automation status (admin only)

#### Frontend Implementation

**Updated:** `/app/frontend/src/pages/settings/admin/MortgageRatesSettings.jsx`
- Added automation status card showing:
  - FRED API configuration status
  - Update interval (every 2 weeks)
  - Data source indicator
  - "Fetch Latest Rates Now" button
- Auto-update badge showing when rates were fetched by FRED vs manual
- Updated info box with automation tips

#### Environment Variables
- `FRED_API_KEY` - Added to `/app/backend/.env`

#### Data Flow
1. Scheduler runs every 2 weeks (or on startup if no data)
2. Fetches MORTGAGE30US and MORTGAGE15US from FRED API
3. Estimates other rates (FHA, VA, USDA) based on market spreads
4. Saves to `mortgage_rates` collection with metadata
5. Manual fetch available via admin UI

#### Rates Fetched (February 17, 2026)
- 30-Year Fixed: 6.09% (from FRED)
- 15-Year Fixed: 5.44% (from FRED)
- 20-Year Fixed: 5.84% (estimated)
- FHA 30yr: 5.715% (estimated)
- VA 30yr: 5.465% (estimated)

#### Files Created
- `/app/backend/services/mortgage_rates_service.py`

#### Files Modified
- `/app/backend/server.py` - Added scheduler, startup event, shutdown cleanup
- `/app/backend/routes/settings.py` - Added FRED fetch and status endpoints
- `/app/backend/.env` - Added FRED_API_KEY
- `/app/frontend/src/pages/settings/admin/MortgageRatesSettings.jsx` - Added automation UI

#### Dependencies Added
- `apscheduler` - Background job scheduling
- (httpx was already installed)

### Verified & Tested
- FRED API integration working ✅
- Scheduler starts on backend startup ✅
- Initial fetch runs if no rates exist ✅
- Manual fetch button works ✅
- Automation status endpoint returns correct data ✅
- Rates display correctly in UI ✅

---

## Current Status (February 17, 2026)

### Completed Today
- ✅ Automated Mortgage Rate Updates via FRED API
- ✅ Background scheduler running every 2 weeks
- ✅ Manual "Fetch Latest Rates Now" button in admin UI
- ✅ Automation status display in settings

### Known Issues (Unchanged)
- **P0:** Bookings data loss (not investigated)
- **P0:** Unreliable production deployments
- **P1:** Contact Import - user verification pending on production
- **P1:** Smart List Email - user needs to test on production
- **P1:** Web scrapers blocked (awaiting user decision on paid API)
- **P1:** iDrive e2 storage credentials invalid

### Upcoming Tasks
1. **P0:** MLS Integration activation (blocked on Bridge API credentials)
2. **P1:** Build Buyer Lead Page
3. **P1:** Jacquie Lawson Card Sender automation
4. **P1:** Social Media Auto-Poster

### Backlog
- Refactor ContactsPage.jsx (~2900 lines → smaller components)
- TMS Integration
- Advanced Lead Management (auction/bidding)
- Advanced Reporting & Analytics
- Booking Notifications (email, SMS, desktop)

---

## Update: February 18, 2026 - Un-convert Property Lead Feature

### Feature: Un-convert Property Lead from Showcase Listing

Implemented the ability to revert a property lead that was previously converted to a showcase listing. This provides a safety mechanism for accidental conversions and allows users to edit and re-convert leads.

#### Backend Implementation
- **Endpoint:** `POST /api/property-leads/{lead_id}/unconvert`
  - Query param: `delete_listing` (boolean, default=true)
  - When `delete_listing=true`: Deletes the associated showcase listing from `properties` collection
  - When `delete_listing=false`: Only resets the lead status, preserves the listing
  - Resets lead status to previous state (from activity log, or 'new' as fallback)
  - Clears `converted_to_listing_id`, `converted_at`, `converted_by` fields
  - Adds "unconverted" entry to activity log

#### Frontend Implementation
- **UI Changes:** `/app/frontend/src/pages/PropertyLeadDetailPage.jsx`
  - Conditional button rendering based on lead status:
    - Non-converted leads: Shows "Convert to Showcase Listing" button
    - Converted leads: Shows "View Showcase Listing" + "Un-convert Lead" buttons
  - Two-step confirmation dialog:
    1. First confirm asks whether to delete the listing (OK = delete, Cancel = keep)
    2. Second confirm asks for final confirmation
  - Added `data-testid` attributes for testing
  - Toast notifications with appropriate success messages

- **API Function:** `/app/frontend/src/lib/api.js`
  - `propertyLeadsAPI.unconvertFromShowcase(id, deleteListing)` - line 422

#### Test Results
- **Backend:** 100% (6/6 tests passed)
- **Frontend:** 100% (12/12 tests passed)
- Test file: `/app/backend/tests/test_unconvert_property_leads.py`
- Test report: `/app/test_reports/iteration_14.json`

#### Files Modified
- `/app/backend/routes/property_leads.py` - Lines 561-643 (unconvert endpoint)
- `/app/frontend/src/pages/PropertyLeadDetailPage.jsx` - Lines 347-366 (handler), Lines 464-522 (UI buttons)
- `/app/frontend/src/lib/api.js` - Line 422 (API method)

#### Verified & Tested
- Unconvert with delete_listing=true deletes showcase listing ✅
- Unconvert with delete_listing=false preserves showcase listing ✅
- Lead status resets to 'new' or previous status ✅
- Activity log updated with 'unconverted' entry ✅
- UI buttons appear/hide correctly based on status ✅
- Confirmation dialogs work correctly ✅
- View Showcase Listing navigation works ✅

---

## Update: February 18, 2026 - SEO-Friendly Property URLs

### Feature: Address-Based URL Slugs for Showcase Properties

Implemented SEO-friendly URL slugs for property pages. Instead of `/listing/{uuid}`, properties now use `/property/{address-slug}` format.

#### URL Format
- **Example:** `/property/804-s-davis-blvd-tampa-fl-33606`
- Pattern: `{street-number}-{street-name}-{city}-{state}-{zip}`
- Abbreviations applied: Boulevard → blvd, Street → st, Avenue → ave, Drive → dr, etc.
- Lowercase, hyphen-separated, special characters removed

#### Backend Implementation
- **New Utility:** `/app/backend/utils/slug.py`
  - `generate_property_slug(address, city, state, zip_code)` - Generates URL-friendly slugs
  - `ensure_unique_slug(base_slug, existing_slugs)` - Ensures uniqueness by appending numbers

- **Updated Convert Endpoint:** `/app/backend/routes/property_leads.py`
  - Generates slug when converting lead to showcase listing
  - Stores slug in both `properties` collection and lead's `converted_to_listing_slug` field

- **New Public Endpoint:** `GET /api/public/property/by-slug/{slug}`
  - Fetches property by slug for public display
  - Falls back to ID lookup for backwards compatibility

- **Migration Endpoint:** `POST /api/listings/migrate-slugs`
  - Generates slugs for existing properties without them
  - Ensures uniqueness across all properties

#### Frontend Implementation
- **Routing:** `/app/frontend/src/App.js`
  - `/property/:slug` → PropertyDetailPage (primary route)
  - `/listing/:slug` → PropertyDetailPage (backwards compatibility)

- **API:** `/app/frontend/src/lib/api.js`
  - `publicAPI.getListingBySlug(slug)` - New method for slug-based lookup

- **Updated Components:**
  - `LandingPage.jsx` - Links use `listing.slug || listing.id`
  - `PublicListingsPage.jsx` - Links use `listing.slug || listing.id`
  - `ListingDetailPage.jsx` - Preview button uses slug
  - `PropertyLeadDetailPage.jsx` - "View Public Page" button uses slug
  - `PropertyDetailPage.jsx` - Uses `useParams().slug`, falls back to ID lookup

#### Slug Generation Rules
1. Combine address + city + state + zip_code
2. Apply abbreviations (Boulevard → blvd, Street → st, etc.)
3. Remove special characters, keep alphanumeric
4. Replace spaces with hyphens
5. Convert to lowercase
6. Ensure uniqueness (append -2, -3, etc. if needed)

#### Migration Results
- 17 existing properties migrated with slugs
- Examples:
  - `2519-n-riverside-dr-tampa-fl`
  - `456-ocean-dr-miami-beach-fl-33139`
  - `804-s-davis-blvd-tampa-fl-33606`

#### Files Created/Modified
- `/app/backend/utils/slug.py` (NEW)
- `/app/backend/routes/property_leads.py` - Added slug generation on convert
- `/app/backend/routes/properties.py` - Added slug endpoint and migration
- `/app/frontend/src/lib/api.js` - Added getListingBySlug
- `/app/frontend/src/App.js` - Updated routing
- `/app/frontend/src/pages/PropertyDetailPage.jsx` - Uses slug param
- `/app/frontend/src/pages/LandingPage.jsx` - Uses slug in links
- `/app/frontend/src/pages/PublicListingsPage.jsx` - Uses slug in links

#### Verified & Tested
- New properties get slugs automatically on conversion ✅
- Existing properties migrated with slugs ✅
- Public slug endpoint works correctly ✅
- Frontend links use slugs ✅
- Backwards compatibility with ID URLs ✅

---

## Current Status (February 18, 2026)

### Completed Today
- ✅ **Un-convert Property Lead Feature** - Fully tested and working
- ✅ **SEO-Friendly Property URLs** - Address-based slugs for all properties
  - Example: `/property/804-s-davis-blvd-tampa-fl-33606`
  - All 17 existing properties migrated with slugs

### Known Issues (Unchanged)
- **P0:** Bookings data loss (not investigated)
- **P0:** Unreliable production deployments
- **P1:** Contact Import - user verification pending on production
- **P1:** Smart List Email - user needs to test on production
- **P1:** Web scrapers blocked (awaiting user decision on paid API)
- **P1:** iDrive e2 storage credentials invalid

### Upcoming Tasks
1. **P0:** MLS Integration activation (blocked on Bridge API credentials)
2. **P1:** Build Buyer Lead Page
3. **P1:** Jacquie Lawson Card Sender automation
4. **P1:** Social Media Auto-Poster

### Backlog
- Refactor ContactsPage.jsx (~2900 lines → smaller components)
- TMS Integration
- Advanced Lead Management (auction/bidding)
- Advanced Reporting & Analytics
- Booking Notifications (email, SMS, desktop)

---

## Update: February 19, 2026 - MLS Hub Dashboard Complete

### MLS Hub - Full Dashboard Built

**New Section:** MLS Hub in main admin sidebar with dedicated sidebar navigation

**Features Implemented:**
1. **MLS Overview Dashboard** (`/mls`)
   - Connection status (Bridge API / Stellar MLS)
   - Stats: Pending Review, Approved, Converted, Total
   - MLS Status Breakdown: Active, Pending Sale, Closed
   - Quick Actions: Pull, Review, Search

2. **Pull Listings** (`/mls/pull`)
   - Syncs Sheila Desautels' listings from Stellar MLS
   - Options: Include Pending, Include Sold
   - Shows results: New, Updated, Total Processed

3. **Moderate Listings** (`/mls/moderate`)
   - Grid view of all pulled listings with photos
   - Filters: Sync Status (Pending/Approved/Converted), MLS Status
   - Actions: Approve, Reject, Convert to Showcase
   - Bulk selection and conversion
   - Detail modal with full property info

4. **Converted Listings** (`/mls/converted`)
   - Shows all listings converted to public Showcase
   - Direct link to view on public website

**Backend Routes Created:**
- `GET /api/mls-listings/` - List all pulled listings with filters
- `GET /api/mls-listings/stats` - Get statistics
- `POST /api/mls-listings/pull` - Pull from MLS
- `PATCH /api/mls-listings/{id}/status` - Approve/Reject
- `POST /api/mls-listings/{id}/convert-to-showcase` - Convert to Showcase
- `POST /api/mls-listings/bulk-convert` - Bulk conversion

**Files Created:**
- `/app/backend/routes/mls_listings.py` - Backend routes
- `/app/frontend/src/components/layout/MLSLayout.jsx` - MLS sidebar layout
- `/app/frontend/src/pages/mls/MLSOverview.jsx` - Dashboard
- `/app/frontend/src/pages/mls/PullListings.jsx` - Pull feature
- `/app/frontend/src/pages/mls/ModerateListings.jsx` - Moderation
- `/app/frontend/src/pages/mls/ConvertedListings.jsx` - Converted view

**Database Collection:**
- `mls_listings` - Stores pulled MLS data with sync status

---

## Update: February 19, 2026 - Bridge API Integration Complete

### Bridge API / Stellar MLS Integration

**Status:** ✅ CONNECTED AND WORKING

**Credentials Added:**
- Client ID: KSz1Z7zwY0KrgNAN63UH
- Server Token: 60de473419bfe5a6b575267a8b31055d  
- Dataset: `stellar` (Stellar MLS)

**API Endpoints Available:**
- `POST /api/mls/test` - Test connection
- `GET /api/mls/datasets` - List available datasets
- `GET /api/mls/search` - Search MLS properties
- `GET /api/mls/property/{mls_id}` - Get property details
- `POST /api/mls/import-to-lead/{mls_id}` - Import as property lead
- `POST /api/mls/sync-to-showcase` - Sync agent listings to showcase

**Current Feed Access:**
- Feed Type: BBO (Back Office)
- Available Data: Sold/Closed properties, Withdrawn listings
- **Note:** Active listings require IDX feed approval from Stellar MLS

**Datasets Available with Current Credentials:**
1. stellar - Stellar MLS (Florida)
2. gcmls2 - Gulf Coast MLS
3. akmls2 - Alaska MLS
4. triangle - Doorify MLS
5. united - MLS United
6. + 5 more regional MLSs

**Files Modified:**
- `/app/backend/services/mls_service.py` - Updated for Bridge API
- `/app/backend/routes/mls.py` - Updated endpoints
- `/app/backend/.env` - Added Bridge API credentials

### Bug Fix: Incomplete Image Transfer on Production

**Problem:** When converting a property lead to a showcase listing on production, only some images were being transferred (6 of 12).

**Root Cause:** The `convert_to_showcase` function in `/app/backend/routes/property_leads.py` used a brittle `os.path.exists()` check before attempting to copy image files. In containerized production environments, file paths can differ, causing the check to fail silently and skip images.

**Solution:** Removed the `os.path.exists()` check and instead:
1. Attempt to copy ALL images listed in the lead's `gallery_images` array
2. Catch `FileNotFoundError` specifically when files don't exist
3. Log detailed error messages for failed copies with `[CONVERT] ✗`
4. Preserve the original image record with its URL as fallback (so images may still display if the original URL is accessible)
5. Added comprehensive logging showing exactly which images were copied vs. failed

**Key Code Changes:** `/app/backend/routes/property_leads.py` (lines 455-525)
- Added detailed logging for each image processing step
- Changed from "check then copy" to "try copy, catch error"
- Images that fail to copy are now preserved with their original URLs instead of being silently dropped

**Testing:** All 9 tests passed (100%)
- Tested with existing files: 5/5 images copied successfully
- Tested with missing files: Conversion succeeds, 4/4 image records preserved with URL fallback
- Test file: `/app/backend/tests/test_convert_to_showcase.py`

**Files Modified:**
- `/app/backend/routes/property_leads.py` - Image transfer logic improved



---

## Update: February 25, 2026 - Withdrawn Listings Prospecting Tool Completed

### Completed
- Added Withdrawn Listings accordion to MLS Hub sidebar with Search/Moderate/Converted routes
- Wired Withdrawn pages into App routes and exports
- Added comprehensive data-testid coverage across Withdrawn Search/Moderate/Converted pages for QA automation
- Fixed HTML structure warning in Withdrawn moderation dialog tag info

### Tests & Verification
- Playwright smoke: login → /mls/withdrawn/search → /mls/withdrawn/moderate ✅
- Auto frontend testing agent: Withdrawn pages render and navigation works ✅


---

## Update: February 25, 2026 - MLS Sidebar UX Tweaks

### Completed
- Main app sidebar auto-collapses when entering any /mls route for more workspace
- MLS Hub sidebar expanded width (w-64) and labels forced single-line

### Tests & Verification
- Playwright: /mls/withdrawn/search loads with main sidebar collapsed and MLS menu labels in one line ✅


---

## Update: February 25, 2026 - MLS My Listings Accordion

### Completed
- Added "MY Listings" accordion in MLS Hub sidebar
- Moved Pull Listings, Moderate, Converted under MY Listings
- Kept Overview and MLS Search as top-level items

### Tests & Verification
- Playwright screenshot: /mls shows MY Listings accordion and items ✅


---

## Update: February 25, 2026 - MLS Moderation Modal Background Fix

### Completed
- Updated shared DialogContent styling to use solid card background and text foreground

### Tests & Verification
- Playwright: opened expired moderation detail modal and verified opaque background ✅


---

## Update: February 25, 2026 - MLS Search Page (Admin-only)

### Completed
- Built MLS Search page with all MLS-supported filters (dataset, address, city, zip, price, beds, baths, property type, status, limit, offset)
- Added MLS Search results cards with view/import-to-lead actions and details modal
- Restricted MLS search/property/import endpoints to Admin/Superuser only
- MLS Search menu item positioned directly under Overview in MLS Hub sidebar

### Tests & Verification
- Playwright: /mls/search page renders and filters visible ✅
- Auto frontend testing agent: MLS Search menu placement + filters + search flow ✅


---

## Update: February 26, 2026 - Global Modal Background Fix

### Completed
- Added fallback solid background classes to Dialog and AlertDialog content so modals remain opaque in production

### Tests & Verification
- Playwright: opened Contacts “Add Contact” modal and verified opaque background ✅
- Auto frontend testing agent: Add Contact, Smart List, and MLS moderation modals confirmed opaque ✅


---

## Update: February 26, 2026 - Moderate Listings Sold Filter

### Completed
- Added Sold option to Moderate Listings sync-status dropdown and MLS status dropdown
- Sold filter now maps to MLS status = Sold and updates filter logic

### Tests & Verification
- Playwright: /mls/moderate dropdown shows Sold option ✅


---

## Update: March 03, 2026 - Expired Listings Automation + Tracking

### Completed
- Added daily 7:00 AM EST scheduler for expired listings automation
- Implemented expired automation workflow: pull → filter → auto-convert → brochure + landing page + placeholder avatar video → tracked email send
- Built internal analytics endpoints for email open/click tracking and landing page session tracking
- Updated Expired manual search UI with default criteria (zip 33602/33606, min $750k, single family, exclude rentals/commercial) and new filters
- Updated MLS service to support property type filtering and property sub-type mapping
- Added admin-only manual trigger endpoint: /api/expired-listings/automation/run

### Tests & Verification
- Playwright: /mls/expired/search shows default criteria + new filters ✅
- Auto frontend testing agent: default criteria prefilled and search runs ✅
- Backend smoke: /api/analytics/email/open/{id} returns 200 ✅


---

## Update: March 03, 2026 - Expired Test Now Button + Avatar Update

### Completed
- Added “Test Now” button to Expired Listings search page header (top right) to manually run automation
- Wired Test Now to /api/expired-listings/automation/run (uses daily criteria + recipients)
- Set automation avatar image to provided transparent PNG and store in automation settings
- Added background image selection (primary MLS photo) to leads for future avatar compositing

### Tests & Verification
- Playwright: Expired Listings page shows Test Now button ✅
- Auto frontend testing agent: Test Now button present (not clicked) ✅


---

## Update: March 03, 2026 - Automation Limit to One Lead

### Completed
- Added max_leads=1 to expired automation criteria so Test Now converts only a single matching home
- Backfilled max_leads into existing automation settings if missing


---

## Update: March 03, 2026 - Test Now Converts One Lead Only

### Completed
- Manual Test Now runs now convert only 1 lead (test_max_leads=1)
- Scheduled daily run remains unlimited (uses full criteria)


---

## Update: March 03, 2026 - Landing Page Link Fix + Public Route

### Completed
- Switched landing page URLs to use SITE_URL + /landing/{slug} (no hiddenhavenrealty hardcode)
- Added public frontend route /landing/:slug for PropertyLandingPage
- Updated property lead creation to store landing_page_url and consistently build links
- Added Test Now error feedback if automation fails (e.g., SMTP not configured)
- Updated SITE_URL in preview env to preview domain

### Tests & Verification
- Playwright: /landing/test-slug renders public PropertyLandingPage (not gated) ✅
- Auto frontend testing agent: landing links format /landing/{slug} confirmed ✅


---

## Update: March 04, 2026 - Telnyx Dialer + SMS + Verification

### Completed
- Integrated Telnyx backend routes for SMS, voice (WebRTC), call history, and phone verification
- Added Dialer, Messages, Call History pages and routes, wired to Telnyx endpoints
- Added Dev Settings → Telnyx configuration UI with all required fields and Verify module
- Added sidebar menu items: Dialer, Messages, Call History under Dashboard
- Stored Telnyx credentials in DB (encrypted) and configured preview for testing

### Tests & Verification
- Playwright: Dialer/Messages/Call History/Telnyx Settings render ✅
- Auto frontend testing agent: all Telnyx UI verified ✅


---

## Update: March 04, 2026 - Buy/Sell Form Verification Hookup

### Completed
- Added backend phone/email verification endpoints using Telnyx Verify + SMTP OTP
- Wired existing EmailVerification/PhoneVerification components with test IDs
- Updated Access Exclusive Auctions form to require both email + phone verification before submit

### Tests & Verification
- Auto frontend testing agent: verification UI buttons appear and validation blocks submit ✅


---

## Update: March 04, 2026 - Telnyx 5-digit Phone Code Support

### Completed
- Updated phone verification UI to accept 5-digit Telnyx codes (input + validation)

### Tests & Verification
- Playwright: landing form renders after phone code update ✅


---

## Update: March 04, 2026 - Phone Verification 5-Digit Validation Fix

### Completed
- Updated phone verification validation + error message to 5-digit (matches Telnyx codes)

### Tests & Verification
- Auto frontend testing agent: 5-digit copy + validation confirmed ✅


---

## Update: March 04, 2026 - CORS for Verification Fix

### Completed
- CORS middleware now ignores wildcard origin and uses explicit CORS_ORIGINS + SITE_URL
- Updated backend env to include hiddenhavenrealty.com in CORS_ORIGINS

### Tests & Verification
- Curl (local backend) with Origin=https://hiddenhavenrealty.com returns Access-Control-Allow-Origin ✅


---

## Update: March 04, 2026 - Telnyx Verify Endpoint Fix

### Completed
- Phone verification now verifies using Telnyx verification_id endpoint (/verifications/{id}/actions/verify) with fallback to legacy path
- Verification send uses /verifications/sms with fallback to /verifications

### Tests & Verification
- Backend: /api/phone/check returns 200 ✅


---

## Update: March 04, 2026 - Public Lead Submission Endpoint

### Completed
- Added /api/public/leads endpoint for landing page buyer lead submissions
- Stores leads in db.leads with verification flags and consent fields

### Tests & Verification
- POST /api/public/leads returns 200 ✅


---

## Update: March 04, 2026 - Buyer/Seller Lead Type Mapping Fix

### Completed
- Normalized public lead submissions to map buyer/seller reliably (accepts lead_type, leadType, type in any case)
- Frontend buyer submission now passes lead type explicitly in multiple fields for robustness

### Tests b Verification
- POST /api/public/leads with leadType=Buyer returns 200 ✅


---

## Update: March 04, 2026 - Avatar Video Script + Background Composite

### Completed
- Added avatar script template with dynamic placeholders (name, address, feature, brokerage)
- Composited avatar PNG over property primary photo and used composite as SkyReels first frame
- Passed custom script into SkyReels prompt and added polling to attach generated video to the lead

### Tests & Verification
- Backend: composite image generated successfully via _compose_avatar_background ✅


---

## Update: March 04, 2026 - Expired “Test Now” Critical Outputs Stabilized

### Completed
- Fixed automation marketing flow to always persist canonical `landing_page_url` on property leads
- Added brochure artifact persistence to static storage and lead fields: `brochure_status`, `brochure_url`, `brochure_filename`, `brochure_generated_at`
- Added resilient automation response contract with per-lead `lead_results` (landing URL, brochure status, email status, visibility flag)
- Updated property leads list ordering to `updated_at DESC` so freshly-processed automation leads surface immediately in Property Leads view
- Enhanced Expired Search UI with a new **Test Now Results** card showing converted count, brochure status, landing/brochure links, and direct lead detail link

### Tests & Verification
- Backend manual smoke (localhost): `/api/expired-listings/automation/run` returns enriched `lead_results` with valid landing + brochure URLs ✅
- Backend checks: brochure static URL serves PDF (200), landing route path resolves, lead data updated with status fields ✅
- Testing agent report: `/app/test_reports/iteration_16.json` confirms backend pass (10/10) and feature verification ✅
- Deep backend/UI testing agent confirms all requested Expired Test Now outputs are working ✅

### Notes
- **MOCKED/PARTIAL:** SkyReels avatar generation remains partially mocked (placeholder path still used when async video is not available immediately).
