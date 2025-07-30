import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, User, Mail, Lock, ArrowRight } from 'lucide-react'

export default function Auth({ onSignOut }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [englishLevel, setEnglishLevel] = useState('beginner')
  const [gender, setGender] = useState('male')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        console.log('🔐 Signing in user:', email)
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        
        if (error) throw error
        
        console.log('✅ Sign in successful:', data.user?.email)
        
      } else {
        console.log('📝 Signing up user:', email)
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim() || email.split('@')[0],
              english_level: englishLevel,
              gender: gender
            }
          }
        })
        
        if (error) throw error
        
        console.log('✅ Sign up successful:', data.user?.email)
        
        // Profile will be created automatically by database trigger
        // Auth state listener in App.jsx will handle the rest
      }
    } catch (error) {
      console.error('❌ Auth error:', error)
      
      // User-friendly error messages
      if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password')
      } else if (error.message.includes('User already registered')) {
        setError('This email is already registered. Try signing in instead.')
      } else if (error.message.includes('Password should be at least')) {
        setError('Password must be at least 6 characters long')
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address')
      } else if (error.message.includes('signup is disabled')) {
        setError('New registrations are currently disabled')
      } else {
        setError(error.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Minimal Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-6 backdrop-blur-sm">
              <span className="text-2xl font-bold text-white">H</span>
            </div>
            <h1 className="text-4xl font-light text-white mb-4 tracking-wide">
              HadalHub
            </h1>
            <p className="text-gray-400 text-lg font-light">
              Ku baro afka Ingiriisiga sheekaysiga
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-light text-white mb-2">
              {isLogin ? 'Welcome' : 'Join'}
            </h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border-l-2 border-red-500/50 p-3 mb-6 rounded-r">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {/* Email Field */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm"
                placeholder="Email"
                disabled={loading}
              />
            </div>

            {/* Display Name Field (Signup only) */}
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm"
                  placeholder="Name"
                  disabled={loading}
                />
              </div>
            )}

            {/* Password Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm"
                placeholder="Password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-400 transition-colors"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Signup Fields */}
            {!isLogin && (
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-gray-600 focus:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm text-sm"
                  disabled={loading}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>

                <select
                  value={englishLevel}
                  onChange={(e) => setEnglishLevel(e.target.value)}
                  className="px-3 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:border-gray-600 focus:bg-gray-800/70 transition-all duration-200 backdrop-blur-sm text-sm"
                  disabled={loading}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-900 hover:bg-gray-100 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center group mt-6"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="text-gray-400 hover:text-white font-light text-sm transition-colors"
              disabled={loading}
            >
              {isLogin ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 