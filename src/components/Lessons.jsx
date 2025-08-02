import { useState, useEffect } from 'react'
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
  const [activeTab, setActiveTab] = useState('grammar') // Default to grammar since phrases are temporarily hidden
  const [completionMessage, setCompletionMessage] = useState('')
  
  // NEW: Enhanced lesson features
  const [showSomaliSupport, setShowSomaliSupport] = useState(false)
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  useEffect(() => {
    if (user) {
      fetchLessons()
      fetchUserProgress()
    }
  }, [user])

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('level', user.english_level)
        .eq('is_active', true)
        .order('order_index')

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
  }

  const fetchUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_lesson_progress')
        .select('lesson_id, is_completed, completion_date, time_spent')
        .eq('user_id', user.id)

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
  }

  // NEW: Audio control functions with REAL speech
  const playAudio = (audioId, text) => {
    if (audioPlaying === audioId) {
      // Stop current audio
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setAudioPlaying(null)
      return
    }
    
    // Use Web Speech API for real audio
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Stop any previous speech
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = playbackSpeed
      utterance.pitch = 1
      utterance.volume = 1
      
      // Try to use English voice
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

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed)
  }

  // NEW: Quiz handling functions
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

  const submitQuizAnswer = (questionIndex, selectedAnswer) => {
    const newAnswers = { ...quizAnswers }
    newAnswers[questionIndex] = selectedAnswer
    setQuizAnswers(newAnswers)

    const question = currentQuiz.questions[questionIndex]
    const isCorrect = selectedAnswer === question.correct_answer
    
    // Show immediate feedback
    const feedback = isCorrect 
      ? `✅ Correct! ${question.explanation}` 
      : `❌ Wrong! ${question.explanation}`
    
    const somaliFeedback = showSomaliSupport 
      ? (isCorrect 
          ? `✅ Sax! ${question.explanation_somali || question.explanation}` 
          : `❌ Qalad! ${question.explanation_somali || question.explanation}`)
      : ''
    
    alert(`${feedback}\n\n${somaliFeedback}`)
    
    if (isCorrect) {
      setCurrentQuiz(prev => ({ ...prev, score: prev.score + 1 }))
    }

    // Move to next question or complete quiz
    setTimeout(() => {
      if (questionIndex < currentQuiz.questions.length - 1) {
        setCurrentQuiz(prev => ({ ...prev, currentQuestion: questionIndex + 1 }))
      } else {
        // Quiz completed
        const finalScore = currentQuiz.score + (isCorrect ? 1 : 0)
        const passed = finalScore === 3 // Need 3/3 to pass (perfect score)
        
        if (passed) {
          setQuizCompleted(true)
          setCompletionMessage(`🎉 Perfect! All 3 correct! You can complete the lesson now!`)
        } else {
          setCompletionMessage(`📚 You need 3/3 correct to pass. Score: ${finalScore}/3. Try again!`)
          setTimeout(() => {
            setCurrentQuiz(null)
            setQuizAnswers({})
          }, 3000)
        }
      }
    }, 1500) // Small delay after feedback
  }

  const startLesson = async (lesson) => {
    console.log('📖 Starting lesson:', lesson.title, 'Type:', lesson.type)
    setSelectedLesson(lesson)
    
    // NEW: Auto-enable Somali support for beginners
    if (user?.english_level === 'beginner' && lesson.content_somali) {
      setShowSomaliSupport(true)
    } else {
      setShowSomaliSupport(false)
    }
    
    // NEW: Start quiz if lesson has enhanced features
    if (lesson.is_enhanced && lesson.quiz_questions) {
      setTimeout(() => {
        startQuiz(lesson)
      }, 1000) // Start quiz after 1 second
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
      
      // NEW: Check if quiz is required and completed
      if (lesson.is_enhanced && lesson.quiz_questions && !quizCompleted) {
        alert('🚫 Please complete the quiz with 3/3 correct answers first!\n\n🇸🇴 Su\'aalaha dhammee oo 3/3 sax ka hel marka hore!')
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

  const getLessonIcon = (type) => {
    switch (type) {
      case 'grammar': return '📝'
      case 'vocabulary': return '📚'
      case 'phrases': return '💬'
      default: return '📖'
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

  const renderLessonContent = (lesson) => {
    const content = lesson.content
    
    // DEBUG: Log the lesson content to see what's causing the issue
    console.log('🔍 Rendering lesson:', lesson.title, 'Content:', JSON.stringify(content, null, 2))
    
    return (
      <div className="space-y-6">
        <div className="prose prose-invert max-w-none">
          <h3 className="text-2xl font-bold text-white mb-4">{lesson.title} - v3.0 FIXED</h3>
          
          {/* NEW: Enhanced lesson controls */}
          {lesson.is_enhanced && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Somali Support Toggle for Beginners */}
                  {user?.english_level === 'beginner' && lesson.content_somali && (
                    <button
                      onClick={() => setShowSomaliSupport(!showSomaliSupport)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        showSomaliSupport 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      🇸🇴 {showSomaliSupport ? 'Hide' : 'Show'} Somali Help
                    </button>
                  )}
                  
                  {/* Audio Speed Control */}
                  {lesson.audio_content && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Speed:</span>
                      {[0.5, 1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
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
          )}
          
          {/* Handle different content structures based on lesson type */}
          {lesson.type === 'grammar' && (
            <div>
              {content.explanation && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="text-lg font-medium text-blue-400">Explanation</h5>
                    <button
                      onClick={() => playAudio('explanation', content.explanation)}
                      className={`p-2 rounded-md transition-colors ${
                        audioPlaying === 'explanation'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                      }`}
                    >
                      🔊
                    </button>
                  </div>
                  <p className="text-blue-100">{content.explanation}</p>
                  
                  {/* NEW: Somali translation for beginners */}
                  {showSomaliSupport && lesson.content_somali?.explanation && (
                    <div className="mt-4 pt-4 border-t border-blue-400/20">
                      <p className="text-green-300 text-sm">
                        🇸🇴 <strong>Somali:</strong> {lesson.content_somali.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {content.rules && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Grammar Rules</h4>
                  <ul className="space-y-2">
                    {content.rules.map((rule, idx) => (
                      <li key={idx} className="text-gray-300">• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}

              {content.examples && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-white mb-2">Examples:</h5>
                  <ul className="space-y-3">
                    {content.examples.map((example, idx) => (
                      <li key={idx} className="flex items-center justify-between">
                        <span className="text-blue-400">{example}</span>
                        <button
                          onClick={() => playAudio(`example-${idx}`, example)}
                          className={`ml-2 p-1 rounded transition-colors ${
                            audioPlaying === `example-${idx}`
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                          }`}
                        >
                          🔊
                        </button>
                      </li>
                    ))}
                  </ul>
                  
                  {/* NEW: Somali translations for examples */}
                  {showSomaliSupport && lesson.content_somali?.examples_translation && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <h6 className="text-sm font-medium text-green-400 mb-2">🇸🇴 Somali Translations:</h6>
                      <ul className="space-y-2">
                        {lesson.content_somali.examples_translation.map((translation, idx) => (
                          <li key={idx} className="text-green-300 text-sm">• {translation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {content.practice && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-green-400 mb-2">Practice:</h5>
                  <ul className="space-y-2">
                    {content.practice.map((practice, idx) => (
                      <li key={idx} className="text-gray-300">{practice}</li>
                    ))}
                  </ul>
                </div>
              )}

              {content.patterns && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-purple-400 mb-2">Patterns:</h5>
                  <ul className="space-y-2">
                    {content.patterns.map((pattern, idx) => (
                      <li key={idx} className="text-purple-300">• {pattern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {content.question_words && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-yellow-400 mb-2">Question Words:</h5>
                  <div className="grid gap-3">
                    {content.question_words.map((word, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-3">
                        <h6 className="text-white font-medium">{word.word}</h6>
                        <p className="text-gray-400 text-sm">{word.use}</p>
                        <p className="text-yellow-400 italic text-sm">"{word.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.time_expressions && lesson.type === 'grammar' && (
                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-cyan-400 mb-2">Time Expressions:</h5>
                  <ul className="space-y-2">
                    {content.time_expressions.map((expression, idx) => (
                      <li key={idx} className="text-cyan-300">• {expression}</li>
                    ))}
                  </ul>
                </div>
              )}

              {content.structure && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-orange-400 mb-2">Structure:</h5>
                  <p className="text-orange-300 font-mono">{content.structure}</p>
                </div>
              )}

              {content.vs_past_simple && (
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-pink-400 mb-2">Comparison:</h5>
                  <p className="text-pink-300">{content.vs_past_simple}</p>
                </div>
              )}

              {content.irregular_note && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <h5 className="text-lg font-medium text-red-400 mb-2">Important Note:</h5>
                  <p className="text-red-300">{content.irregular_note}</p>
                </div>
              )}

              {content.will_uses && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Using "Will"</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.will_uses.map((use, idx) => (
                        <li key={idx} className="text-blue-400">• {use}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.going_to_uses && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Using "Going to"</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.going_to_uses.map((use, idx) => (
                        <li key={idx} className="text-green-400">• {use}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {lesson.type === 'vocabulary' && (
            <div>
              {content.topic && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-blue-100">{content.topic}</p>
                </div>
              )}

              {content.vocabulary && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Vocabulary</h4>
                  <div className="grid gap-4">
                    {content.vocabulary.map((word, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-white">{word.word}</h5>
                        <p className="text-gray-400 text-sm">{word.meaning}</p>
                        <p className="text-blue-400 italic mt-2">"{word.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.dialogues && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-green-400 mb-2">Sample Dialogues:</h5>
                  {content.dialogues.map((dialogue, idx) => (
                    <div key={idx} className="mb-4">
                      <p className="text-gray-300"><strong>Person 1:</strong> {dialogue.person1}</p>
                      <p className="text-gray-300"><strong>Person 2:</strong> {dialogue.person2}</p>
                    </div>
                  ))}
                </div>
              )}

              {content.phrases && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h5 className="text-lg font-medium text-yellow-400 mb-2">Useful Phrases:</h5>
                  <ul className="space-y-2">
                    {content.phrases.map((phrase, idx) => (
                      <li key={idx} className="text-gray-300">• {phrase}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {lesson.type === 'phrases' && (
            <div>
              {/* TEMP: Add try-catch to identify exact error location */}
              {(() => {
                try {
                  return (
                    <div>
              {content.topic && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-6">
                  <p className="text-purple-100">{content.topic}</p>
                </div>
              )}

              {content.explanation && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-blue-100">{content.explanation}</p>
                </div>
              )}

              {/* Handle phrases array - check if it's array of strings or objects */}
              {content.phrases && Array.isArray(content.phrases) && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Key Phrases</h4>
                  <div className="grid gap-4">
                    {content.phrases.map((phraseItem, idx) => {
                      // Handle both string and object phrase formats
                      const isObject = typeof phraseItem === 'object' && phraseItem !== null
                      const phraseText = isObject ? phraseItem.phrase : phraseItem
                      
                      return (
                        <div key={idx} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="text-lg font-medium text-purple-400">{String(phraseText || '')}</h5>
                            <button
                              onClick={() => playAudio(`phrase-${idx}`, String(phraseText || ''))}
                              className={`p-2 rounded-md transition-colors ${
                                audioPlaying === `phrase-${idx}`
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                              }`}
                            >
                              🔊
                            </button>
                          </div>
                          {isObject && phraseItem.use && <p className="text-gray-400 text-sm mb-2">{String(phraseItem.use)}</p>}
                          {isObject && phraseItem.response && <p className="text-green-400 text-sm mb-2"><strong>Response:</strong> {String(phraseItem.response)}</p>}
                          {isObject && phraseItem.example && <p className="text-blue-400 italic">"{String(phraseItem.example)}"</p>}
                        
                          {/* NEW: Real scenarios */}
                          {isObject && phraseItem.real_scenarios && Array.isArray(phraseItem.real_scenarios) && (
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <h6 className="text-sm font-medium text-cyan-400 mb-2">Real-life scenarios:</h6>
                              <ul className="space-y-1">
                                {phraseItem.real_scenarios.map((scenario, sIdx) => (
                                  <li key={sIdx} className="text-cyan-300 text-sm">• {String(scenario || '')}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* NEW: Cultural context */}
                          {isObject && phraseItem.cultural_context && (
                            <div className="mt-3 pt-3 border-t border-gray-600">
                              <p className="text-yellow-300 text-sm">
                                <strong>💡 Cultural tip:</strong> {String(phraseItem.cultural_context)}
                              </p>
                            </div>
                          )}

                          {/* NEW: Somali translation for beginners */}
                          {showSomaliSupport && lesson.content_somali?.phrases_translation && lesson.content_somali.phrases_translation[idx] && (
                            <div className="mt-3 pt-3 border-t border-green-400/20">
                              <p className="text-green-300 text-sm">
                                <strong>🇸🇴 Somali:</strong> {lesson.content_somali.phrases_translation[idx].example_somali || lesson.content_somali.phrases_translation[idx].use}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Handle advanced phrases structures */}
              {content.presenting_arguments && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Presenting Arguments</h4>
                  <div className="grid gap-4">
                    {content.presenting_arguments.map((item, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-purple-400">{item.phrase}</h5>
                        <p className="text-gray-400 text-sm mb-2">{item.use}</p>
                        <p className="text-blue-400 italic">"{item.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.counterarguments && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Counterarguments</h4>
                  <div className="grid gap-4">
                    {content.counterarguments.map((item, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-red-400">{item.phrase}</h5>
                        <p className="text-blue-400 italic">"{item.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.introducing_topics && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Introducing Topics</h4>
                  <div className="grid gap-4">
                    {content.introducing_topics.map((item, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-green-400">{item.phrase}</h5>
                        <p className="text-gray-400 text-sm mb-2">{item.use}</p>
                        <p className="text-blue-400 italic">"{item.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.supporting_arguments && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Supporting Arguments</h4>
                  <div className="grid gap-4">
                    {content.supporting_arguments.map((item, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-yellow-400">{item.phrase}</h5>
                        <p className="text-gray-400 text-sm mb-2">{item.use}</p>
                        <p className="text-blue-400 italic">"{item.example}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.concluding && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Concluding Phrases</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.concluding.map((phrase, idx) => (
                        <li key={idx} className="text-orange-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.agreeing && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Expressing Agreement</h4>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.agreeing.map((phrase, idx) => (
                        <li key={idx} className="text-green-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.disagreeing && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Expressing Disagreement</h4>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.disagreeing.map((phrase, idx) => (
                        <li key={idx} className="text-red-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.polite_expressions && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Polite Expressions</h4>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.polite_expressions.map((phrase, idx) => (
                        <li key={idx} className="text-blue-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.responses && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Common Responses</h4>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.responses.map((phrase, idx) => (
                        <li key={idx} className="text-yellow-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.time_expressions && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Time Expressions</h4>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.time_expressions.map((phrase, idx) => (
                        <li key={idx} className="text-cyan-400">• {phrase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* NEW: Enhanced phrases content structures - Updated */}
              {content.money_vocabulary && Array.isArray(content.money_vocabulary) && content.money_vocabulary.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Money Vocabulary</h4>
                  <div className="grid gap-4">
                    {content.money_vocabulary.map((item, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-green-400">{String(item.term || '')}</h5>
                        <p className="text-gray-400 text-sm mb-2">{String(item.meaning || '')}</p>
                        <p className="text-blue-400 italic">"{String(item.example || '')}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.shopping_tips && Array.isArray(content.shopping_tips) && content.shopping_tips.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Shopping Tips</h4>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.shopping_tips.map((tip, idx) => (
                        <li key={idx} className="text-yellow-400">• {String(tip || '')}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.situations && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Common Situations</h4>
                  <div className="grid gap-4">
                    {content.situations.map((situation, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        <h5 className="text-lg font-medium text-cyan-400">{situation.situation || situation}</h5>
                        {situation.polite_phrases && (
                          <div className="mt-3">
                            <ul className="space-y-1">
                              {situation.polite_phrases.map((phrase, pIdx) => (
                                <li key={pIdx} className="text-gray-300 text-sm">• {phrase}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.cultural_tips && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Cultural Tips</h4>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.cultural_tips.map((tip, idx) => (
                        <li key={idx} className="text-purple-400">• {tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.helpful_responses && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Common Responses</h4>
                  <div className="grid gap-4">
                    {content.helpful_responses.map((response, idx) => (
                      <div key={idx} className="bg-gray-800 rounded-lg p-4">
                        {response.positive && (
                          <div className="mb-2">
                            <span className="text-green-400 font-medium">{response.positive}</span>
                            <p className="text-gray-400 text-sm">{response.meaning}</p>
                          </div>
                        )}
                        {response.polite_decline && (
                          <div className="mb-2">
                            <span className="text-yellow-400 font-medium">{response.polite_decline}</span>
                            <p className="text-gray-400 text-sm">{response.meaning}</p>
                          </div>
                        )}
                        {response.redirect && (
                          <div className="mb-2">
                            <span className="text-blue-400 font-medium">{response.redirect}</span>
                            <p className="text-gray-400 text-sm">{response.meaning}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {content.help_seeking_strategies && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Help Seeking Strategies</h4>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.help_seeking_strategies.map((strategy, idx) => (
                        <li key={idx} className="text-green-400">• {strategy}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.common_help_needs && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Common Help Needs</h4>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.common_help_needs.map((need, idx) => (
                        <li key={idx} className="text-blue-400">• {need}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {content.family_scenarios && Array.isArray(content.family_scenarios) && (
                <div className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">Family Scenarios</h4>
                  <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
                    <ul className="space-y-2">
                      {content.family_scenarios.map((scenario, idx) => (
                        <li key={idx} className="text-pink-400">• {String(scenario || '')}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
                    </div>
                  )
                } catch (error) {
                  console.error('🚨 Error rendering phrases lesson:', error)
                  return <div className="text-red-400 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <h4>Error loading lesson content</h4>
                    <p>Check console for details</p>
                  </div>
                }
              })()}
            </div>
          )}

          {/* Handle advanced grammar structures */}
          {lesson.type === 'grammar' && content.types && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Grammar Types</h4>
              <div className="grid gap-4">
                {content.types.map((type, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-purple-400">{type.name}</h5>
                    <p className="text-gray-400 text-sm mb-2">{type.use}</p>
                    {type.structure && <p className="text-yellow-400 text-sm mb-2"><strong>Structure:</strong> {type.structure}</p>}
                    {type.example && <p className="text-blue-400 italic">"{type.example}"</p>}
                    {type.examples && (
                      <div className="mt-2">
                        {type.examples.map((example, exIdx) => (
                          <p key={exIdx} className="text-blue-400 italic text-sm">"{example}"</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.forms && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Forms</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.forms.map((form, idx) => (
                    <li key={idx} className="text-green-400">• {form}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.uses && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Uses</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.uses.map((use, idx) => (
                    <li key={idx} className="text-yellow-400">• {use}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.tense_changes && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Tense Changes</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.tense_changes.map((change, idx) => (
                    <li key={idx} className="text-cyan-400">• {change}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.time_changes && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Time Changes</h4>
              <div className="bg-gray-800 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.time_changes.map((change, idx) => (
                    <li key={idx} className="text-pink-400">• {change}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.advanced_patterns && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Advanced Patterns</h4>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.advanced_patterns.map((pattern, idx) => (
                    <li key={idx} className="text-red-400">• {pattern}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Handle vocabulary structures */}
          {lesson.type === 'vocabulary' && content.colors && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Colors</h4>
              <div className="grid gap-4">
                {content.colors.map((color, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{color.word}</h5>
                    <p className="text-gray-400 text-sm">{color.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{color.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.numbers && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Numbers</h4>
              <div className="grid gap-4">
                {content.numbers.map((number, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{number.word}</h5>
                    <p className="text-gray-400 text-sm">{number.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{number.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.food && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Food</h4>
              <div className="grid gap-4">
                {content.food.map((food, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{food.word}</h5>
                    <p className="text-gray-400 text-sm">{food.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{food.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.drinks && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Drinks</h4>
              <div className="grid gap-4">
                {content.drinks.map((drink, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{drink.word}</h5>
                    <p className="text-gray-400 text-sm">{drink.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{drink.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.basic_emotions && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Basic Emotions</h4>
              <div className="grid gap-4">
                {content.basic_emotions.map((emotion, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{emotion.word}</h5>
                    <p className="text-gray-400 text-sm">{emotion.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{emotion.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.advanced_emotions && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Advanced Emotions</h4>
              <div className="grid gap-4">
                {content.advanced_emotions.map((emotion, idx) => (
                  <div key={idx} className="bg-gray-800 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white">{emotion.word}</h5>
                    <p className="text-gray-400 text-sm">{emotion.meaning}</p>
                    <p className="text-blue-400 italic mt-2">"{emotion.example}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.expressions && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Expressions</h4>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.expressions.map((expression, idx) => (
                    <li key={idx} className="text-yellow-400">• {expression}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.useful_phrases && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Useful Phrases</h4>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.useful_phrases.map((phrase, idx) => (
                    <li key={idx} className="text-green-400">• {phrase}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.professional_phrases && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Professional Phrases</h4>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.professional_phrases.map((phrase, idx) => (
                    <li key={idx} className="text-blue-400">• {phrase}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.transitions && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Transition Words</h4>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.transitions.map((transition, idx) => (
                    <li key={idx} className="text-purple-400">• {transition}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {content.money_vocabulary && (
            <div className="mb-8">
              <h4 className="text-xl font-semibold text-white mb-3">Money Vocabulary</h4>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <ul className="space-y-2">
                  {content.money_vocabulary.map((word, idx) => (
                    <li key={idx} className="text-green-400">• {word}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Fallback for other lesson types or old content structure */}
          {!['grammar', 'vocabulary', 'phrases'].includes(lesson.type) && content.sections && (
            <div>
              {content.sections.map((section, index) => (
                <div key={index} className="mb-8">
                  <h4 className="text-xl font-semibold text-white mb-3">{section.title}</h4>
                  
                  {section.explanation && (
                    <p className="text-gray-300 mb-4">{section.explanation}</p>
                  )}

                  {section.examples && (
                    <div className="bg-gray-800 rounded-lg p-4 mb-4">
                      <h5 className="text-lg font-medium text-white mb-2">Examples:</h5>
                      <ul className="space-y-2">
                        {section.examples.map((example, idx) => (
                          <li key={idx} className="text-gray-300">
                            <span className="text-blue-400">{example.english}</span>
                            {example.meaning && (
                              <span className="text-gray-400 ml-2">- {example.meaning}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {section.practice && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h5 className="text-lg font-medium text-green-400 mb-2">Practice:</h5>
                      <p className="text-gray-300">{section.practice}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEW: Quiz Section for Enhanced Lessons */}
        {lesson.is_enhanced && lesson.quiz_questions && (
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
            <h4 className="text-xl font-bold text-white mb-4">
              📚 Quick Quiz - Test Your Knowledge!
              {showSomaliSupport && <span className="text-sm text-green-400 block">Su'aalaha dhakhso ah - Aqoontaada tijaabiyo!</span>}
            </h4>
            
            {!currentQuiz ? (
              <div className="text-center">
                <p className="text-gray-300 mb-4">
                  Complete a quick quiz to test what you learned!
                  {showSomaliSupport && <span className="text-green-300 block text-sm">Su'aal dhakhso ah ku dhammee si aad u tijaabisid waxaad baratay!</span>}
                </p>
                <button
                  onClick={() => startQuiz(lesson)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  Start Quiz / Bilaab Su'aalaha
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">
                      Question {currentQuiz.currentQuestion + 1} of {currentQuiz.questions.length}
                    </span>
                    <span className="text-sm text-green-400">
                      Score: {currentQuiz.score}/{currentQuiz.questions.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{width: `${((currentQuiz.currentQuestion + 1) / currentQuiz.questions.length) * 100}%`}}
                    ></div>
                  </div>
                </div>

                {currentQuiz.currentQuestion < currentQuiz.questions.length && (
                  <div>
                    <div className="mb-6">
                      <h5 className="text-lg font-medium text-white mb-2">
                        {currentQuiz.questions[currentQuiz.currentQuestion].question}
                      </h5>
                      {showSomaliSupport && currentQuiz.questions[currentQuiz.currentQuestion].question_somali && (
                        <p className="text-green-300 text-sm mb-3">
                          🇸🇴 {currentQuiz.questions[currentQuiz.currentQuestion].question_somali}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      {currentQuiz.questions[currentQuiz.currentQuestion].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => submitQuizAnswer(currentQuiz.currentQuestion, idx)}
                          className="w-full p-3 text-left bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
                        >
                          <span className="text-white font-medium">{String.fromCharCode(65 + idx)})</span>
                          <span className="text-gray-300 ml-2">{option}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentQuiz.currentQuestion >= currentQuiz.questions.length && (
                  <div className="text-center">
                    <div className="text-2xl mb-4">
                      {quizCompleted ? '🎉' : '📚'}
                    </div>
                    <h5 className="text-lg font-bold text-white mb-2">
                      {quizCompleted ? 'Quiz Completed!' : 'Try Again!'}
                    </h5>
                    <p className="text-gray-300 mb-4">
                      Final Score: {currentQuiz.score}/{currentQuiz.questions.length}
                      {quizCompleted 
                        ? <span className="text-green-400 block text-sm">🎉 Perfect score! You can complete the lesson!</span>
                        : <span className="text-yellow-400 block text-sm">⚠️ Need 3/3 correct to pass</span>
                      }
                      {showSomaliSupport && (
                        <span className="text-green-300 block text-sm">
                          {quizCompleted 
                            ? "🎉 Dhibac kaamil! Casharku dhammee kartaa!"
                            : "⚠️ Waxaad u baahan tahay 3/3 sax si aad u gudbatid"
                          }
                        </span>
                      )}
                    </p>
                    {!quizCompleted && (
                      <button
                        onClick={() => startQuiz(lesson)}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Try Again / Mar kale isku day
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-gray-700">
          <button
            onClick={() => setSelectedLesson(null)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-white">Back to Lessons</span>
          </button>
          
          <button
            onClick={() => completeLesson(lesson)}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-white">Completing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span className="text-white">Complete Lesson</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const levelInfo = getLevelInfo(user?.english_level)
  const grammarLessons = lessons.filter(l => l.type === 'grammar')
  const vocabularyLessons = lessons.filter(l => l.type === 'vocabulary')
  // TEMPORARILY HIDDEN: Phrases lessons will be restored later
  // const phraseLessons = lessons.filter(l => l.type === 'phrases')

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
              <BookOpen className="h-6 w-6 text-blue-500" />
              <h1 className="text-xl font-bold text-white">Casharrada (Phrases Coming Soon)</h1>
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
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg animate-pulse">
            <p className="text-green-400 text-center font-medium">{completionMessage}</p>
          </div>
        )}

        {selectedLesson ? (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            {renderLessonContent(selectedLesson)}
          </div>
        ) : (
          <>
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

            {/* Lesson Type Tabs */}
            <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg mb-8">
              {[
                { key: 'grammar', label: 'Grammar', icon: '📝' },
                { key: 'vocabulary', label: 'Vocabulary', icon: '📚' }
                // TEMPORARILY HIDDEN: Phrases lessons will be restored later
                // { key: 'phrases', label: 'Phrases', icon: '💬' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Lessons Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === 'grammar' ? grammarLessons : vocabularyLessons).map((lesson, index) => {
                const currentLessons = activeTab === 'grammar' ? grammarLessons : vocabularyLessons
                const progress = userProgress[lesson.id]
                const isCompleted = progress?.is_completed
                const isLocked = index > 0 && !userProgress[currentLessons[index - 1]?.id]?.is_completed

                return (
                  <div
                    key={lesson.id}
                    className={`bg-gray-800 rounded-xl p-6 border transition-all ${
                      isLocked
                        ? 'border-gray-700 opacity-50'
                        : isCompleted
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-gray-700 hover:border-gray-600 cursor-pointer'
                    }`}
                    onClick={() => !isLocked && startLesson(lesson)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          isCompleted ? 'bg-green-500/20' : 'bg-gray-700'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="h-6 w-6 text-green-400" />
                          ) : isLocked ? (
                            <Lock className="h-6 w-6 text-gray-500" />
                          ) : (
                            <span className="text-xl">{getLessonIcon(lesson.type)}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-gray-400 capitalize">
                            {lesson.type} • Lesson {lesson.order_index}
                          </p>
                        </div>
                      </div>
                      
                      {!isLocked && !isCompleted && (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    {progress?.completion_date && (
                      <div className="flex items-center space-x-2 text-sm text-green-400">
                        <Clock className="h-4 w-4" />
                        <span>
                          Completed {new Date(progress.completion_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {isLocked && (
                      <p className="text-sm text-gray-500 mt-2">
                        Complete previous lesson to unlock
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress Summary */}
            <div className="mt-12 bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">Your Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {Object.values(userProgress).filter(p => p.is_completed).length}
                  </div>
                  <div className="text-gray-400">Lessons Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {Math.round((Object.values(userProgress).filter(p => p.is_completed).length / lessons.length) * 100) || 0}%
                  </div>
                  <div className="text-gray-400">Course Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {user?.current_streak || 0}
                  </div>
                  <div className="text-gray-400">Day Streak</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 