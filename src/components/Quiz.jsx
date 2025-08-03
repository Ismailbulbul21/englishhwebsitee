import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle,
  RotateCcw,
  Award,
  Target,
  Lock,
  Play,
  Star,
  TrendingUp
} from 'lucide-react'

export default function Quiz({ user }) {
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [userAnswers, setUserAnswers] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  const [score, setScore] = useState(0)
  const [quizStatus, setQuizStatus] = useState('not_started')
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(null)
  
  // NEW: 20-Part System State
  const [currentPart, setCurrentPart] = useState(1)
  const [userProgress, setUserProgress] = useState([])
  const [allParts, setAllParts] = useState([])
  const [showPartSelection, setShowPartSelection] = useState(true)
  const [partAttempts, setPartAttempts] = useState(0)

  useEffect(() => {
    if (user) {
      loadUserLevelParts()
      loadUserProgress()
    }
  }, [user])

  useEffect(() => {
    let timer
    if (timeLeft > 0 && quizStatus === 'in_progress') {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && quizStatus === 'in_progress') {
      handleTimeUp()
    }
    return () => clearTimeout(timer)
  }, [timeLeft, quizStatus])

  // Load all parts for user's level
  const loadUserLevelParts = async () => {
    try {
      console.log('Loading parts for level:', user.english_level)
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('level', user.english_level)
        .eq('is_daily', true)
        .order('part_number', { ascending: true })

      if (error) {
        console.error('Parts fetch error:', error)
        setAllParts([])
      } else {
        setAllParts(data || [])
        console.log(`Loaded ${data?.length || 0} parts for ${user.english_level} level`)
      }
    } catch (error) {
      console.error('Error loading parts:', error)
      setAllParts([])
    }
  }

  // Load user's progress for this level
  const loadUserProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_part_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('level', user.english_level)
        .order('part_number', { ascending: true })

      if (error) {
        console.error('Progress fetch error:', error)
        setUserProgress([])
      } else {
        setUserProgress(data || [])
        console.log(`Loaded progress for ${data?.length || 0} parts`)
      }
    } catch (error) {
      console.error('Error loading progress:', error)
      setUserProgress([])
    } finally {
      setLoading(false)
    }
  }

  // Load specific part for quiz
  const loadPart = async (partNumber) => {
    try {
      const part = allParts.find(p => p.part_number === partNumber)
      if (!part) {
        console.error('Part not found:', partNumber)
        return
      }

      setQuiz(part)
      setCurrentPart(partNumber)
      setShowPartSelection(false)
      console.log(`Loaded Part ${partNumber}: ${part.title}`)
    } catch (error) {
      console.error('Error loading part:', error)
    }
  }

  const startQuiz = () => {
    setQuizStatus('in_progress')
    setCurrentQuestion(0)
    setUserAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setShowDetailedResults(false)
    setTimeLeft(quiz.questions.length * 120) // 2 minutes per question
  }

  const selectAnswer = (answerIndex) => {
    setSelectedAnswer(answerIndex)
  }

  const nextQuestion = () => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestion] = selectedAnswer
    setUserAnswers(newAnswers)
    setSelectedAnswer(null)

    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      finishQuiz(newAnswers)
    }
  }

  const handleTimeUp = () => {
    const newAnswers = [...userAnswers]
    newAnswers[currentQuestion] = selectedAnswer
    finishQuiz(newAnswers)
  }

  const finishQuiz = async (answers) => {
    setQuizStatus('completed')
    
    // Calculate score
    let correctAnswers = 0
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correctAnswers++
      }
    })
    
    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100)
    setScore(finalScore)
    setShowResult(true)

    // Check if part is passed based on required score
    const requiredScore = quiz.required_score_percentage || 80
    const isPassed = finalScore >= requiredScore
    
    console.log(`Part ${currentPart} completed: ${finalScore}% (required: ${requiredScore}%)`)

    // Save part progress
    try {
      // Update or create part progress record
      const { error: progressError } = await supabase
        .from('user_part_progress')
        .upsert({
          user_id: user.id,
          level: user.english_level,
          part_number: currentPart,
          is_completed: isPassed,
          best_score: finalScore,
          attempts_count: (partAttempts || 0) + 1,
          completed_at: isPassed ? new Date().toISOString() : null
        }, {
          onConflict: 'user_id,level,part_number'
        })

      if (progressError) throw progressError

      // Update user stats if passed
      if (isPassed) {
        await supabase
          .from('users')
          .update({ 
            total_quizzes_passed: (user.total_quizzes_passed || 0) + 1,
            last_activity: new Date().toISOString()
          })
          .eq('id', user.id)
        
        console.log(`🎉 Part ${currentPart} PASSED! Score: ${finalScore}%`)
      } else {
        console.log(`❌ Part ${currentPart} failed. Need ${requiredScore}%, got ${finalScore}%`)
      }

      // Reload user progress
      await loadUserProgress()
      
    } catch (error) {
      console.error('Error saving part progress:', error)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  // Helper functions for part access
  const isPartUnlocked = (partNumber) => {
    if (partNumber === 1) return true // Part 1 always unlocked
    
    // Check if previous part is completed
    const previousPart = userProgress.find(p => p.part_number === partNumber - 1)
    return previousPart && previousPart.is_completed
  }

  const getPartProgress = (partNumber) => {
    return userProgress.find(p => p.part_number === partNumber)
  }

  const getCompletedPartsCount = () => {
    return userProgress.filter(p => p.is_completed).length
  }

  const startPart = (partNumber) => {
    const progress = getPartProgress(partNumber)
    setPartAttempts(progress?.attempts_count || 0)
    loadPart(partNumber)
  }

  const backToPartSelection = () => {
    setShowPartSelection(true)
    setQuiz(null)
    setQuizStatus('not_started')
    setShowResult(false)
    setShowDetailedResults(false)
  }

  const retakeQuiz = () => {
    startQuiz()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h1 className="text-xl font-bold text-white">
                {showPartSelection 
                  ? `${user?.english_level?.charAt(0).toUpperCase()}${user?.english_level?.slice(1)} Level - 20 Parts Challenge`
                  : `Part ${currentPart}: ${quiz?.part_theme || 'Quiz'}`
                }
              </h1>
            </div>
            
            {quizStatus === 'in_progress' && timeLeft !== null && (
              <div className="flex items-center space-x-2 text-white">
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}

            {!showPartSelection && (
              <button
                onClick={backToPartSelection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Parts
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Part Selection Screen */}
        {showPartSelection && (
          <div>
            {/* Level Overview */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
              <div className="text-center mb-6">
                <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">
                  {user?.english_level?.charAt(0).toUpperCase()}{user?.english_level?.slice(1)} Level Challenge
                </h2>
                <p className="text-gray-400">Complete all 20 parts to master this level</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{getCompletedPartsCount()}/20</div>
                  <div className="text-gray-400">Parts Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {allParts.length > 0 ? `${allParts[0]?.required_score_percentage || 80}% - ${allParts[allParts.length - 1]?.required_score_percentage || 95}%` : '80% - 95%'}
                  </div>
                  <div className="text-gray-400">Difficulty Range</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {Math.round((getCompletedPartsCount() / 20) * 100)}%
                  </div>
                  <div className="text-gray-400">Level Progress</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(getCompletedPartsCount() / 20) * 100}%` }}
                ></div>
              </div>
              <p className="text-center text-gray-400 text-sm">
                {getCompletedPartsCount() === 20 
                  ? '🎉 Level Complete! You are ready for the next level!' 
                  : `${20 - getCompletedPartsCount()} parts remaining to complete this level`
                }
              </p>
            </div>

            {/* Parts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 20 }, (_, i) => {
                const partNumber = i + 1
                const part = allParts.find(p => p.part_number === partNumber)
                const progress = getPartProgress(partNumber)
                const isUnlocked = isPartUnlocked(partNumber)
                const isCompleted = progress?.is_completed || false
                
                return (
                  <div
                    key={partNumber}
                    className={`bg-gray-800 rounded-xl p-4 border transition-all hover:scale-105 ${
                      isCompleted 
                        ? 'border-green-500 bg-green-500/10' 
                        : isUnlocked 
                        ? 'border-blue-500 cursor-pointer hover:border-blue-400' 
                        : 'border-gray-600 opacity-50'
                    }`}
                    onClick={() => isUnlocked && !loading && startPart(partNumber)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-white">
                        Part {partNumber}
                      </span>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      ) : isUnlocked ? (
                        <Play className="h-6 w-6 text-blue-400" />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    
                    <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                      {part?.part_theme || `Theme ${partNumber}`}
                    </h4>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">
                        {part?.questions?.length || 0} questions
                      </span>
                      <span className={`font-bold ${
                        isCompleted ? 'text-green-400' : 'text-yellow-400'
                      }`}>
                        {part?.required_score_percentage || 80}% needed
                      </span>
                    </div>
                    
                    {progress && (
                      <div className="mt-2 text-xs text-gray-400">
                        Best: {progress.best_score}% • Attempts: {progress.attempts_count}
                      </div>
                    )}
                    
                    {!isUnlocked && (
                      <div className="text-xs text-gray-500 mt-2">
                        Complete Part {partNumber - 1} first
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quiz Interface */}
        {!showPartSelection && quiz && (
          <div>
            {/* Quiz Start Screen */}
            {quizStatus === 'not_started' && !showResult && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                <div className="text-center mb-8">
                  <Target className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-white mb-2">{quiz.title}</h2>
                  <p className="text-gray-400 mb-2">{quiz.part_theme}</p>
                  <p className={`text-lg ${getLevelColor(user.english_level)}`}>
                    Part {currentPart} of 20
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{quiz.questions.length}</div>
                    <div className="text-gray-400">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{quiz.required_score_percentage}%</div>
                    <div className="text-gray-400">Required Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{quiz.difficulty_level}/7</div>
                    <div className="text-gray-400">Difficulty</div>
                  </div>
                </div>

                {getPartProgress(currentPart) && (
                  <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Your Progress</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Best Score:</span>
                        <span className="text-green-400 font-bold">
                          {getPartProgress(currentPart).best_score}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Attempts:</span>
                        <span className="text-blue-400 font-bold">
                          {getPartProgress(currentPart).attempts_count}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={startQuiz}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  >
                    Start Part {currentPart}
                  </button>
                </div>
              </div>
            )}

            {/* Quiz In Progress */}
            {quizStatus === 'in_progress' && !showResult && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
                    <span>{Math.round(((currentQuestion + 1) / quiz.questions.length) * 100)}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-white mb-6">
                    {quiz.questions[currentQuestion].question}
                  </h3>

                  <div className="space-y-3">
                    {quiz.questions[currentQuestion].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => selectAnswer(index)}
                        className={`w-full text-left p-4 rounded-lg border transition-colors ${
                          selectedAnswer === index
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next Button */}
                <div className="flex justify-end">
                  <button
                    onClick={nextQuestion}
                    disabled={selectedAnswer === null}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white font-medium"
                  >
                    {currentQuestion + 1 === quiz.questions.length ? 'Finish Quiz' : 'Next Question'}
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Results */}
            {showResult && (
              <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                <div className="text-center mb-8">
                  {score >= quiz.required_score_percentage ? (
                    <div className="text-green-400">
                      <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold mb-2">Part {currentPart} Complete! 🎉</h2>
                      <p className="text-lg">You passed with {score}%!</p>
                      <p className="text-sm text-gray-300 mt-2">
                        Next part unlocked! Keep going!
                      </p>
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <XCircle className="h-16 w-16 mx-auto mb-4" />
                      <h2 className="text-3xl font-bold mb-2">Not Quite There</h2>
                      <p className="text-lg">You got {score}% but need {quiz.required_score_percentage}%</p>
                      <p className="text-sm text-gray-300 mt-2">
                        Study more and try again!
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${score >= quiz.required_score_percentage ? 'text-green-400' : 'text-red-400'}`}>
                      {score}%
                    </div>
                    <div className="text-gray-400">Your Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-400">
                      {userAnswers.filter((answer, index) => answer === quiz.questions[index].correct).length}
                    </div>
                    <div className="text-gray-400">Correct Answers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-400">
                      {quiz.required_score_percentage}%
                    </div>
                    <div className="text-gray-400">Required</div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    onClick={backToPartSelection}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
                  >
                    Back to Parts
                  </button>
                  
                  {score < quiz.required_score_percentage && (
                    <button
                      onClick={retakeQuiz}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Try Again</span>
                    </button>
                  )}

                  {score >= quiz.required_score_percentage && currentPart < 20 && (
                    <button
                      onClick={() => {
                        backToPartSelection()
                        // Auto-scroll to next part or highlight it
                      }}
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white"
                    >
                      <TrendingUp className="h-4 w-4" />
                      <span>Next Part</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 