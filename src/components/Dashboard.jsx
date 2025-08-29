import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import WinnerBanner from './WinnerBanner'
import InfoBanner from './InfoBanner'
import { 
  BookOpen, 
  MessageCircle, 
  Users, 
  Trophy, 
  LogOut,
  ArrowRight,
  Flame,
  Award
} from 'lucide-react'

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      fetchUserStats()
      checkAdminStatus()
    }
  }, [user])

  const checkAdminStatus = async () => {
    try {
      setAdminCheckLoading(true)
      const { data, error } = await supabase.rpc('check_admin_access', {
        user_id_param: user.id
      })
      
      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(data || false)
        console.log('🔐 Admin check result:', data ? `✅ Admin user (${user.display_name})` : `❌ Regular user (${user.display_name})`)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setAdminCheckLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_stats', { user_id_param: user.id })

      if (error) {
        console.error('Error fetching user stats:', error)
        // Use fallback stats from user object
        setStats({
          total_lessons_completed: user.total_lessons_completed || 0,
          total_quizzes_passed: user.total_quizzes_passed || 0,
          current_streak: user.current_streak || 0,
          longest_streak: user.longest_streak || 0,
          daily_matches_used: user.daily_matches_used || 0,
          groups_created_today: user.groups_created_today || 0,
          english_level: user.english_level || 'beginner',
          join_date: user.created_at,
          last_activity: user.last_activity,
          total_messages_sent: 0,
          total_groups_joined: 0
        })
      } else {
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      // Use fallback stats from user object
      setStats({
        total_lessons_completed: user.total_lessons_completed || 0,
        total_quizzes_passed: user.total_quizzes_passed || 0,
        current_streak: user.current_streak || 0,
        longest_streak: user.longest_streak || 0,
        daily_matches_used: user.daily_matches_used || 0,
        groups_created_today: user.groups_created_today || 0,
        english_level: user.english_level || 'beginner',
        join_date: user.created_at,
        last_activity: user.last_activity,
        total_messages_sent: 0,
        total_groups_joined: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'from-green-400 to-emerald-500'
      case 'intermediate': return 'from-yellow-400 to-orange-500'
      case 'advanced': return 'from-red-400 to-pink-500'
      default: return 'from-gray-400 to-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
      </div>
    )
  }

  const matchesLeft = 5 - (user?.daily_matches_used || 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Minimal Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="text-xl font-light text-white">HadalHub</div>
              <div className={`bg-gradient-to-r ${getLevelColor(user?.english_level)} px-3 py-1 rounded-full text-xs font-medium text-white/90`}>
                {user?.english_level}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white/70 text-sm">{user?.display_name}</span>
              
              {/* Admin Dashboard Access - Only show to real admins */}
              {!adminCheckLoading && isAdmin && (
                <Link
                  to="/admin"
                  className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                  title="Admin Dashboard"
                >
                  <span>Admin</span>
                </Link>
              )}
              
              {/* About Link */}
              <Link
                to="/about"
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                title="About HadalHub"
              >
                <span>About</span>
              </Link>
              
              <button
                onClick={handleSignOut}
                className="text-white/50 hover:text-white/80 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Winner Banner */}
      <WinnerBanner user={user} />

      {/* Info Banner */}
      <InfoBanner />

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light text-white mb-3">
            Welcome back
          </h1>
          <p className="text-white/60">
            Continue your English journey
          </p>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Learn Card */}
          <Link
            to="/lessons"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-blue-500/20 rounded-full p-3">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Learn</h3>
            <p className="text-white/60 text-sm">
                              Grammar, vocabulary & new categories
            </p>
          </Link>

          {/* Chat Card */}
          <Link
            to="/chat"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-green-500/20 rounded-full p-3">
                <MessageCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-white/50">{matchesLeft} left</span>
                <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Chat</h3>
            <p className="text-white/60 text-sm">
              Practice with partners
            </p>
          </Link>

          {/* Quiz Card */}
          <Link
            to="/quiz"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-yellow-500/20 rounded-full p-3">
                <Trophy className="h-6 w-6 text-yellow-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Quiz</h3>
            <p className="text-white/60 text-sm">
              Test your knowledge
            </p>
          </Link>

          {/* Winner Card */}
          <Link
            to="/voice-challenge"
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="bg-yellow-500/20 rounded-full p-3">
                <Award className="h-6 w-6 text-yellow-400" />
              </div>
              <ArrowRight className="h-5 w-5 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">Winner</h3>
            <p className="text-white/60 text-sm">
              Daily voice challenge
            </p>
          </Link>

        </div>

        {/* Minimal Stats */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Flame className="h-5 w-5 text-orange-400 mr-2" />
                <span className="text-2xl font-light text-white">{stats?.current_streak || 0}</span>
              </div>
              <p className="text-white/50 text-xs">Day streak</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-blue-400 mr-2" />
                <span className="text-2xl font-light text-white">{stats?.total_lessons_completed || 0}</span>
              </div>
              <p className="text-white/50 text-xs">Lessons</p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-2">
                <Trophy className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-2xl font-light text-white">{stats?.total_quizzes_passed || 0}</span>
              </div>
              <p className="text-white/50 text-xs">Quizzes</p>
            </div>
          </div>
        </div>

        {/* Progress Link */}
        <div className="mt-8 text-center">
          <Link
            to="/progress"
            className="inline-flex items-center space-x-2 text-white/60 hover:text-white/80 transition-colors text-sm"
          >
            <span>View detailed progress</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

    </div>
  )
} 