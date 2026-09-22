import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Ensure profile row exists in Supabase Postgres profiles table
  const ensureProfile = useCallback(async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    try {
      // 1. Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[Kalpa v2] Error fetching profile:', fetchError.message)
      }

      if (existingProfile) {
        setProfile(existingProfile)
        return
      }

      // 2. Profile does not exist yet: create row
      const displayName =
        currentUser.user_metadata?.full_name ||
        currentUser.user_metadata?.name ||
        currentUser.email?.split('@')[0] ||
        'Kalpa Explorer'

      const newProfileData = {
        id: currentUser.id,
        display_name: displayName,
        email: currentUser.email,
        current_streak: 0,
        last_completed_date: null,
      }

      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfileData)
        .select('*')
        .single()

      if (insertError) {
        // If conflict occurs (e.g. database trigger already inserted it), fetch that row
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (retryProfile) {
          setProfile(retryProfile)
          return
        }
        console.error('[Kalpa v2] Profile creation fallback error:', insertError.message)
      } else {
        setProfile(insertedProfile)
      }
    } catch (err) {
      console.error('[Kalpa v2] Profile initialization error:', err.message)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function initSession() {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          if (currentSession?.user) {
            await ensureProfile(currentSession.user)
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to authenticate session')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return

      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)

      if (newSession?.user) {
        await ensureProfile(newSession.user)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [ensureProfile])

  const signInWithGoogle = async () => {
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (signInError) throw signInError
    } catch (err) {
      const clientMessage =
        err.message?.includes('provider is not enabled')
          ? 'Google sign-in is not yet enabled in your Supabase dashboard. Please enable Google provider in Authentication settings.'
          : err.message || 'Failed to initiate Google sign-in. Please try again.'
      setError(clientMessage)
      throw err
    }
  }

  const signOut = async () => {
    setError(null)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setUser(null)
      setSession(null)
      setProfile(null)
    } catch (err) {
      setError(err.message || 'Failed to sign out.')
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await ensureProfile(user)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        error,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
