import { useEffect } from 'react'
import { Mic, MicOff, Send, X, AlertCircle } from 'lucide-react'

export default function VoiceRecordingModal({
  isOpen,
  onClose,
  isRecording,
  recordingTime,
  audioBlob,
  isUploading,
  error,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendVoice,
  formatTime
}) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (isRecording) {
          onCancelRecording()
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isRecording, onCancelRecording, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-medium text-white">
            {isRecording ? 'Recording Voice Message' : audioBlob ? 'Voice Message Ready' : 'Record Voice Message'}
          </h3>
          <button
            onClick={isRecording ? onCancelRecording : onClose}
            className="text-white/60 hover:text-white transition-colors"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Recording Interface */}
        <div className="text-center">
          {/* Recording Visualization */}
          <div className="mb-6">
            {isRecording ? (
              <div className="relative">
                {/* Pulsing circle animation */}
                <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                <div className="relative bg-red-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                
                {/* Recording time */}
                <div className="mt-4">
                  <p className="text-white text-2xl font-mono">{formatTime(recordingTime)}</p>
                  <p className="text-white/60 text-sm mt-1">Recording in progress...</p>
                </div>

                {/* Sound wave animation */}
                <div className="flex items-center justify-center space-x-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-red-400 w-1 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 20 + 10}px`,
                        animationDelay: `${i * 100}ms`,
                        animationDuration: '800ms'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            ) : audioBlob ? (
              <div>
                {/* Ready to send */}
                <div className="bg-green-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <p className="text-white text-lg font-medium">Voice message recorded!</p>
                <p className="text-white/60 text-sm">Duration: {formatTime(recordingTime)}</p>
              </div>
            ) : (
              <div>
                {/* Ready to record */}
                <div className="bg-blue-500 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Mic className="h-8 w-8 text-white" />
                </div>
                <p className="text-white text-lg font-medium">Ready to record</p>
                <p className="text-white/60 text-sm">Tap the microphone to start</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isRecording ? (
              // Recording controls
              <div className="flex space-x-3">
                <button
                  onClick={onCancelRecording}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={onStopRecording}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
                  disabled={isUploading}
                >
                  <MicOff className="h-4 w-4" />
                  <span>Stop</span>
                </button>
              </div>
            ) : audioBlob ? (
              // Send/Re-record controls
              <div className="flex space-x-3">
                <button
                  onClick={onCancelRecording}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-xl transition-colors"
                  disabled={isUploading}
                >
                  Re-record
                </button>
                <button
                  onClick={onSendVoice}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Start recording
              <button
                onClick={onStartRecording}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
                disabled={isUploading}
              >
                <Mic className="h-4 w-4" />
                <span>Start Recording</span>
              </button>
            )}
          </div>

          {/* Recording tips */}
          {!isRecording && !audioBlob && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-blue-400 text-xs">
                💡 Tip: Speak clearly and keep messages under 2 minutes for best results
              </p>
            </div>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="mt-4">
              <div className="bg-white/10 rounded-full h-2 overflow-hidden">
                <div className="bg-green-500 h-full rounded-full animate-pulse w-full"></div>
              </div>
              <p className="text-white/60 text-xs mt-2">Uploading voice message...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 