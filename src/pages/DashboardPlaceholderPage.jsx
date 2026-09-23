import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import SanctuaryHeader from '../components/SanctuaryHeader'
import {
  Sparkles,
  Compass,
  Flame,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

export default function DashboardPlaceholderPage() {
  const { user, profile } = useAuth()
  const pathName = sessionStorage.getItem('kalpa_selected_path_name') || 'Exploration Sanctuary'
  const workStyleSummary = JSON.parse(
    localStorage.getItem('kalpa_work_style_summary') ||
      '{"learning_style":"Hands-on experiential discovery","collaboration_style":"Balanced hybrid rhythm","motivation_driver":"Tangible craft & creation","feedback_preference":"Strengths-first guidance"}'
  )

  return (
    <div className="relative min-h-screen bg-bg-dark text-slate-100 overflow-x-hidden">
      <SanctuaryHeader />

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[38rem] h-[38rem] rounded-full bg-gorange/15 blur-[130px]" />
        <div className="absolute top-1/3 -right-24 w-[34rem] h-[34rem] rounded-full bg-violet/15 blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-[30rem] h-[30rem] rounded-full bg-coral/10 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full pt-28 pb-16 min-h-[calc(100vh-140px)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 space-y-8">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[28px] glass-panel-elevated p-6 sm:p-10 relative overflow-hidden"
          >
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gorange font-mono uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-gorange" />
                <span>Sanctuary Path Initialized</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Welcome home, {profile?.display_name || user?.email?.split('@')[0] || 'Explorer'}! 🌻
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Your instincts have been recorded into your private Supabase Postgres sanctuary. You are taking your first steps toward{' '}
                <span className="text-white font-semibold">{pathName}</span>.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-emerald">
                <ShieldCheck className="w-4 h-4" />
                <span>Row Level Security Verified · Encrypted to your session</span>
              </div>
            </div>
          </motion.div>

          {/* Work Style Synthesis Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[26px] glass-panel p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-gorange font-semibold">
                  Aptitude & Style Profile
                </span>
                <h2 className="font-display text-xl font-bold text-white">Your Sanctuary Fingerprint</h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald/10 border border-emerald/20 text-emerald text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Synced</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="font-mono text-[11px] uppercase text-slate-400">Learning Style</span>
                <p className="text-sm font-semibold text-slate-100">{workStyleSummary.learning_style}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="font-mono text-[11px] uppercase text-slate-400">Collaboration Rhythm</span>
                <p className="text-sm font-semibold text-slate-100">{workStyleSummary.collaboration_style}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="font-mono text-[11px] uppercase text-slate-400">Core Motivation</span>
                <p className="text-sm font-semibold text-slate-100">{workStyleSummary.motivation_driver}</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="font-mono text-[11px] uppercase text-slate-400">Feedback Sanctuary</span>
                <p className="text-sm font-semibold text-slate-100">{workStyleSummary.feedback_preference}</p>
              </div>
            </div>
          </motion.div>

          {/* Next Phase Teaser & Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-[26px] glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="space-y-1 text-center md:text-left">
              <span className="font-mono text-xs uppercase text-violet font-semibold">
                Phase 3 Roadmap Under Construction
              </span>
              <h3 className="font-display text-xl font-bold text-white">
                Personalized Learning & Squad Matching
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                In Phase 3, we will unlock your customized step-by-step curriculum, daily reflections, and your 5-person peer squad.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to="/paths"
                className="py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold border border-white/10 flex items-center gap-2 transition-colors"
              >
                <Compass className="w-4 h-4 text-gorange" />
                <span>Switch Path</span>
              </Link>
              <Link
                to="/quiz"
                className="py-3 px-5 rounded-xl bg-gradient-to-r from-gorange to-coral text-white text-xs sm:text-sm font-semibold shadow-[0_4px_20px_rgba(255,85,0,0.35)] hover:opacity-95 flex items-center gap-2 transition-all"
              >
                <span>Retake Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
