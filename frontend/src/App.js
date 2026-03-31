import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { Toaster } from './components/ui/sonner';
import { PWAInstallBanner } from './components/PWAComponents';
import { registerServiceWorker } from './hooks/usePWA';

// Layouts
import { MainLayout } from './components/layout/MainLayout';
import { SettingsLayout } from './components/layout/SettingsLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContactsPage } from './pages/ContactsPage';
import { DealsPage } from './pages/DealsPage';
import { TasksPage } from './pages/TasksPage';
import { AIWriterPage } from './pages/AIWriterPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { BookingPage } from './pages/BookingPage';
import { PublicBookingPage } from './pages/PublicBookingPage';
import { ListingsPage } from './pages/ListingsPage';
import { LandingPage } from './pages/LandingPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { PropertySubmissionsPage } from './pages/PropertySubmissionsPage';
import { PublicListingsPage } from './pages/PublicListingsPage';
import { NewsletterPage } from './pages/NewsletterPage';
import { NewsletterArchivePage } from './pages/NewsletterArchivePage';
import { AboutPage } from './pages/AboutPage';
import { LandingPagesPage } from './pages/LandingPagesPage';
import { PropertyLandingPage } from './pages/PropertyLandingPage';
import DialerPage from './pages/phone/DialerPage';
import DialerPopup from './pages/phone/DialerPopup';
import MessagesPage from './pages/phone/MessagesPage';
import CallHistoryPage from './pages/phone/CallHistoryPage';
import { MortgageCalculatorPage } from './pages/MortgageCalculatorPage';
import { MediaLibraryPage } from './pages/MediaLibraryPage';
import { PropertyLookupPage } from './pages/PropertyLookupPage';

// Settings Pages
import { SettingsOverview } from './pages/settings/SettingsOverview';
import { AdminReports } from './pages/settings/admin/AdminReports';
import { AuditLog } from './pages/settings/admin/AuditLog';
import { RolesPermissions } from './pages/settings/admin/RolesPermissions';
import { GlossaryManager } from './pages/settings/admin/GlossaryManager';
import { OnlineStaff } from './pages/settings/admin/OnlineStaff';
import { DatabaseBackup } from './pages/settings/admin/DatabaseBackup';
import { CustomFields } from './pages/settings/admin/CustomFields';
import { StaffManagement } from './pages/settings/admin/StaffManagement';
import { ErrorReports } from './pages/settings/support/ErrorReports';
import { PushAlerts } from './pages/settings/support/PushAlerts';
import { StorageManagement } from './pages/settings/support/StorageManagement';
import { SitemapSubmit } from './pages/settings/seo/SitemapSubmit';
import { MetaInformation } from './pages/settings/seo/MetaInformation';
import { StructuredData } from './pages/settings/seo/StructuredData';
import { GeneralSettings } from './pages/settings/developer/GeneralSettings';
import { EmailSettings } from './pages/settings/developer/EmailSettings';
import { TelnyxSettings } from './pages/settings/developer/TelnyxSettings';
import { CustomCode } from './pages/settings/developer/CustomCode';
import { AiRules } from './pages/settings/developer/AiRules';
import { SystemMessages } from './pages/settings/developer/SystemMessages';
import { PWASettings } from './pages/settings/developer/PWASettings';
import { LeadScoringSettings } from './pages/settings/developer/LeadScoringSettings';
import { MLSSettings } from './pages/settings/developer/MLSSettings';
import { JacquieLawsonSettings } from './pages/settings/developer/JacquieLawsonSettings';
import { ElevenLabsSettings } from './pages/settings/admin/ElevenLabsSettings';
import { MortgageRatesSettings } from './pages/settings/admin/MortgageRatesSettings';
import { SamplesSettings } from './pages/settings/admin/SamplesSettings';
import { SignatureSettings } from './pages/settings/profile/SignatureSettings';
import { MailingListsPage } from './pages/MailingListsPage';
import ReviewsManagementPage from './pages/ReviewsManagementPage';
import WriteReviewPage from './pages/WriteReviewPage';
import PropertyLeadsPage from './pages/PropertyLeadsPage';
import PropertyLeadDetailPage from './pages/PropertyLeadDetailPage';
import ListingDetailPage from './pages/ListingDetailPage';
import SellerLeadsPage from './pages/SellerLeadsPage';
import SellerLeadDetailPage from './pages/SellerLeadDetailPage';
import VideoGeneratorPage from './pages/VideoGeneratorPage';

