import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { logger } from './services/logger';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoader from './components/PageLoader';

// Initialize frontend logging
logger.initialize();

// Eagerly loaded pages (frequently accessed)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import ItemDetail from './pages/ItemDetail';
import ItemForm from './pages/ItemForm';
import Categories from './pages/Categories';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import Tags from './pages/Tags';
import Scanner from './pages/Scanner';
import NotFound from './pages/NotFound';

// Lazily loaded pages (admin/heavy/less frequent)
const Users = lazy(() => import('./pages/Users'));
const Roles = lazy(() => import('./pages/Roles'));
const Groups = lazy(() => import('./pages/Groups'));
const Templates = lazy(() => import('./pages/Templates'));
const Icons = lazy(() => import('./pages/Icons'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const Profile = lazy(() => import('./pages/Profile'));
const SettingsLayout = lazy(() => import('./pages/settings/SettingsLayout'));
const BrandingSettings = lazy(() => import('./pages/settings/Branding'));
const DashboardSettings = lazy(() => import('./pages/settings/Dashboard'));
const NetworkingSettings = lazy(() => import('./pages/settings/Networking'));
const SecuritySettings = lazy(() => import('./pages/settings/Security'));
const LdapSettings = lazy(() => import('./pages/settings/Ldap'));
const SmtpSettings = lazy(() => import('./pages/settings/Smtp'));
const TimezoneSettings = lazy(() => import('./pages/settings/Timezone'));
const NotificationsSettings = lazy(() => import('./pages/settings/Notifications'));
const AuditSettings = lazy(() => import('./pages/settings/Audit'));
const SessionsSettings = lazy(() => import('./pages/settings/Sessions'));
const ApiSettings = lazy(() => import('./pages/settings/Api'));
const WebhooksSettings = lazy(() => import('./pages/settings/Webhooks'));
const LogsSettings = lazy(() => import('./pages/settings/Logs'));
const DatabaseSettings = lazy(() => import('./pages/settings/Database'));
const AboutSettings = lazy(() => import('./pages/settings/About'));
const Quarantine = lazy(() => import('./pages/Quarantine'));
const Barcodes = lazy(() => import('./pages/Barcodes'));
const Devices = lazy(() => import('./pages/Devices'));
const Announcements = lazy(() => import('./pages/Announcements'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const WebhookDocs = lazy(() => import('./pages/WebhookDocs'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="items" element={<Items />} />
            <Route path="items/new" element={<ItemForm />} />
            <Route path="items/:id" element={<ItemDetail />} />
            <Route path="items/:id/edit" element={<ItemForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="locations" element={<Locations />} />
            <Route path="locations/:id" element={<LocationDetail />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="barcodes" element={<Barcodes />} />
            <Route path="tags" element={<Tags />} />
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="roles" element={<AdminRoute><Roles /></AdminRoute>} />
            <Route path="groups" element={<AdminRoute><Groups /></AdminRoute>} />
            <Route path="templates" element={<AdminRoute><Templates /></AdminRoute>} />
            <Route path="devices" element={<AdminRoute><Devices /></AdminRoute>} />
            <Route path="announcements" element={<AdminRoute><Announcements /></AdminRoute>} />
            <Route path="icons" element={<Icons />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="settings" element={<SettingsLayout />}>
              <Route index element={null} />
              <Route path="branding" element={<AdminRoute><BrandingSettings /></AdminRoute>} />
              <Route path="dashboard" element={<AdminRoute><DashboardSettings /></AdminRoute>} />
              <Route path="networking" element={<NetworkingSettings />} />
              <Route path="security" element={<AdminRoute><SecuritySettings /></AdminRoute>} />
              <Route path="ldap" element={<LdapSettings />} />
              <Route path="smtp" element={<SmtpSettings />} />
              <Route path="timezone" element={<TimezoneSettings />} />
              <Route path="notifications" element={<NotificationsSettings />} />
              <Route path="audit" element={<AdminRoute><AuditSettings /></AdminRoute>} />
              <Route path="sessions" element={<SessionsSettings />} />
              <Route path="api" element={<ApiSettings />} />
              <Route path="webhooks" element={<WebhooksSettings />} />
              <Route path="logs" element={<AdminRoute><LogsSettings /></AdminRoute>} />
              <Route path="database" element={<AdminRoute><DatabaseSettings /></AdminRoute>} />
              <Route path="about" element={<AboutSettings />} />
            </Route>
            <Route path="docs" element={<ApiDocs />} />
            <Route path="docs/webhooks" element={<WebhookDocs />} />
            <Route path="profile" element={<Profile />} />
            <Route path="quarantine" element={<Quarantine />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
