import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  BarChart3, 
  Trophy, 
  Flame, 
  BookOpen,
  MessageCircle,
  Users,
  Clock,
  Target,
  Award,
  Calendar,
  TrendingUp
} from 'lucide-react'

export default function Progress({ user }) {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserStats()
      fetchRecentActivity()
      calculateAchievements()
    }
  }, [user])

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_stats', { user_id_param: user.id })

      if (error) throw error
      setStats(data)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Get recent lesson completions
      const { data: lessons, error: lessonsError } = await supabase
        .from('user_lesson_progress')
        .select(`
          completion_date,
          lesson:lessons(title, type)
        `)
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('completion_date', { ascending: false })
        .limit(10)

      if (lessonsError) throw lessonsError

      // Get recent quiz attempts
      const { data: quizzes, error: quizzesError } = await supabase
        .from('user_quiz_attempts')
        .select(`
          completed_at,
          score,
          status,
          quiz:quizzes(title)
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10)

      if (quizzesError) throw quizzesError

      // Combine and sort activities
      const activities = [
        ...(lessons || []).map(l => ({
          type: 'lesson',
          date: l.completion_date,
          title: l.lesson?.title,
          subtype: l.lesson?.type,
          icon: BookOpen,
          color: 'text-blue-400'
        })),
        ...(quizzes || []).map(q => ({
          type: 'quiz',
          date: q.completed_at,
          title: q.quiz?.title,
          score: q.score,
          status: q.status,
          icon: Trophy,
          color: q.status === 'passed' ? 'text-green-400' : 'text-yellow-400'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))

      setRecentActivity(activities.slice(0, 10))
    } catch (error) {
      console.error('Error fetching recent activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAchievements = () => {
    const userAchievements = []

    // Learning achievements
    if ((user?.total_lessons_completed || 0) >= 1) {
      userAchievements.push({
        id: 'first_lesson',
        title: 'First Steps',
        description: 'Complete your first lesson',
        icon: BookOpen,
        color: 'text-blue-400',
        unlocked: true
      })
    }

    if ((user?.total_lessons_completed || 0) >= 10) {
      userAchievements.push({
        id: 'lesson_master',
        title: 'Lesson Master',
        description: 'Complete 10 lessons',
        icon: Award,
        color: 'text-purple-400',
        unlocked: true
      })
    }

    // Quiz achievements
    if ((user?.total_quizzes_passed || 0) >= 1) {
      userAchievements.push({
        id: 'quiz_starter',
        title: 'Quiz Starter',
        description: 'Pass your first quiz',
        icon: Trophy,
        color: 'text-yellow-400',
        unlocked: true
      })
    }

    if ((user?.total_quizzes_passed || 0) >= 5) {
      userAchievements.push({
        id: 'quiz_champion',
        title: 'Quiz Champion',
        description: 'Pass 5 quizzes',
        icon: Target,
        color: 'text-green-400',
        unlocked: true
      })
    }

    // Streak achievements
    if ((user?.current_streak || 0) >= 3) {
      userAchievements.push({
        id: 'streak_starter',
        title: 'On Fire',
        description: 'Maintain a 3-day streak',
        icon: Flame,
        color: 'text-orange-400',
        unlocked: true
      })
    }

    if ((user?.longest_streak || 0) >= 7) {
      userAchievements.push({
        id: 'week_warrior',
        title: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: Calendar,
        color: 'text-red-400',
        unlocked: true
      })
    }

    // Social achievements
    if ((stats?.total_messages_sent || 0) >= 10) {
      userAchievements.push({
        id: 'chatter',
        title: 'Chatter',
        description: 'Send 10 messages in chats',
        icon: MessageCircle,
        color: 'text-green-400',
        unlocked: true
      })
    }

    if ((stats?.total_groups_joined || 0) >= 1) {
      userAchievements.push({
        id: 'social_butterfly',
        title: 'Social Butterfly',
        description: 'Join your first debate group',
        icon: Users,
        color: 'text-purple-400',
        unlocked: true
      })
    }

    setAchievements(userAchievements)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getLevelProgress = (level) => {
    const levelData = {
      beginner: { current: user?.total_lessons_completed || 0, total: 15, next: 'intermediate' },
      intermediate: { current: user?.total_lessons_completed || 0, total: 20, next: 'advanced' },
      advanced: { current: user?.total_lessons_completed || 0, total: 25, next: 'expert' }
    }
    return levelData[level] || levelData.beginner
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const levelProgress = getLevelProgress(user?.english_level)
  const progressPercentage = Math.min((levelProgress.current / levelProgress.total) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-gray-600"></div>
              <BarChart3 className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-white">Horumaarkaaga</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-sm ${getLevelColor(user?.english_level)}`}>
                {user?.english_level?.charAt(0).toUpperCase() + user?.english_level?.slice(1)} Level
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Level Progress */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Level Progress</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              user?.english_level === 'beginner' ? 'bg-green-500/20 text-green-400' :
              user?.english_level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {user?.english_level?.toUpperCase()}
            </span>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress to {levelProgress.next}</span>
              <span>{levelProgress.current}/{levelProgress.total} lessons</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  user?.english_level === 'beginner' ? 'bg-green-500' :
                  user?.english_level === 'intermediate' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm">
            Complete {levelProgress.total - levelProgress.current} more lessons to advance to {levelProgress.next} level
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Current Streak</p>
                <p className="text-3xl font-bold text-orange-400">{user?.current_streak || 0}</p>
                <p className="text-xs text-gray-500">Longest: {user?.longest_streak || 0} days</p>
              </div>
              <Flame className="h-10 w-10 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Lessons Completed</p>
                <p className="text-3xl font-bold text-blue-400">{user?.total_lessons_completed || 0}</p>
                <p className="text-xs text-gray-500">Keep learning!</p>
              </div>
              <BookOpen className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Quizzes Passed</p>
                <p className="text-3xl font-bold text-green-400">{user?.total_quizzes_passed || 0}</p>
                <p className="text-xs text-gray-500">Great job!</p>
              </div>
              <Trophy className="h-10 w-10 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Messages Sent</p>
                <p className="text-3xl font-bold text-purple-400">{stats?.total_messages_sent || 0}</p>
                <p className="text-xs text-gray-500">Keep chatting!</p>
              </div>
              <MessageCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </h3>
            
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => {
                  const Icon = activity.icon
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                      <Icon className={`h-5 w-5 ${activity.color}`} />
                      <div className="flex-1">
                        <p className="text-white font-medium">{activity.title}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <span className="capitalize">{activity.type}</span>
                          {activity.subtype && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{activity.subtype}</span>
                            </>
                          )}
                          {activity.score && (
                            <>
                              <span>•</span>
                              <span className={activity.status === 'passed' ? 'text-green-400' : 'text-yellow-400'}>
                                {activity.score}%
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No recent activity</p>
                <p className="text-sm text-gray-500">Start learning to see your progress here!</p>
              </div>
            )}
          </div>

          {/* Achievements */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Achievements</span>
            </h3>
            
            {achievements.length > 0 ? (
              <div className="space-y-4">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                      <div className={`p-2 rounded-lg ${achievement.unlocked ? 'bg-yellow-500/20' : 'bg-gray-600'}`}>
                        <Icon className={`h-5 w-5 ${achievement.unlocked ? achievement.color : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                          {achievement.title}
                        </p>
                        <p className="text-sm text-gray-400">{achievement.description}</p>
                      </div>
                      {achievement.unlocked && (
                        <div className="text-yellow-400">
                          <Trophy className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No achievements yet</p>
                <p className="text-sm text-gray-500">Complete lessons and quizzes to unlock achievements!</p>
              </div>
            )}
          </div>
        </div>

        {/* Learning Goals */}
        <div className="mt-8 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Learning Goals</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-400 mb-2">
                {Math.max(0, 5 - (user?.daily_matches_used || 0))}
              </div>
              <div className="text-sm text-gray-400">Daily Chats Left</div>
              <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${((user?.daily_matches_used || 0) / 5) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-400 mb-2">
                {user?.current_streak || 0}
              </div>
              <div className="text-sm text-gray-400">Day Streak</div>
              <div className="mt-2 text-xs text-gray-500">
                Goal: Reach 7 days
              </div>
            </div>
            
            <div className="text-center p-4 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400 mb-2">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-gray-400">Level Progress</div>
              <div className="mt-2 text-xs text-gray-500">
                Goal: Advance to {levelProgress.next}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 