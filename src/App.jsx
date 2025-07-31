import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, authHelpers, getConnectionHealth } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import Lessons from './components/Lessons'
import Quiz from './components/Quiz'
import RandomChat from './components/RandomChat'
import GroupDebates from './components/GroupDebates'
import GroupChat from './components/GroupChat'
import Progress from './components/Progress'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState('')
  
  // Prevent duplicate initializations
  const initializingRef = useRef(false)
  const authSubscriptionRef = useRef(null)

  // Global debug function for clearing stuck states
  useEffect(() => {
    window.clearAuthState = () => {
      console.log('🧹 Clearing all authentication state...')
      
      // Clear React state
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
      setError('')
      
      // Clear refs
      initializingRef.current = false
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe()
        authSubscriptionRef.current = null
      }
      
      // Clear Supabase cache
      authHelpers.clearCache()
      
      // Clear local storage
      localStorage.clear()
      sessionStorage.clear()
      
      console.log('✅ All authentication state cleared')
    }
    
    window.forceReload = () => {
      window.clearAuthState()
      window.location.reload()
    }
  }, [])

  // Initialize authentication on app start with improved handling
  useEffect(() => {
    let mounted = true
    
    // Prevent duplicate initialization
    if (initializingRef.current) {
      console.log('⏭️ Auth initialization already in progress, skipping...')
      return
    }

    const initializeAuth = async () => {
      if (initializingRef.current) return
      initializingRef.current = true
      
      try {
        console.log('🚀 Initializing authentication...')
        
        // Check connection health first
        const health = getConnectionHealth()
        if (!health.isOnline) {
          console.warn('⚠️ App starting offline')
          setError('No internet connection')
          setLoading(false)
          return
        }

        // Fast session validation with improved timeout handling
        const session = await authHelpers.validateSession(3000)
        
        if (!mounted) return

        if (session?.user) {
          console.log('✅ Valid session found:', session.user.email)
          
          // Set authenticated state immediately for better UX
          setIsAuthenticated(true)
          setLoading(false)
          
          // Fetch user profile in background
          try {
            const profile = await ensureUserProfile(session.user)
            if (mounted) {
              setUser(profile)
              setError('')
            }
          } catch (profileError) {
            console.warn('⚠️ Profile loading failed, but user is authenticated:', profileError)
            // Keep user authenticated even if profile fails
            if (mounted) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                display_name: session.user.email.split('@')[0],
                english_level: 'beginner'
              })
              setError('')
            }
          }
        } else {
          console.log('ℹ️ No valid session found')
          if (mounted) {
            setUser(null)
            setIsAuthenticated(false)
            setError('')
          }
        }

        // Set up auth state listener (only once)
        if (mounted && !authSubscriptionRef.current) {
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return
            
            console.log('🔄 Auth state changed:', event)
            
            // Ignore INITIAL_SESSION to prevent loops
            if (event === 'INITIAL_SESSION') {
              return
            }
            
            try {
              if (event === 'SIGNED_OUT' || !session) {
                setUser(null)
                setIsAuthenticated(false)
                setError('')
                // Clear cache on sign out
                authHelpers.clearCache()
              } else if (event === 'SIGNED_IN' && session?.user) {
                console.log('✅ User signed in:', session.user.email)
                
                // Set authenticated immediately
                setIsAuthenticated(true)
                
                // Load profile in background
                try {
                  const profile = await ensureUserProfile(session.user)
                  if (mounted) {
                    setUser(profile)
                    setError('')
                  }
                } catch (profileError) {
                  console.warn('Profile loading failed during sign in:', profileError)
                  // Keep basic user info
                  if (mounted) {
                    setUser({
                      id: session.user.id,
                      email: session.user.email,
                      display_name: session.user.email.split('@')[0],
                      english_level: 'beginner'
                    })
                  }
                }
              } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                // Just update the session, keep existing profile
                console.log('🔄 Token refreshed')
              }
            } catch (error) {
              console.error('❌ Auth state change error:', error)
              if (mounted) {
                setError('Authentication error occurred')
              }
            }
          })
          
          authSubscriptionRef.current = subscription
        }

      } catch (error) {
        console.error('❌ Auth initialization failed:', error)
        if (mounted) {
          // Don't show error immediately, try to recover
          console.log('🔄 Attempting auth recovery...')
          
          // Try to get cached session
          try {
            const cachedSession = await authHelpers.getSessionSync()
            if (cachedSession.data?.session?.user) {
              console.log('✅ Recovered from cached session')
              setIsAuthenticated(true)
              setUser({
                id: cachedSession.data.session.user.id,
                email: cachedSession.data.session.user.email,
                display_name: cachedSession.data.session.user.email.split('@')[0],
                english_level: 'beginner'
              })
            } else {
              setError('Failed to initialize authentication')
            }
          } catch (recoveryError) {
            setError('Failed to initialize authentication')
          }
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
        initializingRef.current = false
      }
    }

    initializeAuth()

    // Cleanup function
    return () => {
      mounted = false
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe()
        authSubscriptionRef.current = null
      }
      initializingRef.current = false
    }
  }, []) // Empty dependency array - only run once

  // Ensure user profile exists with optimized fallback
  const ensureUserProfile = async (authUser) => {
    try {
      // First try to get existing profile with extended cache
      let profile = await authHelpers.getUserProfile(authUser.id)
      
      if (profile) {
        console.log('✅ Profile loaded:', profile.display_name)
        return profile
      }

      console.log('⚠️ Profile not found, ensuring creation...')
      
      // Use database function to ensure profile exists
      const { data, error } = await supabase.rpc('ensure_user_profile', {
        user_id_param: authUser.id,
        user_email_param: authUser.email,
        metadata: authUser.user_metadata || {}
      })

      if (error) {
        console.error('❌ Profile creation failed:', error)
        throw error
      }

      // Fetch the created profile
      const { data: newProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (fetchError) {
        console.error('❌ Profile fetch after creation failed:', fetchError)
        // Return basic profile structure
        return {
          id: authUser.id,
          email: authUser.email,
          display_name: authUser.email.split('@')[0],
          english_level: 'beginner',
          created_at: new Date().toISOString()
        }
      }

      console.log('✅ Profile created and loaded:', newProfile.display_name)
      return newProfile

    } catch (error) {
      console.error('❌ Profile management failed:', error)
      
      // Return minimal profile to keep app functional
      return {
        id: authUser.id,
        email: authUser.email,
        display_name: authUser.email.split('@')[0],
        english_level: 'beginner',
        created_at: new Date().toISOString()
      }
    }
  }

  // Handle sign out with improved cleanup
  const handleSignOut = async () => {
    try {
      setLoading(true)
      await authHelpers.signOut()
      
      // Clear all state
      setUser(null)
      setIsAuthenticated(false)
      setError('')
    } catch (error) {
      console.error('Sign out failed:', error)
      setError('Failed to sign out')
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner only for initial load or when explicitly loading
  if (loading && !user && !error) {
    return <LoadingSpinner />
  }

  // Show error state with retry option
  if (error && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 max-w-md mx-4 text-center">
          <div className="text-red-400 mb-4">⚠️</div>
          <h2 className="text-xl font-medium text-white mb-2">Connection Issue</h2>
          <p className="text-white/60 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setError('')
                setLoading(true)
                window.location.reload()
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => {
                setError('')
                setUser(null)
                setIsAuthenticated(false)
              }}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl transition-colors"
            >
              Continue Offline
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="App">
        {!isAuthenticated ? (
          <Auth onSignOut={handleSignOut} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard user={user} onSignOut={handleSignOut} />} />
            <Route path="/admin" element={<AdminDashboard user={user} />} />
            <Route path="/lessons" element={<Lessons user={user} />} />
            <Route path="/quiz" element={<Quiz user={user} />} />
            <Route path="/chat" element={<RandomChat user={user} />} />
            <Route path="/debates" element={<GroupDebates user={user} />} />
            <Route path="/group/:groupId" element={<GroupChat user={user} />} />
            <Route path="/progress" element={<Progress user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </div>
    </Router>
  )
}

export default App
