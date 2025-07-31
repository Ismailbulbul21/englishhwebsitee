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
  Target
} from 'lucide-react'

export default function Quiz({ user }) {
  const [quiz, setQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [userAnswers, setUserAnswers] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [showDetailedResults, setShowDetailedResults] = useState(false)
  const [score, setScore] = useState(0)
  const [quizStatus, setQuizStatus] = useState('not_started') // not_started, in_progress, completed
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (user) {
      fetchDailyQuiz()
      fetchUserAttempts()
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

  const fetchDailyQuiz = async () => {
    try {
      console.log('Fetching quiz for level:', user.english_level)
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('level', user.english_level)
        .eq('is_daily', true)
        .limit(1)

      console.log('Quiz query result:', data, error)

      if (error) {
        console.error('Quiz fetch error:', error)
        setQuiz(null)
      } else if (data && data.length > 0) {
        setQuiz(data[0])
        console.log('Quiz set:', data[0])
      } else {
        console.log('No quiz found for level:', user.english_level)
        setQuiz(null)
      }
    } catch (error) {
      console.error('Error fetching quiz:', error)
      setQuiz(null)
    }
  }

  const fetchUserAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (error) {
        console.error('Error fetching attempts:', error)
        setAttempts([])
      } else {
        setAttempts(data || [])
      }
    } catch (error) {
      console.error('Error fetching attempts:', error)
      setAttempts([])
    } finally {
      setLoading(false)
    }
  }

  const startQuiz = () => {
    setQuizStatus('in_progress')
    setCurrentQuestion(0)
    setUserAnswers([])
    setSelectedAnswer(null)
    setShowResult(false)
    setShowDetailedResults(false)
    setTimeLeft(quiz.questions.length * 120) // 2 minutes per question for less pressure
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

    // Save attempt to database
    try {
      const status = finalScore >= (quiz.passing_score || 80) ? 'passed' : 'failed'
      const attemptNumber = attempts.filter(a => a.quiz_id === quiz.id).length + 1

      const { error } = await supabase
        .from('user_quiz_attempts')
        .insert([
          {
            user_id: user.id,
            quiz_id: quiz.id,
            score: finalScore,
            answers: answers,
            status: status,
            attempt_number: attemptNumber,
            time_taken: (quiz.questions.length * 120) - (timeLeft || 0)
          }
        ])

      if (error) throw error

      // Update user stats if passed
      if (status === 'passed') {
        await supabase
          .from('users')
          .update({ 
            total_quizzes_passed: (user.total_quizzes_passed || 0) + 1,
            last_activity: new Date().toISOString()
          })
          .eq('id', user.id)
      }

      fetchUserAttempts()
    } catch (error) {
      console.error('Error saving quiz attempt:', error)
    }
  }

  const retakeQuiz = () => {
    const todayAttempts = attempts.filter(attempt => {
      const attemptDate = new Date(attempt.completed_at).toDateString()
      const today = new Date().toDateString()
      return attemptDate === today && attempt.quiz_id === quiz.id
    })

    if (todayAttempts.length >= (quiz.max_attempts || 3)) {
      alert('You have reached the maximum number of attempts for today.')
      return
    }

    startQuiz()
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

  const getScoreColor = (score, passingScore = 80) => {
    if (score >= passingScore) return 'text-green-400'
    if (score >= passingScore * 0.7) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quiz) {
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
                <h1 className="text-xl font-bold text-white">Imtixaanka Maalinta</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Quiz Available</h3>
            <p className="text-gray-400 mb-4">
              Daily quiz for {user?.english_level} level is being prepared.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Check back later or try completing some lessons first.
            </p>
            <Link
              to="/lessons"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Award className="h-5 w-5" />
              <span className="text-white">Go to Lessons</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const todayAttempts = attempts.filter(attempt => {
    const attemptDate = new Date(attempt.completed_at).toDateString()
    const today = new Date().toDateString()
    return attemptDate === today && attempt.quiz_id === quiz.id
  })

  const bestScore = todayAttempts.length > 0 ? Math.max(...todayAttempts.map(a => a.score)) : 0
  const attemptsLeft = (quiz.max_attempts || 3) - todayAttempts.length
  const hasPassed = todayAttempts.some(a => a.status === 'passed')

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
              <h1 className="text-xl font-bold text-white">Imtixaanka Maalinta</h1>
            </div>
            
            {quizStatus === 'in_progress' && timeLeft !== null && (
              <div className="flex items-center space-x-2 text-white">
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {quizStatus === 'not_started' && !showResult && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">{quiz.title}</h2>
              <p className={`text-lg ${getLevelColor(user.english_level)}`}>
                {user.english_level?.charAt(0).toUpperCase() + user.english_level?.slice(1)} Level
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{quiz.questions.length}</div>
                <div className="text-gray-400">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{quiz.passing_score || 80}%</div>
                <div className="text-gray-400">Passing Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{attemptsLeft}</div>
                <div className="text-gray-400">Attempts Left</div>
              </div>
            </div>

            {todayAttempts.length > 0 && (
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Your Progress Today</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Best Score:</span>
                  <span className={`font-bold ${getScoreColor(bestScore, quiz.passing_score)}`}>
                    {bestScore}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Status:</span>
                  <span className={hasPassed ? 'text-green-400' : 'text-yellow-400'}>
                    {hasPassed ? 'Passed' : 'Not Passed Yet'}
                  </span>
                </div>
              </div>
            )}

            <div className="text-center">
              {attemptsLeft > 0 ? (
                <button
                  onClick={startQuiz}
                  className="px-8 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                >
                  <span className="text-white font-medium">
                    {todayAttempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
                  </span>
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-red-400 mb-2">No attempts left for today</p>
                  <p className="text-gray-400 text-sm">Come back tomorrow for a new chance</p>
                </div>
              )}
            </div>
          </div>
        )}

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
                  className="bg-yellow-600 h-2 rounded-full transition-all"
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
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <span className="text-white font-medium">
                  {currentQuestion + 1 === quiz.questions.length ? 'Finish Quiz' : 'Next Question'}
                </span>
              </button>
            </div>
          </div>
        )}

        {showResult && !showDetailedResults && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="text-center mb-8">
              {score >= (quiz.passing_score || 80) ? (
                <div className="text-green-400">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Congratulations!</h2>
                  <p className="text-lg">You passed the quiz!</p>
                </div>
              ) : (
                <div className="text-red-400">
                  <XCircle className="h-16 w-16 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold mb-2">Keep Trying!</h2>
                  <p className="text-lg">You can retake the quiz to improve your score.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(score, quiz.passing_score)}`}>
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
                <div className="text-3xl font-bold text-yellow-400">
                  {attemptsLeft - 1}
                </div>
                <div className="text-gray-400">Attempts Left</div>
              </div>
            </div>

            <div className="flex justify-center space-x-4 mb-6">
              <button
                onClick={() => setShowDetailedResults(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <span className="text-white">Review Answers</span>
              </button>
            </div>

            <div className="flex justify-center space-x-4">
              <Link
                to="/"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <span className="text-white">Back to Dashboard</span>
              </Link>
              
              {attemptsLeft > 1 && score < (quiz.passing_score || 80) && (
                <button
                  onClick={retakeQuiz}
                  className="flex items-center space-x-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-white">Retake Quiz</span>
                </button>
              )}
            </div>
          </div>
        )}

        {showDetailedResults && (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Detailed Results</h2>
              <button
                onClick={() => setShowDetailedResults(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Back to Summary
              </button>
            </div>

            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const userAnswer = userAnswers[index]
                const isCorrect = userAnswer === question.correct
                const userAnswerText = userAnswer !== undefined ? question.options[userAnswer] : 'Not answered'
                const correctAnswerText = question.options[question.correct]

                return (
                  <div key={index} className={`p-6 rounded-lg border-2 ${
                    isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
                  }`}>
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex-1">
                        {index + 1}. {question.question}
                      </h3>
                      {isCorrect ? (
                        <CheckCircle className="h-6 w-6 text-green-400 ml-4" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-400 ml-4" />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Your Answer:</p>
                        <p className={`font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {userAnswerText}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Correct Answer:</p>
                        <p className="font-medium text-green-400">
                          {correctAnswerText}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-700 p-4 rounded-lg">
                      <p className="text-sm text-gray-400 mb-1">Explanation:</p>
                      <p className="text-gray-300">{question.explanation}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center space-x-4 mt-8">
              <Link
                to="/"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                <span className="text-white">Back to Dashboard</span>
              </Link>
              
              {attemptsLeft > 1 && score < (quiz.passing_score || 80) && (
                <button
                  onClick={retakeQuiz}
                  className="flex items-center space-x-2 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-white">Retake Quiz</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 