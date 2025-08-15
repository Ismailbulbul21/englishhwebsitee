import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useVoiceRecording } from '../lib/useVoiceRecording';
import { Mic, MicOff, Play, Pause, Square, Upload, User, Calendar, Clock, Award } from 'lucide-react';

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

        {/* User Registration */}
        {!isRegistered && (
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-white/60" />
              <h4 className="text-lg font-medium text-white">Register Your Name</h4>
            </div>
            <p className="text-white/60 mb-4">
              To participate in challenges and potentially win, please provide your full name.
              This will be displayed publicly if you win.
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                onChange={(e) => setUserFullName(e.target.value.split(' ')[0] + ' ' + (userFullName.split(' ')[1] || ''))}
              />
              <input
                type="text"
                placeholder="Last Name"
                className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                onChange={(e) => setUserFullName((userFullName.split(' ')[0] || '') + ' ' + e.target.value)}
              />
            </div>
            
            <button
              onClick={() => {
                const names = userFullName.trim().split(' ');
                if (names.length === 2 && names[0] && names[1]) {
                  registerUser(names[0], names[1]);
                }
              }}
              disabled={!userFullName.trim().includes(' ') || userFullName.trim().split(' ').length < 2}
              className="mt-4 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 text-white px-6 py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Register & Continue
            </button>
          </div>
        )}

        {/* Voice Recording */}
        {isRegistered && (
          <div className="bg-white/5 rounded-xl p-6">
            <h4 className="text-lg font-medium text-white mb-4">🎙️ Record Your Response</h4>
            
            {/* Recording Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {!isRecording && !audioUrl && (
                <button
                  onClick={startRecording}
                  className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors"
                >
                  <Mic className="h-6 w-6" />
                </button>
              )}
              
              {isRecording && (
                <>
                  <button
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-full transition-colors"
                  >
                    {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                  </button>
                  
                  <button
                    onClick={stopRecording}
                    className="bg-gray-500 hover:bg-gray-600 text-white p-4 rounded-full transition-colors"
                  >
                    <Square className="h-6 w-6" />
                  </button>
                </>
              )}
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