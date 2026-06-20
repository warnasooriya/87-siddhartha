import { CircularProgress, Stack, Typography } from '@mui/material'
import { lazy, Suspense, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ALL_USER_ROLES, FULL_ACCESS_ROLES } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import AppShell from '../layouts/AppShell'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import ProfilePage from '../pages/ProfilePage'
import SettingsPage from '../pages/SettingsPage'
import type { UserRole } from '../types/domain'

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))
const MembersPage = lazy(() => import('../features/members/MembersPage'))
const BirthdaysPage = lazy(() => import('../features/birthdays/BirthdaysPage'))
const DocumentsPage = lazy(() => import('../features/documents/DocumentsPage'))
const SamithiReportsPage = lazy(() => import('../features/documents/SamithiReportsPage'))
const ConstitutionPage = lazy(() => import('../features/documents/ConstitutionPage'))
const FeesPage = lazy(() => import('../features/documents/FeesPage'))
const FinancePage = lazy(() => import('../features/finance/FinancePage'))
const AuditPage = lazy(() => import('../features/audit/AuditPage'))

const LoadingFallback = () => (
  <Stack spacing={2} sx={{ minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
    <Typography color="text.secondary">පිටුව පූරණය වෙමින් පවතී...</Typography>
  </Stack>
)

const ProtectedRoute = ({
  roles,
  children,
}: {
  roles?: UserRole[]
  children: ReactElement
}) => {
  const auth = useAuth()

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && !auth.hasRole(roles)) {
    return <Navigate to="/" replace />
  }

  return children
}

const AppRouter = () => (
  <Suspense fallback={<LoadingFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/birthdays" element={<BirthdaysPage />} />
        <Route path="/samithi-reports" element={<SamithiReportsPage />} />
        <Route path="/constitution" element={<ConstitutionPage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/documents"
          element={
            <ProtectedRoute roles={ALL_USER_ROLES}>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={FULL_ACCESS_ROLES}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={FULL_ACCESS_ROLES}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
)

export default AppRouter
