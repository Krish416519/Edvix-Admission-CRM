
# PHASE 2.0 INITIAL METRICS

## 1. Metrics Summary
- Total Routes: 91
- Total Authorization Checks: 104
- Total Supabase Queries (from/select): 765
- Total Mutations (insert/update/delete): 216
- Total RPCs: 50
- Total Realtime Subscriptions: 26
- Total Potential Legacy Admin Refs: 87
- Total Privileged Operations: 266 (Approximated as mutations + RPCs)

## 2. Sample Legacy Findings
components\admin\UserManagement.tsx: user.role
components\admissionOS\DailyMissions.tsx: user.role
components\ai\AIAssistant.tsx: role === 
components\ai\AIAssistant.tsx: role === 
components\ai\AIAssistant.tsx: role === 
components\ai\AIAssistant.tsx: role === 
components\ai\CommandPalette.tsx: role === 
components\ai\CommandPalette.tsx: role === 
components\ai\CommandPalette.tsx: role === 
components\ai\CommandPalette.tsx: role === 
components\ai\CommandPalette.tsx: role === 
components\ai\FounderDashboard.tsx: !== 'Admin'
components\applications\ApplicationWorkspace.tsx: role === 
components\applications\ApplicationWorkspace.tsx: role === 
components\applications\ApplicationWorkspace.tsx: role === 
components\applications\ApplicationWorkspace.tsx: role === 
components\dashboard\Dashboard.tsx: user.role
components\dashboard\DashboardWidgets.tsx: user.role
components\dashboard\DashboardWidgets.tsx: user.role
components\dashboard\DashboardWidgets.tsx: !== 'Admin'
components\leads\AdvancedFilterSidebar.tsx: isAdmin
components\leads\AdvancedFilterSidebar.tsx: isAdmin
components\leads\LeadsList.tsx: === 'Admin'
components\leads\profile\DispositionWidget.tsx: user.role
components\leads\profile\LeadAssignmentPanel.tsx: role === 
components\partner\PartnerAi.tsx: role === 
components\partner\PartnerAi.tsx: role === 
components\profile\UserProfile.tsx: user.role
components\public\ChatWidget.tsx: role === 
components\public\ChatWidget.tsx: role === 
components\public\ChatWidget.tsx: role === 
components\public\ChatWidget.tsx: role === 
components\public\ChatWidget.tsx: role === 
components\telephony\CallCenterDashboard.tsx: isAdmin
components\telephony\CallCenterDashboard.tsx: isAdmin
components\telephony\CallCenterDashboard.tsx: isAdmin
components\university\UniversityAi.tsx: role === 
components\university\UniversityAi.tsx: role === 
components\universityOps\AdmissionDecisionPanel.tsx: === 'Admin'
components\universityOps\AdmissionLetterManager.tsx: === 'Admin'
components\universityOps\IntegrationConfig.tsx: === 'Admin'
components\universityOps\UniversityProfileEditor.tsx: === 'Admin'
contexts\AuthContext.tsx: user.role
contexts\AuthContext.tsx: role === 
contexts\AuthContext.tsx: user.role
contexts\AuthContext.tsx: .includes('Admin')
contexts\AuthContext.tsx: user.role
contexts\AuthContext.tsx: user.role
contexts\AuthContext.tsx: user.role
contexts\AuthContext.tsx: user.role

## 3. Sample Route Findings
App.tsx: <Routes>
                {/* Public Routes */}
                <Route path="/login"
App.tsx: <Route path="/forgot-password"
App.tsx: <Route path="/reset-password"
App.tsx: <Route path="/public/chat"
App.tsx: <Route path="/api-docs"
App.tsx: <Route element={<ProtectedRoute />}>
                  <Route path="/"
App.tsx: <Route index element={<Dashboard />} />
                    <Route path="all-leads"
App.tsx: <Route path="all-leads/:id"
App.tsx: <Route path="/ai-dashboard"
App.tsx: <Route path="/admin/founder"
App.tsx: <Route path="/ai-intelligence"
App.tsx: <Route path="/smart-view"
App.tsx: <Route path="/smart-view/:id"
App.tsx: <Route path="/smart-view/command-center"
App.tsx: <Route path="tasks"
App.tsx: <Route path="whatsapp"
App.tsx: <Route path="integration"
App.tsx: <Route path="automation"
App.tsx: <Route path="analytics"
App.tsx: <Route path="notifications"
App.tsx: <Route path="profile"
App.tsx: <Route path="call-center"
App.tsx: <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                      {/* Admin Console Routes */}
                      <Route path="admin"
