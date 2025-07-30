import { createClient } from '@supabase/supabase-js'

// Use environment variables for security
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kjsqpbctouxvhahlpzuw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc3FwYmN0b3V4dmhhaGxwenV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDMyMTMsImV4cCI6MjA2OTI3OTIxM30.-wt2dt3vKGYb1bTDBvLsnNjyoPc-f37iOioEOfzfb20'

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Optimized client configuration for 100+ concurrent users
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Faster session detection
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Prevent URL-based session detection loops
    // Reduce auth polling for better performance
    flowType: 'pkce'
  },
  db: {
    // Connection pooling optimization
    schema: 'public'
  },
  realtime: {
    // Optimize real-time connections
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    // Network optimizations
    headers: {
      'x-client-info': 'hadalhub@1.0.0'
    }
  }
})

// Enhanced session cache with longer duration and smarter invalidation
let sessionCache = {
  session: null,
  user: null,
  profile: null,
  lastCheck: 0,
  isValidating: false,
  // Add background validation flag
  backgroundValidating: false,
  // Track if user was recently active
  lastActivity: Date.now()
}

// Track user activity to extend cache intelligently
const updateLastActivity = () => {
  sessionCache.lastActivity = Date.now()
}

// Listen for user activity
if (typeof window !== 'undefined') {
  ['click', 'keydown', 'scroll', 'mousemove'].forEach(event => {
    window.addEventListener(event, updateLastActivity, { passive: true })
  })
}

// Enhanced auth helpers for better session management
export const authHelpers = {
  // Fast session check with extended cache duration
  getSessionSync: () => {
    try {
      // Extended cache duration: 5 minutes for active users, 2 minutes for inactive
      const cacheAge = Date.now() - sessionCache.lastCheck
      const isRecentlyActive = (Date.now() - sessionCache.lastActivity) < 300000 // 5 minutes
      const maxCacheAge = isRecentlyActive ? 300000 : 120000 // 5min vs 2min
      
      // Return cached session if still valid
      if (sessionCache.session && cacheAge < maxCacheAge) {
        return Promise.resolve({ data: { session: sessionCache.session } })
      }
      
      const session = supabase.auth.getSession()
      return session
    } catch (error) {
      console.warn('Session sync check failed:', error)
      return Promise.resolve({ data: { session: null } })
    }
  },

  // Optimized user fetch with extended caching
  getCurrentUser: async () => {
    try {
      // Extended cache for user data (10 minutes)
      if (sessionCache.user && (Date.now() - sessionCache.lastCheck) < 600000) {
        return sessionCache.user
      }

      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      // Update cache
      sessionCache.user = user
      sessionCache.lastCheck = Date.now()
      
      return user
    } catch (error) {
      console.warn('User fetch failed:', error)
      // Return cached user if available, even if stale
      return sessionCache.user
    }
  },

  // Fast profile fetch with smart caching
  getUserProfile: async (userId) => {
    if (!userId) return null
    
    // Extended cache for profile data (10 minutes)
    if (sessionCache.profile && sessionCache.profile.id === userId && (Date.now() - sessionCache.lastCheck) < 600000) {
      return sessionCache.profile
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        // If profile doesn't exist, return cached profile if available
        if (error.code === 'PGRST116' && sessionCache.profile) {
          return sessionCache.profile
        }
        console.warn('Profile fetch failed:', error)
        return null
      }
      
      // Update cache
      sessionCache.profile = data
      sessionCache.lastCheck = Date.now()
      
      return data
    } catch (error) {
      console.warn('Profile fetch error:', error)
      // Return cached profile if available
      return sessionCache.profile
    }
  },

  // Enhanced sign out with better cleanup
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear cache
      sessionCache = {
        session: null,
        user: null,
        profile: null,
        lastCheck: 0,
        isValidating: false,
        backgroundValidating: false,
        lastActivity: Date.now()
      }
      
      // Clear any cached data
      localStorage.removeItem('sb-session-cache')
      
      return true
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force clear even if API fails
      sessionCache = {
        session: null,
        user: null,
        profile: null,
        lastCheck: 0,
        isValidating: false,
        backgroundValidating: false,
        lastActivity: Date.now()
      }
      localStorage.clear()
      return false
    }
  },

  // Smart session validation with background refresh
  validateSession: async (timeoutMs = 5000) => {
    try {
      // If we have a recent session, return it immediately and validate in background
      const cacheAge = Date.now() - sessionCache.lastCheck
      if (sessionCache.session && cacheAge < 120000) { // 2 minutes
        // Start background validation if not already running
        if (!sessionCache.backgroundValidating) {
          authHelpers.backgroundValidateSession()
        }
        return sessionCache.session
      }

      // Prevent duplicate validation calls
      if (sessionCache.isValidating) {
        console.log('⏳ Session validation already in progress, waiting...')
        // Wait for existing validation to complete (max 3 seconds)
        let attempts = 0
        while (sessionCache.isValidating && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        return sessionCache.session
      }

      sessionCache.isValidating = true

      // Use longer timeout for better reliability
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const { data: { session }, error } = await supabase.auth.getSession()
      clearTimeout(timeoutId)
      
      if (error) {
        // If network error and we have cached session, return it
        if (sessionCache.session && (error.name === 'AbortError' || error.message.includes('network'))) {
          console.warn('Network error, using cached session:', error.message)
          return sessionCache.session
        }
        throw error
      }
      
      // Update cache
      sessionCache.session = session
      sessionCache.lastCheck = Date.now()
      
      return session
    } catch (error) {
      console.warn('Session validation failed:', error)
      
      // Return cached session if available and error is network-related
      if (sessionCache.session && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.log('Using cached session due to network error')
        return sessionCache.session
      }
      
      return null
    } finally {
      sessionCache.isValidating = false
    }
  },

  // Background session validation (non-blocking)
  backgroundValidateSession: async () => {
    if (sessionCache.backgroundValidating) return
    
    sessionCache.backgroundValidating = true
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (!error && session) {
        sessionCache.session = session
        sessionCache.lastCheck = Date.now()
        console.log('🔄 Background session refresh completed')
      }
    } catch (error) {
      console.warn('Background session validation failed:', error)
    } finally {
      sessionCache.backgroundValidating = false
    }
  },

  // Clear cache manually
  clearCache: () => {
    sessionCache = {
      session: null,
      user: null,
      profile: null,
      lastCheck: 0,
      isValidating: false,
      backgroundValidating: false,
      lastActivity: Date.now()
    }
    console.log('🧹 Session cache cleared')
  },

  // Get cache status for debugging
  getCacheStatus: () => {
    return {
      hasSession: !!sessionCache.session,
      hasUser: !!sessionCache.user,
      hasProfile: !!sessionCache.profile,
      cacheAge: Date.now() - sessionCache.lastCheck,
      isValidating: sessionCache.isValidating,
      backgroundValidating: sessionCache.backgroundValidating,
      lastActivity: Date.now() - sessionCache.lastActivity
    }
  }
}

