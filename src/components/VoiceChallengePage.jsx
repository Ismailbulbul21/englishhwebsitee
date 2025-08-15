import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useVoiceRecording } from '../lib/useVoiceRecording'
import { Mic, Play, Trophy, Clock, Users, Star, CheckCircle, ArrowLeft, Award } from 'lucide-react'

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

      <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
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

          <div className="space-y-4 sm:space-y-6">
            <div>
              <h4 className="text-white font-bold text-xl sm:text-2xl mb-2 sm:mb-3">{todaysChallenge.title}</h4>
              <p className="text-white/80 text-base sm:text-lg mb-3 sm:mb-4 leading-relaxed">{todaysChallenge.description}</p>
              <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-2 border-blue-400/30 rounded-xl p-4 sm:p-6 backdrop-blur-sm">
                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                  <div className="p-2 bg-blue-500/30 rounded-lg">
                    <span className="text-xl sm:text-2xl">🤔</span>
                  </div>
                  <p className="text-blue-200 text-lg sm:text-xl font-bold">Your Task:</p>
                </div>
                <p className="text-white text-base sm:text-lg leading-relaxed font-medium">{todaysChallenge.question}</p>
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-4 bg-white/5 rounded-xl px-4 sm:px-5 border border-white/10 space-y-2 sm:space-y-0">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <span className={`px-3 sm:px-4 py-2 rounded-full text-sm sm:text-base font-bold border-2 ${getLevelColor(todaysChallenge.level)}`}>
                  {todaysChallenge.level.charAt(0).toUpperCase() + todaysChallenge.level.slice(1)}
                </span>
                <div className="flex items-center space-x-2 sm:space-x-3 text-white/70">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold text-sm sm:text-base">{todaysChallenge.max_duration_seconds}s recording limit</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 text-white/70">
                <Users className="h-4 w-4" />
                <span className="font-semibold text-sm sm:text-base">Daily Challenge</span>
              </div>
            </div>

            {!userFullName ? (
              <button
                onClick={() => setShowFullNameModal(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Star className="h-4 w-4" />
                <span>Set Your Full Name to Participate</span>
              </button>
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
              <div className="space-y-3 sm:space-y-4">
                {/* Recording Status Indicator */}
                <div className="text-center">
                  {localIsRecording ? (
                    <div className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-red-500/20 to-red-600/20 border-2 border-red-400/40 rounded-full">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-red-300 text-sm sm:text-lg font-bold">Recording in Progress</span>
                    </div>
                  ) : recordingStarting ? (
                    <div className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-400/40 rounded-full">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full animate-spin"></div>
                      <span className="text-yellow-300 text-sm sm:text-lg font-bold">Starting Recording...</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-400/40 rounded-full">
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                      <span className="text-blue-300 text-sm sm:text-lg font-bold">Ready to Record</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={localIsRecording ? stopRecording : handleStartRecording}
                    disabled={submitting || recordingStarting}
                    className={`p-3 sm:p-4 rounded-full transition-all duration-200 ${
                      localIsRecording 
                        ? 'bg-red-500 hover:bg-red-600 text-white scale-105 sm:scale-110 shadow-lg shadow-red-500/50' 
                        : recordingStarting
                        ? 'bg-yellow-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {localIsRecording ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : recordingStarting ? (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
                    )}
                  </button>
                  
                  {localIsRecording && (
                    <div className="text-red-400 text-xs sm:text-sm font-medium animate-pulse flex items-center justify-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span>Recording... {Math.floor(localRecordingTime)}s</span>
                    </div>
                  )}
                  
                  {localRecordingTime > 0 && !localIsRecording && (
                    <div className="text-white/60 text-xs sm:text-sm flex items-center justify-center space-x-2">
                      <span>Recorded: {Math.floor(localRecordingTime)}s</span>
                    </div>
                  )}
                </div>

                {/* Recording Progress Bar */}
                {localIsRecording && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2 sm:mt-3">
                    <div 
                      className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${Math.min((localRecordingTime / (todaysChallenge?.max_duration_seconds || 60)) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                )}

                {/* Large Recording Time Display */}
                {localIsRecording && (
                  <div className="text-center mt-3 sm:mt-4">
                    <div className="text-4xl sm:text-5xl font-bold text-red-400 font-mono mb-1">
                      {Math.floor(localRecordingTime)}s
                    </div>
                    <div className="text-red-300 text-sm sm:text-base font-medium">
                      Recording in progress...
                    </div>
                  </div>
                )}

                {audioBlob && (
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <audio controls className="w-full" src={URL.createObjectURL(audioBlob)} />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        onClick={submitVoiceChallenge}
                        disabled={submitting}
                        className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {submitting ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Submit Challenge</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          resetRecording()
                          setLocalRecordingTime(0)
                          setError('') // Clear any error messages
                          setSuccessMessage('') // Clear any success messages
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
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

      {/* Full Name Modal */}
      {showFullNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Set Your Full Name</h3>
            <p className="text-gray-400 text-sm mb-4">
              To participate in voice challenges, we need your full name for the leaderboard.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFullNameModal(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveUserFullName}
                disabled={!fullName.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
              >
                Save & Continue
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