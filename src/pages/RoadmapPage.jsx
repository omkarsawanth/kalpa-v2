import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SanctuaryHeader from '../components/SanctuaryHeader'
import {
  Flame,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  Compass,
  AlertCircle,
  Clock,
  BookOpen,
  Award,
  Layers,
  Check,
  RotateCcw
} from 'lucide-react'

export default function RoadmapPage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [careerPath, setCareerPath] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [tasksByMilestone, setTasksByMilestone] = useState({})
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set())
  const [expandedMilestones, setExpandedMilestones] = useState({})
  const [completingTaskId, setCompletingTaskId] = useState(null)
  const [streakNotification, setStreakNotification] = useState(null)

  // Fetch full roadmap hierarchy and user progress
  const fetchRoadmapData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // 1. Fetch fresh user profile to get selected_career_path_id
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileErr) throw profileErr
      const activePathId = profileData?.selected_career_path_id || profile?.selected_career_path_id

      let targetPathId = activePathId
      if (!targetPathId) {
        // Fallback to first path if not chosen yet
        const { data: defaultPath } = await supabase
          .from('career_paths')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (defaultPath) {
          targetPathId = defaultPath.id
          setCareerPath(defaultPath)
        }
      } else {
        const { data: pathData, error: pathErr } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', targetPathId)
          .maybeSingle()
        if (pathErr) throw pathErr
        setCareerPath(pathData)
      }

      if (!targetPathId) {
        setMilestones([])
        setLoading(false)
        return
      }

      // 2. Fetch milestones for this career path
      const { data: milestoneData, error: mErr } = await supabase
        .from('roadmap_milestones')
        .select('*')
        .eq('career_path_id', targetPathId)
        .order('order_index', { ascending: true })

      if (mErr) throw mErr
      const fetchedMilestones = milestoneData || []
      setMilestones(fetchedMilestones)

      // 3. Fetch all tasks for these milestones
      const milestoneIds = fetchedMilestones.map((m) => m.id)
      let tasksMap = {}
      if (milestoneIds.length > 0) {
        const { data: taskData, error: tErr } = await supabase
          .from('roadmap_tasks')
          .select('*')
          .in('milestone_id', milestoneIds)
          .order('order_index', { ascending: true })

        if (tErr) throw tErr
        ;(taskData || []).forEach((task) => {
          if (!tasksMap[task.milestone_id]) {
            tasksMap[task.milestone_id] = []
          }
          tasksMap[task.milestone_id].push(task)
        })
      }
      setTasksByMilestone(tasksMap)

      // 4. Fetch user's completed tasks
      const { data: progressData, error: pErr } = await supabase
        .from('user_roadmap_progress')
        .select('task_id')
        .eq('user_id', user.id)

      if (pErr) throw pErr
      const completedIds = new Set((progressData || []).map((p) => p.task_id))
      setCompletedTaskIds(completedIds)

      // 5. Determine active milestone and set initial expanded state
      // Active milestone = the first milestone that has at least one incomplete task
      let foundActive = false
      const expandedState = {}
      for (const m of fetchedMilestones) {
        const mTasks = tasksMap[m.id] || []
        const isMilestoneCompleted = mTasks.length > 0 && mTasks.every((t) => completedIds.has(t.id))
        if (!isMilestoneCompleted && !foundActive) {
          expandedState[m.id] = true
          foundActive = true
        } else {
          expandedState[m.id] = false
        }
      }
      // If all completed, expand the last milestone
      if (!foundActive && fetchedMilestones.length > 0) {
        expandedState[fetchedMilestones[fetchedMilestones.length - 1].id] = true
      }
      setExpandedMilestones(expandedState)
    } catch (err) {
      console.error('[Kalpa v2] Error fetching roadmap:', err.message)
      setError(err.message || 'Unable to load your interactive curriculum.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoadmapData()
  }, [user])

  // Toggle milestone expanded accordion
  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones((prev) => ({
      ...prev,
      [milestoneId]: !prev[milestoneId],
    }))
  }

  // Complete a roadmap task with optimistic UI and streak progression
  const handleCompleteTask = async (taskId, milestoneId) => {
    if (!user || completingTaskId) return

    setCompletingTaskId(taskId)
    setStreakNotification(null)

    // Optimistic UI update
    const previousCompleted = new Set(completedTaskIds)
    const newCompleted = new Set(completedTaskIds)
    newCompleted.add(taskId)
    setCompletedTaskIds(newCompleted)

    try {
      const { data, error: rpcErr } = await supabase.rpc('complete_roadmap_task', {
        p_task_id: taskId,
        target_user_id: user.id,
      })

      if (rpcErr) throw rpcErr

      await refreshProfile()

      if (data?.task_already_completed) {
        setStreakNotification({
          type: 'info',
          message: 'Task already completed previously. Progress safe and preserved!',
        })
      } else if (data?.already_completed) {
        setStreakNotification({
          type: 'success',
          message: "Task completed! Today's daily focus rhythm was already preserved.",
        })
      } else {
        setStreakNotification({
          type: 'celebrate',
          message: `Task completed! Streak elevated to ${data?.current_streak ?? 1} days! 🔥`,
        })
      }

      // Check if current milestone is now fully complete, and if so auto-expand the next milestone
      const mTasks = tasksByMilestone[milestoneId] || []
      const isNowComplete = mTasks.every((t) => newCompleted.has(t.id))
      if (isNowComplete) {
        const currentIndex = milestones.findIndex((m) => m.id === milestoneId)
        if (currentIndex !== -1 && currentIndex + 1 < milestones.length) {
          const nextMilestone = milestones[currentIndex + 1]
          setExpandedMilestones((prev) => ({
            ...prev,
            [nextMilestone.id]: true,
          }))
        }
      }
    } catch (err) {
      console.error('[Kalpa v2] Task completion error:', err.message)
      // Rollback optimistic state
      setCompletedTaskIds(previousCompleted)
      setError('Could not save task completion. Please check your connection.')
    } finally {
      setCompletingTaskId(null)
    }
  }

  // Calculate overall metrics
  const allTasks = Object.values(tasksByMilestone).flat()
  const totalTasks = allTasks.length
  const completedCount = allTasks.filter((t) => completedTaskIds.has(t.id)).length
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  // Helper to determine status of a milestone
  const getMilestoneState = (milestone, index) => {
    const tasks = tasksByMilestone[milestone.id] || []
    const isCompleted = tasks.length > 0 && tasks.every((t) => completedTaskIds.has(t.id))
    if (isCompleted) return 'completed'

    // Check if all previous milestones are completed
    const allPreviousCompleted = milestones
      .slice(0, index)
      .every((m) => {
        const prevTasks = tasksByMilestone[m.id] || []
        return prevTasks.length > 0 && prevTasks.every((t) => completedTaskIds.has(t.id))
      })

    if (allPreviousCompleted) return 'active'
    return 'locked'
  }

  return (
    <div className="min-h-screen bg-bg-dark text-slate-100 flex flex-col selection:bg-gorange selection:text-white">
      {/* Universal Sanctuary Header */}
      <SanctuaryHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 md:px-10 pt-28 pb-20 space-y-10">
        {/* Error notification banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-coral/10 border border-coral/30 text-coral flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchRoadmapData}
              className="px-3 py-1.5 rounded-lg bg-coral text-white font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Streak & Celebration notification */}
        <AnimatePresence>
          {streakNotification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-emerald/15 border border-emerald/30 text-emerald flex items-center justify-between gap-3 text-xs sm:text-sm shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-medium text-white">{streakNotification.message}</span>
              </div>
              <button
                onClick={() => setStreakNotification(null)}
                className="text-slate-400 hover:text-white transition-colors text-xs font-semibold px-2 py-1"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-8 animate-pulse">
            <div className="h-44 rounded-3xl bg-white/[0.03] border border-white/5 p-8 space-y-4">
              <div className="h-4 w-32 bg-white/10 rounded-full" />
              <div className="h-8 w-72 bg-white/10 rounded-xl" />
              <div className="h-4 w-96 bg-white/10 rounded-full" />
            </div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-3xl bg-white/[0.02] border border-white/5 p-6" />
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <>
            {/* Header Hero Banner */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-3xl glass-panel-elevated p-6 sm:p-8 md:p-10 relative overflow-hidden space-y-6"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-gorange/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-coral/10 rounded-full blur-[90px] pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gorange/10 border border-gorange/20">
                    <Sparkles className="w-3.5 h-3.5 text-gorange" />
                    <span className="font-mono text-[11px] uppercase tracking-wider text-gorange font-semibold">
                      Interactive Curriculum • {careerPath?.category || 'Sanctuary'}
                    </span>
                  </div>

                  <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {careerPath?.name || 'Your Career'} Roadmap
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    {careerPath?.description ||
                      'Step-by-step actionable craftsmanship designed for quiet progress with zero judgment.'}
                  </p>
                </div>

                {/* Progress Ring Widget */}
                <div className="p-4 rounded-2xl glass-panel flex items-center gap-4 shrink-0 shadow-md">
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
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
                        className="text-gorange transition-all duration-700 ease-out"
                        cx="24"
                        cy="24"
                        fill="transparent"
                        r="20"
                        stroke="currentColor"
                        strokeDasharray={125.66}
                        strokeDashoffset={125.66 - (progressPercent / 100) * 125.66}
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                    </svg>
                    <span className="absolute font-mono text-xs font-bold text-white">
                      {progressPercent}%
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase text-slate-400">Total Completion</span>
                    <span className="font-display text-xs sm:text-sm font-bold text-white">
                      {completedCount} of {totalTasks} Tasks Done
                    </span>
                    <span className="text-[11px] text-gorange mt-0.5">
                      {totalTasks - completedCount === 0
                        ? 'All Milestones Mastered! 🎉'
                        : `${totalTasks - completedCount} milestones ahead`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Line */}
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden relative z-10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gorange to-coral"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.section>

            {/* Empty State if no milestones found */}
            {milestones.length === 0 && (
              <div className="rounded-3xl glass-panel p-12 text-center space-y-4">
                <Compass className="w-12 h-12 text-gorange mx-auto opacity-80" />
                <h2 className="font-display text-xl font-bold text-white">No Roadmap Configured Yet</h2>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Select a career path from our horizon directory to reveal your guided milestones and actionable focus tasks.
                </p>
                <Link
                  to="/paths"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gorange text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,85,0,0.35)]"
                >
                  <span>Explore Career Paths</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* Vertical Timeline of Milestones */}
            {milestones.length > 0 && (
              <section className="relative pl-6 sm:pl-10 md:pl-14 space-y-8">
                {/* Vertical Spine Line */}
                <div className="absolute left-3 sm:left-5 md:left-7 top-6 bottom-6 w-0.5 bg-gradient-to-b from-gorange/60 via-coral/40 to-white/10" />

                {milestones.map((milestone, idx) => {
                  const state = getMilestoneState(milestone, idx)
                  const isExpanded = !!expandedMilestones[milestone.id]
                  const tasks = tasksByMilestone[milestone.id] || []
                  const completedTasksCount = tasks.filter((t) => completedTaskIds.has(t.id)).length

                  return (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="relative"
                    >
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-6 sm:-left-10 md:-left-14 top-5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all ${
                          state === 'completed'
                            ? 'bg-emerald text-white shadow-[0_0_16px_rgba(16,185,129,0.5)]'
                            : state === 'active'
                            ? 'bg-gorange text-white ring-4 ring-gorange/25 shadow-[0_0_20px_rgba(255,85,0,0.5)]'
                            : 'bg-bg-surface border border-white/15 text-slate-500'
                        }`}
                      >
                        {state === 'completed' ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : state === 'active' ? (
                          <Flame className="w-4 h-4 text-white" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>

                      {/* Milestone Card */}
                      <div
                        className={`rounded-3xl transition-all overflow-hidden ${
                          state === 'active'
                            ? 'glass-panel-elevated border-gorange/40 shadow-[0_0_30px_rgba(255,85,0,0.12)]'
                            : state === 'completed'
                            ? 'glass-panel border-white/10 opacity-90'
                            : 'glass-panel border-white/5 opacity-65'
                        }`}
                      >
                        {/* Milestone Card Header */}
                        <div
                          onClick={() => toggleMilestone(milestone.id)}
                          className="p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                                Phase {milestone.phase_number}
                              </span>

                              {state === 'completed' && (
                                <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Phase Mastered</span>
                                </span>
                              )}

                              {state === 'active' && (
                                <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-gorange/15 text-gorange border border-gorange/30 font-semibold flex items-center gap-1">
                                  <Flame className="w-3 h-3" />
                                  <span>Current Focus</span>
                                </span>
                              )}

                              {state === 'locked' && (
                                <span className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-white/5 text-slate-500 border border-white/10 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Upcoming</span>
                                </span>
                              )}

                              <span className="font-mono text-[10px] text-slate-400 ml-auto sm:ml-0">
                                {completedTasksCount}/{tasks.length} Action Items
                              </span>
                            </div>

                            <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                              {milestone.title}
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                              {milestone.description}
                            </p>
                          </div>

                          {/* Accordion Arrow Button */}
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Collapse milestone' : 'Expand milestone'}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Collapsible Tasks List */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-white/5 px-5 sm:px-6 py-4 bg-white/[0.01] space-y-3"
                            >
                              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                                <span className="font-mono uppercase tracking-wider text-[11px]">
                                  Milestone Action Tasks
                                </span>
                                <span>{tasks.length} actionable items</span>
                              </div>

                              {tasks.map((task, tIdx) => {
                                const isDone = completedTaskIds.has(task.id)
                                const isCompleting = completingTaskId === task.id
                                const canComplete = state === 'active' || state === 'completed'

                                return (
                                  <div
                                    key={task.id}
                                    className={`p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${
                                      isDone
                                        ? 'bg-emerald/[0.04] border-emerald/20'
                                        : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      {/* Task Index / Done Icon */}
                                      <div
                                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                                          isDone
                                            ? 'bg-emerald text-white'
                                            : 'bg-white/5 text-slate-400 border border-white/10'
                                        }`}
                                      >
                                        {isDone ? (
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : (
                                          tIdx + 1
                                        )}
                                      </div>

                                      <div className="space-y-1">
                                        <h3
                                          className={`text-sm font-semibold ${
                                            isDone ? 'text-slate-300 line-through decoration-emerald/60' : 'text-white'
                                          }`}
                                        >
                                          {task.title}
                                        </h3>
                                        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                                          {task.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="shrink-0 self-end sm:self-center">
                                      {isDone ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald/15 text-emerald border border-emerald/30 text-xs font-semibold">
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Completed ✓</span>
                                        </div>
                                      ) : canComplete ? (
                                        <button
                                          type="button"
                                          disabled={isCompleting}
                                          onClick={() => handleCompleteTask(task.id, milestone.id)}
                                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-gorange to-coral hover:opacity-95 text-white text-xs font-semibold shadow-[0_4px_16px_rgba(255,85,0,0.3)] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                        >
                                          <Flame className="w-3.5 h-3.5" />
                                          <span>{isCompleting ? 'Saving...' : 'Complete Task'}</span>
                                        </button>
                                      ) : (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-slate-500 border border-white/10 text-xs">
                                          <Lock className="w-3 h-3" />
                                          <span>Complete Phase {milestone.phase_number - 1} First</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
