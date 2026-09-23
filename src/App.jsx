import React, { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Lazy-loaded route chunks
const LoginPage = lazy(() => import('./pages/LoginPage'))
const CareerPathsPage = lazy(() => import('./pages/CareerPathsPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'))

function RouteFallback() {
  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gorange/30 border-t-gorange rounded-full animate-spin" />
    </div>
  )
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <RouteFallback />
  }

  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/paths"
          element={
            <ProtectedRoute>
              <CareerPathsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <ProtectedRoute>
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          }
        />
        {/* Root redirect */}
        <Route
          path="/"
          element={<Navigate to={user ? '/paths' : '/paths'} replace />}
        />
        <Route path="*" element={<Navigate to="/paths" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