// Social Media Pages
import { SocialMediaLayout } from './components/layout/SocialMediaLayout';
import { SocialMediaDashboard } from './pages/social-media/SocialMediaDashboard';
import { SocialMediaSettings } from './pages/social-media/SocialMediaSettings';
import { ComposePost } from './pages/social-media/ComposePost';

// MLS Pages
import { MLSLayout } from './components/layout/MLSLayout';
import { MLSOverview, PullListings, ModerateListings, ConvertedListings, MLSSearch } from './pages/mls';
import { SearchExpired, ModerateExpired, ConvertedExpired } from './pages/mls/expired';
import { SearchWithdrawn, ModerateWithdrawn, ConvertedWithdrawn } from './pages/mls/withdrawn';

import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  // Register service worker on app load
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ThemeProvider>
      <BrandingProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
            <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
            <Route path="/property/:slug" element={<PropertyDetailPage />} />
            <Route path="/listing/:slug" element={<PropertyDetailPage />} />  {/* Backwards compatibility */}
            <Route path="/showcase" element={<PublicListingsPage />} />
            <Route path="/mortgage-calculator" element={<MortgageCalculatorPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/newsletter-archive" element={<NewsletterArchivePage />} />
            <Route path="/write-review" element={<WriteReviewPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/book/:agentCode" element={<PublicBookingPage />} />

            <Route path="/landing/:slug" element={<PropertyLandingPage />} />

            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
              <Route path="/dialer" element={<ErrorBoundary><DialerPage /></ErrorBoundary>} />
              <Route path="/dialer-popup" element={<ErrorBoundary><DialerPopup /></ErrorBoundary>} />
              <Route path="/messages" element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
              <Route path="/messages/:phone" element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
              <Route path="/call-history" element={<ErrorBoundary><CallHistoryPage /></ErrorBoundary>} />
              <Route path="/contacts" element={<ErrorBoundary><ContactsPage /></ErrorBoundary>} />
              <Route path="/contacts/:id" element={<ErrorBoundary><ContactsPage /></ErrorBoundary>} />
              <Route path="/deals" element={<ErrorBoundary><DealsPage /></ErrorBoundary>} />
              <Route path="/tasks" element={<ErrorBoundary><TasksPage /></ErrorBoundary>} />
              <Route path="/bookings" element={<ErrorBoundary><BookingPage /></ErrorBoundary>} />
              <Route path="/listings" element={<ErrorBoundary><ListingsPage /></ErrorBoundary>} />
              <Route path="/listings/:id" element={<ErrorBoundary><ListingDetailPage /></ErrorBoundary>} />
              <Route path="/leads" element={<ErrorBoundary><LeadsPage /></ErrorBoundary>} />
              <Route path="/property-submissions" element={<ErrorBoundary><PropertySubmissionsPage /></ErrorBoundary>} />
              <Route path="/landing-pages" element={<ErrorBoundary><LandingPagesPage /></ErrorBoundary>} />
              <Route path="/media" element={<ErrorBoundary><MediaLibraryPage /></ErrorBoundary>} />
              <Route path="/property-lookup" element={<ErrorBoundary><PropertyLookupPage /></ErrorBoundary>} />
              <Route path="/reviews" element={<ErrorBoundary><ReviewsManagementPage /></ErrorBoundary>} />
              <Route path="/property-leads" element={<ErrorBoundary><PropertyLeadsPage /></ErrorBoundary>} />
              <Route path="/property-leads/:id" element={<ErrorBoundary><PropertyLeadDetailPage /></ErrorBoundary>} />
              <Route path="/seller-leads" element={<ErrorBoundary><SellerLeadsPage /></ErrorBoundary>} />
              <Route path="/seller-leads/:id" element={<ErrorBoundary><SellerLeadDetailPage /></ErrorBoundary>} />
              <Route path="/writer" element={<ErrorBoundary><AIWriterPage /></ErrorBoundary>} />
              <Route path="/video-generator" element={<ErrorBoundary><VideoGeneratorPage /></ErrorBoundary>} />
              <Route path="/newsletter" element={<ErrorBoundary><NewsletterPage /></ErrorBoundary>} />
              <Route path="/mailing-lists" element={<ErrorBoundary><MailingListsPage /></ErrorBoundary>} />
              <Route path="/admin/users" element={<ErrorBoundary><AdminUsersPage /></ErrorBoundary>} />
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/profile" element={<Navigate to="/settings" replace />} />

              {/* Social Media with nested layout */}
              <Route path="/social-media" element={<SocialMediaLayout />}>
                <Route index element={<SocialMediaDashboard />} />
                <Route path="compose" element={<ComposePost />} />
                <Route path="settings" element={<SocialMediaSettings />} />
                <Route path="calendar" element={<SocialMediaDashboard />} />
                <Route path="queue" element={<SocialMediaDashboard />} />
                <Route path="templates" element={<SocialMediaDashboard />} />
                <Route path="ai-content" element={<SocialMediaDashboard />} />
                <Route path="media" element={<SocialMediaDashboard />} />
                <Route path="analytics" element={<SocialMediaDashboard />} />
              </Route>

              {/* MLS Hub with nested layout */}
              <Route path="/mls" element={<MLSLayout />}>
                <Route index element={<MLSOverview />} />
                <Route path="pull" element={<PullListings />} />
                <Route path="moderate" element={<ModerateListings />} />
                <Route path="converted" element={<ConvertedListings />} />
                <Route path="search" element={<MLSSearch />} />
                <Route path="sync-history" element={<MLSOverview />} />
                <Route path="settings" element={<MLSOverview />} />
                {/* Expired Listings */}
                <Route path="expired/search" element={<SearchExpired />} />
                <Route path="expired/moderate" element={<ModerateExpired />} />
                <Route path="expired/converted" element={<ConvertedExpired />} />
                {/* Withdrawn Listings */}
                <Route path="withdrawn/search" element={<SearchWithdrawn />} />
                <Route path="withdrawn/moderate" element={<ModerateWithdrawn />} />
                <Route path="withdrawn/converted" element={<ConvertedWithdrawn />} />
              </Route>

              {/* Settings with nested layout */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<SettingsOverview />} />
                
                {/* Admin Settings */}
                <Route path="admin/jacquie-lawson" element={<JacquieLawsonSettings />} />
                <Route path="admin/elevenlabs" element={<ElevenLabsSettings />} />
                <Route path="admin/mortgage-rates" element={<MortgageRatesSettings />} />
                <Route path="admin/samples" element={<SamplesSettings />} />
                <Route path="admin/reports" element={<AdminReports />} />
                <Route path="admin/audit-log" element={<AuditLog />} />
                <Route path="admin/roles" element={<RolesPermissions />} />
                <Route path="admin/glossary" element={<GlossaryManager />} />
                <Route path="admin/online-staff" element={<OnlineStaff />} />
                <Route path="admin/backup" element={<DatabaseBackup />} />
                <Route path="admin/custom-fields" element={<CustomFields />} />
                <Route path="admin/staff" element={<StaffManagement />} />
                
                {/* Support Settings */}
                <Route path="support/error-reports" element={<ErrorReports />} />
                <Route path="support/push-alerts" element={<PushAlerts />} />
                <Route path="support/storage" element={<StorageManagement />} />
                
                {/* SEO Settings */}
                <Route path="seo/sitemap" element={<SitemapSubmit />} />
                <Route path="seo/meta" element={<MetaInformation />} />
                <Route path="seo/structured-data" element={<StructuredData />} />
                
                {/* Developer Settings */}
                <Route path="developer/general" element={<GeneralSettings />} />
                <Route path="developer/email" element={<EmailSettings />} />
                <Route path="developer/telnyx" element={<TelnyxSettings />} />
                <Route path="developer/lead-scoring" element={<LeadScoringSettings />} />
                <Route path="developer/mls" element={<MLSSettings />} />
                <Route path="developer/custom-code" element={<CustomCode />} />
                <Route path="developer/ai-rules" element={<AiRules />} />
                <Route path="developer/system-messages" element={<SystemMessages />} />
                <Route path="developer/pwa" element={<PWASettings />} />
                
                {/* Profile Settings */}
                <Route path="profile/signature" element={<SignatureSettings />} />
              </Route>
            </Route>

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
        <PWAInstallBanner />
      </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default App;
