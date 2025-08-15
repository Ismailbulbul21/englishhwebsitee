import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Trophy, Star, X } from 'lucide-react'

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
    <div className="bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20 border-b border-yellow-500/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Winner Announcement */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400 animate-pulse" />
              <Star className="h-4 w-4 text-yellow-400" />
            </div>
            
            <div className="text-white">
              <span className="font-semibold text-yellow-300">
                🎉 CONGRATULATIONS {winner.winner_full_name.toUpperCase()}! 🎉
              </span>
              <span className="text-white/80 ml-2">
                Winner of today's voice challenge: "{winner.challenge_title}"
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/60 hover:text-white transition-colors p-1"
            title="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
} 