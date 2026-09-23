import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import CareerPathsPage from './pages/CareerPathsPage'
import QuizPage from './pages/QuizPage'
import DashboardPlaceholderPage from './pages/DashboardPlaceholderPage'

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gorange/30 border-t-gorange rounded-full animate-spin" />
      </div>
    )
  }

  // Allow access in demo/preview mode even if not signed in so user can freely explore
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  return (
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
            <DashboardPlaceholderPage />
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
