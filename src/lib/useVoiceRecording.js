import { useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const chunksRef = useRef([])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError('')
      console.log('🎤 Starting voice recording...')

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream
      chunksRef.current = []

      // Create MediaRecorder with fallback MIME types
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // Let browser choose
          }
        }
      }
      
      console.log('🎵 Using MIME type:', mimeType)
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      
      mediaRecorderRef.current = mediaRecorder

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        setAudioBlob(blob)
        console.log('🎵 Recording completed, blob size:', blob.size)
        console.log('🎵 Final blob type:', blob.type)
      }

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingTime(0)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      console.log('✅ Recording started successfully')

    } catch (error) {
      console.error('❌ Error starting recording:', error)
      setError(error.message.includes('Permission denied') 
        ? 'Microphone permission denied. Please allow microphone access.' 
        : 'Failed to start recording. Please check your microphone.')
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('⏹️ Stopping voice recording...')
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    console.log('✅ Recording stopped')
  }, [])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    console.log('❌ Cancelling voice recording...')
    
    stopRecording()
    setAudioBlob(null)
    setRecordingTime(0)
    setError('')
    
    console.log('✅ Recording cancelled')
  }, [stopRecording])

  // Upload voice message
  const uploadVoiceMessage = useCallback(async (chatSessionId, senderId) => {
    if (!audioBlob) {
      setError('No audio recording available')
      return null
    }

    try {
      setIsUploading(true)
      setError('')
      console.log('☁️ Uploading voice message...')

      // Generate unique filename with proper extension
      const timestamp = Date.now()
      let extension = 'webm'
      if (audioBlob.type.includes('mp4')) {
        extension = 'mp4'
      } else if (audioBlob.type.includes('wav')) {
        extension = 'wav'
      } else if (audioBlob.type.includes('ogg')) {
        extension = 'ogg'
      }
      
      const filename = `voice_${senderId}_${timestamp}.${extension}`
      const filePath = filename

      // Upload to Supabase Storage
      console.log('📁 Uploading to path:', filePath)
      console.log('📦 Blob info:', {
        size: audioBlob.size,
        type: audioBlob.type
      })
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-messages')
        .upload(filePath, audioBlob, {
          contentType: audioBlob.type || 'audio/webm',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Upload error:', uploadError)
        console.error('❌ Upload error details:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        })
        throw uploadError
      }

      console.log('✅ File uploaded successfully:', uploadData.path)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(filePath)

      const voiceFileUrl = urlData.publicUrl

      // Save message to database
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_session_id: chatSessionId,
          sender_id: senderId,
          content: `[Voice message - ${recordingTime}s]`,
          message_type: 'voice',
          voice_file_url: voiceFileUrl,
          voice_duration: recordingTime
        })
        .select(`
          *,
          sender:users(display_name, english_level)
        `)
        .single()

      if (messageError) {
        console.error('❌ Message save error:', messageError)
        throw messageError
      }

      console.log('✅ Voice message saved successfully')

      // Clean up
      setAudioBlob(null)
      setRecordingTime(0)

      return messageData

    } catch (error) {
      console.error('❌ Error uploading voice message:', error)
      
      let errorMessage = 'Failed to send voice message. Please try again.'
      if (error.message) {
        if (error.message.includes('JWT')) {
          errorMessage = 'Authentication error. Please refresh the page and try again.'
        } else if (error.message.includes('413')) {
          errorMessage = 'Voice message is too large. Please record a shorter message.'
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid file format. Please try recording again.'
        }
      }
      
      setError(errorMessage)
      return null
    } finally {
      setIsUploading(false)
    }
  }, [audioBlob, recordingTime])

  // Format recording time
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
  }, [isRecording, stopRecording])

  return {
    isRecording,
    recordingTime,
    audioBlob,
    isUploading,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadVoiceMessage,
    formatTime,
    cleanup
  }
} 