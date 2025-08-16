import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useVoiceRecording } from '../lib/useVoiceRecording'
import { Mic, Play, Trophy, Clock, Users, Star, CheckCircle, ArrowLeft, Award, Square, User } from 'lucide-react'

export default function VoiceChallengePage({ user }) {
  const [todaysChallenge, setTodaysChallenge] = useState(null)
  const [userSubmission, setUserSubmission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showFullNameModal, setShowFullNameModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [userFullName, setUserFullName] = useState('')
  const [recordingStarting, setRecordingStarting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Local state to ensure UI updates
  const [localRecordingTime, setLocalRecordingTime] = useState(0)
  const [localIsRecording, setLocalIsRecording] = useState(false)
  
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    audioBlob, 
    recordingTime,
    resetRecording,
    forceUpdate
  } = useVoiceRecording()

  // Sync local state with hook state to force re-renders
  useEffect(() => {
    setLocalRecordingTime(recordingTime)
    setLocalIsRecording(isRecording)
  }, [recordingTime, isRecording, forceUpdate])

  // Force re-render every 100ms during recording for smooth updates
  useEffect(() => {
    let intervalId
    if (isRecording) {
      intervalId = setInterval(() => {
        setLocalRecordingTime(prev => prev + 0.1)
      }, 100)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [isRecording])

  // Reset local time when recording stops
  useEffect(() => {
    if (!isRecording && localRecordingTime > 0) {
      setLocalRecordingTime(0)
    }
  }, [isRecording, localRecordingTime])

  const handleStartRecording = async () => {
    setRecordingStarting(true)
    setLocalRecordingTime(0) // Reset local time when starting
    setError('') // Clear any previous errors
    setSuccessMessage('') // Clear any previous success messages
    try {
      await startRecording()
    } catch (error) {
      console.error('Failed to start recording:', error)
    } finally {
      setRecordingStarting(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadTodaysChallenge()
      loadUserFullName()
    }
  }, [user])

  const loadTodaysChallenge = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_active_voice_challenges', {
        user_level_param: user.english_level
      })
      
      if (error) {
        console.error('Error loading challenge:', error)
        return
      }

      // Find today's challenge
      const today = new Date().toISOString().split('T')[0]
      const challenge = data?.find(c => c.challenge_date === today)
      
      if (challenge) {
        setTodaysChallenge(challenge)
        checkUserSubmission(challenge.id)
      }
    } catch (error) {
      console.error('Error loading challenge:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserFullName = async () => {
    try {
      const { data, error } = await supabase
        .from('user_full_names')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single()
      
      if (data && !error) {
        if (data.first_name && data.last_name) {
          setUserFullName(`${data.first_name} ${data.last_name}`)
        } else if (data.first_name) {
          setUserFullName(data.first_name)
        }
      }
    } catch (error) {
      console.error('Error loading user full name:', error)
      // Don't show error to user, just log it
    }
  }

  const checkUserSubmission = async (challengeId) => {
    try {
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', user.id)
        .single()
      
      if (data && !error) {
        setUserSubmission(data)
      }
    } catch (error) {
      // User hasn't submitted yet
      setUserSubmission(null)
    }
  }

  const saveUserFullName = async () => {
    if (!fullName.trim()) return
    
    try {
      const [firstName, ...lastNameParts] = fullName.trim().split(' ')
      const lastName = lastNameParts.join(' ') || ''
      
      const { error } = await supabase
        .from('user_full_names')
        .upsert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName
        })
      
      if (!error) {
        setUserFullName(fullName)
        setShowFullNameModal(false)
        setFullName('')
      }
    } catch (error) {
      console.error('Error saving full name:', error)
    }
  }

  const submitVoiceChallenge = async () => {
    if (!audioBlob || !userFullName) return
    
    setSubmitting(true)
    try {
      // Upload audio file
      const fileName = `voice_challenge_${user.id}_${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          cacheControl: '3600',
          upsert: false
        })
      
      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName)
      
      // Save submission - recordingTime is already in seconds, no need to divide by 1000
      const { error: submissionError } = await supabase
        .from('voice_submissions')
        .insert({
          challenge_id: todaysChallenge.id,
          user_id: user.id,
          voice_file_url: urlData.publicUrl,
          voice_duration_seconds: Math.ceil(recordingTime)
        })
      
      if (submissionError) {
        console.error('Submission error:', submissionError)
        throw new Error(`Submission failed: ${submissionError.message}`)
      }
      
      // Reload submission
      await checkUserSubmission(todaysChallenge.id)
      resetRecording()
      
      // Show success message
      setError('')
      setSuccessMessage('Voice challenge submitted successfully! 🎉')
      
    } catch (error) {
      console.error('Error submitting challenge:', error)
      setError(error.message || 'Failed to submit challenge. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white/60">Loading today's challenge...</p>
        </div>
      </div>
    )
  }

  if (!todaysChallenge) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center py-8">
          <Mic className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Challenge Today</h3>
          <p className="text-gray-400">Check back tomorrow for a new voice challenge!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 min-h-14 sm:min-h-16">
            {/* Left Section - Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Link
                to="/"
                className="flex items-center space-x-1 sm:space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-600"></div>
              <Award className="h-4 w-4 sm:h-5 sm:w-6 text-yellow-500 flex-shrink-0" />
            </div>

            {/* Center Section - Title */}
            <div className="flex-1 flex justify-center px-2 sm:px-4">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white text-center truncate">
                🎤 Daily Voice Challenge
              </h1>
            </div>
            
            {/* Right Section - Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="flex items-center space-x-1 sm:space-x-2 text-white">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-mono text-xs sm:text-sm lg:text-lg">{todaysChallenge.max_duration_seconds}s max</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-xl border border-blue-400/30">
                <Mic className="h-6 w-6 sm:h-8 sm:w-8 text-blue-300" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-1">Voice Challenge</h3>
                <p className="text-white/80 text-base sm:text-lg">Daily speaking practice</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 bg-white/10 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/20">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              <span className="text-white font-bold text-base sm:text-lg">
                {todaysChallenge.max_duration_seconds}s max
              </span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {/* Compact Challenge Overview - All in One */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/15 via-blue-500/15 to-green-500/15 rounded-xl blur-lg"></div>
              <div className="relative bg-gradient-to-r from-yellow-500/10 via-blue-500/10 to-green-500/10 border-2 border-yellow-400/40 rounded-xl p-4 sm:p-5 backdrop-blur-sm">
                
                {/* Title Row */}
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg">
                    <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-yellow-400 text-xs sm:text-sm font-bold uppercase tracking-wide">
                      🏆 TODAY'S CHALLENGE
                    </p>
                    <h2 className="text-white font-black text-lg sm:text-2xl leading-tight">
                      {todaysChallenge.title}
                    </h2>
                  </div>
                </div>

                {/* Two Column Layout for Description & Task */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                  
                  {/* Description Column */}
                  <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">📋</span>
                      <h3 className="text-blue-300 text-sm sm:text-base font-bold uppercase">
                        TARTANKA • DETAILS
                      </h3>
                    </div>
                    <p className="text-white text-sm sm:text-base leading-relaxed font-medium">
                      {todaysChallenge.description}
                    </p>
                  </div>

                  {/* Task Column - Most Important */}
                  <div className="bg-green-500/15 border-2 border-green-400/40 rounded-lg p-3 sm:p-4">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-400 to-emerald-500 px-3 py-2 rounded-full shadow-lg mb-2">
                        <span className="text-lg animate-bounce">🎯</span>
                        <p className="text-white text-sm sm:text-base font-black uppercase">
                          YOUR TASK
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 border border-green-300/30 rounded-lg p-3 sm:p-4">
                      <p className="text-white text-sm sm:text-lg font-bold text-center leading-relaxed">
                        "{todaysChallenge.question}"
                      </p>
                    </div>
                    
                    <div className="mt-2 text-center">
                      <div className="inline-flex items-center space-x-1 text-green-300 text-xs font-medium">
                        <span className="animate-pulse">💡</span>
                        <span>Read before recording</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
            {/* Error and Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">{successMessage}</p>
              </div>
            )}
            {/* Compact Challenge Info */}
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/30 rounded-lg p-3 backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-center gap-3 text-center">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-purple-400" />
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(todaysChallenge.level)}`}>
                    {todaysChallenge.level.charAt(0).toUpperCase() + todaysChallenge.level.slice(1)}
                  </span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="font-bold text-white text-sm">{todaysChallenge.max_duration_seconds}s max</span>
                </div>
                <div className="flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="font-bold text-blue-300 text-sm">Daily</span>
                </div>
              </div>
            </div>
          
          {!userFullName ? (
              <div className="space-y-4">
                {/* Simple explanation */}
                <div className="text-center">
                  <p className="text-blue-300 text-sm mb-1">
                    Magsacaaga buuxo • Enter your name
                  </p>
                  <p className="text-white/60 text-xs">
                    First time setup to join the challenge
                  </p>
                </div>
                
                {/* Profile setup button - Smaller & More Compact */}
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowFullNameModal(true)}
                    className="group relative"
                  >
                    {/* Pulsing background rings - Smaller */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-ping"></div>
                    <div className="absolute inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 animate-pulse"></div>
                    
                    {/* Main button - Smaller */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-105 group-active:scale-95 transition-all duration-200 border-3 border-white/20 group-hover:border-white/40">
                      <User className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-lg" />
                    </div>
                    
                    {/* Clear label for name setup - Closer */}
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-blue-400 text-xs font-medium">
                        👆 Magaca qor • Enter Name
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            ) : userSubmission ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 font-medium">Challenge Submitted!</span>
                </div>
                <p className="text-green-200 text-sm">
                  Your voice recording has been submitted. Admins will review and score it.
                </p>
                {userSubmission.score && (
                  <div className="mt-2">
                    <span className="text-green-300 text-sm">
                      Your Score: {userSubmission.score}/10
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Compact Recording Section */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  
                  {/* Recording State Display */}
                  {localIsRecording && (
                    <div className="text-center mb-4">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="text-3xl sm:text-4xl font-bold text-red-400 font-mono">
                          {Math.floor(localRecordingTime)}s
                        </div>
                        <div className="text-red-300 text-sm animate-pulse">
                          🔴 Recording...
                        </div>
                        <div className="text-white/60 text-sm">
                          {Math.max(0, (todaysChallenge?.max_duration_seconds || 60) - Math.floor(localRecordingTime))}s left
                        </div>
                      </div>
                      
                      {/* Compact Progress Bar */}
                      <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3">
                        <div 
                          className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-300 ease-out animate-pulse"
                          style={{ 
                            width: `${Math.min((localRecordingTime / (todaysChallenge?.max_duration_seconds || 60)) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Main Recording Button - Centered */}
                  <div className="flex justify-center">
                    {localIsRecording ? (
                      /* STOP BUTTON - Clear red square */
                      <button
                        onClick={stopRecording}
                        disabled={submitting}
                        className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Pulsing rings for recording */}
                        <div className="absolute inset-0 rounded-lg bg-red-500 opacity-20 animate-ping"></div>
                        <div className="absolute inset-1 rounded-lg bg-red-500 opacity-30 animate-pulse"></div>
                        
                        {/* Stop button - classic square shape */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-xl group-hover:scale-105 group-active:scale-95 transition-all duration-200 border-3 border-white/30">
                          <Square className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white" />
                        </div>
                        
                        {/* Stop label */}
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          <span className="text-red-400 text-xs font-bold animate-pulse">
                            ⏹️ Joojiyo • Stop
                          </span>
                        </div>
                      </button>
                    ) : recordingStarting ? (
                      /* STARTING STATE */
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                        <div className="absolute inset-0 rounded-full bg-yellow-500 opacity-20 animate-pulse"></div>
                        <div className="relative w-full h-full bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl border-3 border-white/30">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          <span className="text-yellow-400 text-xs font-medium">
                            ⏳ Starting...
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* RECORD BUTTON - Big red circle with microphone */
                      <button
                        onClick={handleStartRecording}
                        disabled={submitting}
                        className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Pulsing rings to draw attention */}
                        <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></div>
                        <div className="absolute inset-2 rounded-full bg-red-500 opacity-30 animate-pulse"></div>
                        
                        {/* Main record button */}
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-full flex items-center justify-center shadow-xl group-hover:scale-105 group-active:scale-95 transition-all duration-200 border-3 border-white/20 group-hover:border-white/40">
                          <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                        </div>
                        
                        {/* Record label */}
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                          <span className="text-red-400 text-xs font-bold">
                            🎤 Riix • Tap to Record
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {audioBlob && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="text-center mb-3">
                      <div className="inline-flex items-center space-x-2 text-green-400 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        <span>Recording Ready!</span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-2 mb-3">
                      <audio controls className="w-full h-8" src={URL.createObjectURL(audioBlob)} />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={submitVoiceChallenge}
                        disabled={submitting}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm font-medium"
                      >
                        {submitting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Submit</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          resetRecording()
                          setLocalRecordingTime(0)
                          setError('')
                          setSuccessMessage('')
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors text-sm"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Name Modal - Mobile Optimized */}
      {showFullNameModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md border border-gray-700/50 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="mb-3">
                <Star className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400 mx-auto" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Magsacaaga buuxo</h3>
              <div className="space-y-2">
                <p className="text-blue-300 text-sm sm:text-base">
                  Ku qoro magacaaga oo buuxa
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Enter your full name to participate
                </p>
              </div>
            </div>
            
            {/* Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Magaca • Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Soo gali magacaaga buuxa • Enter full name"
                  className="w-full px-4 py-3 sm:py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
                  autoFocus
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowFullNameModal(false)}
                className="flex-1 py-3 sm:py-2 bg-gray-700/80 hover:bg-gray-600 rounded-xl transition-colors text-white text-sm sm:text-base font-medium"
              >
                Ka noqo • Cancel
              </button>
              <button
                onClick={saveUserFullName}
                disabled={!fullName.trim()}
                className="flex-1 py-3 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl transition-all text-white text-sm sm:text-base font-medium"
              >
                Kaydi • Save & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function for level colors
const getLevelColor = (level) => {
  switch (level) {
    case 'beginner': return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    case 'advanced': return 'text-red-400 bg-red-500/10 border-red-500/30'
    default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
  }
} 