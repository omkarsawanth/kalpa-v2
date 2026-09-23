import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Flame, Compass, BookOpen, Users, LayoutDashboard, Sparkles, LogOut } from 'lucide-react'

export default function SanctuaryHeader() {
  const { user, profile, signOut } = useAuth()
  const location = useLocation()

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Roadmap', path: '/roadmap', icon: BookOpen },
    { name: 'Explore Paths', path: '/paths', icon: Compass },
    { name: 'Tailored Quiz', path: '/quiz', icon: Sparkles },
  ]

  const streak = profile?.current_streak ?? 0

  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 sm:px-6 md:px-10 pt-4 pointer-events-none">
      <div className="pointer-events-auto max-w-7xl mx-auto h-20 rounded-2xl glass-panel-elevated px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/paths" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gorange to-coral flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,85,0,0.35)] group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white group-hover:text-gorange transition-colors">
              Kalpa
            </span>
          </Link>

          <div className="hidden sm:block h-5 w-px bg-white/10" />
          <span className="hidden sm:inline-flex text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
            Sanctuary
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 p-1.5 rounded-xl bg-white/[0.04] border border-white/5">
          {navLinks.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-gorange text-white shadow-[0_4px_16px_rgba(255,85,0,0.35)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Stats & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Streak pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gorange shadow-inner">
            <Flame className="w-4 h-4 text-gorange" />
            <span className="font-mono text-xs font-semibold text-slate-200">
              {streak > 0 ? `${streak} Days` : '1st Day'}
            </span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-1">
            <div
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet to-coral flex items-center justify-center text-white font-bold text-xs shadow-md"
              title={user?.email || 'Explorer'}
            >
              {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'K'}
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-coral hover:bg-coral/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
