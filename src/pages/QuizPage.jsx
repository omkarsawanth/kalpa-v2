import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SanctuaryHeader from '../components/SanctuaryHeader'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  AlertCircle,
  RefreshCw,
  Clock,
  Compass,
  HeartHandshake,
  Check,
} from 'lucide-react'

// Work Style Questions (8 fixed questions shown sequentially after path questions)
const WORK_STYLE_QUESTIONS = [
  {
    id: 'ws-1',
    domain_title: 'Learning Modality & Curiosity',
    type: 'work_style',
    dimension: 'learning_style',
    question_text: 'When encountering something completely new, how does your curiosity naturally light up?',
    wisdom_tip: 'Sanctuary Insight: Understanding how your brain naturally absorbs insight turns learning from a chore into a restorative rhythm.',
    options: [
      { id: 'A', label: 'Hands-On First', text: 'Tinkering directly with tools or ingredients, learning through real trial and error.' },
      { id: 'B', label: 'Visual Mapping', text: 'Watching master demonstrations, diagrams, and video walkthroughs.' },
      { id: 'C', label: 'Deep Context', text: 'Reading background stories, principles, and understanding the "why" before touching the "how".' },
      { id: 'D', label: 'Conversational', text: 'Talking it through with a mentor or peer squad, asking questions aloud.' },
    ],
  },
  {
    id: 'ws-2',
    domain_title: 'Workspace Energy & Rhythm',
    type: 'work_style',
    dimension: 'collaboration_style',
    question_text: 'What kind of rhythm makes you feel most at home and focused during the day?',
    wisdom_tip: 'Sanctuary Insight: Quiet focus and group momentum are both superpowers; honoring your energy prevents burnout.',
    options: [
      { id: 'A', label: 'Quiet Focus', text: 'Deep solitary immersion with ambient music and zero interruptions.' },
      { id: 'B', label: 'Collaborative Pulse', text: 'A bustling room with friendly peer energy, shared check-ins, and laughter.' },
      { id: 'C', label: 'Balanced Hybrid', text: 'Solo deep thinking in the morning, followed by collaborative workshops in the afternoon.' },
      { id: 'D', label: 'Fluid Adaptation', text: 'Moving between different environments as creative inspiration moves me.' },
    ],
  },
  {
    id: 'ws-3',
    domain_title: 'Core Inner Motivation',
    type: 'work_style',
    dimension: 'motivation_driver',
    question_text: 'What gives you that warm, quiet spark of accomplishment at the end of a long day?',
    wisdom_tip: 'Sanctuary Insight: Your inner motivation is your compass. Aligning your daily steps with your core spark creates sustainable craft.',
    options: [
      { id: 'A', label: 'Empowering Others', text: "Seeing someone else's eyes light up because I helped them overcome a struggle." },
      { id: 'B', label: 'Tangible Craft', text: 'Looking at something tangible and beautifully made that did not exist this morning.' },
      { id: 'C', label: 'Untangling Puzzles', text: 'Cracking a complex problem that had everyone else stumped.' },
      { id: 'D', label: 'Order & Clarity', text: "Organizing chaos into smooth, reliable systems that ease everyone's burden." },
    ],
  },
  {
    id: 'ws-4',
    domain_title: 'Feedback Sanctuary',
    type: 'work_style',
    dimension: 'feedback_preference',
    question_text: 'When receiving feedback on your work, what delivery helps you grow with confidence?',
    wisdom_tip: 'Sanctuary Insight: Feedback should nourish and illuminate, never diminish. Clear expectations allow fearless iteration.',
    options: [
      { id: 'A', label: 'Strengths-First Coaching', text: 'Celebrate what worked first, then guide me on one key adjustment.' },
      { id: 'B', label: 'Direct & Objective', text: 'Give me clear, unvarnished metrics and concrete examples right away.' },
      { id: 'C', label: 'Reflective Dialogue', text: 'Ask me how I feel about the work first, then co-explore ways to elevate it.' },
      { id: 'D', label: 'Written & Private', text: 'Detailed written thoughts I can absorb in private at my own pace.' },
    ],
  },
  {
    id: 'ws-5',
    domain_title: 'Team Harmony & Role',
    type: 'work_style',
    dimension: 'collaboration_style',
    question_text: 'In a group project or community initiative, what role feels like your natural element?',
    wisdom_tip: 'Sanctuary Insight: Every healthy squad needs both visionaries and anchors. Your natural role is a gift to the collective.',
    options: [
      { id: 'A', label: 'The Steady Anchor', text: 'Keeping track of timelines, details, and ensuring nobody falls behind.' },
      { id: 'B', label: 'The Creative Catalyst', text: 'Pitching fresh perspectives, bold prototypes, and sparking excitement.' },
      { id: 'C', label: 'The Heart & Harmonizer', text: 'Checking in on morale, smoothing over tensions, and keeping spirits high.' },
      { id: 'D', label: 'The Craftsman', text: 'Taking a dedicated component and polishing it to perfection with high standards.' },
    ],
  },
  {
    id: 'ws-6',
    domain_title: 'Navigating Ambiguity',
    type: 'work_style',
    dimension: 'learning_style',
    question_text: 'When a project has very open-ended or ambiguous directions, how do you instinctually respond?',
    wisdom_tip: 'Sanctuary Insight: Ambiguity is a canvas. Whether you enjoy sketching freely or laying down a grid first, you are in control.',
    options: [
      { id: 'A', label: 'Excited Freedom', text: 'I love having blank paper—it means I can invent something completely novel.' },
      { id: 'B', label: 'Self-Structured', text: 'I draft my own checkpoints and milestones to create clarity for myself.' },
      { id: 'C', label: 'Clarifying Dialogue', text: 'I schedule a quick conversation to align on boundaries before starting.' },
      { id: 'D', label: 'Look for Precedents', text: 'I find real-world examples of how others succeeded in similar situations.' },
    ],
  },
  {
    id: 'ws-7',
    domain_title: 'Pacing & Long-term Goals',
    type: 'work_style',
    dimension: 'motivation_driver',
    question_text: 'How do you prefer to approach a multi-week skill milestone?',
    wisdom_tip: 'Sanctuary Insight: Steady micro-steps compound into mastery faster than exhausting sprints. Consistency over intensity.',
    options: [
      { id: 'A', label: 'Daily Micro-Habits', text: '15 to 20 minutes every single day to build an unbreakable streak.' },
      { id: 'B', label: 'Weekend Deep Dives', text: '2 to 3 uninterrupted hours on a quiet weekend morning.' },
      { id: 'C', label: 'Milestone Sprints', text: 'Focused multi-day sprints right before a portfolio review or deadline.' },
      { id: 'D', label: 'Flexible Rhythms', text: 'Whenever inspiration strikes, alternating between rest and intensity.' },
    ],
  },
  {
    id: 'ws-8',
    domain_title: 'Six-Month Horizon',
    type: 'work_style',
    dimension: 'motivation_driver',
    question_text: 'Looking 6 months ahead in your Kalpa journey, what would make you feel quiet pride?',
    wisdom_tip: 'Sanctuary Insight: True growth is deeply personal. Your horizon is defined by your own joy and craftsmanship.',
    options: [
      { id: 'A', label: 'Confident Mastery', text: 'Trusting my hands and instincts without hesitation in my chosen field.' },
      { id: 'B', label: 'A Living Portfolio', text: 'Having 2–3 completed projects I am proud to share with the community.' },
      { id: 'C', label: 'Lifelong Squad', text: 'Belonging to a warm group of peers who encourage each other every week.' },
      { id: 'D', label: 'Real-World Impact', text: "Using my new skills to tangibly improve someone else's daily life." },
    ],
  },
]

