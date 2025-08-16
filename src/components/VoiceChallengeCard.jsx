import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useVoiceRecording } from '../lib/useVoiceRecording'
import { Mic, Play, Award, Clock, Users, Star, CheckCircle, User } from 'lucide-react'

export default function VoiceChallengeCard({ user }) {
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

  // Monitor recording time changes for debugging
  useEffect(() => {
    if (recordingTime > 0) {
      console.log('🎯 VoiceChallengeCard: recordingTime updated to', recordingTime)
    }
  }, [recordingTime])

  // Monitor recording state changes
  useEffect(() => {
    console.log('🎯 VoiceChallengeCard: isRecording changed to', isRecording)
  }, [isRecording])

  // Monitor force update changes
  useEffect(() => {
    if (forceUpdate > 0) {
      console.log('🎯 VoiceChallengeCard: forceUpdate triggered:', forceUpdate)
    }
  }, [forceUpdate])

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
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white/60">Loading today's challenge...</p>
        </div>
      </div>
    )
  }

  if (!todaysChallenge) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
        <div className="text-center py-8">
          <Mic className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Challenge Today</h3>
          <p className="text-gray-400">Check back tomorrow for a new voice challenge!</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Mic className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Voice Challenge</h3>
              <p className="text-white/60 text-xs sm:text-sm">Daily speaking practice</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/40" />
            <span className="text-white/40 text-xs sm:text-sm">
              {todaysChallenge.max_duration_seconds}s max
            </span>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <h4 className="text-white font-medium mb-1 sm:mb-2 text-sm sm:text-base">{todaysChallenge.title}</h4>
            <p className="text-white/60 text-xs sm:text-sm mb-2 sm:mb-3">{todaysChallenge.description}</p>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 sm:p-3">
              <p className="text-blue-300 text-xs sm:text-sm font-medium">Your Task:</p>
              <p className="text-blue-200 text-xs sm:text-sm">{todaysChallenge.question}</p>
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

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(todaysChallenge.level)}`}>
                {todaysChallenge.level}
              </span>
              <span className="text-white/60">
                {todaysChallenge.max_duration_seconds}s recording limit
              </span>
            </div>
            <div className="flex items-center space-x-2 text-white/60">
              <Users className="h-4 w-4" />
              <span>Daily Challenge</span>
            </div>
          </div>

          {!userFullName ? (
            <div className="space-y-4">
              {/* Simple explanation */}
              <div className="text-center">
                <p className="text-blue-300 text-sm mb-1">
                  Magsacaaga buuxo • Enter name first
                </p>
                <p className="text-white/60 text-xs">
                  One-time setup to join
                </p>
              </div>
              
              {/* Profile setup button for card - Different from record button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowFullNameModal(true)}
                  className="group relative"
                >
                  {/* Pulsing background rings - Blue instead of red */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 animate-pulse"></div>
                  
                  {/* Main button - Blue with User icon, not red with mic */}
                  <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-active:scale-95 transition-all duration-200 border-3 border-white/20 group-hover:border-white/40">
                    <User className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                  
                  {/* Compact label */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-blue-400 text-xs font-medium">
                      👆 Magaca • Name
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
            <div className="space-y-3 sm:space-y-4">
              {/* Recording Status Indicator */}
              <div className="text-center">
                {localIsRecording ? (
                  <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span className="text-red-400 text-xs sm:text-sm font-medium">Recording in Progress</span>
                  </div>
                ) : recordingStarting ? (
                  <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-spin"></div>
                    <span className="text-yellow-400 text-xs sm:text-sm font-medium">Starting Recording...</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full">
                    <Mic className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                    <span className="text-blue-400 text-xs sm:text-sm font-medium">Ready to Record</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-3 sm:space-x-4">
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
                    <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : recordingStarting ? (
                    <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4 sm:h-6 sm:w-6" />
                  )}
                </button>
                
                {localIsRecording && (
                  <div className="text-red-400 text-xs font-medium animate-pulse flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    <span>Recording... {Math.floor(localRecordingTime)}s</span>
                  </div>
                )}
                
                {localRecordingTime > 0 && !localIsRecording && (
                  <div className="text-white/60 text-xs flex items-center space-x-2">
                    <span>Recorded: {Math.floor(localRecordingTime)}s</span>
                  </div>
                )}
              </div>

              {/* Recording Progress Bar */}
              {localIsRecording && (
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2 sm:mt-4">
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
                  <div className="text-3xl sm:text-4xl font-bold text-red-400 font-mono">
                    {Math.floor(localRecordingTime)}s
                  </div>
                  <div className="text-red-300 text-xs sm:text-sm mt-1">
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
    </>
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