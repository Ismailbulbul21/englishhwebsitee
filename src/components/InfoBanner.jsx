import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const InfoBanner = () => {
  const [announcements, setAnnouncements] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [progressWidth, setProgressWidth] = useState(0)

  // Fetch active announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching announcements:', error)
          return
        }

        setAnnouncements(data || [])
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchAnnouncements()
  }, [])

  // Auto-rotate announcements with smooth transitions
  useEffect(() => {
    if (announcements.length <= 1) return

    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length)
        setIsTransitioning(false)
      }, 400) // Transition duration
    }, 60000) // Change every 1 minute (60 seconds)

    return () => clearInterval(interval)
  }, [announcements.length])

  // Progress bar animation - fills over 60 seconds
  useEffect(() => {
    if (announcements.length <= 1) return

    // Reset progress when announcement changes
    setProgressWidth(0)
    
    // Animate progress bar over 60 seconds
    const progressInterval = setInterval(() => {
      setProgressWidth(prev => {
        if (prev >= 100) return 100
        return prev + (100 / 60) // Increment to reach 100% in 60 seconds
      })
    }, 1000) // Update every 1 second

    return () => clearInterval(progressInterval)
  }, [currentIndex, announcements.length])

  // Don't show banner if no announcements
  if (announcements.length === 0) return null

  const currentAnnouncement = announcements[currentIndex]

  // Get modern banner styling based on type
  const getBannerStyle = (type) => {
    switch (type) {
      case 'warning':
        return 'from-amber-500 via-orange-500 to-yellow-500 border-amber-400/30'
      case 'success':
        return 'from-emerald-500 via-green-500 to-teal-500 border-emerald-400/30'
      case 'error':
        return 'from-rose-500 via-red-500 to-pink-500 border-rose-400/30'
      default:
        return 'from-blue-500 via-indigo-500 to-purple-500 border-blue-400/30'
    }
  }

  // Get type icon
  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      default:
        return 'ℹ️'
    }
  }

  return (
    <div className="relative mb-4">
      {/* Modern Gradient Banner */}
      <div className="relative overflow-hidden">
        <div
          className={`bg-gradient-to-r ${getBannerStyle(currentAnnouncement.type)} 
                     border border-white/20 rounded-3xl shadow-2xl 
                     transform transition-all duration-500 ease-out
                     ${isTransitioning ? 'scale-95 opacity-80 translate-y-1' : 'scale-100 opacity-100 translate-y-0'}
                     hover:scale-[1.02] hover:shadow-3xl hover:-translate-y-1`}
        >
          {/* Unique English Learning & Somali Culture Background */}
          <div className="absolute inset-0 opacity-15">
            {/* Floating English books */}
            <div className="absolute top-4 left-8 w-16 h-20 bg-white/20 rounded-lg transform rotate-12 animate-float-slow"></div>
            <div className="absolute top-12 right-12 w-12 h-16 bg-white/15 rounded-lg transform -rotate-6 animate-float-medium"></div>
            <div className="absolute bottom-8 left-16 w-14 h-18 bg-white/10 rounded-lg transform rotate-3 animate-float-fast"></div>
            
            {/* Somali flag colors (blue, white, green) */}
            <div className="absolute top-1/4 right-1/4 w-20 h-3 bg-blue-400/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-1/3 w-16 h-3 bg-white/30 rounded-full animate-pulse delay-1000"></div>
            <div className="absolute top-2/5 right-2/5 w-18 h-3 bg-green-400/20 rounded-full animate-pulse delay-2000"></div>
            
            {/* English letters floating */}
            <div className="absolute top-6 left-1/4 text-white/20 text-2xl font-bold animate-bounce">E</div>
            <div className="absolute top-16 right-1/3 text-white/15 text-xl font-bold animate-bounce delay-500">N</div>
            <div className="absolute bottom-12 left-1/3 text-white/25 text-lg font-bold animate-bounce delay-1000">G</div>
            
            {/* Learning symbols */}
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white/5 rounded-full blur-2xl animate-ping"></div>
            <div className="absolute bottom-4 right-8 w-20 h-20 bg-white/8 rounded-full blur-xl animate-pulse"></div>
            
            {/* Connection lines representing learning */}
            <div className="absolute top-1/4 left-1/4 w-32 h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent transform rotate-45 animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 w-28 h-0.5 bg-gradient-to-r from-transparent via-white/15 to-transparent transform -rotate-45 animate-pulse delay-1000"></div>
          </div>

          {/* Content - Centered and Smaller */}
          <div className="relative p-6 text-white text-center">
            {/* Header with icon and title */}
            <div className="flex items-center justify-center space-x-3 mb-3">
              <span className="text-3xl animate-bounce">{getTypeIcon(currentAnnouncement.type)}</span>
              <h3 className="text-2xl font-black tracking-wide text-white drop-shadow-lg">
                {currentAnnouncement.title}
              </h3>
            </div>
            
            {/* Message with smaller, bolder typography */}
            <p className="text-white/95 text-lg leading-relaxed font-bold max-w-3xl mx-auto">
              {currentAnnouncement.message}
            </p>
          </div>

          {/* Animated progress bar - now properly 60 seconds */}
          <div className="absolute bottom-0 left-0 h-1.5 bg-white/30 w-full overflow-hidden rounded-b-3xl">
            <div 
              className="h-full bg-white/80 rounded-b-3xl transition-all duration-1000 ease-linear
                         shadow-lg shadow-white/30"
              style={{
                width: `${progressWidth}%`
              }}
            />
          </div>

          {/* Shimmer effect */}
          <div className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent 
                         transform translate-x-[-100%] animate-shimmer"></div>
        </div>
      </div>

      {/* Enhanced multiple announcements indicator */}
      {announcements.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {announcements.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true)
                setTimeout(() => {
                  setCurrentIndex(index)
                  setIsTransitioning(false)
                }, 400)
              }}
              className={`w-4 h-4 rounded-full transition-all duration-500 ease-out cursor-pointer
                         ${index === currentIndex 
                           ? 'bg-white scale-125 shadow-lg shadow-white/50' 
                           : 'bg-white/30 hover:bg-white/50 hover:scale-110'
                         }`}
            />
          ))}
        </div>
      )}

      {/* Floating particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-4 left-4 w-2 h-2 bg-white/20 rounded-full animate-ping"></div>
        <div className="absolute top-8 right-8 w-1 h-1 bg-white/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-6 left-12 w-1.5 h-1.5 bg-white/25 rounded-full animate-bounce"></div>
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-white/15 rounded-full animate-ping delay-1000"></div>
      </div>

      {/* Custom CSS Animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-10px) rotate(12deg); }
        }
        
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(-6deg); }
          50% { transform: translateY(-8px) rotate(-6deg); }
        }
        
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(3deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }
        
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 4s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 3s ease-in-out infinite;
        }
        
        .animate-float-fast {
          animation: float-fast 2.5s ease-in-out infinite;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}

export default InfoBanner
