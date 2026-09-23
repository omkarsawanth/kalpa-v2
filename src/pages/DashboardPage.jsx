import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SanctuaryHeader from '../components/SanctuaryHeader'
import {
  Flame,
  CheckCircle2,
  Sparkles,
  Compass,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Clock,
  Award,
  Layers,
  Heart,
  Smile,
  Check,
  Calendar,
  Lock,
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Real Supabase Data States
  const [userProfile, setUserProfile] = useState(null)
  const [careerPath, setCareerPath] = useState(null)
  const [workStyle, setWorkStyle] = useState(null)
  const [assessments, setAssessments] = useState([])
  const [isCompletingStreak, setIsCompletingStreak] = useState(false)
  const [streakSuccessMessage, setStreakSuccessMessage] = useState(null)

  const fetchDashboardData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Fetch fresh profile from Supabase
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr) throw profileErr
      const activeProfile = profileData || profile
      setUserProfile(activeProfile)

      // 2. Fetch Selected Career Path details from Supabase
      if (activeProfile?.selected_career_path_id) {
        const { data: pathData, error: pathErr } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', activeProfile.selected_career_path_id)
          .maybeSingle()

        if (!pathErr && pathData) {
          setCareerPath(pathData)
        }
      } else {
        // If user hasn't selected a path yet, fetch the default recommended first path
        const { data: defaultPath } = await supabase
          .from('career_paths')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (defaultPath) setCareerPath(defaultPath)
      }

      // 3. Fetch Work Style Profile from Supabase
      const { data: wsData } = await supabase
        .from('work_style_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      setWorkStyle(wsData)

      // 4. Fetch Skill Assessments from Supabase to compute Career Readiness %
      const { data: assessmentData } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('user_id', user.id)

      setAssessments(assessmentData || [])
    } catch (err) {
      console.error('[Kalpa v2] Error fetching dashboard data:', err.message)
      setError(err.message || 'Unable to load your sanctuary dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  // Complete Daily Task via atomic Supabase RPC function
  const handleCompleteDailyTask = async () => {
    if (!user || isCompletingStreak) return

    setIsCompletingStreak(true)
    setStreakSuccessMessage(null)

    // Optimistic UI update
    const previousStreak = userProfile?.current_streak ?? 0
    setUserProfile((prev) => ({
      ...prev,
      current_streak: previousStreak + 1,
      last_completed_date: new Date().toISOString().split('T')[0],
    }))

    try {
      const { data, error: rpcErr } = await supabase.rpc('complete_daily_task', {
        target_user_id: user.id,
      })

      if (rpcErr) throw rpcErr

      // Reconcile with real database response
      if (data?.current_streak !== undefined) {
        setUserProfile((prev) => ({
          ...prev,
          current_streak: data.current_streak,
          last_completed_date: data.last_completed_date,
        }))
        await refreshProfile()

        if (data.already_completed) {
          setStreakSuccessMessage("You have already completed today's focus! Rhythm preserved.")
        } else {
          setStreakSuccessMessage(`Streak elevated to ${data.current_streak} days! Flame burning bright.`)
        }
      }
    } catch (err) {
      console.error('[Kalpa v2] Streak completion error:', err.message)
      // Rollback optimistic state on failure
      setUserProfile((prev) => ({
        ...prev,
        current_streak: previousStreak,
      }))
      setError('Could not update daily streak. Please check connection and try again.')
    } finally {
      setIsCompletingStreak(false)
    }
  }

  // Compute Career Readiness Percentage from real skill_assessments
  const totalAssessed = assessments.length
  const correctAssessed = assessments.filter((a) => a.is_correct).length
  const readinessPercent = totalAssessed > 0 ? Math.round((correctAssessed / totalAssessed) * 100) : 0

  // Check if today is completed
  const todayStr = new Date().toISOString().split('T')[0]
  const isCompletedToday = userProfile?.last_completed_date === todayStr

  // Daily Affirmation based on selected career path category
  const getDailyAffirmation = () => {
    const category = careerPath?.category
    if (category === 'cooking') {
      return 'Daily Affirmation: Flavors harmonized through patience, heat, and sensory curiosity.'
    }
    if (category === 'teaching') {
      return 'Daily Affirmation: Patience & curiosity make great teachers.'
    }
    if (category === 'tech') {
      return 'Daily Affirmation: Great engineering begins with empathy. Every tool is built for a human.'
    }
    if (category === 'management') {
      return 'Daily Affirmation: True leadership creates quiet spaces where others feel safe to shine.'
    }
    return 'Daily Affirmation: Gentle daily consistency compounds into joyful lifelong mastery.'
  }

  const streakCount = userProfile?.current_streak ?? 0

  return (
    <div className="relative min-h-screen bg-bg-dark text-slate-100 overflow-x-hidden">
      <SanctuaryHeader />

      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[38rem] h-[38rem] rounded-full bg-gorange/10 blur-[130px]" />
        <div className="absolute top-1/3 -right-24 w-[34rem] h-[34rem] rounded-full bg-violet/10 blur-[140px]" />
        <div className="absolute bottom-10 left-10 w-[30rem] h-[30rem] rounded-full bg-coral/10 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full pt-28 pb-16 min-h-[calc(100vh-140px)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 space-y-8">
          {/* Two-Tier Sub Navigation */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1">
              <span className="px-4 py-2 rounded-xl bg-gorange text-white font-semibold text-xs sm:text-sm shadow-[0_4px_16px_rgba(255,85,0,0.35)] flex items-center gap-2 shrink-0">
                <Sparkles className="w-4 h-4" />
                <span>Dashboard</span>
              </span>

              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-white/[0.03] text-slate-400 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-not-allowed border border-white/5 shrink-0 opacity-70"
                title="Unlocks in Phase 3"
              >
                <span>My Roadmap</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                  Coming Soon
                </span>
              </button>

              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-white/[0.03] text-slate-400 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-not-allowed border border-white/5 shrink-0 opacity-70"
                title="Unlocks in Phase 3"
              >
                <span>My Squad</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                  Coming Soon
                </span>
              </button>

              <button
                type="button"
                disabled
                className="px-4 py-2 rounded-xl bg-white/[0.03] text-slate-400 text-xs sm:text-sm font-medium flex items-center gap-2 cursor-not-allowed border border-white/5 shrink-0 opacity-70"
                title="Unlocks in Phase 3"
              >
                <span>Leaderboard</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                  Coming Soon
                </span>
              </button>
            </div>

            <Link
              to="/paths"
              className="text-xs text-gorange hover:underline font-semibold flex items-center gap-1 shrink-0 ml-4"
            >
              <span>Switch Track</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="p-4 rounded-2xl bg-coral/10 border border-coral/30 flex items-center justify-between text-xs text-coral">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchDashboardData}
                className="px-3 py-1.5 rounded-lg bg-coral text-white font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Skeleton Loading State */}
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-44 rounded-[28px] glass-panel-elevated p-8 bg-white/5" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-48 rounded-3xl glass-panel bg-white/5" />
                <div className="h-48 rounded-3xl glass-panel bg-white/5" />
                <div className="h-48 rounded-3xl glass-panel bg-white/5" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 h-64 rounded-2xl glass-panel bg-white/5" />
                <div className="lg:col-span-5 h-64 rounded-2xl glass-panel bg-white/5" />
              </div>
            </div>
          ) : (
            <>
              {/* Top Welcome Sanctuary Banner */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative w-full rounded-[28px] glass-panel-elevated p-6 sm:p-10 shadow-xl overflow-hidden"
              >
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-3xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300">
                      <span className="w-2 h-2 rounded-full bg-gorange animate-pulse" />
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gorange font-semibold">
                        Sanctuary Path • Week 1 of 12
                      </span>
                    </div>

                    <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                      Good day, {userProfile?.display_name || user?.email?.split('@')[0] || 'Explorer'}!{' '}
                      <span className="inline-block hover:scale-110 transition-transform cursor-default">🌻</span>
                    </h1>

                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                      You are actively exploring your journey in{' '}
                      <span className="text-white font-semibold underline decoration-gorange/50 underline-offset-4">
                        {careerPath?.name || 'Chosen Career Field'}
                      </span>
                      . Two focused reflections scheduled today.
                    </p>

                    <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gorange/10 border border-gorange/20 text-xs sm:text-sm text-gorange font-medium">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>{getDailyAffirmation()}</span>
                    </div>
                  </div>

                  {/* Active Cohort Widget */}
                  <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-2xl glass-panel shadow-md">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gorange to-coral flex items-center justify-center text-white font-bold text-lg shadow-md">
                        {careerPath?.name?.[0] || 'K'}
                      </div>
                      <div className="flex flex-col pr-2">
                        <span className="font-mono text-[10px] uppercase text-slate-400">Active Cohort</span>
                        <span className="font-display text-xs sm:text-sm font-bold text-white">
                          {careerPath?.name || 'Sanctuary Cohort'} • Cohort I
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/quiz"
                      className="px-5 py-2.5 rounded-xl bg-gorange hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,85,0,0.35)] flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <span>Take Practice Reflection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.section>

              {/* Streak notification alert */}
              {streakSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald/10 border border-emerald/30 text-emerald text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{streakSuccessMessage}</span>
                </div>
              )}

              {/* Key Metrics Row (3 Frosted Cards) */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Exploration Streak */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                  className="rounded-3xl glass-panel p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Sanctuary Rhythm
                      </span>
                      <h2 className="font-display text-lg font-bold text-white mt-0.5">Exploration Streak</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-gorange/20 text-gorange flex items-center justify-center shadow-inner border border-gorange/30">
                      <Flame className="w-6 h-6" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                        {streakCount}
                      </span>
                      <span className="font-display text-base font-semibold text-gorange">Days Active</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {streakCount >= 7
                        ? 'Silver Torch milestone achieved! Next: 14 Days'
                        : `Next milestone: 7 Days (Bronze Torch) • ${Math.max(1, 7 - streakCount)} left`}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      disabled={isCompletedToday || isCompletingStreak}
                      onClick={handleCompleteDailyTask}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isCompletedToday
                          ? 'bg-emerald/15 text-emerald border border-emerald/30 cursor-default'
                          : 'bg-gradient-to-r from-gorange to-coral text-white shadow-[0_4px_16px_rgba(255,85,0,0.35)] hover:opacity-95'
                      }`}
                    >
                      {isCompletedToday ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald" />
                          <span>Focus Completed for Today ✓</span>
                        </>
                      ) : (
                        <>
                          <Flame className="w-4 h-4" />
                          <span>{isCompletingStreak ? 'Saving Focus...' : "Complete Today's Focus"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>

                {/* Card 2: Career Readiness with Ring Visual */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="rounded-3xl glass-panel p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Curriculum Velocity
                      </span>
                      <h2 className="font-display text-lg font-bold text-white mt-0.5">Career Readiness</h2>
                    </div>

                    {/* Circular Progress Ring */}
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                        <circle
                          className="text-white/10"
                          cx="24"
                          cy="24"
                          fill="transparent"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <circle
                          className="text-gorange"
                          cx="24"
                          cy="24"
                          fill="transparent"
                          r="20"
                          stroke="currentColor"
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 - (125.6 * (readinessPercent || 25)) / 100}
                          strokeLinecap="round"
                          strokeWidth="4"
                        />
                      </svg>
                      <span className="absolute font-mono text-[11px] text-white font-bold">
                        {readinessPercent > 0 ? `${readinessPercent}%` : '0%'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                        {readinessPercent}%
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald/10 text-emerald text-[11px] font-mono font-medium">
                        <TrendingUp className="w-3 h-3" />
                        <span>{totalAssessed > 0 ? `${correctAssessed}/${totalAssessed} answered` : 'Quiz Pending'}</span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {totalAssessed > 0
                        ? `Computed across ${totalAssessed} tailored assessment reflections`
                        : 'Take the tailored quiz to generate your readiness baseline'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <Link
                      to="/quiz"
                      className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-gorange" />
                      <span>{totalAssessed > 0 ? 'Elevate Readiness' : 'Take Tailored Quiz'}</span>
                    </Link>
                  </div>
                </motion.div>

                {/* Card 3: Field Practicum Hours / Skill Level */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="rounded-3xl glass-panel p-6 flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        Field Practicum
                      </span>
                      <h2 className="font-display text-lg font-bold text-white mt-0.5">Craft Milestones</h2>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-violet/20 text-violet flex items-center justify-center shadow-inner border border-violet/30">
                      <Award className="w-6 h-6" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                        {totalAssessed > 0 ? `${totalAssessed * 2}.5` : '0.0'}
                      </span>
                      <span className="font-display text-base font-semibold text-violet">hours logged</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Goal: 50 hrs for Level 1 Mentor status • Sanctuary certified
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <div className="w-full py-2 px-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Status: Explorer Level 1</span>
                      <span className="font-mono text-emerald font-semibold">Active</span>
                    </div>
                  </div>
                </motion.div>
              </section>

              {/* Two-Column Section: Focus Modules & Work Style Fingerprint */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Daily Focus Module (7 Cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-gorange" />
                      <h2 className="font-display text-xl font-bold text-white">Today’s High-Impact Focus</h2>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      1 Module Ready
                    </span>
                  </div>

                  {/* High-Impact Practice Module Card */}
                  <div className="relative rounded-2xl glass-panel p-6 shadow-md hover:shadow-xl transition-all duration-300">
                    <div className="absolute left-0 top-6 bottom-6 w-1.5 bg-gorange rounded-r-full" />
                    <div className="pl-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-gorange/15 font-mono text-[11px] text-gorange uppercase font-semibold">
                            Interactive Studio
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">• 15 mins interactive</span>
                        </div>
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-coral">
                          <Sparkles className="w-3.5 h-3.5" /> Peer Feedback Ready
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white">
                          {careerPath?.category === 'cooking'
                            ? 'Balancing Acid & Fat in Savory Sauces'
                            : careerPath?.category === 'teaching'
                            ? 'Explaining Metaphors in 3 Minutes with Visual Pacing'
                            : 'Friendly Problem Deconstruction & Empathy Check'}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                          {careerPath?.category === 'cooking'
                            ? 'Practice adjusting sensory mouthfeel using cold fat and natural sweetness without losing herbal brightness.'
                            : careerPath?.category === 'teaching'
                            ? 'Practice breaking down challenging verse into relatable modern analogies for first-time learners.'
                            : 'Walk through an everyday user workflow to identify hidden bottlenecks and craft approachable solutions.'}
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-slate-400 text-xs">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> 15 mins
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald" /> Sanctuary rubric
                          </span>
                        </div>

                        <Link
                          to="/quiz"
                          className="px-4 py-2 rounded-xl bg-gorange text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,85,0,0.3)] hover:opacity-95 flex items-center gap-1.5 transition-all"
                        >
                          <span>Start Focus</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Skills Progress Breakdown */}
                  <div className="p-6 rounded-2xl glass-panel space-y-4">
                    <h3 className="font-display text-base font-bold text-white">
                      Core Foundations Progress
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">
                            {careerPath?.category === 'cooking' ? 'Flavor Chemistry & Sensory Acuity' : 'Intuitive Problem Solving'}
                          </span>
                          <span className="font-mono text-gorange">85%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-gorange" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">
                            {careerPath?.category === 'cooking' ? 'Knife Craft & Mise en Place' : 'Empathetic Communication'}
                          </span>
                          <span className="font-mono text-coral">70%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-coral" style={{ width: '70%' }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 font-medium">
                            {careerPath?.category === 'cooking' ? 'Thermal Control & Searing' : 'Systems & Organization'}
                          </span>
                          <span className="font-mono text-violet">65%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-violet" style={{ width: '65%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Work Style Fingerprint (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-violet" />
                      <h2 className="font-display text-xl font-bold text-white">Sanctuary Fingerprint</h2>
                    </div>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30 font-semibold">
                      {workStyle ? 'Postgres Synced' : 'Default Profile'}
                    </span>
                  </div>

                  <div className="rounded-2xl glass-panel p-6 space-y-4">
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-gorange font-semibold">
                        Learning Modality
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-white">
                        {workStyle?.learning_style || 'Hands-on experiential discovery with visual breakdowns'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-coral font-semibold">
                        Collaboration Rhythm
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-white">
                        {workStyle?.collaboration_style || 'Balanced hybrid rhythm with quiet morning focus'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-violet font-semibold">
                        Core Spark
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-white">
                        {workStyle?.motivation_driver || 'Tangible craft and creative human empowerment'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-amber font-semibold">
                        Feedback Sanctuary
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-white">
                        {workStyle?.feedback_preference || 'Strengths-first coaching with actionable clarity'}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        to="/quiz"
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake Style Assessment</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