// Fallback career path questions if Supabase is offline or empty
const FALLBACK_CAREER_QUESTIONS = [
  {
    id: 'cq-1',
    domain_title: 'Flavor Chemistry & Balance',
    question_text: 'You are preparing a rich tomato basil sauce for a family dinner, but after simmering, it tastes slightly too acidic and sharp. What is your instinct to balance it out?',
    wisdom_tip: 'Kitchen Wisdom: Acidity, fat, and subtle sweetness work as a dynamic sensory triangle to harmonize savory sauces without blunting fresh herbal notes.',
    type: 'aptitude',
    options: [
      { id: 'A', label: 'Classic Instinct', text: 'Fold in a knob of cold butter or a pinch of brown sugar to soften acidity and round the mouthfeel.', is_correct: true },
      { id: 'B', label: 'Direct Acidity', text: 'Add a splash of red wine vinegar to heighten the acidic contrast.', is_correct: false },
      { id: 'C', label: 'Dilution', text: 'Dilute with two cups of water and boil rapidly on high heat.', is_correct: false },
      { id: 'D', label: 'Cheese Finish', text: 'Grate in mild pecorino cheese and simmer for 5 extra minutes.', is_correct: false },
    ],
  },
  {
    id: 'cq-2',
    domain_title: 'Knife Craft & Station Rhythm',
    question_text: 'You are prepping vegetables for a hearty stir-fry alongside two other cooks. What is the foundation of safe and efficient knife work on a busy cutting board?',
    wisdom_tip: 'Chef Insight: Mise en place isn’t just organization—it is the mental calm that allows intuition to flow freely in a bustling kitchen.',
    type: 'aptitude',
    options: [
      { id: 'A', label: 'The Claw Grip', text: 'Curl non-knife fingertips into a protective claw against the flat of the blade while rocking smoothly.', is_correct: true },
      { id: 'B', label: 'Speed First', text: 'Chop as rapidly as possible with outstretched fingers to maintain velocity.', is_correct: false },
      { id: 'C', label: 'Direct Pressure', text: 'Press down hard with your palm directly on the knife spine.', is_correct: false },
      { id: 'D', label: 'Loose Station', text: 'Keep ingredients spread loosely across the whole table without small prep bowls.', is_correct: false },
    ],
  },
  {
    id: 'cq-3',
    domain_title: 'Searing & Pan Temperature',
    question_text: 'When searing fresh mushrooms in a cast iron skillet, they begin releasing water and steaming instead of developing a golden crust. What is the gentle adjustment?',
    wisdom_tip: 'Culinary Wisdom: Caramelization and the Maillard reaction require dry heat and space. Patience is the secret ingredient to golden depth.',
    type: 'aptitude',
    options: [
      { id: 'A', label: 'Space & Patience', text: 'Avoid overcrowding the pan; give each piece breathing room and let the moisture evaporate without stirring constantly.', is_correct: true },
      { id: 'B', label: 'Cover Skillet', text: 'Place a tight lid over the skillet immediately to trap moisture.', is_correct: false },
      { id: 'C', label: 'Lower Flame', text: 'Turn the flame down to lowest simmer and add more cold oil.', is_correct: false },
      { id: 'D', label: 'Rapid Stirring', text: 'Whisk and stir continuously every two seconds.', is_correct: false },
    ],
  },
]

