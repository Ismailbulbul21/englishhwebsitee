import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const InfoBanner = () => {
  const [announcements, setAnnouncements] = useState([])
  const [isScrolling, setIsScrolling] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
        // Start scrolling after announcements are loaded
        if (data && data.length > 0) {
          setIsScrolling(true)
        }
      } catch (error) {
        console.error('Error:', error)
      }
    }

    fetchAnnouncements()
  }, [])

  // Don't show banner if no announcements
  if (announcements.length === 0) return null

  // Get professional news ticker styling based on type
  const getTickerStyle = (type) => {
    switch (type) {
      case 'warning':
        return 'border-l-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent'
      case 'success':
        return 'border-l-emerald-500 bg-gradient-to-r from-emerald-500/10 to-transparent'
      case 'error':
        return 'border-l-red-500 bg-gradient-to-r from-red-500/10 to-transparent'
      default:
        return 'border-l-blue-500 bg-gradient-to-r from-blue-500/10 to-transparent'
    }
  }

  // Get type icon for news ticker
  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning':
        return '⚠️'
      case 'success':
        return '✅'
      case 'error':
        return '🚨'
      default:
        return 'ℹ️'
    }
  }

  // Get type label for news ticker
  const getTypeLabel = (type) => {
    switch (type) {
      case 'warning':
        return 'WARNING'
      case 'success':
        return 'SUCCESS'
      case 'error':
        return 'BREAKING'
      default:
        return 'INFO'
    }
  }

  // Calculate animation duration - optimized for mobile and desktop
  const getAnimationDuration = () => {
    const totalLength = announcements.reduce((acc, ann) => 
      acc + ann.title.length + ann.message.length, 0)
    
    if (isMobile) {
      // Mobile: Vertical scrolling - slower for readability
      return Math.max(15, Math.min(30, 15 + (totalLength / 20)))
    } else {
      // Desktop: Horizontal scrolling - professional pace
      return Math.max(20, Math.min(50, 20 + (totalLength / 15)))
    }
  }

  // Mobile: Vertical scrolling ticker
  const MobileTicker = () => (
    <div className="relative h-24 bg-black overflow-hidden">
      {/* Vertical scrolling content */}
      <div 
        className={`flex flex-col h-full ${
          isScrolling ? 'animate-scroll-up-smooth' : ''
        }`}
        style={{
          animationDuration: `${getAnimationDuration()}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear'
        }}
      >
        {/* First set of announcements */}
        {announcements.map((announcement, index) => (
          <div
            key={`mobile-first-${announcement.id}-${index}`}
            className={`flex-shrink-0 p-3 mx-2 my-1 border-l-4 ${getTickerStyle(announcement.type)} 
                       hover:bg-gray-900/50 transition-colors duration-200 cursor-pointer rounded-r-lg`}
          >
            {/* Type Badge */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm">{getTypeIcon(announcement.type)}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider text-white
                              ${announcement.type === 'warning' ? 'bg-amber-600' :
                                announcement.type === 'success' ? 'bg-emerald-600' :
                                announcement.type === 'error' ? 'bg-red-600' :
                                'bg-blue-600'}`}>
                {getTypeLabel(announcement.type)}
              </span>
            </div>

            {/* News Content - FULL TEXT VISIBLE on mobile */}
            <div className="space-y-1">
              <h3 className="text-white font-semibold text-sm tracking-wide leading-tight">
                {announcement.title}
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed break-words">
                {announcement.message}
              </p>
            </div>

            {/* Time Stamp */}
            <div className="text-gray-500 text-xs font-mono mt-1">
              {new Date(announcement.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </div>
          </div>
        ))}

        {/* Duplicate announcements for seamless loop */}
        {announcements.map((announcement, index) => (
          <div
            key={`mobile-second-${announcement.id}-${index}`}
            className={`flex-shrink-0 p-3 mx-2 my-1 border-l-4 ${getTickerStyle(announcement.type)} 
                       hover:bg-gray-900/50 transition-colors duration-200 cursor-pointer rounded-r-lg`}
          >
            {/* Type Badge */}
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm">{getTypeIcon(announcement.type)}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider text-white
                              ${announcement.type === 'warning' ? 'bg-amber-600' :
                                announcement.type === 'success' ? 'bg-emerald-600' :
                                announcement.type === 'error' ? 'bg-red-600' :
                                'bg-blue-600'}`}>
                {getTypeLabel(announcement.type)}
              </span>
          </div>

            {/* News Content - FULL TEXT VISIBLE on mobile */}
            <div className="space-y-1">
              <h3 className="text-white font-semibold text-sm tracking-wide leading-tight">
                {announcement.title}
              </h3>
              <p className="text-gray-300 text-xs leading-relaxed break-words">
                {announcement.message}
              </p>
            </div>
            
            {/* Time Stamp */}
            <div className="text-gray-500 text-xs font-mono mt-1">
              {new Date(announcement.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile fade effects */}
      <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black to-transparent pointer-events-none z-10"></div>
      <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
    </div>
  )

  // Desktop: Horizontal scrolling ticker
  const DesktopTicker = () => (
    <div className="relative h-20 bg-black overflow-hidden">
      {/* Horizontal scrolling content */}
      <div 
        className={`flex items-center whitespace-nowrap h-full ${
          isScrolling ? 'animate-scroll-left-ultra-smooth' : ''
        }`}
              style={{
          animationDuration: `${getAnimationDuration()}s`,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear'
        }}
      >
        {/* Multiple sets for seamless looping */}
        {[1, 2, 3, 4, 5].map((setNum) => (
          announcements.map((announcement, index) => (
            <div
              key={`desktop-${setNum}-${announcement.id}-${index}`}
              className={`flex items-center space-x-6 px-8 py-4 mx-6 border-l-4 ${getTickerStyle(announcement.type)} 
                         hover:bg-gray-900/50 transition-colors duration-200 cursor-pointer`}
              style={{ minWidth: 'max-content' }}
            >
              {/* Type Badge */}
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(announcement.type)}</span>
                <span className={`px-3 py-1 rounded text-xs font-bold tracking-wider text-white
                                ${announcement.type === 'warning' ? 'bg-amber-600' :
                                  announcement.type === 'success' ? 'bg-emerald-600' :
                                  announcement.type === 'error' ? 'bg-red-600' :
                                  'bg-blue-600'}`}>
                  {getTypeLabel(announcement.type)}
                </span>
              </div>

              {/* News Content */}
              <div className="flex items-center space-x-4">
                <h3 className="text-white font-semibold text-sm tracking-wide whitespace-nowrap">
                  {announcement.title}
                </h3>
                <span className="text-gray-400 text-xs">•</span>
                <p className="text-gray-300 text-sm whitespace-nowrap">
                  {announcement.message}
                </p>
              </div>

              {/* Time Stamp */}
              <div className="text-gray-500 text-xs font-mono whitespace-nowrap">
                {new Date(announcement.created_at).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </div>
            </div>
          ))
        ))}
      </div>

      {/* Desktop fade effects */}
      <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-black to-transparent pointer-events-none z-10"></div>
      <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-black to-transparent pointer-events-none z-10"></div>
    </div>
  )

  return (
    <div className="relative mb-4">
      {/* Professional TV News Ticker Container */}
      <div className="bg-black border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
        {/* News Ticker Header Bar */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-3 sm:px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* News Channel Logo */}
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">H</span>
              </div>
              <span className="text-red-500 font-bold text-xs sm:text-sm tracking-wider">HADALHUB NEWS</span>
            </div>
            
            {/* Live Indicator */}
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-500 text-xs font-semibold tracking-wider">LIVE</span>
            </div>
          </div>
        </div>

        {/* Responsive Ticker - Mobile vs Desktop */}
        {isMobile ? <MobileTicker /> : <DesktopTicker />}

        {/* News Ticker Footer */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-3 sm:px-4 py-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="tracking-wider text-xs sm:text-sm">ENGLISH LEARNING PLATFORM</span>
            <span className="font-mono text-xs sm:text-sm">{new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>

      {/* Multiple Announcements Indicator */}
      {announcements.length > 1 && (
        <div className="flex justify-center mt-3 space-x-2">
          {announcements.map((_, index) => (
            <div
              key={index}
              className="w-2 h-2 bg-gray-600 rounded-full animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Custom CSS for both mobile and desktop animations */}
      <style jsx>{`
        /* Mobile: Vertical scrolling animation */
        @keyframes scroll-up-smooth {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
        
        .animate-scroll-up-smooth {
          animation: scroll-up-smooth linear infinite;
        }

        /* Desktop: Horizontal scrolling animation */
        @keyframes scroll-left-ultra-smooth {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .animate-scroll-left-ultra-smooth {
          animation: scroll-left-ultra-smooth linear infinite;
        }
      `}</style>
    </div>
  )
}

export default InfoBanner
