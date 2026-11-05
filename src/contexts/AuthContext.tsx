import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface Member {
  id: string
  name: string
  is_admin: boolean
}

interface AuthContextType {
  member: Member | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const authActionInProgress = useRef(false)

  useEffect(() => {
    let active = true
    let requestId = 0
    let loadedUserId: string | null = null
    const loadMember = async (session: Session | null) => {
      const currentRequest = ++requestId
      if (active) { setMember(null); setLoading(!!session) }
      if (!session) {
        loadedUserId = null
        return
      }
      const { data, error } = await supabase.from('members')
        .select('id, name, is_admin').eq('id', session.user.id).single()
      if (active && currentRequest === requestId) {
        setMember(error ? null : data)
        loadedUserId = error ? null : session.user.id
        setLoading(false)
      }
    }
    supabase.auth.getSession().then(({ data }) => loadMember(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Keep the form mounted until a manual sign-in or sign-up can report its result.
      if (event === 'SIGNED_IN' && authActionInProgress.current) return
      if (event === 'TOKEN_REFRESHED' || (session && loadedUserId === session.user.id)) return
      setTimeout(() => { if (active) loadMember(session) }, 0)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  const login = async (email: string, password: string) => {
    authActionInProgress.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: profile, error: profileError } = await supabase.from('members')
        .select('id, name, is_admin').eq('id', data.user.id).single()
      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error(profileError
          ? `Could not load your wish-list profile: ${profileError.message}`
          : 'This account has not been added to the wish list yet.')
      }
      setMember(profile)
      setLoading(false)
    } finally {
      authActionInProgress.current = false
    }
  }

  const signup = async (name: string, email: string, password: string) => {
    authActionInProgress.current = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
      if (!data.session) return { needsEmailConfirmation: true }

      const { data: profile, error: profileError } = await supabase.from('members')
        .select('id, name, is_admin').eq('id', data.user!.id).single()
      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error('Account created, but the member profile could not be loaded. Check the database setup.')
      }
      setMember(profile)
      setLoading(false)
      return { needsEmailConfirmation: false }
    } finally {
      authActionInProgress.current = false
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setMember(null)
  }

  return <AuthContext.Provider value={{ member, loading, login, signup, logout }}>{children}</AuthContext.Provider>
}
