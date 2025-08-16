import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVoiceRecording } from '../lib/useVoiceRecording';
import { Mic, MicOff, Play, Pause, Square, Upload, User, Calendar, Clock, Award, Star } from 'lucide-react';

export default function VoiceChallenge({ user, onClose }) {
  const [challenge, setChallenge] = useState(null);
  const [userFullName, setUserFullName] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const {
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    audioBlob,
    audioUrl,
    resetRecording
  } = useVoiceRecording();

  // Check if user has already submitted today
  useEffect(() => {
    checkUserSubmission();
  }, [user]);

  // Load today's challenge
  useEffect(() => {
    loadTodaysChallenge();
  }, []);

  // Check if user is registered
  useEffect(() => {
    checkUserRegistration();
  }, [user]);

  const checkUserRegistration = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_full_names')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        if (data.first_name && data.last_name) {
          setUserFullName(`${data.first_name} ${data.last_name}`);
        } else if (data.first_name) {
          setUserFullName(data.first_name);
        }
        setIsRegistered(true);
      }
    } catch (err) {
      console.log('User not registered yet');
    }
  };

  const checkUserSubmission = async () => {
    if (!user || !challenge) return;
    
    try {
      const { data, error } = await supabase
        .from('voice_submissions')
        .select('id')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .single();
      
      if (data && !error) {
        setHasSubmitted(true);
      }
    } catch (err) {
      // User hasn't submitted yet
    }
  };

  const loadTodaysChallenge = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_voice_challenges', {
        user_level_param: user.english_level
      });
      
      if (error) throw error;
      
      // Get today's challenge
      const today = new Date().toISOString().split('T')[0];
      const todaysChallenge = data.find(c => c.challenge_date === today);
      
      if (todaysChallenge) {
        setChallenge(todaysChallenge);
      }
    } catch (err) {
      setError('Failed to load challenge');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (firstName, lastName) => {
    try {
      const { error } = await supabase
        .from('user_full_names')
        .insert({
          user_id: user.id,
          first_name: firstName,
          last_name: lastName
        });
      
      if (error) throw error;
      
      setIsRegistered(true);
      setUserFullName(`${firstName} ${lastName}`);
    } catch (err) {
      setError('Failed to register name');
      console.error(err);
    }
  };

  const submitVoiceChallenge = async () => {
    if (!audioBlob || !challenge || !user) return;
    
    try {
      setSubmitting(true);
      setError('');
      
      // Upload voice file to Supabase Storage
      const fileName = `voice-challenge-${challenge.id}-${user.id}-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600'
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);
      
      // Submit to database
      const { error: dbError } = await supabase
        .from('voice_submissions')
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          voice_file_url: urlData.publicUrl,
          voice_duration_seconds: Math.round(recordingTime / 1000)
        });
      
      if (dbError) throw dbError;
      
      setHasSubmitted(true);
      resetRecording();
      
    } catch (err) {
      setError('Failed to submit challenge');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading today's challenge...</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-md">
          <Calendar className="h-16 w-16 text-white/60 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Challenge Today</h3>
          <p className="text-white/60 mb-6">
            Check back tomorrow for a new voice challenge!
          </p>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-md">
          <Award className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Challenge Submitted!</h3>
          <p className="text-white/60 mb-6">
            Great job! Your voice challenge has been submitted. 
            Check back later to see if you're the winner!
          </p>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-white">🎤 Daily Voice Challenge</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Challenge Info */}
        <div className="bg-white/5 rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${
              challenge.level === 'beginner' ? 'bg-blue-500/20 text-blue-300 border-blue-400/40' :
              challenge.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40' :
              'bg-red-500/20 text-red-300 border-red-400/40'
            }`}>
              {challenge.level.charAt(0).toUpperCase() + challenge.level.slice(1)}
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Clock className="h-5 w-5" />
              <span className="text-lg font-medium">{challenge.max_duration_seconds}s max</span>
            </div>
          </div>
          
          <h3 className="text-3xl font-bold text-white mb-4">{challenge.title}</h3>
          <p className="text-white/80 text-xl mb-6 leading-relaxed">{challenge.description}</p>
          
          <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 border-2 border-blue-400/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-500/30 rounded-lg">
                <span className="text-2xl">🤔</span>
              </div>
              <p className="text-blue-200 text-xl font-bold">Your Task:</p>
            </div>
            <p className="text-white text-lg leading-relaxed font-medium">{challenge.question}</p>
          </div>
        </div>

        {/* User Registration - Intuitive Design */}
        {!isRegistered && (
          <div className="bg-white/5 rounded-xl p-4 sm:p-6 mb-6">
            <div className="text-center mb-6">
              <h4 className="text-lg sm:text-xl font-bold text-white mb-2">Magsacaaga buuxo</h4>
              <p className="text-blue-300 text-sm">
                Enter your name to join • Ku qoro magacaaga si aad uga qayb gasho
              </p>
            </div>
            
            {/* Mobile-first single input approach */}
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="Magaca buuxa • Full Name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm sm:text-base"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Profile setup button - Different from record button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => {
                  const names = userFullName.trim().split(' ');
                  if (names.length >= 2 && names[0] && names[1]) {
                    registerUser(names[0], names.slice(1).join(' '));
                  }
                }}
                disabled={!userFullName.trim().includes(' ') || userFullName.trim().split(' ').length < 2}
                className="group relative disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {/* Pulsing background rings - only when enabled */}
                {userFullName.trim().includes(' ') && userFullName.trim().split(' ').length >= 2 && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-ping"></div>
                    <div className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-30 animate-pulse"></div>
                  </>
                )}
                
                {/* Main button - Blue with User icon, not red with mic */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 disabled:from-gray-600 disabled:to-gray-700 rounded-full flex items-center justify-center shadow-xl group-hover:scale-105 group-active:scale-95 transition-all duration-200 border-4 border-white/20 group-hover:border-white/40">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-lg" />
                </div>
                
                {/* Label */}
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-blue-400 text-xs font-medium">
                    {userFullName.trim().includes(' ') && userFullName.trim().split(' ').length >= 2 
                      ? '👆 Kaydi • Save & Start'
                      : 'Magaca buuxo • Enter full name'
                    }
                  </span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Voice Recording */}
        {isRegistered && (
          <div className="bg-white/5 rounded-xl p-6">
            <h4 className="text-lg font-medium text-white mb-6 text-center">🎙️ Record Your Response</h4>
            
            {/* Recording Controls - Intuitive Design */}
            <div className="flex items-center justify-center mb-6">
              {!isRecording && !audioUrl ? (
                /* RECORD BUTTON */
                <button
                  onClick={startRecording}
                  className="group relative"
                >
                  {/* Pulsing rings */}
                  <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping"></div>
                  <div className="absolute inset-2 rounded-full bg-red-500 opacity-30 animate-pulse"></div>
                  
                  {/* Main record button */}
                  <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-active:scale-95 transition-all duration-200 border-4 border-white/20">
                    <Mic className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                  
                  {/* Label */}
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-red-400 text-xs font-bold">
                      🎤 Riix • Record
                    </span>
                  </div>
                </button>
              ) : isRecording ? (
                /* RECORDING CONTROLS */
                <div className="flex items-center gap-6">
                  {/* Pause/Resume Button */}
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="group relative"
                  >
                    <div className="relative w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-200 border-3 border-white/20">
                      {isPaused ? <Play className="h-5 w-5 text-white ml-1" /> : <Pause className="h-5 w-5 text-white" />}
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-yellow-400 text-xs font-medium">
                        {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                      </span>
                    </div>
                  </button>
                  
                  {/* Stop Button */}
                  <button
                    onClick={stopRecording}
                    className="group relative"
                  >
                    {/* Pulsing rings for recording */}
                    <div className="absolute inset-0 rounded-lg bg-red-500 opacity-20 animate-ping"></div>
                    
                    <div className="relative w-12 h-12 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-xl group-hover:scale-110 transition-all duration-200 border-3 border-white/20">
                      <Square className="h-5 w-5 text-white fill-white" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <span className="text-red-400 text-xs font-bold">
                        ⏹️ Stop
                      </span>
                    </div>
                  </button>
                </div>
              ) : null}
            </div>

            {/* Recording Status */}
            {isRecording && (
              <div className="text-center mb-4">
                <div className="text-2xl font-mono text-white mb-2">
                  {formatTime(recordingTime)}
                </div>
                <div className="text-white/60">
                  {isPaused ? 'Paused' : 'Recording...'}
                </div>
              </div>
            )}

            {/* Audio Preview */}
            {audioUrl && (
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <p className="text-white/60 mb-2">Preview your recording:</p>
                <audio controls className="w-full" src={audioUrl} />
                <button
                  onClick={resetRecording}
                  className="mt-2 text-white/60 hover:text-white text-sm"
                >
                  Record again
                </button>
              </div>
            )}

            {/* Submit Button */}
            {audioUrl && (
              <button
                onClick={submitVoiceChallenge}
                disabled={submitting}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-white/10 disabled:text-white/40 text-white py-3 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Submit Challenge
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mt-4">
            <p className="text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
} 