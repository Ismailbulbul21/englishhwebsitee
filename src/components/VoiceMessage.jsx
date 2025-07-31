import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, Download } from 'lucide-react'

export default function VoiceMessage({ 
  message, 
  isOwnMessage = false,
  senderName = '',
  timestamp = ''
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(message.voice_duration || 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const audioRef = useRef(null)

  // Initialize audio element
  useEffect(() => {
    if (message.voice_file_url && !audioRef.current) {
      const audio = new Audio(message.voice_file_url)
      audioRef.current = audio

      // Audio event listeners
      audio.addEventListener('loadedmetadata', () => {
        setDuration(Math.floor(audio.duration))
        setIsLoading(false)
      })

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(Math.floor(audio.currentTime))
      })

      audio.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
      })

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e)
        setError('Failed to load voice message')
        setIsLoading(false)
      })

      // Start loading
      setIsLoading(true)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [message.voice_file_url])

  // Play/pause toggle
  const togglePlayback = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (error) {
      console.error('Playback error:', error)
      setError('Failed to play voice message')
    }
  }

  // Seek to position
  const seekTo = (event) => {
    if (!audioRef.current) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(Math.floor(newTime))
  }

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Download voice message
  const downloadVoice = () => {
    if (message.voice_file_url) {
      const link = document.createElement('a')
      link.href = message.voice_file_url
      link.download = `voice_message_${message.id}.webm`
      link.click()
    }
  }

  if (error) {
    return (
      <div className={`max-w-xs px-4 py-3 rounded-2xl ${
        isOwnMessage
          ? 'bg-red-500/20 text-red-300 ml-auto'
          : 'bg-red-500/10 text-red-400'
      }`}>
        <div className="flex items-center space-x-2">
          <Volume2 className="h-4 w-4" />
          <span className="text-sm">Voice message failed to load</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xs">
      {/* Sender name for group chats */}
      {!isOwnMessage && senderName && (
        <p className="text-white/60 text-xs mb-1 ml-2">
          {senderName}
        </p>
      )}
      
      <div className={`px-4 py-3 rounded-2xl ${
        isOwnMessage
          ? 'bg-blue-500 text-white ml-auto'
          : 'bg-white/10 text-white'
      }`}>
        <div className="flex items-center space-x-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayback}
            disabled={isLoading}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isOwnMessage
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-blue-500/30 hover:bg-blue-500/40 text-blue-300'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </button>

          {/* Waveform/Progress Bar */}
          <div className="flex-1">
            <div 
              className="relative h-6 cursor-pointer"
              onClick={seekTo}
            >
              {/* Background bar */}
              <div className={`absolute top-1/2 transform -translate-y-1/2 w-full h-1 rounded-full ${
                isOwnMessage ? 'bg-white/30' : 'bg-white/20'
              }`}></div>
              
              {/* Progress bar */}
              <div 
                className={`absolute top-1/2 transform -translate-y-1/2 h-1 rounded-full transition-all ${
                  isOwnMessage ? 'bg-white' : 'bg-blue-400'
                }`}
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>

              {/* Progress indicator */}
              {duration > 0 && (
                <div 
                  className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full transition-all ${
                    isOwnMessage ? 'bg-white' : 'bg-blue-400'
                  }`}
                  style={{ 
                    left: `${(currentTime / duration) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                ></div>
              )}
            </div>

            {/* Time display */}
            <div className={`flex justify-between text-xs mt-1 ${
              isOwnMessage ? 'text-white/80' : 'text-white/60'
            }`}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={downloadVoice}
            className={`flex-shrink-0 p-1 rounded transition-colors ${
              isOwnMessage
                ? 'hover:bg-white/20 text-white/80'
                : 'hover:bg-white/10 text-white/60'
            }`}
            title="Download voice message"
          >
            <Download className="h-3 w-3" />
          </button>
        </div>

        {/* Timestamp */}
        <div className={`text-xs mt-2 ${
          isOwnMessage ? 'text-blue-100' : 'text-white/60'
        }`}>
          {timestamp}
        </div>
      </div>
    </div>
  )
} 