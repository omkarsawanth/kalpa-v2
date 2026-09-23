import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SanctuaryHeader from '../components/SanctuaryHeader'
import {
  Compass,
  Utensils,
  GraduationCap,
  Laptop,
  Scale,
  Users,
  Microscope,
  TrendingUp,
  Palette,
  ArrowRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'

// Default fallback seed data if database is initial or offline
const FALLBACK_PATHS = [
  {
    id: 'path-cooking',
    name: 'Culinary Arts & Cooking',
    category: 'cooking',
    sector_group: 'hands-on',
    tag: 'Craftsmanship & Flavor',
    description: 'Mastering vibrant flavors, kitchen rhythm, pastry craft, and bringing people together over nourishing meals.',
    members: '2,150 members exploring',
    sub_paths: '8 Paths',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&auto=format&fit=crop&q=80',
    icon: Utensils,
    accent: 'gorange',
  },
  {
    id: 'path-teaching',
    name: 'Teaching & Mentoring',
    category: 'teaching',
    sector_group: 'people',
    tag: 'Empathy & Inspiration',
    description: 'Inspiring young minds, breaking down tough concepts into simple steps, and cheering others across milestones.',
    members: '1,630 members exploring',
    sub_paths: '6 Paths',
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
    icon: GraduationCap,
    accent: 'amber',
  },
  {
    id: 'path-tech',
    name: 'Technology & Digital Craft',
    category: 'tech',
    sector_group: 'analytical',
    tag: 'Beginner Friendly • Problem Solving',
    description: 'Building helpful digital tools, fun games, and friendly apps that solve everyday human challenges.',
    members: '1,840 members exploring',
    sub_paths: '9 Paths',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80',
    icon: Laptop,
    accent: 'cyan',
  },
  {
    id: 'path-management',
    name: 'Leadership & Management',
    category: 'management',
    sector_group: 'people',
    tag: 'Leadership & Community',
    description: 'Guiding supportive teams, organizing community projects, and turning great ideas into shared reality.',
    members: '1,420 members exploring',
    sub_paths: '7 Paths',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    icon: Users,
    accent: 'violet',
  },
  {
    id: 'path-art',
    name: 'Art & Visual Creativity',
    category: 'art/creativity',
    sector_group: 'hands-on',
    tag: 'Expression & Visual Craft',
    description: 'Expressing stories and emotions through illustration, interior spaces, animation, and tactile crafting.',
    members: '2,480 members exploring',
    sub_paths: '11 Paths',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=80',
    icon: Palette,
    accent: 'coral',
  },
  {
    id: 'path-law',
    name: 'Law & Justice',
    category: 'law',
    sector_group: 'people',
    tag: 'Advocacy & Fairness',
    description: 'Standing up for fairness, helping neighbors resolve disagreements, and protecting human dignity.',
    members: '980 members exploring',
    sub_paths: '6 Paths',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    icon: Scale,
    accent: 'amber',
  },
  {
    id: 'path-research',
    name: 'Research & Academia',
    category: 'research',
    sector_group: 'analytical',
    tag: 'Curiosity & Discovery',
    description: 'Asking curious questions about the world and discovering new truths through creative experiments.',
    members: '1,120 members exploring',
    sub_paths: '5 Paths',
    image: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    icon: Microscope,
    accent: 'emerald',
  },
  {
    id: 'path-finance',
    name: 'Finance & Economics',
    category: 'finance',
    sector_group: 'analytical',
    tag: 'Planning & Stability',
    description: 'Understanding how resources flow, smart budgeting, and helping families and organizations thrive.',
    members: '1,305 members exploring',
    sub_paths: '5 Paths',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80',
    icon: TrendingUp,
    accent: 'emerald',
  },
]

export default function CareerPathsPage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  const [careerPaths, setCareerPaths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStage, setSelectedStage] = useState('all')
  const [savingPathId, setSavingPathId] = useState(null)

  const fetchCareerPaths = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('career_paths')
        .select('*')
        .order('name')

      if (fetchErr) {
        console.warn('[Kalpa v2] Supabase fetch error, using sanctuary path catalog:', fetchErr.message)
        setCareerPaths(FALLBACK_PATHS)
      } else if (data && data.length > 0) {
        // Merge database rows with curated visual attributes
        const merged = data.map((dbRow) => {
          const fallback = FALLBACK_PATHS.find((f) => f.category === dbRow.category) || FALLBACK_PATHS[0]
          return {
            ...fallback,
            ...dbRow,
            id: dbRow.id,
            name: dbRow.name || fallback.name,
            description: dbRow.description || fallback.description,
          }
        })
        setCareerPaths(merged)
      } else {
        setCareerPaths(FALLBACK_PATHS)
      }
    } catch (err) {
      console.warn('[Kalpa v2] Network exception, displaying fallback catalog:', err.message)
      setCareerPaths(FALLBACK_PATHS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCareerPaths()
  }, [])

  const handleSelectPath = async (path) => {
    setSavingPathId(path.id)
    try {
      if (user) {
        // Store choice on profiles table in Supabase
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ selected_career_path_id: path.id })
          .eq('id', user.id)

        if (updateErr) {
          console.error('[Kalpa v2] Error updating selected path:', updateErr.message)
        }
        await refreshProfile()
      }
      navigate('/quiz')
    } catch (err) {
      console.error('[Kalpa v2] Selection transition error:', err.message)
      navigate('/quiz')
    } finally {
      setSavingPathId(null)
    }
  }

  // Filter paths
  const filteredPaths = careerPaths.filter((path) => {
    if (selectedCategory === 'all') return true
    return path.sector_group === selectedCategory || path.category === selectedCategory
  })

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          {/* Hero Section */}
          <section className="flex flex-col items-center text-center max-w-4xl mx-auto pt-4 pb-8 space-y-6">
            {/* Badge pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-md">
              <Compass className="w-4 h-4 text-gorange" />
              <span className="font-mono text-xs uppercase tracking-wider text-gorange font-medium">
                Explore All Horizons
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
                Which direction calls to you today?
              </h1>
              <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Whether you are 13 dreaming of your first kitchen or 35 switching into teaching, every journey starts here with zero judgment.
              </p>
            </div>

            {/* Life Stage Switcher */}
            <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-full bg-white/[0.04] border border-white/10">
              <button
                type="button"
                onClick={() => setSelectedStage('all')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedStage === 'all'
                    ? 'bg-gorange text-white shadow-[0_4px_16px_rgba(255,85,0,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Stages
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('youth')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedStage === 'youth'
                    ? 'bg-gorange text-white shadow-[0_4px_16px_rgba(255,85,0,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                First Spark (Ages 13–19)
              </button>
              <button
                type="button"
                onClick={() => setSelectedStage('pivot')}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedStage === 'pivot'
                    ? 'bg-gorange text-white shadow-[0_4px_16px_rgba(255,85,0,0.35)]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Career Pivoters
              </button>
            </div>

            {/* Sector Filter Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'all'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4 text-gorange" />
                <span>All Fields ({careerPaths.length || 8})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('hands-on')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'hands-on'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Palette className="w-4 h-4 text-coral" />
                <span>Hands-On & Creative</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('people')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'people'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Users className="w-4 h-4 text-violet" />
                <span>People & Leadership</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('analytical')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === 'analytical'
                    ? 'bg-white/15 text-white border border-white/20 shadow-md'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Laptop className="w-4 h-4 text-cyan" />
                <span>Analytical & Problem-Solving</span>
              </button>
            </div>
          </section>

          {/* Live Community Pulse Banner */}
          <section className="w-full mb-10">
            <div className="relative w-full rounded-2xl overflow-hidden glass-panel p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl space-y-2 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-violet text-[11px] font-mono uppercase tracking-wider font-semibold">
                  <span className="w-2 h-2 rounded-full bg-violet animate-pulse" />
                  Live Community Pulse
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Over 14,200 quiet explorers finding their rhythm this month
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Browse through everyday mentors, safe step-by-step roadmaps, and friendly squads who have been in your exact shoes.
                </p>
              </div>

              {/* Active Explorations Metric Widget */}
              <div className="flex items-center gap-5 bg-black/40 border border-white/10 p-4 rounded-xl shrink-0 shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Active Explorations
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-gorange tracking-tight">
                    8 Sanctuary Tracks
                  </span>
                  <span className="text-xs text-slate-400">100% Free • Open access</span>
                </div>

                {/* Miniature Sparkline SVG */}
                <svg className="w-24 h-10 text-gorange" fill="none" viewBox="0 0 112 48">
                  <path
                    d="M2 38C15 38 18 14 30 18C42 22 46 8 58 12C70 16 75 32 88 24C98 17 102 4 110 6"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  <circle cx="110" cy="6" fill="currentColor" r="3" />
                </svg>
              </div>
            </div>
          </section>

          {/* Error Banner with Retry */}
          {error && (
            <div className="mb-8 p-4 rounded-2xl bg-coral/10 border border-coral/30 flex items-center justify-between text-xs text-coral">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchCareerPaths}
                className="px-3 py-1.5 rounded-lg bg-coral text-white font-semibold flex items-center gap-1 hover:opacity-90"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Skeleton Loading State */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className="rounded-[24px] glass-panel p-6 flex flex-col justify-between h-96 animate-pulse"
                >
                  <div>
                    <div className="w-full h-40 rounded-xl bg-white/5 mb-5" />
                    <div className="w-28 h-4 rounded-full bg-white/10 mb-3" />
                    <div className="w-3/4 h-6 rounded-lg bg-white/10 mb-2" />
                    <div className="w-full h-12 rounded-lg bg-white/5" />
                  </div>
                  <div className="w-full h-11 rounded-xl bg-white/10 mt-6" />
                </div>
              ))}
            </div>
          ) : (
            /* Career Paths Grid */
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {filteredPaths.map((path) => {
                const IconComponent = path.icon || Compass
                const isSelected = profile?.selected_career_path_id === path.id
                const isSaving = savingPathId === path.id

                return (
                  <motion.article
                    key={path.id}
                    variants={itemVariants}
                    className={`group flex flex-col justify-between rounded-[24px] glass-panel hover:glass-panel-elevated p-6 transition-all duration-300 hover:-translate-y-1.5 ${
                      isSelected ? 'border-gorange/50 shadow-[0_0_30px_rgba(255,85,0,0.25)]' : ''
                    }`}
                  >
                    <div>
                      {/* Image preview with ambient overlay */}
                      <div className="relative w-full h-40 rounded-xl overflow-hidden mb-5 bg-black/40">
                        <img
                          src={path.image}
                          alt={path.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-transparent to-transparent opacity-80" />
                        <div className="absolute top-3 left-3 w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md flex items-center justify-center text-gorange border border-white/10 shadow-md">
                          <IconComponent className="w-5 h-5 text-gorange" />
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-emerald/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </div>
                        )}
                      </div>

                      {/* Tag pill */}
                      <div className="mb-2">
                        <span className="inline-block font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gorange font-medium">
                          {path.tag}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-display text-lg font-bold text-white tracking-tight mb-2 group-hover:text-gorange transition-colors">
                        {path.name}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
                        {path.description}
                      </p>
                    </div>

                    {/* Footer stats & Action CTA */}
                    <div className="pt-4 mt-auto border-t border-white/5 space-y-4">
                      <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-gorange" />
                          <span>{path.members}</span>
                        </span>
                        <span className="font-mono text-gorange">{path.sub_paths}</span>
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSelectPath(path)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-gorange to-coral hover:opacity-95 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,85,0,0.3)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        <span>{isSaving ? 'Connecting path...' : isSelected ? 'Continue Path' : 'Explore path'}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.article>
                )
              })}
            </motion.div>
          )}

          {/* Bottom Prompt: Sanctuary Spark Quiz */}
          <section className="mt-14 w-full">
            <div className="glass-panel p-6 sm:p-8 rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center md:text-left">
                <span className="text-[11px] font-mono uppercase text-gorange font-semibold">
                  Still feeling undecided?
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                  Take the 3-minute Sanctuary Spark Quiz
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                  No tests or grades here. Just simple questions about what makes you smile on a Sunday afternoon, and we will gently suggest two fields to look at first.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate('/quiz')}
                  className="py-3 px-5 rounded-xl bg-gorange text-white text-xs sm:text-sm font-semibold shadow-[0_4px_20px_rgba(255,85,0,0.35)] hover:opacity-95 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Start Friendly Quiz</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
