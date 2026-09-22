import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import {
  ShieldCheck,
  Flame,
  Sparkles,
  LogOut,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react'

export default function LoginPage() {
  const { user, profile, loading, error, signInWithGoogle, signOut } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [localError, setLocalError] = useState(null)

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    setLocalError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setLocalError(err.message || 'Authentication encountered an issue.')
    } finally {
      setIsSigningIn(false)
    }
  }

  const activeError = localError || error

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden bg-bg-dark selection:bg-gorange/30 selection:text-gorange">
      {/* Ambient background glows (Framer Motion driven) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-gorange/15 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-coral/15 blur-[130px]"
        />
        <motion.div
          animate={{
            x: [0, 30, -30, 0],
            y: [0, 30, -20, 0],
            scale: [0.9, 1.05, 1, 0.9],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-violet/10 blur-[140px]"
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="glass-panel-elevated rounded-[28px] p-6 sm:p-10 transition-all duration-300">
          {/* Header Brand */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-[20px] bg-gradient-to-br from-gorange to-coral shadow-[0_0_25px_rgba(255,85,0,0.4)]">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-xl tracking-tight text-white">
                    KALPA
                  </span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gorange/20 text-gorange border border-gorange/30">
                    v2.0
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Career Trajectory Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald" />
              <span>RLS Enforced</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-14 flex flex-col items-center justify-center gap-3"
              >
                <div className="w-8 h-8 border-2 border-gorange/30 border-t-gorange rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Connecting to Supabase...</p>
              </motion.div>
            ) : user ? (
              /* Authenticated View */
              <motion.div
                key="authenticated"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[18px] bg-gradient-to-br from-violet to-coral flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                      {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'K'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white truncate">
                          {profile?.display_name || 'Kalpa Explorer'}
                        </h2>
                        <CheckCircle2 className="w-4 h-4 text-emerald shrink-0" />
                      </div>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gorange">
                          <Flame className="w-3 h-3" />
                          Streak: {profile?.current_streak ?? 0} days
                        </span>
                        <span className="text-[10px] text-slate-500">•</span>
                        <span className="text-[11px] text-slate-400 font-mono text-[10px]">
                          ID: {user.id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-[20px] bg-emerald/10 border border-emerald/20 text-xs text-emerald space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Database className="w-4 h-4" />
                    <span>Supabase Postgres Profile Synchronized</span>
                  </div>
                  <p className="text-[11px] text-emerald/80 pl-6">
                    Row Level Security is active. Your profile data is strictly readable and writable by your auth session (auth.uid = id).
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={signOut}
                  className="w-full py-3.5 px-4 rounded-[20px] bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-semibold border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </motion.button>
              </motion.div>
            ) : (
              /* Unauthenticated / Login View */
              <motion.div
                key="login"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
                    Welcome to <span className="text-gorange">Kalpa</span>
                  </h1>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    Personalized AI career roadmaps, real-world skill verification, and autonomous progression.
                  </p>
                </div>

                {/* Error Banner */}
                {activeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-[18px] bg-coral/10 border border-coral/30 flex items-start gap-3 text-xs text-coral"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1">{activeError}</div>
                  </motion.div>
                )}

                {/* Google Sign In CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isSigningIn}
                  onClick={handleGoogleSignIn}
                  className="relative w-full py-4 px-6 rounded-[22px] bg-gradient-to-r from-gorange to-coral text-white font-semibold text-sm shadow-[0_10px_30px_rgba(255,85,0,0.35)] hover:shadow-[0_15px_35px_rgba(255,85,0,0.5)] transition-all flex items-center justify-center gap-3 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {/* Official Google 'G' icon with white container */}
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-1 shrink-0">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                  </div>

                  <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google'}</span>
                  <ArrowRight className="w-4 h-4 ml-auto text-white/80 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {/* Architecture Highlights */}
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-[18px] bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Lock className="w-3.5 h-3.5 text-gorange" />
                      <span>Postgres RLS</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Every table protected at the database engine level.
                    </p>
                  </div>
                  <div className="p-3 rounded-[18px] bg-white/[0.03] border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <Sparkles className="w-3.5 h-3.5 text-coral" />
                      <span>Google OAuth</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Seamless one-click identity & auto profile sync.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-white/5 text-center">
            <p className="text-[11px] text-slate-500 font-medium">
              Kalpa v2 • Powered solely by Supabase Postgres & Auth
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
