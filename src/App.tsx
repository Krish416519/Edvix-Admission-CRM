import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AIProvider } from './contexts/AIContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PageLoader } from './components/layout/PageLoader';
import { Construction } from 'lucide-react';

// Core layout components (loaded eagerly)
import { CounselorDashboard } from './components/ai/CounselorDashboard';
import { FounderDashboard } from './components/ai/FounderDashboard';
import { Layout } from './components/layout/Layout';
import { Login } from './components/auth/Login';
import { ForgotPassword } from './components/auth/ForgotPassword';
import { ResetPassword } from './components/auth/ResetPassword';
import CallCenterDashboard from './components/telephony/CallCenterDashboard';
import { DialerWidget } from './components/telephony/DialerWidget';
import { CommandPalette } from './components/ai/CommandPalette';
import { ChatWidget } from './components/public/ChatWidget';

// Lazy loaded views
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const LeadsList = React.lazy(() => import('./components/leads/LeadsList').then(m => ({ default: m.LeadsList })));
const LeadDetails = React.lazy(() => import('./components/leads/LeadDetails').then(m => ({ default: m.LeadDetails })));
const AdmissionsList = React.lazy(() => import('./components/admissions/AdmissionsList').then(m => ({ default: m.AdmissionsList })));
const AdmissionDetails = React.lazy(() => import('./components/admissions/AdmissionDetails').then(m => ({ default: m.AdmissionDetails })));
const TasksList = React.lazy(() => import('./components/tasks/TasksList').then(m => ({ default: m.TasksList })));
const FinanceDashboard = React.lazy(() => import('./components/finance/FinanceDashboard').then(m => ({ default: m.FinanceDashboard })));
const NotificationsList = React.lazy(() => import('./components/notifications/NotificationsList').then(m => ({ default: m.NotificationsList })));
const AnalyticsDashboard = React.lazy(() => import('./components/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const AutomationDashboard = React.lazy(() => import('./components/automation/AutomationDashboard').then(m => ({ default: m.AutomationDashboard })));
const WhatsAppCenter = React.lazy(() => import('./components/whatsapp/WhatsAppCenter').then(m => ({ default: m.WhatsAppCenter })));
const EmailCenter = React.lazy(() => import('./components/email/EmailCenter').then(m => ({ default: m.EmailCenter })));
const IntegrationCenter = React.lazy(() => import('./components/integration/IntegrationCenter').then(m => ({ default: m.IntegrationCenter })));
const UserProfile = React.lazy(() => import('./components/profile/UserProfile').then(m => ({ default: m.UserProfile })));

// Admin Console
const AdminLayout = React.lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const SuperAdminDashboard = React.lazy(() => import('./components/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const UserManagement = React.lazy(() => import('./components/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const RoleManagement = React.lazy(() => import('./components/admin/RoleManagement').then(m => ({ default: m.RoleManagement })));
const SystemSettings = React.lazy(() => import('./components/admin/SystemSettings').then(m => ({ default: m.SystemSettings })));
const MasterDataManagement = React.lazy(() => import('./components/admin/MasterDataManagement').then(m => ({ default: m.MasterDataManagement })));
const AiSettings = React.lazy(() => import('./components/admin/AiSettings').then(m => ({ default: m.AiSettings })));
const SecurityLogs = React.lazy(() => import('./components/admin/SecurityLogs').then(m => ({ default: m.SecurityLogs })));
const BackupRestore = React.lazy(() => import('./components/admin/BackupRestore').then(m => ({ default: m.BackupRestore })));
const NotificationSettings = React.lazy(() => import('./components/admin/NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const SystemLogsTab = React.lazy(() => import('./components/admin/SystemLogsTab').then(m => ({ default: m.SystemLogsTab })));

// Partner Portal
const PartnerLayout = React.lazy(() => import('./components/partner/PartnerLayout').then(m => ({ default: m.PartnerLayout })));
const PartnerDashboard = React.lazy(() => import('./components/partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));
const PartnerLeads = React.lazy(() => import('./components/partner/PartnerLeads').then(m => ({ default: m.PartnerLeads })));
const PartnerAdmissions = React.lazy(() => import('./components/partner/PartnerAdmissions').then(m => ({ default: m.PartnerAdmissions })));
const PartnerCommissions = React.lazy(() => import('./components/partner/PartnerCommissions').then(m => ({ default: m.PartnerCommissions })));
const PartnerReports = React.lazy(() => import('./components/partner/PartnerReports').then(m => ({ default: m.PartnerReports })));
const PartnerDocuments = React.lazy(() => import('./components/partner/PartnerDocuments').then(m => ({ default: m.PartnerDocuments })));
const PartnerPayments = React.lazy(() => import('./components/partner/PartnerPayments').then(m => ({ default: m.PartnerPayments })));
const PartnerNotifications = React.lazy(() => import('./components/partner/PartnerNotifications').then(m => ({ default: m.PartnerNotifications })));
const PartnerAi = React.lazy(() => import('./components/partner/PartnerAi').then(m => ({ default: m.PartnerAi })));

// University Portal
const UniversityLayout = React.lazy(() => import('./components/university/UniversityLayout').then(m => ({ default: m.UniversityLayout })));
const UniversityDashboard = React.lazy(() => import('./components/university/UniversityDashboard').then(m => ({ default: m.UniversityDashboard })));
const UniversityLeads = React.lazy(() => import('./components/university/UniversityLeads').then(m => ({ default: m.UniversityLeads })));
const UniversityAdmissions = React.lazy(() => import('./components/university/UniversityAdmissions').then(m => ({ default: m.UniversityAdmissions })));
const UniversityFinance = React.lazy(() => import('./components/university/UniversityFinance').then(m => ({ default: m.UniversityFinance })));
const UniversityCourses = React.lazy(() => import('./components/university/UniversityCourses').then(m => ({ default: m.UniversityCourses })));
const UniversityDocuments = React.lazy(() => import('./components/university/UniversityDocuments').then(m => ({ default: m.UniversityDocuments })));
const UniversityNotifications = React.lazy(() => import('./components/university/UniversityNotifications').then(m => ({ default: m.UniversityNotifications })));
const UniversityReports = React.lazy(() => import('./components/university/UniversityReports').then(m => ({ default: m.UniversityReports })));
const UniversityAi = React.lazy(() => import('./components/university/UniversityAi').then(m => ({ default: m.UniversityAi })));

// Marketing Hub
const MarketingLayout = React.lazy(() => import('./components/marketing/MarketingLayout').then(m => ({ default: m.MarketingLayout })));
const MarketingDashboard = React.lazy(() => import('./components/marketing/MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));
const CampaignsList = React.lazy(() => import('./components/marketing/CampaignsList').then(m => ({ default: m.CampaignsList })));
const RoiDashboard = React.lazy(() => import('./components/marketing/RoiDashboard').then(m => ({ default: m.RoiDashboard })));
const MarketingJourneys = React.lazy(() => import('./components/marketing/MarketingJourneys').then(m => ({ default: m.MarketingJourneys })));

// Backend Status
const BackendStatus = React.lazy(() => import('./components/admin/BackendStatus').then(m => ({ default: m.BackendStatus })));

// Admission OS
const LivePipeline = React.lazy(() => import('./components/admissionOS/LivePipeline').then(m => ({ default: m.LivePipeline })));
const ExecutiveCommandCenter = React.lazy(() => import('./components/admissionOS/ExecutiveCommandCenter').then(m => ({ default: m.ExecutiveCommandCenter })));

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center border border-border rounded-2xl p-8 bg-card shadow-sm animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">{title}</h2>
      <p className="text-muted-foreground max-w-md">
        This module is currently pending approval to be built in the next iteration.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <AIProvider>
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/public/chat" element={<ChatWidget />} />

                {/* Main Application Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="leads" element={<LeadsList />} />
                    <Route path="leads/:id" element={<LeadDetails />} />
                    <Route path="applications" element={<PlaceholderPage title="Applications" />} />
                    <Route path="/admissions" element={<AdmissionsList />} />
                    <Route path="/ai-dashboard" element={<CounselorDashboard />} />
                    <Route path="/admin/founder" element={<FounderDashboard />} />
                    <Route path="/admission-os" element={<LivePipeline />} />
                    <Route path="/admission-os/command-center" element={<ExecutiveCommandCenter />} />
                    
                    <Route path="tasks" element={<TasksList />} />
                    <Route path="whatsapp" element={<WhatsAppCenter />} />
                    <Route path="email" element={<EmailCenter />} />
                    <Route path="integration" element={<IntegrationCenter />} />
                    <Route path="automation" element={<AutomationDashboard />} />
                    <Route path="analytics" element={<AnalyticsDashboard />} />
                    <Route path="notifications" element={<NotificationsList />} />
                    <Route path="profile" element={<UserProfile />} />
                    <Route path="call-center" element={<CallCenterDashboard />} />
                    
                    {/* Admin and Super Admin only route */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin', 'Super Admin']} />}>
                      <Route path="finance" element={<FinanceDashboard />} />
                    
                      {/* Admin Console Routes */}
                      <Route path="admin" element={<AdminLayout />}>
                        <Route index element={<SuperAdminDashboard />} />
                        <Route path="users" element={<UserManagement />} />
                        <Route path="roles" element={<RoleManagement />} />
                        <Route path="settings" element={<SystemSettings />} />
                        <Route path="universities" element={<MasterDataManagement />} />
                        <Route path="courses" element={<MasterDataManagement />} />
                        <Route path="ai" element={<AiSettings />} />
                        <Route path="security" element={<SecurityLogs />} />
                        <Route path="backup" element={<BackupRestore />} />
                        <Route path="notifications" element={<NotificationSettings />} />
                        <Route path="logs" element={<SystemLogsTab />} />
                      </Route>
                    </Route>
                    
                  </Route>
                </Route>

                {/* Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['Super Admin', 'Admin']} />}>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="settings" element={<PlaceholderPage title="System Settings" />} />
                    <Route path="backend" element={<BackendStatus />} />
                  </Route>
                </Route>

                {/* Partner Portal Routes */}
                <Route element={<ProtectedRoute allowedRoles={['Partner', 'Admin', 'Super Admin']} />}>
                  <Route path="/partner" element={<PartnerLayout />}>
                    <Route index element={<PartnerDashboard />} />
                    <Route path="leads" element={<PartnerLeads />} />
                    <Route path="admissions" element={<PartnerAdmissions />} />
                    <Route path="commissions" element={<PartnerCommissions />} />
                    <Route path="reports" element={<PartnerReports />} />
                    <Route path="documents" element={<PartnerDocuments />} />
                    <Route path="payments" element={<PartnerPayments />} />
                    <Route path="notifications" element={<PartnerNotifications />} />
                    <Route path="ai" element={<PartnerAi />} />
                  </Route>
                </Route>

                {/* University Portal Routes */}
                <Route element={<ProtectedRoute allowedRoles={['University', 'Admin', 'Super Admin']} />}>
                  <Route path="/university" element={<UniversityLayout />}>
                    <Route index element={<UniversityDashboard />} />
                    <Route path="leads" element={<UniversityLeads />} />
                    <Route path="admissions" element={<UniversityAdmissions />} />
                    <Route path="finance" element={<UniversityFinance />} />
                    <Route path="courses" element={<UniversityCourses />} />
                    <Route path="documents" element={<UniversityDocuments />} />
                    <Route path="notifications" element={<UniversityNotifications />} />
                    <Route path="reports" element={<UniversityReports />} />
                    <Route path="ai" element={<UniversityAi />} />
                  </Route>
                </Route>

                {/* Marketing Hub Routes */}
                <Route element={<ProtectedRoute allowedRoles={['Marketing', 'Admin', 'Super Admin']} />}>
                  <Route path="/marketing" element={<MarketingLayout />}>
                    <Route index element={<MarketingDashboard />} />
                    <Route path="campaigns" element={<CampaignsList />} />
                    <Route path="roi" element={<RoiDashboard />} />
                    <Route path="journeys" element={<MarketingJourneys />} />
                    <Route path="reports" element={<PlaceholderPage title="Marketing Reports" />} />
                    <Route path="ai" element={<PlaceholderPage title="Marketing AI Insights" />} />
                    <Route path="*" element={<Navigate to="/marketing" replace />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            </AIProvider>
            <CommandPalette />
          </BrowserRouter>
          <DialerWidget />
          <Toaster position="top-right" richColors closeButton />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
