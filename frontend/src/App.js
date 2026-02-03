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
import { CustomCode } from './pages/settings/developer/CustomCode';
import { SystemMessages } from './pages/settings/developer/SystemMessages';
import { PWASettings } from './pages/settings/developer/PWASettings';
import { MailingListsPage } from './pages/MailingListsPage';

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
            <Route path="/" element={<LandingPage />} />
            <Route path="/property/:id" element={<PropertyDetailPage />} />
            <Route path="/showcase" element={<PublicListingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/newsletter-archive" element={<NewsletterArchivePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/book/:agentCode" element={<PublicBookingPage />} />

            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/:id" element={<ContactsPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/bookings" element={<BookingPage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/property-submissions" element={<PropertySubmissionsPage />} />
              <Route path="/writer" element={<AIWriterPage />} />
              <Route path="/newsletter" element={<NewsletterPage />} />
              <Route path="/mailing-lists" element={<MailingListsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/profile" element={<Navigate to="/settings" replace />} />

              {/* Settings with nested layout */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<SettingsOverview />} />
                
                {/* Admin Settings */}
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
                <Route path="developer/custom-code" element={<CustomCode />} />
                <Route path="developer/system-messages" element={<SystemMessages />} />
                <Route path="developer/pwa" element={<PWASettings />} />
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