App.tsx: <Route index element={<SuperAdminDashboard />} />
                        <Route path="team-intelligence"
App.tsx: <Route path="users"
App.tsx: <Route path="lead-forms"
App.tsx: <Route path="dispositions"
App.tsx: <Route path="smartviews"
App.tsx: <Route path="universities"
App.tsx: <Route path="courses"
App.tsx: <Route path="ai"
App.tsx: <Route path="notifications"
App.tsx: <Route element={<ProtectedRoute requireSuperAdmin />}>
                          <Route path="roles"
App.tsx: <Route path="settings"
App.tsx: <Route path="security"
App.tsx: <Route path="backup"
App.tsx: <Route path="logs"
App.tsx: <Route path="audit-logs"
App.tsx: <Route path="billing"
App.tsx: <Route path="developer"
App.tsx: <Route path="automation"
App.tsx: <Route path="webhooks"
App.tsx: <Route path="backend"
App.tsx: <Route path="bi"
App.tsx: <Route index element={<ExecutiveDashboard />} />
                        <Route path="funnel"
App.tsx: <Route path="revenue"
App.tsx: <Route path="performance"
App.tsx: <Route path="reports"
App.tsx: <Route element={<ProtectedRoute allowedDomains={['Partner']} />}>
                  <Route path="/partner"
App.tsx: <Route index element={<PartnerDashboard />} />
                    <Route path="leads"

## 4. Sample DB Operations
components\admin\AuditLogsTab.tsx: .from('audit_logs')
components\admin\AutomationBuilder.tsx: .from('automation_workflows')
components\admin\AutomationBuilder.tsx: .from('automation_workflows')
components\admin\AutomationBuilder.tsx: .from('automation_actions')
components\admin\AutomationBuilder.tsx: .from('automation_actions')
components\admin\AutomationBuilder.tsx: .from('automation_workflows')
components\admin\AutomationBuilder.tsx: .from('automation_workflows')
components\admin\AutomationBuilder.tsx: .insert(
components\admin\AutomationBuilder.tsx: .insert(
components\admin\AutomationBuilder.tsx: .insert(
components\admin\AutomationBuilder.tsx: .update(
components\admin\AutomationBuilder.tsx: .delete(
components\admin\BackupRestore.tsx: .from('system_backups')
components\admin\BackupRestore.tsx: .from('system_backups')
components\admin\BackupRestore.tsx: .from('system_backups')
components\admin\BackupRestore.tsx: .insert(
components\admin\BackupRestore.tsx: .update(
components\admin\DeveloperSettings.tsx: .from('webhooks')
components\admin\DeveloperSettings.tsx: .from('api_keys')
components\admin\DeveloperSettings.tsx: .from('api_keys')
components\admin\DeveloperSettings.tsx: .from('api_keys')
components\admin\DeveloperSettings.tsx: .from('webhooks')
components\admin\DeveloperSettings.tsx: .from('webhooks')
components\admin\DeveloperSettings.tsx: .insert(
components\admin\DeveloperSettings.tsx: .update(
components\admin\DeveloperSettings.tsx: .insert(
components\admin\DeveloperSettings.tsx: .delete(
components\admin\MasterDataManagement.tsx: .from('universities')
components\admin\MasterDataManagement.tsx: .from('courses')
components\admin\MasterDataManagement.tsx: .from('universities')
components\admin\MasterDataManagement.tsx: .delete(
components\admin\MasterDataManagement.tsx: .delete(
components\admin\MasterDataManagement.tsx: .update(
components\admin\MasterDataManagement.tsx: .delete(
components\admin\MasterDataManagement.tsx: .update(
components\admin\MasterDataManagement.tsx: .insert(
components\admin\NotificationSettings.tsx: .from('system_settings')
components\admin\NotificationSettings.tsx: .from('system_settings')
components\admin\NotificationSettings.tsx: .upsert(
components\admin\RoleManagement.tsx: .from('roles')
components\admin\RoleManagement.tsx: .from('permissions')
components\admin\RoleManagement.tsx: .from('role_permissions')
components\admin\RoleManagement.tsx: .from('role_permissions')
components\admin\RoleManagement.tsx: .from('role_permissions')
components\admin\RoleManagement.tsx: .from('role_permissions')
components\admin\RoleManagement.tsx: .from('roles')
components\admin\RoleManagement.tsx: .delete(
components\admin\RoleManagement.tsx: .delete(
components\admin\RoleManagement.tsx: .insert(
components\admin\RoleManagement.tsx: .insert(
