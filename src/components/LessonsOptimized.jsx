import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  BookOpen, 
  Play, 
  CheckCircle, 
  Lock, 
  Clock,
  Award,
  ChevronRight
} from 'lucide-react'

// 🚀 PERFORMANCE OPTIMIZED VERSION OF LESSONS.JSX

export default function LessonsOptimized({ user }) {
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [userProgress, setUserProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('grammar')
  const [completionMessage, setCompletionMessage] = useState('')

  // 🔥 PERFORMANCE FIX 1: Memoize filtered lessons
  const { grammarLessons, vocabularyLessons } = useMemo(() => {
    console.log('📊 Filtering lessons (memoized):', lessons.length)
    return {
      grammarLessons: lessons.filter(l => l.type === 'grammar'),
      vocabularyLessons: lessons.filter(l => l.type === 'vocabulary')
      // NEW CATEGORIES: Will be added here when created
      // conversationsLessons: lessons.filter(l => l.type === 'conversations'),
      // homeLifeLessons: lessons.filter(l => l.type === 'home_life'),
      // shoppingLessons: lessons.filter(l => l.type === 'shopping'),
      // travelLessons: lessons.filter(l => l.type === 'travel'),
      // healthLessons: lessons.filter(l => l.type === 'health'),
      // schoolLessons: lessons.filter(l => l.type === 'school')
    }
  }, [lessons])

  // 🔥 PERFORMANCE FIX 2: Memoize progress calculations
  const progressMap = useMemo(() => {
    console.log('📊 Calculating progress map (memoized):', Object.keys(userProgress).length)
    const map = {}
    
    // Pre-calculate locked status for each lesson type
    ;[grammarLessons, vocabularyLessons].forEach(lessonGroup => {
      lessonGroup.forEach((lesson, index) => {
        const progress = userProgress[lesson.id]
        const isCompleted = progress?.is_completed
        const isLocked = index > 0 && !userProgress[lessonGroup[index - 1]?.id]?.is_completed
        
        map[lesson.id] = {
          progress,
          isCompleted,
          isLocked,
          index
        }
      })
    })
    
    return map
  }, [grammarLessons, vocabularyLessons, userProgress])

  // 🔥 PERFORMANCE FIX 3: Optimize database queries
  const fetchLessons = useCallback(async () => {
    try {
      console.log('📡 Fetching lessons for level:', user.english_level)
      const startTime = performance.now()
      
      // Optimized query: only fetch needed fields initially
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, type, order_index, is_active, is_enhanced')
        .eq('level', user.english_level)
        .eq('is_active', true)
        .order('order_index')

      const endTime = performance.now()
      console.log(`⚡ Lessons fetched in ${endTime - startTime}ms`)

      if (error) {
        console.error('Error fetching lessons:', error)
        setLessons([])
      } else {
        setLessons(data || [])
      }
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setLessons([])
    }
  }, [user.english_level])

  // 🔥 PERFORMANCE FIX 4: Optimize progress fetching
  const fetchUserProgress = useCallback(async () => {
    try {
      console.log('📡 Fetching user progress for user:', user.id)
      const startTime = performance.now()
      
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id, is_completed, completion_date, time_spent')
        .eq('user_id', user.id)

      const endTime = performance.now()
      console.log(`⚡ Progress fetched in ${endTime - startTime}ms`)

      if (error) {
        console.error('Error fetching user progress:', error)
        setUserProgress({})
      } else {
        const progressMap = {}
        data?.forEach(progress => {
          progressMap[progress.lesson_id] = progress
        })
        setUserProgress(progressMap)
      }
    } catch (error) {
      console.error('Error fetching user progress:', error)
      setUserProgress({})
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    if (user) {
      fetchLessons()
      fetchUserProgress()
    }
  }, [user, fetchLessons, fetchUserProgress])

  // 🔥 PERFORMANCE FIX 5: Memoize lesson icon function
  const getLessonIcon = useCallback((type) => {
    switch (type) {
      case 'grammar': return '📝'
      case 'vocabulary': return '📚'
      // NEW CATEGORIES: Will be added here when created
      // case 'conversations': return '🗣️'
      // case 'home_life': return '🏠'
      // case 'shopping': return '🛒'
      // case 'travel': return '🚌'
      // case 'health': return '🏥'
      // case 'school': return '🎓'
      default: return '📖'
    }
  }, [])

  // 🔥 PERFORMANCE FIX 6: Memoize level info
  const levelInfo = useMemo(() => {
    switch (user?.english_level) {
      case 'beginner':
        return {
          title: 'Beginner Level',
          description: '500 core words • Basic grammar • Simple conversations',
          color: 'text-green-400',
          bg: 'bg-green-500/10 border-green-500/30'
        }
      case 'intermediate':
        return {
          title: 'Intermediate Level',
          description: '1,500 words • Complex grammar • Detailed discussions',
          color: 'text-yellow-400',
          bg: 'bg-yellow-500/10 border-yellow-500/30'
        }
      case 'advanced':
        return {
          title: 'Advanced Level',
          description: '3,000+ words • Advanced grammar • Professional communication',
          color: 'text-red-400',
          bg: 'bg-red-500/10 border-red-500/30'
        }
      default:
        return {
          title: 'Unknown Level',
          description: '',
          color: 'text-gray-400',
          bg: 'bg-gray-500/10 border-gray-500/30'
        }
    }
  }, [user?.english_level])

  // 🔥 PERFORMANCE FIX 7: Lazy lesson content loading
  const loadLessonContent = useCallback(async (lessonId) => {
    console.log('📡 Loading full lesson content for:', lessonId)
    const startTime = performance.now()
    
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()

      const endTime = performance.now()
      console.log(`⚡ Lesson content loaded in ${endTime - startTime}ms`)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error loading lesson content:', error)
      return null
    }
  }, [])

  // 🔥 PERFORMANCE FIX 8: Optimized lesson start
  const startLesson = useCallback(async (lesson) => {
    console.log('📖 Starting lesson:', lesson.title)
    
    // Load full content only when needed
    const fullLesson = await loadLessonContent(lesson.id)
    if (!fullLesson) return
    
    setSelectedLesson(fullLesson)
    
    // Use database function to start lesson safely
    try {
      const { data, error } = await supabase.rpc('start_lesson', {
        p_user_id: user.id,
        p_lesson_id: lesson.id
      })
      
      if (error) {
        console.error('❌ Error starting lesson:', error)
      }
    } catch (error) {
      console.error('❌ Exception in startLesson:', error)
    }
  }, [user.id, loadLessonContent])

  // 🔥 PERFORMANCE FIX 9: Memoized lesson cards
  const LessonCard = useCallback(({ lesson, type }) => {
    const lessonData = progressMap[lesson.id]
    if (!lessonData) return null

    const { isCompleted, isLocked, index } = lessonData

    return (
      <div
        key={lesson.id}
        className={`bg-gray-800 rounded-xl p-4 sm:p-6 border transition-all cursor-pointer ${
          isLocked
            ? 'border-gray-700 opacity-50 cursor-not-allowed'
            : isCompleted
            ? 'border-green-500/30 bg-green-500/5 hover:border-green-500/50'
            : 'border-gray-700 hover:border-gray-600'
        }`}
        onClick={() => !isLocked && startLesson(lesson)}
      >
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              isCompleted ? 'bg-green-500/20' : 'bg-gray-700'
            }`}>
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              ) : isLocked ? (
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              ) : (
                <span className="text-lg sm:text-xl">{getLessonIcon(lesson.type)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white leading-tight truncate">
                {lesson.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-400 capitalize mt-1">
                {lesson.type} • Lesson {lesson.order_index}
              </p>
              {lesson.is_enhanced && (
                <span className="inline-block mt-1 px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  ✨ Enhanced
                </span>
              )}
            </div>
          </div>
          
          {!isLocked && !isCompleted && (
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 ml-2" />
          )}
        </div>

        {isLocked && (
          <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
            Complete previous lesson to unlock
          </p>
        )}
      </div>
    )
  }, [progressMap, startLesson, getLessonIcon])

  // 🔥 PERFORMANCE FIX 10: Optimized tab switching
  const currentLessons = useMemo(() => {
    switch (activeTab) {
      case 'grammar': return grammarLessons
      case 'vocabulary': return vocabularyLessons
      // NEW CATEGORIES: Will be added here when created
      // case 'conversations': return conversationsLessons
      // case 'home_life': return homeLifeLessons
      // case 'shopping': return shoppingLessons
      // case 'travel': return travelLessons
      // case 'health': return healthLessons
      // case 'school': return schoolLessons
      default: return []
    }
  }, [activeTab, grammarLessons, vocabularyLessons])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (selectedLesson) {
    // TODO: Implement optimized lesson content rendering
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <button
          onClick={() => setSelectedLesson(null)}
          className="mb-4 flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Lessons</span>
        </button>
        <h1 className="text-2xl font-bold text-white mb-4">{selectedLesson.title}</h1>
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-300">Lesson content will be rendered here...</p>
          <p className="text-sm text-gray-500 mt-2">Content size: {JSON.stringify(selectedLesson.content).length} characters</p>
        </div>
      </div>
    )
  }

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
              <div className="flex items-center space-x-2">
                <BookOpen className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl font-bold text-white">Lessons (Optimized)</h1>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-full border ${levelInfo.bg}`}>
              <span className={`text-sm font-medium ${levelInfo.color}`}>
                {levelInfo.title}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {completionMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-400 text-center font-medium">{completionMessage}</p>
          </div>
        )}

        {/* Level Info */}
        <div className={`rounded-xl p-6 border mb-8 ${levelInfo.bg}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${levelInfo.color}`}>
                {levelInfo.title}
              </h2>
              <p className="text-gray-300">{levelInfo.description}</p>
            </div>
            <Award className={`h-12 w-12 ${levelInfo.color}`} />
          </div>
        </div>

        {/* Performance Stats */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h3 className="text-blue-400 font-medium mb-2">⚡ Performance Optimizations Active</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Lessons:</span>
              <span className="text-white ml-2">{lessons.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Grammar:</span>
              <span className="text-white ml-2">{grammarLessons.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Vocabulary:</span>
              <span className="text-white ml-2">{vocabularyLessons.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Progress Entries:</span>
              <span className="text-white ml-2">{Object.keys(userProgress).length}</span>
            </div>
          </div>
        </div>

        {/* Lesson Type Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8">
          {[
            { key: 'grammar', label: 'Grammar', icon: '📝', count: grammarLessons.length },
            { key: 'vocabulary', label: 'Vocabulary', icon: '📚', count: vocabularyLessons.length }
            // NEW CATEGORIES: Will be added here when created
            // { key: 'conversations', label: 'Daily Conversations', icon: '🗣️', count: conversationsLessons.length },
            // { key: 'home_life', label: 'Home & Life', icon: '🏠', count: homeLifeLessons.length },
            // { key: 'shopping', label: 'Shopping & Services', icon: '🛒', count: shoppingLessons.length },
            // { key: 'travel', label: 'Travel & Transport', icon: '🚌', count: travelLessons.length },
            // { key: 'health', label: 'Health & Safety', icon: '🏥', count: healthLessons.length },
            // { key: 'school', label: 'School & Learning', icon: '🎓', count: schoolLessons.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                console.log(`🔄 Switching to ${tab.key} tab (${tab.count} lessons)`)
                const startTime = performance.now()
                setActiveTab(tab.key)
                requestAnimationFrame(() => {
                  const endTime = performance.now()
                  console.log(`⚡ Tab switch completed in ${endTime - startTime}ms`)
                })
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              <span className="bg-white/20 px-2 py-1 rounded-full text-xs">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentLessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} type={activeTab} />
          ))}
        </div>

        {/* Progress Summary */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Your Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-3xl font-bold text-blue-400">
                {Object.values(userProgress).filter(p => p.is_completed).length}
              </div>
              <div className="text-gray-400 mt-1">Lessons Completed</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-3xl font-bold text-green-400">
                {Math.round((Object.values(userProgress).filter(p => p.is_completed).length / lessons.length) * 100) || 0}%
              </div>
              <div className="text-gray-400 mt-1">Course Progress</div>
            </div>
            <div className="text-center p-4 bg-gray-700/50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">
                {user?.current_streak || 0}
              </div>
              <div className="text-gray-400 mt-1">Day Streak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}