// Connection health monitoring with better recovery
let connectionHealth = {
  isOnline: navigator.onLine,
  lastCheck: Date.now(),
  retryCount: 0
}

// Enhanced connection health check
export const getConnectionHealth = () => {
  return {
    isOnline: connectionHealth.isOnline,
    lastCheck: connectionHealth.lastCheck,
    retryCount: connectionHealth.retryCount
  }
}

// Listen for online/offline events with smart recovery
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Connection restored')
    connectionHealth.isOnline = true
    connectionHealth.lastCheck = Date.now()
    connectionHealth.retryCount = 0
    
    // Clear cache and refresh session when coming back online
    authHelpers.backgroundValidateSession()
  })

  window.addEventListener('offline', () => {
    console.log('📴 Connection lost')
    connectionHealth.isOnline = false
    connectionHealth.lastCheck = Date.now()
  })

  // Handle page visibility changes (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Page became visible, refresh session in background
      console.log('👁️ Page became visible, refreshing session...')
      updateLastActivity()
      
      // Only refresh if cache is older than 1 minute
      if ((Date.now() - sessionCache.lastCheck) > 60000) {
        authHelpers.backgroundValidateSession()
      }
    }
  })

  // Periodic health check (every 2 minutes instead of 1 minute)
  let healthCheckInterval = setInterval(() => {
    if (connectionHealth.isOnline) {
      // Only check if user has been active recently
      const timeSinceActivity = Date.now() - sessionCache.lastActivity
      if (timeSinceActivity < 1800000) { // 30 minutes
        authHelpers.backgroundValidateSession()
      }
    }
  }, 120000) // 2 minutes

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    sessionCache.isValidating = false
    sessionCache.backgroundValidating = false
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval)
    }
  })
}

// Add global debug functions
if (typeof window !== 'undefined') {
  window.debugSession = () => {
    console.log('🔍 Session Debug Info:', authHelpers.getCacheStatus())
    console.log('🌐 Connection Health:', getConnectionHealth())
  }
} 