export default function QuizPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pathName, setPathName] = useState('Career Exploration')

  // Load questions for the user's selected career path
  const loadQuestions = async () => {
    setLoading(true)
    setError(null)
    try {
      const selectedPathId = profile?.selected_career_path_id
      if (selectedPathId) {
        const { data: pathData } = await supabase
          .from('career_paths')
          .select('name')
          .eq('id', selectedPathId)
          .maybeSingle()
        if (pathData?.name) {
          setPathName(pathData.name)
        }
      }

      let careerQuestions = []

      if (selectedPathId) {
        // Fetch questions from Supabase filtered by selected_career_path_id
        const { data, error: qErr } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('career_path_id', selectedPathId)

        if (!qErr && data && data.length > 0) {
          careerQuestions = data.map((q) => ({
            ...q,
            type: 'aptitude',
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          }))
        }
      }

      // If no path-specific questions found, fetch general quiz questions from database
      if (careerQuestions.length === 0) {
        const { data: allQuestions } = await supabase
          .from('quiz_questions')
          .select('*')
          .limit(4)

        if (allQuestions && allQuestions.length > 0) {
          careerQuestions = allQuestions.map((q) => ({
            ...q,
            type: 'aptitude',
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
          }))
        } else {
          careerQuestions = FALLBACK_CAREER_QUESTIONS
        }
      }

      // Combine Career Aptitude questions + 8 Work Style questions
      const combined = [...careerQuestions, ...WORK_STYLE_QUESTIONS]
      setQuestions(combined)
    } catch (err) {
      console.warn('[Kalpa v2] Falling back to sanctuary default quiz questions:', err.message)
      setQuestions([...FALLBACK_CAREER_QUESTIONS, ...WORK_STYLE_QUESTIONS])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [profile?.selected_career_path_id])

  const currentQ = questions[currentIndex]
  const totalQuestions = questions.length
  const progressPercent = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const selectedAnswerId = currentQ ? answers[currentQ.id] : null

  const handleSelectOption = (optionId) => {
    if (!currentQ) return
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionId,
    }))
  }

  const handleNext = async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // Completed all questions: save to Supabase
      await handleCompleteQuiz()
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleCompleteQuiz = async () => {
    setIsSubmitting(true)
    try {
      if (user) {
        // 1. Save skill assessments for career questions
        const aptitudeQuestions = questions.filter((q) => q.type === 'aptitude')
        const assessmentRows = aptitudeQuestions.map((q) => {
          const chosenAnswer = answers[q.id]
          const chosenOption = q.options?.find((o) => o.id === chosenAnswer)
          return {
            user_id: user.id,
            career_path_id: q.career_path_id || profile?.selected_career_path_id || null,
            question_id: q.id?.length === 36 ? q.id : null, // valid uuid or null
            answer: chosenAnswer || 'A',
            is_correct: chosenOption?.is_correct ?? true,
          }
        })

        // Insert assessments safely
        try {
          await supabase.from('skill_assessments').insert(assessmentRows)
        } catch (assErr) {
          console.warn('[Kalpa v2] Skill assessments log notice:', assErr.message)
        }

        // 2. Synthesize Work Style Profile answers
        const workStyleAnswers = {
          learning_style: answers['ws-1']
            ? WORK_STYLE_QUESTIONS[0].options.find((o) => o.id === answers['ws-1'])?.text
            : 'Hands-on experiential discovery',
          collaboration_style: answers['ws-2']
            ? WORK_STYLE_QUESTIONS[1].options.find((o) => o.id === answers['ws-2'])?.text
            : 'Balanced hybrid rhythm',
          motivation_driver: answers['ws-3']
            ? WORK_STYLE_QUESTIONS[2].options.find((o) => o.id === answers['ws-3'])?.text
            : 'Tangible craft & creation',
          feedback_preference: answers['ws-4']
            ? WORK_STYLE_QUESTIONS[3].options.find((o) => o.id === answers['ws-4'])?.text
            : 'Strengths-first guidance',
        }

        // Upsert work_style_profiles
        try {
          await supabase
            .from('work_style_profiles')
            .upsert({
              user_id: user.id,
              ...workStyleAnswers,
              updated_at: new Date().toISOString(),
            })
        } catch (wsErr) {
          console.warn('[Kalpa v2] Work style profile log notice:', wsErr.message)
        }
      }

      navigate('/dashboard')
    } catch (err) {
      console.error('[Kalpa v2] Quiz completion notice:', err.message)
      navigate('/dashboard')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10">
          {/* Header Track Switcher */}
          <div className="w-full mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-widest text-gorange px-2.5 py-0.5 rounded-full bg-gorange/10 border border-gorange/20">
                  Cross-Disciplinary Discovery
                </span>
                <span className="text-xs text-slate-400">• Lifelong Assessment</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Instinct & Aptitude Lab
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-xs text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <span className="font-semibold text-white">Active: {pathName}</span>
            </div>
          </div>

          {/* Progress Indicator Card */}
          <div className="w-full mb-8 p-4 rounded-2xl glass-panel flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-gorange animate-pulse" />
                <span className="font-semibold text-white">
                  Question {currentIndex + 1} of {totalQuestions} • {currentQ?.type === 'work_style' ? 'Work-Style Synthesis' : pathName}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <Clock className="w-3.5 h-3.5 text-gorange" />
                <span>EST. {Math.max(1, Math.ceil((totalQuestions - currentIndex) * 0.5))} MIN REMAINING</span>
                <span>•</span>
                <span className="text-violet font-semibold">SANCTUARY MODE</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gorange to-coral"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Error Banner with Retry */}
          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-coral/10 border border-coral/30 flex items-center justify-between text-xs text-coral">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadQuestions}
                className="px-3 py-1.5 rounded-lg bg-coral text-white font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Skeleton State */}
          {loading ? (
            <div className="rounded-[26px] glass-panel-elevated p-6 sm:p-10 space-y-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/10" />
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-4 rounded-full bg-white/10" />
                  <div className="w-48 h-6 rounded-lg bg-white/15" />
                </div>
              </div>
              <div className="w-full h-16 rounded-xl bg-white/5" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-full h-16 rounded-2xl bg-white/5" />
                ))}
              </div>
            </div>
          ) : currentQ ? (
            /* Question Card with AnimatePresence */
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.id || currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="rounded-[26px] glass-panel-elevated p-6 sm:p-10 shadow-2xl relative overflow-hidden"
              >
                {/* Header of Question */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-gorange/15 text-gorange flex items-center justify-center font-display font-bold text-lg border border-gorange/30">
                      {String(currentIndex + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-gorange font-semibold">
                        {currentQ.domain_title || 'Discovery Focus'}
                      </p>
                      <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                        {currentQ.type === 'work_style' ? 'Work Style & Instinct' : 'Sensory Instinct Challenge'}
                      </h2>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                    {currentQ.type === 'work_style' ? 'Self-Reflection' : 'Scenario-Driven'}
                  </span>
                </div>

                {/* Scenario Narrative Text */}
                <div className="mb-8">
                  <p className="text-base sm:text-lg text-slate-100 leading-relaxed font-medium">
                    {currentQ.question_text}
                  </p>
                </div>

                {/* Answer Options Chips */}
                <div className="grid grid-cols-1 gap-3 mb-8" role="radiogroup" aria-label="Answer options">
                  {currentQ.options?.map((option) => {
                    const isSelected = selectedAnswerId === option.id

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(option.id)}
                        className={`group relative flex items-start gap-4 p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer border ${
                          isSelected
                            ? 'bg-gorange/15 border-gorange shadow-[0_0_25px_rgba(255,85,0,0.25)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                        }`}
                      >
                        {/* Radio Check Circle */}
                        <div
                          className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-gorange text-white'
                              : 'border border-slate-500 group-hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>

                        {/* Text and Tag */}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-gorange">
                              Option {option.id}
                            </span>
                            {option.label && (
                              <span
                                className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  isSelected
                                    ? 'bg-gorange/25 text-white'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {option.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                            {option.text}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Wisdom Tip Callout */}
                {currentQ.wisdom_tip && (
                  <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3 mb-8">
                    <div className="p-2 rounded-xl bg-amber/15 text-amber shrink-0">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {currentQ.wisdom_tip}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={handlePrevious}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-slate-300 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={!selectedAnswerId || isSubmitting}
                      onClick={handleNext}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-gorange to-coral text-white text-xs sm:text-sm font-semibold shadow-[0_4px_20px_rgba(255,85,0,0.35)] hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>
                        {isSubmitting
                          ? 'Synthesizing Roadmap...'
                          : currentIndex === totalQuestions - 1
                          ? 'Complete Assessment & View Dashboard'
                          : 'Next Question'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </main>
    </div>
  )
}
