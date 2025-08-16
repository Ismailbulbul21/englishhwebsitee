import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Star, X, Sparkles, Crown, Award, Zap } from 'lucide-react'

export default function WinnerBanner({ user }) {
  const [isVisible, setIsVisible] = useState(false)
  const [winner, setWinner] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      checkForTodaysWinner()
    }
  }, [user])

  const checkForTodaysWinner = async () => {
    setLoading(true)
    try {
      // Get today's winner for the user's specific level
      const { data, error } = await supabase.rpc('get_todays_winner_by_level', {
        user_level_param: user.english_level
      })
      
      if (error) {
        console.error('Error checking for winner:', error)
        return
      }

      if (data && data.length > 0) {
        setWinner(data[0])
        setIsVisible(true)
      }
    } catch (error) {
      console.error('Error checking for winner:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible || !winner) {
    return null
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      {/* Professional Background with Subtle Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/20 via-amber-600/30 to-orange-600/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/15"></div>
      
      {/* Minimal Professional Decoration */}
      <div className="absolute top-3 left-6">
        <Star className="h-5 w-5 text-yellow-400/60" />
      </div>
      <div className="absolute top-4 right-8">
        <Award className="h-5 w-5 text-amber-400/60" />
      </div>
      
      {/* Main Content Container */}
      <div className="relative border-y-2 border-yellow-500/40 backdrop-blur-sm shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-5 sm:py-6">
            
            {/* Winner Announcement Section */}
            <div className="flex items-center gap-6 flex-1">
              
              {/* Professional Trophy */}
              <div className="relative flex-shrink-0">
                <div className="bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full p-4 shadow-xl border-2 border-yellow-400/50">
                  <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Crown className="h-5 w-5 text-yellow-400" />
                </div>
              </div>
              
              {/* Winner Information */}
              <div className="flex-1 min-w-0">
                {/* Challenge Winner Header */}
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-6 w-6 text-yellow-400" />
                  <span className="text-yellow-300 font-bold text-lg sm:text-xl uppercase tracking-wide">
                    🏆 TARTANKA MAANTA • TODAY'S CHALLENGE WINNER
                  </span>
                </div>
                
                {/* Winner Name - HIGHLY PROMINENT */}
                <div className="mb-4">
                  <div className="text-yellow-200 font-medium text-sm sm:text-base mb-1 uppercase tracking-wider">
                    GUULEYSANI • CONGRATULATIONS
                  </div>
                  <h1 className="text-white font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-none">
                    {winner?.winner_full_name || 'Winner Name Loading...'}
                  </h1>
                  <div className="h-1 bg-gradient-to-r from-yellow-400 to-amber-500 w-full mt-2 rounded-full"></div>
                </div>
                
                {/* Challenge Information - Professional Layout */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl px-4 py-3 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span className="text-amber-200 font-semibold text-sm uppercase tracking-wide">
                      Challenge Winner
                    </span>
                  </div>
                  <p className="text-white/90 font-medium text-base sm:text-lg">
                    "{winner?.challenge_title || 'Challenge Loading...'}"
                  </p>
                  <p className="text-yellow-300/80 font-medium text-sm mt-1">
                    Waa qofka ugu fiican maanta! • Best performance today!
                  </p>
                </div>
              </div>
            </div>

            {/* Professional Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 ml-6 group bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg p-3 transition-all duration-200 border border-white/10 hover:border-white/20"
              title="Iska dhaaf • Dismiss banner"
            >
              <X className="h-5 w-5 text-white/60 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
        
        {/* Professional Bottom Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent"></div>
      </div>
    </div>
  )
} 