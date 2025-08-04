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

export default function Lessons({ user }) {
  const [lessons, setLessons] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [userProgress, setUserProgress] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('grammar')
  const [completionMessage, setCompletionMessage] = useState('')
  
  // NEW: Enhanced lesson features
  const [showSomaliSupport, setShowSomaliSupport] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  
  // 🌟 NEW: Confidence Meter & Conversation Features
  const [confidenceLevel, setConfidenceLevel] = useState(0)
  const [showConversationStarters, setShowConversationStarters] = useState(false)
  const [currentConversation, setCurrentConversation] = useState(0)

  // 🚀 PERFORMANCE FIX 1: Only fetch essential fields, not heavy JSONB content
  const fetchLessons = useCallback(async () => {
    try {
      console.log('📡 Fetching lessons list (optimized)...')
      const startTime = performance.now()
      
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, type, order_index, is_enhanced, is_active')  // ⚡ NO HEAVY JSONB!
        .eq('level', user.english_level)
        .eq('is_active', true)
        .order('order_index')

      const endTime = performance.now()
      console.log(`⚡ Lessons list fetched in ${Math.round(endTime - startTime)}ms (${data?.length || 0} lessons)`)

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

  // 🚀 PERFORMANCE FIX 2: Optimize progress fetching  
  const fetchUserProgress = useCallback(async () => {
    try {
      console.log('📡 Fetching user progress...')
      const startTime = performance.now()
      
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id, is_completed, completion_date, time_spent')
        .eq('user_id', user.id)

      const endTime = performance.now()
      console.log(`⚡ Progress fetched in ${Math.round(endTime - startTime)}ms`)

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

  // 🔧 useEffect after function definitions to avoid dependency issues
  useEffect(() => {
    if (user) {
      fetchLessons()
      fetchUserProgress()
    }
  }, [user, fetchLessons, fetchUserProgress])

  // 🚀 ENHANCED QUIZ LOGIC: Mandatory 100% completion with better feedback
  const submitQuizAnswer = (questionIndex, selectedAnswer) => {
    const newAnswers = { ...quizAnswers }
    newAnswers[questionIndex] = selectedAnswer
    setQuizAnswers(newAnswers)

    const question = currentQuiz.questions[questionIndex]
    const isCorrect = selectedAnswer === question.correct_answer
    
    // Enhanced feedback with visual indicators
    const feedback = isCorrect 
      ? `🎉 Excellent! ${question.explanation}` 
      : `💡 Not quite right. ${question.explanation}`
    
    const somaliFeedback = showSomaliSupport 
      ? (isCorrect 
          ? `🎉 Fiican! ${question.explanation_somali || question.explanation}` 
          : `💡 Ma aha kan saxda ah. ${question.explanation_somali || question.explanation}`)
      : ''
    
    // Show beautiful feedback modal instead of alert
    setCompletionMessage(`${feedback}${somaliFeedback ? `\n\n🇸🇴 ${somaliFeedback}` : ''}`)
    
    if (isCorrect) {
      setCurrentQuiz(prev => ({ ...prev, score: prev.score + 1 }))
    }

    // Move to next question or complete quiz
    setTimeout(() => {
      setCompletionMessage('') // Clear feedback message
      if (questionIndex < currentQuiz.questions.length - 1) {
        setCurrentQuiz(prev => ({ ...prev, currentQuestion: questionIndex + 1 }))
      } else {
        // Quiz completed - MANDATORY 100% requirement
        const finalScore = currentQuiz.score + (isCorrect ? 1 : 0)
        const totalQuestions = currentQuiz.questions.length
        const passed = finalScore === totalQuestions // Must get ALL correct
        
        if (passed) {
          setQuizCompleted(true)
          setCompletionMessage(`🎊 PERFECT SCORE! ${finalScore}/${totalQuestions} correct! You've mastered this lesson!`)
        } else {
          setQuizCompleted(false)
          setCompletionMessage(`📚 Almost there! Score: ${finalScore}/${totalQuestions}. You need ${totalQuestions}/${totalQuestions} to complete the lesson. Don't give up!`)
          // Reset quiz for retry after short delay
          setTimeout(() => {
            setCurrentQuiz(null)
            setQuizAnswers({})
            setCompletionMessage('')
          }, 4000)
        }
      }
    }, 2500) // Longer delay to read feedback
  }

  const startQuiz = (lesson) => {
    if (lesson.quiz_questions) {
      setCurrentQuiz({
        questions: lesson.quiz_questions,
        currentQuestion: 0,
        score: 0
      })
      setQuizAnswers({})
      setQuizCompleted(false)
    }
  }

  const playAudio = (audioId, text) => {
    if (audioPlaying === audioId) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setAudioPlaying(null)
      return
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = playbackSpeed
      utterance.pitch = 1
      utterance.volume = 1
      
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(voice => voice.lang.startsWith('en'))
      if (englishVoice) {
        utterance.voice = englishVoice
      }
      
      utterance.onstart = () => {
        setAudioPlaying(audioId)
        console.log(`🔊 Speaking: "${text}" at ${playbackSpeed}x speed`)
      }
      
      utterance.onend = () => {
        setAudioPlaying(null)
      }
      
      utterance.onerror = () => {
        setAudioPlaying(null)
        console.error('Speech synthesis error')
      }
      
      window.speechSynthesis.speak(utterance)
    } else {
      console.error('Speech synthesis not supported')
      alert('🔊 Audio not supported in this browser')
    }
  }

  const startLesson = async (lesson) => {
    console.log('📖 Starting lesson:', lesson.title, 'Type:', lesson.type)
    
    // 🚀 PERFORMANCE FIX 7: Fetch full content only when lesson is opened
    console.log('📡 Fetching full lesson content...')
    const startTime = performance.now()
    
    try {
      const { data: fullLesson, error } = await supabase
        .from('lessons')
        .select('*')  // Now fetch all content including JSONB
        .eq('id', lesson.id)
        .single()
      
      const endTime = performance.now()
      console.log(`⚡ Full lesson content fetched in ${Math.round(endTime - startTime)}ms`)
      
      if (error) {
        console.error('Error fetching lesson content:', error)
        return
      }
      
      setSelectedLesson(fullLesson)
      
      // NEW: Auto-enable Somali support for beginners
      if (user?.english_level === 'beginner' && fullLesson.content_somali) {
        setShowSomaliSupport(true)
      } else {
        setShowSomaliSupport(false)
      }
      
      // NEW: Start quiz if lesson has enhanced features
      if (fullLesson.is_enhanced && fullLesson.quiz_questions) {
        setTimeout(() => {
          startQuiz(fullLesson)
        }, 1000) // Start quiz after 1 second
      }
    } catch (fetchError) {
      console.error('❌ Exception fetching lesson content:', fetchError)
      return
    }
    
    // Use database function to start lesson safely
    try {
      const { data, error } = await supabase.rpc('start_lesson', {
        p_user_id: user.id,
        p_lesson_id: lesson.id
      })

      console.log('📊 Start lesson result:', data, error)

      if (error) {
        console.error('❌ Error starting lesson:', error)
      } else if (data && data.length > 0) {
        const result = data[0]
        if (result.success) {
          console.log('✅ Lesson started successfully:', result.message)
        } else {
          console.error('❌ Failed to start lesson:', result.message)
        }
      }
    } catch (error) {
      console.error('❌ Exception in startLesson:', error)
    }
  }

  const completeLesson = async (lesson) => {
    try {
      console.log('🎯 Starting lesson completion for:', lesson.title)
      
      // 🚀 ENHANCED: Strict quiz completion requirement
      if (lesson.is_enhanced && lesson.quiz_questions && !quizCompleted) {
        const totalQuestions = lesson.quiz_questions.length
        setCompletionMessage(`🚫 Quiz Mastery Required!\n\nYou must complete the quiz with ${totalQuestions}/${totalQuestions} correct answers to unlock this lesson completion.\n\n🇸🇴 Su'aalaha dhammee oo ${totalQuestions}/${totalQuestions} sax ka hel si aad u dhammeyso casharkan!`)
        
        // Scroll to quiz section to guide user
        setTimeout(() => {
          const quizElement = document.querySelector('[data-quiz-section]')
          if (quizElement) {
            quizElement.scrollIntoView({ behavior: 'smooth' })
          }
        }, 1000)
        
        return
      }
      
      setLoading(true)

      // Use the database function to handle completion safely
      const { data, error } = await supabase.rpc('complete_lesson', {
        p_user_id: user.id,
        p_lesson_id: lesson.id,
        p_time_spent: 300
      })

      console.log('📊 Database function result:', data, error)

      if (error) {
        console.error('❌ Database function error:', error)
        throw error
      }

      if (data && data.length > 0) {
        const result = data[0]
        if (!result.success) {
          throw new Error(result.message)
        }

        console.log('✅ Lesson completion result:', result)
        
        // Refresh progress data
        console.log('🔄 Refreshing progress data')
        await fetchUserProgress()
        
        // Show success message
        const message = result.was_first_completion 
          ? `🎉 Lesson "${lesson.title}" completed successfully!`
          : `✅ Lesson "${lesson.title}" already completed!`
        
        setCompletionMessage(message)
        setTimeout(() => {
          setCompletionMessage('')
          setSelectedLesson(null)
        }, 2000)
        
        console.log('✅ Lesson completion successful!')
      } else {
        throw new Error('No result returned from database function')
      }
      
    } catch (error) {
      console.error('❌ Error completing lesson:', error)
      alert(`Error completing lesson: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getLevelInfo = (level) => {
    switch (level) {
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
  }

  // 🎨 BEAUTIFUL ENHANCED LESSON CONTENT RENDERER
  const renderLessonContent = (lesson) => {
    const content = lesson.content
    const somalicontent = lesson.content_somali || {}
    
    // 🎯 Get lesson-specific icon and color scheme
    const getLessonTheme = (title) => {
      if (title.includes('Present Tense') || title.includes('To Be')) {
        return { icon: '📝', color: 'blue', gradient: 'from-blue-600/20 via-purple-600/20 to-indigo-600/20' }
      } else if (title.includes('Questions')) {
        return { icon: '❓', color: 'cyan', gradient: 'from-cyan-600/20 via-blue-600/20 to-indigo-600/20' }
      } else if (title.includes('Present Simple')) {
        return { icon: '⏰', color: 'green', gradient: 'from-green-600/20 via-emerald-600/20 to-teal-600/20' }
      } else if (title.includes('Articles')) {
        return { icon: '📰', color: 'orange', gradient: 'from-orange-600/20 via-red-600/20 to-pink-600/20' }
      } else if (title.includes('Plurals')) {
        return { icon: '🔢', color: 'purple', gradient: 'from-purple-600/20 via-violet-600/20 to-indigo-600/20' }
      } else if (title.includes('Possessive')) {
        return { icon: '👤', color: 'pink', gradient: 'from-pink-600/20 via-rose-600/20 to-red-600/20' }
      } else if (title.includes('There is')) {
        return { icon: '📍', color: 'indigo', gradient: 'from-indigo-600/20 via-blue-600/20 to-cyan-600/20' }
      } else if (title.includes('Prepositions')) {
        return { icon: '🗺️', color: 'teal', gradient: 'from-teal-600/20 via-cyan-600/20 to-blue-600/20' }
      } else if (title.includes('Adjectives')) {
        return { icon: '🎨', color: 'emerald', gradient: 'from-emerald-600/20 via-green-600/20 to-lime-600/20' }
      } else if (title.includes('Comparatives')) {
        return { icon: '📈', color: 'lime', gradient: 'from-lime-600/20 via-green-600/20 to-emerald-600/20' }
      } else if (title.includes('Past Tense')) {
        return { icon: '⏮️', color: 'amber', gradient: 'from-amber-600/20 via-orange-600/20 to-red-600/20' }
      } else if (title.includes('Future') || title.includes('Going to')) {
        return { icon: '⏭️', color: 'sky', gradient: 'from-sky-600/20 via-blue-600/20 to-indigo-600/20' }
      } else if (title.includes('Can and Can\'t')) {
        return { icon: '💪', color: 'violet', gradient: 'from-violet-600/20 via-purple-600/20 to-fuchsia-600/20' }
      } else if (title.includes('Have and Have Got')) {
        return { icon: '✅', color: 'fuchsia', gradient: 'from-fuchsia-600/20 via-pink-600/20 to-rose-600/20' }
      } else if (title.includes('Countable')) {
        return { icon: '🔢', color: 'slate', gradient: 'from-slate-600/20 via-gray-600/20 to-zinc-600/20' }
      } else if (title.includes('Imperatives')) {
        return { icon: '⚡', color: 'red', gradient: 'from-red-600/20 via-pink-600/20 to-rose-600/20' }
      } else if (title.includes('Present Continuous')) {
        return { icon: '🔄', color: 'blue', gradient: 'from-blue-600/20 via-indigo-600/20 to-purple-600/20' }
      } else {
        return { icon: '📝', color: 'blue', gradient: 'from-blue-600/20 via-purple-600/20 to-indigo-600/20' }
      }
    }
    
    const theme = getLessonTheme(lesson.title)
    
    return (
      <div className="space-y-8">
        {/* 🌟 BEAUTIFUL LESSON HEADER */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.gradient} border border-${theme.color}-500/30 backdrop-blur-sm`}>
          <div className={`absolute inset-0 bg-gradient-to-r from-${theme.color}-600/10 to-transparent`}></div>
          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br from-${theme.color}-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{theme.icon}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{lesson.title}</h2>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 bg-${theme.color}-500/20 text-${theme.color}-300 rounded-full text-sm font-medium border border-${theme.color}-400/30`}>
                    Grammar Lesson
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium border border-green-400/30">
                    Beginner Level
                  </span>
                  {lesson.is_enhanced && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-400/30">
                      ✨ Enhanced
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* 🇸🇴 LESSON INTRODUCTION WITH SOMALI SUPPORT */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span> What You'll Learn
              </h4>
              <p className="text-blue-100 text-lg leading-relaxed mb-4">{content.explanation}</p>
              {showSomaliSupport && somalicontent.explanation && (
                <div className="mt-4 pt-4 border-t border-green-400/20">
                  <p className="text-green-300 text-lg leading-relaxed">
                    <span className="inline-flex items-center gap-2 font-semibold mb-2">
                      🇸🇴 <span>Somali Translation:</span>
                    </span>
                    <br />
                    {somalicontent.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 🎨 ENHANCED CONTENT SECTIONS FOR ALL LESSON TYPES */}
        
        {/* 📚 GRAMMAR RULES SECTION */}
        {content.rules && (
          <div className={`bg-gradient-to-br from-${theme.color}-600/10 to-indigo-600/10 backdrop-blur-sm rounded-2xl border border-${theme.color}-500/30 overflow-hidden`}>
            <div className={`bg-gradient-to-r from-${theme.color}-600/20 to-indigo-600/20 p-6 border-b border-${theme.color}-400/20`}>
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className={`w-8 h-8 bg-${theme.color}-500 rounded-lg flex items-center justify-center`}>
                  <span className="text-lg">📋</span>
                </div>
                Grammar Rules
              </h3>
              <p className={`text-${theme.color}-200 mt-2`}>Learn the fundamental rules of {lesson.title.toLowerCase()}</p>
            </div>
            
            <div className="p-6 space-y-4">
              {content.rules.map((rule, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-indigo-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">{rule}</p>
                      {showSomaliSupport && somalicontent.rules_translation?.[index] && (
                        <p className="text-green-300 text-sm mt-2 pl-4 border-l-2 border-green-400/30">
                          🇸🇴 {somalicontent.rules_translation[index]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => playAudio(`rule-${index}`, rule)}
                      className={`ml-4 p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                        audioPlaying === `rule-${index}`
                          ? `bg-${theme.color}-600 text-white shadow-lg shadow-${theme.color}-500/25`
                          : 'bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">🔊</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ❓ QUESTION WORDS SECTION */}
        {content.question_words && (
          <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-cyan-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 p-6 border-b border-cyan-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">❓</span>
                </div>
                Question Words
              </h3>
              <p className="text-cyan-200 mt-2">Master the essential question words</p>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {content.question_words.map((word, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-cyan-300 mb-2">{word.word}</h4>
                    <p className="text-gray-300 text-sm mb-2">{word.use}</p>
                    <p className="text-cyan-200 italic text-sm">"{word.example}"</p>
                    <button
                      onClick={() => playAudio(`question-${index}`, word.example)}
                      className="mt-3 p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ⏰ TIME EXPRESSIONS SECTION */}
        {content.time_expressions && (
          <div className="bg-gradient-to-br from-amber-600/10 to-orange-600/10 backdrop-blur-sm rounded-2xl border border-amber-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 p-6 border-b border-amber-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">⏰</span>
                </div>
                Time Expressions
              </h3>
              <p className="text-amber-200 mt-2">Learn when to use different time expressions</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {content.time_expressions.map((expression, index) => (
                  <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 text-center">
                    <span className="text-amber-300 font-medium">{expression}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 📝 PATTERNS SECTION */}
        {content.patterns && (
          <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/10 backdrop-blur-sm rounded-2xl border border-violet-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-6 border-b border-violet-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📝</span>
                </div>
                Sentence Patterns
              </h3>
              <p className="text-violet-200 mt-2">Master the sentence structures</p>
            </div>
            
            <div className="p-6 space-y-4">
              {content.patterns.map((pattern, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-violet-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">{pattern}</p>
                      {showSomaliSupport && somalicontent.patterns_translation?.[index] && (
                        <p className="text-green-300 text-sm mt-2 pl-4 border-l-2 border-green-400/30">
                          🇸🇴 {somalicontent.patterns_translation[index]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => playAudio(`pattern-${index}`, pattern)}
                      className="ml-4 p-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 💬 SOMALI VOCABULARY CARDS */}
        {showSomaliSupport && somalicontent.key_vocabulary && (
          <div className="bg-gradient-to-br from-green-600/10 to-emerald-600/10 backdrop-blur-sm rounded-2xl border border-green-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-6 border-b border-green-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🇸🇴</span>
                </div>
                Somali Vocabulary
              </h3>
              <p className="text-green-200 mt-2">Connect English with your native language</p>
            </div>
            
            <div className="p-6 space-y-4">
              {somalicontent.key_vocabulary.map((vocab, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-green-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-2xl font-bold text-white">{vocab.english}</span>
                        <span className="text-lg text-green-400">→</span>
                        <span className="text-xl font-semibold text-green-300">{vocab.somali}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{vocab.use}</p>
                    </div>
                    <button
                      onClick={() => playAudio(`vocab-${index}`, vocab.english)}
                      className={`ml-4 p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                        audioPlaying === `vocab-${index}`
                          ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
                          : 'bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white'
                      }`}
                    >
                      <span className="text-lg">🔊</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📱 MODERN EXAMPLES SECTION */}
        {content.modern_examples && (
          <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 backdrop-blur-sm rounded-2xl border border-emerald-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-6 border-b border-emerald-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📱</span>
                </div>
                Modern Examples
              </h3>
              <p className="text-emerald-200 mt-2">Real-world examples for today's digital world</p>
            </div>
            
            <div className="p-6 space-y-4">
              {content.modern_examples.map((example, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-emerald-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">{example}</p>
                      {showSomaliSupport && somalicontent.modern_examples_translation?.[index] && (
                        <p className="text-green-300 text-sm mt-2 pl-4 border-l-2 border-green-400/30">
                          🇸🇴 {somalicontent.modern_examples_translation[index]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => playAudio(`modern-${index}`, example)}
                      className="ml-4 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✏️ PRACTICE EXERCISES SECTION */}
        {content.practice && (
          <div className="bg-gradient-to-br from-orange-600/10 to-red-600/10 backdrop-blur-sm rounded-2xl border border-orange-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 p-6 border-b border-orange-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">✏️</span>
                </div>
                Practice Exercises
              </h3>
              <p className="text-orange-200 mt-2">Test your understanding with these exercises</p>
            </div>
            
            <div className="p-6 space-y-4">
              {content.practice.map((exercise, index) => (
                <div key={index} className="group bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-orange-400/30 transition-all duration-300 hover:bg-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-medium text-lg">{exercise}</p>
                      {showSomaliSupport && somalicontent.practice_translation?.[index] && (
                        <p className="text-green-300 text-sm mt-2 pl-4 border-l-2 border-green-400/30">
                          🇸🇴 {somalicontent.practice_translation[index]}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => playAudio(`practice-${index}`, exercise)}
                      className="ml-4 p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors"
                    >
                      🔊
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          
        {/* 🎛️ ENHANCED LESSON CONTROLS */}
        <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 🇸🇴 BEAUTIFUL SOMALI SUPPORT TOGGLE */}
              {user?.english_level === 'beginner' && lesson.content_somali && (
                <button
                  onClick={() => setShowSomaliSupport(!showSomaliSupport)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-3 ${
                    showSomaliSupport 
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25 scale-105' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gradient-to-r hover:from-green-600 hover:to-emerald-600 hover:text-white hover:shadow-lg hover:shadow-green-500/25'
                  }`}
                >
                  <span className="text-xl">🇸🇴</span>
                  <span>{showSomaliSupport ? 'Hide' : 'Show'} Somali Help</span>
                </button>
              )}
                  
              {/* Audio Speed Control */}
              {lesson.audio_content && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Speed:</span>
                  {[0.5, 1, 1.5, 2].map(speed => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-sm text-purple-400">
              ✨ Enhanced Lesson with Audio & Quiz
            </div>
          </div>
        </div>
          
        {/* 🎯 BEAUTIFUL INTERACTIVE EXAMPLES WITH PHONETIC GUIDES */}
        {content.examples && (
          <div className="bg-gradient-to-br from-cyan-600/10 to-blue-600/10 backdrop-blur-sm rounded-2xl border border-cyan-500/30 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 p-6 border-b border-cyan-400/20">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                Interactive Examples
              </h3>
              <p className="text-cyan-200 mt-2">Practice with real-life sentences</p>
            </div>
            
            <div className="p-6 space-y-6">
              {content.examples.map((example, idx) => (
                <div key={idx} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-cyan-400/30 transition-all duration-500 hover:bg-white/10">
                  {/* Example Sentence */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-2xl font-semibold text-white mb-2">{example}</p>
                      
                      {/* 🗣️ SOMALI PHONETIC GUIDE */}
                      <div className="bg-purple-600/10 rounded-xl p-4 border border-purple-400/20">
                        <h6 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
                          <span>🗣️</span> Pronunciation Guide
                        </h6>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-gray-400 text-sm mb-1">English Phonetics:</p>
                            <p className="text-blue-300 font-mono text-lg">/{example.toLowerCase().replace(/[.,!?]/g, '')}/</p>
                          </div>
                          {showSomaliSupport && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Somali Phonetics:</p>
                              <p className="text-green-300 font-mono text-lg">
                                {example.toLowerCase()
                                  .replace(/working/g, 'waarking')
                                  .replace(/friend/g, 'freend')
                                  .replace(/streaming/g, 'siriiming')
                                  .replace(/learning/g, 'laarning')
                                  .replace(/ordering/g, 'oordaring')
                                  .replace(/today/g, 'tudey')
                                  .replace(/together/g, 'tugeder')
                                  .replace(/online/g, 'onlayn')
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Audio Button */}
                    <button
                      onClick={() => playAudio(`example-${idx}`, example)}
                      className={`ml-6 p-4 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                        audioPlaying === `example-${idx}`
                          ? 'bg-cyan-600 text-white shadow-2xl shadow-cyan-500/25 scale-110'
                          : 'bg-gray-700 hover:bg-cyan-600 text-gray-300 hover:text-white hover:shadow-xl hover:shadow-cyan-500/25'
                      }`}
                    >
                      <span className="text-2xl">🔊</span>
                    </button>
                  </div>
                  
                  {/* Somali Translation */}
                  {showSomaliSupport && somalicontent.examples_translation?.[idx] && (
                    <div className="bg-green-600/10 rounded-xl p-4 border border-green-400/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-400">🇸🇴</span>
                        <h6 className="text-green-300 font-medium">Somali Translation:</h6>
                      </div>
                      <p className="text-green-200 text-lg leading-relaxed">{somalicontent.examples_translation[idx]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📊 CONFIDENCE METER */}
        <div className="bg-gradient-to-br from-violet-600/10 to-purple-600/10 backdrop-blur-sm rounded-2xl border border-violet-500/30 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 p-6 border-b border-violet-400/20">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-lg">📊</span>
              </div>
              Confidence Check
            </h3>
            <p className="text-violet-200 mt-2">How confident do you feel about {lesson.title.toLowerCase()}?</p>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <p className="text-white text-lg mb-4">Rate your confidence level:</p>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfidenceLevel(level)}
                    className={`w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center ${
                      confidenceLevel >= level
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25 scale-110'
                        : 'bg-gray-700 text-gray-400 hover:bg-violet-600 hover:text-white'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              
              {confidenceLevel > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <p className="text-violet-300 text-lg">
                    {confidenceLevel === 1 && "🌱 Just starting - that's perfectly normal!"}
                    {confidenceLevel === 2 && "🌿 Getting there - keep practicing!"}
                    {confidenceLevel === 3 && "🌸 Good progress - you're learning well!"}
                    {confidenceLevel === 4 && "🌟 Very confident - excellent work!"}
                    {confidenceLevel === 5 && "🚀 Master level - ready for the quiz!"}
                  </p>
                  {showSomaliSupport && (
                    <p className="text-green-300 text-sm mt-2">
                      🇸🇴 {confidenceLevel <= 2 ? "Waa caadi, sii wad!" : "Aad ayaad u fiican tahay!"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 💬 CONVERSATION STARTERS */}
        <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 backdrop-blur-sm rounded-2xl border border-emerald-500/30 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 p-6 border-b border-emerald-400/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Conversation Practice</h3>
                  <p className="text-emerald-200 mt-1">Practice using {lesson.title.toLowerCase()} in real conversations</p>
                </div>
              </div>
              <button
                onClick={() => setShowConversationStarters(!showConversationStarters)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
              >
                {showConversationStarters ? 'Hide' : 'Show'} Practice
              </button>
            </div>
          </div>
          
          {showConversationStarters && (
            <div className="p-6">
              {/* Dynamic Conversation Templates Based on Lesson Type */}
              {(() => {
                // Generate conversation templates based on lesson type
                let conversations = []
                
                if (lesson.title.includes('Present Tense') || lesson.title.includes('To Be')) {
                  conversations = [
                    {
                      title: "Meeting Someone New",
                      english: ["Hi, I am Sarah.", "Nice to meet you! I am Ahmed.", "I am from Somalia. Where are you from?", "I am from the United States."],
                      somali: ["Salaan, waxaan ahay Sarah.", "Waa ku mahadsantahay! Waxaan ahay Ahmed.", "Waxaan ka imid Soomaaliya. Xaggee ka timid?", "Waxaan ka imid Maraykanka."]
                    },
                    {
                      title: "Describing Yourself",
                      english: ["I am a student.", "She is very kind.", "We are learning English.", "They are my family."],
                      somali: ["Waxaan ahay arday.", "Waxay tahay qof naxariis leh.", "Waxaanu baranaynaa Ingiriiska.", "Waxay yihiin qoyskaayga."]
                    }
                  ]
                } else if (lesson.title.includes('Questions')) {
                  conversations = [
                    {
                      title: "Asking for Information",
                      english: ["What is your name?", "Where are you from?", "How are you today?", "When is your birthday?"],
                      somali: ["Magacaaga maa?", "Xaggee ka timid?", "Sidee tahay maanta?", "Goorma dhalashadaaga?"]
                    },
                    {
                      title: "Getting to Know Someone",
                      english: ["Who is your favorite teacher?", "What do you like to do?", "How is your family?", "When do you study?"],
                      somali: ["Kuma macallinkaaga ugu fiican?", "Maxaad jeceshahay inaad samayso?", "Sidee tahay qoyskaaga?", "Goorma aad barasho?"]
                    }
                  ]
                } else if (lesson.title.includes('Present Simple')) {
                  conversations = [
                    {
                      title: "Daily Routine",
                      english: ["I wake up at 7 AM.", "She works from home.", "We study English every day.", "They live in the city."],
                      somali: ["Waxaan toosaa 7 AM.", "Waxay ka shaqeysaa guriga.", "Waxaanu baranaynaa Ingiriiska maalin kasta.", "Waxay ku nool yihiin magaalada."]
                    },
                    {
                      title: "Habits and Preferences",
                      english: ["I drink coffee every morning.", "She likes social media.", "We watch movies on weekends.", "They speak Somali at home."],
                      somali: ["Waxaan cabaa shaah subax kasta.", "Waxay jeceshahay warbaahinta bulshada.", "Waxaanu daawanaynaa filimaha maalintii dambe.", "Waxay ku hadlayaan Soomaali guriga."]
                    }
                  ]
                } else if (lesson.title.includes('Articles')) {
                  conversations = [
                    {
                      title: "Shopping for Technology",
                      english: ["I need a new phone.", "She downloaded an app.", "Where is the WiFi password?", "I love social media."],
                      somali: ["Waxaan u baahanahay mobile cusub.", "Waxay soo dejisay app.", "Xaggee waa passwordka WiFi?", "Waxaan jeclahay warbaahinta bulshada."]
                    },
                    {
                      title: "Describing Things",
                      english: ["This is a good app.", "She has an honest face.", "The internet is slow today.", "I like coffee."],
                      somali: ["Tani waa app fiican.", "Waxay leedahay wajig cad.", "Internetka maanta waa gaabis.", "Waxaan jeclahay shaah."]
                    }
                  ]
                } else {
                  // Default conversation for other lesson types
                  conversations = [
                    {
                      title: "General Conversation",
                      english: ["Hello, how are you?", "I'm learning English.", "This is interesting.", "Thank you for helping."],
                      somali: ["Salaan, sidee tahay?", "Waxaan baranayaa Ingiriiska.", "Tani waa mid xiiso leh.", "Mahadsanid caawimada."]
                    },
                    {
                      title: "Learning Together",
                      english: ["Can you help me?", "I understand now.", "This is difficult.", "Let's practice together."],
                      somali: ["Ma i caawin kartaa?", "Hadda waan fahmi doonaa.", "Tani waa mid adag.", "Aan isku tijaabino."]
                    }
                  ]
                }
                
                                 return conversations.map((conversation, idx) => (
                  <div key={idx} className={`mb-6 ${currentConversation === idx ? 'block' : 'hidden'}`}>
                    <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="text-emerald-400">📞</span>
                      {conversation.title}
                    </h4>
                    
                    <div className="space-y-4">
                      {conversation.english.map((line, lineIdx) => (
                        <div key={lineIdx} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-emerald-300 text-lg font-medium">{line}</p>
                            <button
                              onClick={() => playAudio(`conversation-${idx}-${lineIdx}`, line)}
                              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                            >
                              🔊
                            </button>
                          </div>
                          
                          {showSomaliSupport && conversation.somali[lineIdx] && (
                            <p className="text-green-300 text-sm pl-4 border-l-2 border-green-400/30">
                              🇸🇴 {conversation.somali[lineIdx]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
               })()}
              
              {/* Navigation */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentConversation(0)}
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    currentConversation === 0 ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-emerald-600'
                  }`}
                >
                  Meeting People
                </button>
                <button
                  onClick={() => setCurrentConversation(1)}
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    currentConversation === 1 ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-emerald-600'
                  }`}
                >
                  Describing Yourself
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🎯 BEAUTIFUL ENHANCED QUIZ SECTION */}
        {lesson.is_enhanced && lesson.quiz_questions && (
          <div data-quiz-section className="mt-8 bg-gradient-to-br from-pink-600/10 via-purple-600/10 to-indigo-600/10 backdrop-blur-sm rounded-3xl border border-pink-500/30 overflow-hidden">
            <div className="bg-gradient-to-r from-pink-600/20 to-purple-600/20 p-8 border-b border-pink-400/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
                  <span className="text-4xl">🎯</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Mastery Quiz - 100% Required!
                  </h2>
                  <p className="text-pink-200 text-lg">
                    Prove your understanding to unlock lesson completion
                  </p>
                  {showSomaliSupport && (
                    <p className="text-green-300 text-sm mt-2">
                      🇸🇴 Su'aalaha dhammee si aad u dhammeyso casharkan!
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {quizCompleted ? (
                    <div className="px-4 py-2 bg-green-500/20 text-green-300 rounded-xl border border-green-400/30">
                      ✅ Completed
                    </div>
                  ) : (
                    <div className="px-4 py-2 bg-orange-500/20 text-orange-300 rounded-xl border border-orange-400/30">
                      ⏳ Required
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-8">
              {!currentQuiz ? (
                <div className="text-center">
                  <div className="mb-6">
                    <div className="text-6xl mb-4">🎓</div>
                                      <h3 className="text-2xl font-bold text-white mb-4">Ready for Your Quiz?</h3>
                  <p className="text-gray-300 text-lg mb-2">
                    Test your understanding of {lesson.title.toLowerCase()}
                  </p>
                    <p className="text-pink-300 font-medium">
                      You need 100% correct answers to complete this lesson
                    </p>
                    {showSomaliSupport && (
                      <p className="text-green-300 text-sm mt-3">
                        🇸🇴 Su'aal dhakhso ah ku dhammee si aad u tijaabisid waxaad baratay!
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => startQuiz(lesson)}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-purple-500/25 hover:scale-105"
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-2xl">🚀</span>
                      <span>Start Quiz / Bilaab Su'aalaha</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div>
                  {/* Beautiful Progress Header */}
                  <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold">
                            {currentQuiz.currentQuestion + 1}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            Question {currentQuiz.currentQuestion + 1} of {currentQuiz.questions.length}
                          </p>
                          <p className="text-gray-400 text-sm">
                            Need {currentQuiz.questions.length}/{currentQuiz.questions.length} correct
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-bold text-lg">
                          Score: {currentQuiz.score}/{currentQuiz.questions.length}
                        </p>
                      </div>
                    </div>
                    
                    {/* Beautiful Progress Bar */}
                    <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                        style={{width: `${((currentQuiz.currentQuestion + 1) / currentQuiz.questions.length) * 100}%`}}
                      ></div>
                    </div>
                  </div>

                  {currentQuiz.currentQuestion < currentQuiz.questions.length && (
                    <div>
                      {/* Question Card */}
                      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
                        <h3 className="text-2xl font-bold text-white mb-4">
                          {currentQuiz.questions[currentQuiz.currentQuestion].question}
                        </h3>
                        {showSomaliSupport && currentQuiz.questions[currentQuiz.currentQuestion].question_somali && (
                          <div className="bg-green-600/10 rounded-xl p-4 border border-green-400/20">
                            <p className="text-green-300 text-lg">
                              🇸🇴 {currentQuiz.questions[currentQuiz.currentQuestion].question_somali}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Answer Options */}
                      <div className="space-y-4">
                        {currentQuiz.questions[currentQuiz.currentQuestion].options.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => submitQuizAnswer(currentQuiz.currentQuestion, idx)}
                            className="group w-full p-6 text-left bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl transition-all duration-300 hover:border-purple-400/50 hover:bg-white/10 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/10"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-purple-600/20 group-hover:bg-purple-600 rounded-xl flex items-center justify-center transition-colors">
                                <span className="text-purple-300 group-hover:text-white font-bold text-lg">
                                  {String.fromCharCode(65 + idx)}
                                </span>
                              </div>
                              <span className="text-white text-lg font-medium group-hover:text-purple-200">
                                {option}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentQuiz.currentQuestion >= currentQuiz.questions.length && (
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        {quizCompleted ? '🎉' : '📚'}
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {quizCompleted ? 'Perfect Score!' : 'Try Again!'}
                      </h3>
                      <p className="text-gray-300 mb-4 text-lg">
                        Final Score: {currentQuiz.score}/{currentQuiz.questions.length}
                        {quizCompleted 
                          ? <span className="text-green-400 block text-sm mt-2">🎉 Perfect score! You can complete the lesson!</span>
                          : <span className="text-yellow-400 block text-sm mt-2">⚠️ Need {currentQuiz.questions.length}/{currentQuiz.questions.length} correct to pass</span>
                        }
                        {showSomaliSupport && (
                          <span className="text-green-300 block text-sm mt-2">
                            {quizCompleted 
                              ? "🎉 Dhibac kaamil! Casharku dhammee kartaa!"
                              : `⚠️ Waxaad u baahan tahay ${currentQuiz.questions.length}/${currentQuiz.questions.length} sax si aad u gudbatid`
                            }
                          </span>
                        )}
                      </p>
                      {!quizCompleted && (
                        <button
                          onClick={() => startQuiz(lesson)}
                          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl shadow-purple-500/25 hover:scale-105"
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-2xl">🔄</span>
                            <span>Try Again / Mar kale isku day</span>
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lesson Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-700 space-y-3 sm:space-y-0">
          <button
            onClick={() => setSelectedLesson(null)}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors order-2 sm:order-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-white text-sm sm:text-base">Back to Lessons</span>
          </button>
          
          <button
            onClick={() => completeLesson(lesson)}
            disabled={loading || (lesson.is_enhanced && lesson.quiz_questions && !quizCompleted)}
            className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 order-1 sm:order-2 ${
              lesson.is_enhanced && lesson.quiz_questions && !quizCompleted
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                : loading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25 hover:scale-105'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Completing...</span>
              </>
            ) : lesson.is_enhanced && lesson.quiz_questions && !quizCompleted ? (
              <>
                <span className="text-xl">🔒</span>
                <span>Complete Quiz First</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Complete Lesson</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // 🚀 PERFORMANCE FIX 3: Memoize level info and lesson filtering (MOVED TO TOP)
  const levelInfo = useMemo(() => getLevelInfo(user?.english_level), [user?.english_level])
  
  const { grammarLessons, vocabularyLessons } = useMemo(() => {
    console.log('📊 Filtering lessons (memoized):', lessons.length)
    const startTime = performance.now()
    
    const result = {
      grammarLessons: lessons.filter(l => l.type === 'grammar'),
      vocabularyLessons: lessons.filter(l => l.type === 'vocabulary'),
    }
    
    const endTime = performance.now()
    console.log(`⚡ Lesson filtering completed in ${Math.round(endTime - startTime)}ms`)
    console.log(`📈 Grammar: ${result.grammarLessons.length}, Vocabulary: ${result.vocabularyLessons.length}`)
    
    return result
  }, [lessons])

  // 🚀 PERFORMANCE FIX 4: Pre-calculate lesson progress states (MOVED TO TOP)
  const lessonProgressMap = useMemo(() => {
    console.log('📊 Pre-calculating lesson progress (memoized)...')
    const startTime = performance.now()
    
    const map = {}
    
    // Pre-calculate for grammar lessons
    grammarLessons.forEach((lesson, index) => {
      const progress = userProgress[lesson.id]
      const isCompleted = progress?.is_completed
      const isLocked = index > 0 && !userProgress[grammarLessons[index - 1]?.id]?.is_completed
      
      map[lesson.id] = { progress, isCompleted, isLocked, index, type: 'grammar' }
    })
    
    // Pre-calculate for vocabulary lessons  
    vocabularyLessons.forEach((lesson, index) => {
      const progress = userProgress[lesson.id]
      const isCompleted = progress?.is_completed
      const isLocked = index > 0 && !userProgress[vocabularyLessons[index - 1]?.id]?.is_completed
      
      map[lesson.id] = { progress, isCompleted, isLocked, index, type: 'vocabulary' }
    })
    
    const endTime = performance.now()
    console.log(`⚡ Progress calculations completed in ${Math.round(endTime - startTime)}ms`)
    
    return map
  }, [grammarLessons, vocabularyLessons, userProgress])

  // 🔧 LOADING SCREEN: Moved after all hooks to prevent hook order violation
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header - Responsive */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Link
                to="/"
                className="flex items-center space-x-1 sm:space-x-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:block">Dashboard</span>
                <span className="sm:hidden text-sm">Back</span>
              </Link>
              
              <div className="h-4 sm:h-6 w-px bg-gray-600 hidden xs:block"></div>
              
              <div className="flex items-center space-x-2 min-w-0">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 flex-shrink-0" />
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-white truncate">
                  <span className="hidden sm:inline">Casharrada</span>
                  <span className="sm:hidden">Lessons</span>
                  <span className="hidden lg:inline"> (Phrases Coming Soon)</span>
                </h1>
              </div>
            </div>
            
            {/* Right Section - Level Badge */}
            <div className={`px-2 sm:px-4 py-1 sm:py-2 rounded-full border ${levelInfo.bg} flex-shrink-0`}>
              <span className={`text-xs sm:text-sm font-medium ${levelInfo.color}`}>
                <span className="hidden sm:inline">{levelInfo.title}</span>
                <span className="sm:hidden">
                  {user?.english_level === 'beginner' ? 'Beg' : 
                   user?.english_level === 'intermediate' ? 'Int' : 'Adv'}
                </span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {completionMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-pulse">
            <p className="text-green-400 text-center font-medium whitespace-pre-line">{completionMessage}</p>
          </div>
        )}

        {selectedLesson ? (
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-700">
            {renderLessonContent(selectedLesson)}
          </div>
        ) : (
          <>
            {/* Level Info - Responsive */}
            <div className={`rounded-xl p-4 sm:p-6 border mb-6 sm:mb-8 ${levelInfo.bg}`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex-1 min-w-0">
                  <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${levelInfo.color}`}>
                    {levelInfo.title}
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{levelInfo.description}</p>
                </div>
                <Award className={`h-10 w-10 sm:h-12 sm:w-12 ${levelInfo.color} flex-shrink-0`} />
              </div>
            </div>

            {/* Lesson Type Tabs - Responsive */}
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-6 sm:mb-8">
              {[
                { key: 'grammar', label: 'Grammar', icon: '📝', shortLabel: 'Grammar' },
                { key: 'vocabulary', label: 'Vocabulary', icon: '📚', shortLabel: 'Vocab' }
                // TEMPORARILY HIDDEN: Phrases lessons will be restored later
                // { key: 'phrases', label: 'Phrases', icon: '💬', shortLabel: 'Phrases' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    // 🚀 PERFORMANCE FIX 6: Monitor tab switch performance
                    console.log(`🔄 Switching to ${tab.key} tab...`)
                    const startTime = performance.now()
                    setActiveTab(tab.key)
                    requestAnimationFrame(() => {
                      const endTime = performance.now()
                      console.log(`⚡ Tab switch to ${tab.key} completed in ${Math.round(endTime - startTime)}ms`)
                    })
                  }}
                  className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-4 rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span className="text-sm sm:text-base">{tab.icon}</span>
                  <span className="font-medium text-sm sm:text-base">
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Lessons Grid - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {(activeTab === 'grammar' ? grammarLessons : vocabularyLessons).map((lesson) => {
                // 🚀 PERFORMANCE FIX 5: Use pre-calculated progress data
                const progressData = lessonProgressMap[lesson.id]
                const { progress, isCompleted, isLocked } = progressData || {}
                const index = progressData?.index || 0

                return (
                  <div
                    key={lesson.id}
                    className={`bg-gray-800 rounded-xl p-4 sm:p-6 border transition-all ${
                      isLocked
                        ? 'border-gray-700 opacity-50'
                        : isCompleted
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-gray-700 hover:border-gray-600 cursor-pointer'
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
                            <span className="text-lg sm:text-xl">📝</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-white leading-tight truncate">
                            {lesson.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-400 capitalize mt-1">
                            {lesson.type} • Lesson {lesson.order_index}
                          </p>
                        </div>
                      </div>
                      
                      {!isLocked && !isCompleted && (
                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 ml-2" />
                      )}
                    </div>

                    {progress?.completion_date && (
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-green-400">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span className="truncate">
                          Completed {new Date(progress.completion_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {isLocked && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                        Complete previous lesson to unlock
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress Summary - Responsive */}
            <div className="mt-8 sm:mt-12 bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4 text-center sm:text-left">Your Progress</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                    {Object.values(userProgress).filter(p => p.is_completed).length}
                  </div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">Lessons Completed</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-green-400">
                    {Math.round((Object.values(userProgress).filter(p => p.is_completed).length / lessons.length) * 100) || 0}%
                  </div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">Course Progress</div>
                </div>
                <div className="text-center p-4 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
                    {user?.current_streak || 0}
                  </div>
                  <div className="text-sm sm:text-base text-gray-400 mt-1">Day Streak</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}