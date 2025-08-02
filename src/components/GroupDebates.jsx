import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Plus, 
  Clock, 
  MessageCircle, 
  ArrowLeft,
  AlertCircle,
  Calendar,
  Hash,
  Shield,
  CheckCircle,
  Eye,
  StopCircle,
  Trash2,
  Timer,
  Settings
} from 'lucide-react'

// ScheduledGroupCard component for displaying scheduled groups with simple countdown
const ScheduledGroupCard = ({ group, onCountdownComplete }) => {
  const [timeLeft, setTimeLeft] = useState(null)
  const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false)
  
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const activationTime = new Date(group.activation_time)
      const diff = activationTime - now
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft({ hours, minutes, seconds })
        setHasTriggeredComplete(false) // Reset when countdown is active
      } else {
        setTimeLeft(null) // Ready to activate
        // Trigger completion callback only once
        if (!hasTriggeredComplete && onCountdownComplete) {
          console.log(`⏰ Countdown completed for group: ${group.name}, triggering activation check`)
          setHasTriggeredComplete(true)
          onCountdownComplete(group.id)
        }
      }
    }, 1000)
    
    return () => clearInterval(timer)
  }, [group.activation_time, hasTriggeredComplete, onCountdownComplete, group.id, group.name])

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getActivationTime = () => {
    if (!group.activation_time) return 'Loading...'
    return new Date(group.activation_time).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 opacity-90">
      {/* Group Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">
            {group.name}
          </h3>
          <p className="text-sm text-gray-400">
            Hosted by {group.host?.display_name}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
            Scheduled
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(group.level)} bg-current/10`}>
            {group.level}
          </span>
        </div>
      </div>

      {/* Simple Countdown Display */}
      {timeLeft ? (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              Opens in: {timeLeft.hours > 0 && `${timeLeft.hours}h `}
              {timeLeft.minutes}m {timeLeft.seconds}s
            </span>
          </div>
          <div className="text-center mt-1">
            <span className="text-blue-300 text-xs">
              Activates at {getActivationTime()}
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">
              Ready to join!
            </span>
          </div>
        </div>
      )}

      {/* Topic */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-blue-400 mb-1">Debate Topic:</h4>
        <p className="text-white font-medium">{group.topic?.title}</p>
        {group.topic?.description && (
          <p className="text-sm text-gray-400 mt-1">{group.topic.description}</p>
        )}
      </div>

      {/* Participants Info */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300">
            {group.participants?.length || 0}/{group.max_participants || 10} spots
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-gray-300">
            {formatTime(group.scheduled_start)} - {formatTime(group.scheduled_end)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function GroupDebates({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [scheduledGroups, setScheduledGroups] = useState([])
  const [activeGroups, setActiveGroups] = useState([])
  const [debateTopics, setDebateTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  // Countdown values loaded from AdminDashboard defaults - not editable here
  const [countdownHours, setCountdownHours] = useState(0)
  const [countdownMinutes, setCountdownMinutes] = useState(30)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  // Removed old schedule-based states - using simple countdown system only
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminCheckLoading, setAdminCheckLoading] = useState(true)
  const [selectedLevel, setSelectedLevel] = useState('beginner')
  const [realtimeSubscription, setRealtimeSubscription] = useState(null)

  useEffect(() => {
    if (user) {
      fetchGroups()
      fetchDebateTopics()
      checkAdminStatus()
      setupRealtimeSubscription()
    }
    
    return () => {
      // Cleanup subscription on unmount
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe()
      }
    }
  }, [user])

  // Setup real-time subscription for group status changes
  const setupRealtimeSubscription = () => {
    if (!user) return

    console.log('🔔 Setting up real-time subscription for group status changes')
    
    const subscription = supabase
      .channel(`group_status_updates_${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'groups'
        // Listen to all groups - filter in the handler since Supabase filters are limited
      }, (payload) => {
        // Filter by user level unless admin
        if (!isAdmin && payload.new.level !== user.english_level) {
          return // Ignore groups not for user's level
        }
        console.log('📨 Group status updated:', payload.new)
        
        const updatedGroup = payload.new
        
        // Check if this is a status change from scheduled to waiting/active
        if (payload.old?.status === 'scheduled' && ['waiting', 'active'].includes(updatedGroup.status)) {
          console.log(`🎉 Group "${updatedGroup.name}" is now ${updatedGroup.status}! Moving to active groups.`)
          
          // Refresh groups to get the latest data
          fetchGroups()
        }
        
        // Also handle other status changes
        if (payload.old?.status !== updatedGroup.status) {
          console.log(`🔄 Group status changed: ${payload.old?.status} → ${updatedGroup.status}`)
          fetchGroups()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'groups'
      }, (payload) => {
        console.log('➕ New group created:', payload.new)
        fetchGroups()
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public', 
        table: 'groups'
      }, (payload) => {
        console.log('🗑️ Group deleted:', payload.old)
        fetchGroups()
      })
      .subscribe((status) => {
        console.log(`🔔 Groups subscription status:`, status)
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time groups subscription active`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Real-time groups subscription error`)
          
          // Retry subscription after a delay
          setTimeout(() => {
            console.log('🔄 Retrying groups subscription')
            setupRealtimeSubscription()
          }, 2000)
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ Groups subscription timed out, retrying...`)
          
          // Retry subscription
          setTimeout(() => {
            setupRealtimeSubscription()
          }, 1000)
        }
      })

    setRealtimeSubscription(subscription)
  }

  // Handle countdown completion - trigger immediate activation check
  const handleCountdownComplete = async (groupId) => {
    console.log(`🚀 Triggering immediate activation check for group: ${groupId}`)
    
    try {
      // Force activation check
      const { data, error } = await supabase.rpc('activate_scheduled_groups')
      
      if (error) {
        console.error('❌ Error in immediate activation check:', error)
      } else {
        console.log('✅ Immediate activation check completed:', data)
        if (data && data.activated_count > 0) {
          console.log(`🎉 Immediately activated ${data.activated_count} groups!`)
        }
      }
      
      // Refresh groups immediately
      await fetchGroups()
      
    } catch (error) {
      console.error('❌ Error in immediate activation:', error)
    }
  }

  const checkAdminStatus = async () => {
    try {
      setAdminCheckLoading(true)
      const { data, error } = await supabase.rpc('check_admin_access', {
        user_id_param: user.id
      })
      
      if (error) {
        console.error('Error checking admin status:', error)
        setIsAdmin(false)
      } else {
        setIsAdmin(data || false)
        console.log('🔐 Admin check result:', data ? `✅ Admin user (${user.display_name})` : `❌ Regular user (${user.display_name})`)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsAdmin(false)
    } finally {
      setAdminCheckLoading(false)
    }
  }

  // Removed old schedule-based timer - countdown now handled in individual cards

  // Auto-activation timer for scheduled groups
  useEffect(() => {
    const activationTimer = setInterval(async () => {
      try {
        console.log('🔄 Checking for groups to activate...')
        
        // Activate scheduled groups whose time has arrived
        const { data, error } = await supabase.rpc('activate_scheduled_groups')
        
        if (error) {
          console.error('❌ Error in activate_scheduled_groups:', error)
        } else {
          console.log('✅ Auto-activation check completed:', data)
          if (data && data.activated_count > 0) {
            console.log(`🎉 Activated ${data.activated_count} groups!`)
          }
        }
        
        // Always refresh groups to get latest status
        await fetchGroups()
        
      } catch (error) {
        console.error('❌ Error in activation timer:', error)
      }
    }, 5000) // Check every 5 seconds for more responsive updates

    return () => clearInterval(activationTimer)
  }, [])

  // Removed old debate time activation - now handled by simple auto-activation timer

  // Removed complex schedule calculation - using simple countdown system only

  const fetchGroups = async () => {
    try {
      console.log('🔄 Fetching groups...')
      
      let query = supabase
        .from('groups')
        .select(`
          *,
          topic:debate_topics(title, description),
          host:users(display_name)
        `)
        .in('status', ['waiting', 'active', 'scheduled'])
        .gte('scheduled_end', new Date().toISOString())
        .order('created_at', { ascending: false })

      // If user is admin, show groups for all levels, otherwise only their level
      if (!isAdmin) {
        query = query.eq('level', user.english_level)
      }

      const { data, error } = await query

      if (error) throw error
      
      const allGroups = data || []
      
      // Separate groups by status (exclude closed groups)
      const active = allGroups.filter(g => ['waiting', 'active'].includes(g.status))
      const scheduled = allGroups.filter(g => g.status === 'scheduled')
      
      console.log('📊 Groups fetched:', {
        total: allGroups.length,
        active: active.length,
        scheduled: scheduled.length,
        statuses: allGroups.map(g => ({ name: g.name, status: g.status }))
      })
      
      setGroups(allGroups) // Keep for backward compatibility
      setActiveGroups(active)
      setScheduledGroups(scheduled)
    } catch (error) {
      console.error('❌ Error fetching groups:', error)
    }
  }

  const fetchDebateTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('debate_topics')
        .select('*')
        .eq('level', selectedLevel)
        .eq('is_active', true)
        .order('usage_count', { ascending: true })

      if (error) throw error
      setDebateTopics(data || [])
    } catch (error) {
      console.error('Error fetching debate topics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refetch topics and load countdown defaults when selected level changes
  useEffect(() => {
    if (isAdmin && selectedLevel) {
      fetchDebateTopics()
      loadCountdownDefaults()
    }
  }, [selectedLevel, isAdmin])

  const loadCountdownDefaults = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_countdown_defaults', { level_param: selectedLevel })

      if (error) throw error
      
      if (data) {
        setCountdownHours(data.default_countdown_hours || 0)
        setCountdownMinutes(data.default_countdown_minutes || 30)
      }
    } catch (error) {
      console.error('Error loading countdown defaults:', error)
      // Keep current values as fallback
    }
  }

  // Refetch groups when admin status changes
  useEffect(() => {
    if (user && !adminCheckLoading) {
      fetchGroups()
      // Restart subscription with updated admin filter
      if (realtimeSubscription) {
        realtimeSubscription.unsubscribe()
      }
      setupRealtimeSubscription()
    }
  }, [isAdmin, adminCheckLoading])

  // Removed schedule fetching - no longer needed for simple countdown system

  const createGroup = async () => {
    if (!selectedTopic || !groupName.trim()) return

    setCreating(true)
    try {
      // Use admin-specific function that bypasses restrictions
      const { data, error } = await supabase
        .rpc('admin_create_debate_group', {
          group_name_param: groupName.trim(),
          level_param: selectedLevel,
          topic_id_param: selectedTopic.id,
          admin_id_param: user.id,
          countdown_hours_param: countdownHours,
          countdown_minutes_param: countdownMinutes
        })

      if (error) throw error

      if (data.success) {
        setShowCreateModal(false)
        setSelectedTopic(null)
        setGroupName('')
        // Reset to defaults for selected level
        loadCountdownDefaults()
        fetchGroups()
        
        const totalMinutes = (countdownHours * 60) + countdownMinutes
        const message = totalMinutes === 0 
          ? `${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} group created and active now!`
          : `${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} group will activate in ${countdownHours}h ${countdownMinutes}m!`
        alert(message)
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error creating group:', error)
      alert('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const joinGroup = async (groupId, topicTitle) => {
    // Show topic agreement modal
    const agreed = window.confirm(
      `Do you agree to debate the topic: "${topicTitle}"?\n\nBy joining, you commit to respectful discussion and staying on topic.`
    )

    if (!agreed) return

    try {
      // First create join request
      const { error: requestError } = await supabase
        .from('group_join_requests')
        .upsert({
          group_id: groupId,
          user_id: user.id,
          agreed_to_topic: true
        })

      if (requestError) throw requestError

      // Then join the group
      const { data, error } = await supabase
        .rpc('join_group', {
          group_id_param: groupId,
          user_id_param: user.id
        })

      if (error) throw error

      if (data) {
        fetchGroups()
        alert('Successfully joined the group! Redirecting to group chat...')
        // Navigate to the specific group chat
        setTimeout(() => {
          navigate(`/group/${groupId}`)
        }, 1500)
      } else {
        alert('Failed to join group. It might be full or no longer available.')
      }
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group')
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Removed schedule display functions - no longer needed

  const getGroupStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'full': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const canCreateGroup = () => {
    return isAdmin && !adminCheckLoading
  }

  // Admin group management functions
  const handleAdminGroupAction = async (groupId, action, groupName) => {
    const actionNames = {
      'close': 'close',
      'delete': 'delete', 
      'extend': 'extend by 1 hour'
    }

    const confirmMessage = action === 'delete' 
      ? `Are you sure you want to DELETE group "${groupName}"? This cannot be undone.`
      : `Are you sure you want to ${actionNames[action]} group "${groupName}"?`

    if (!confirm(confirmMessage)) return

    try {
      const { data, error } = await supabase.rpc('admin_manage_group', {
        admin_id_param: user.id,
        group_id_param: groupId,
        action_param: action
      })

      if (error) throw error

      if (data.success) {
        await fetchGroups() // Refresh the groups list
        alert(`✅ ${data.message}`)
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing group:`, error)
      alert(`Failed to ${action} group`)
    }
  }

  // Calculate time remaining for active groups
  const getTimeRemaining = (scheduledEnd) => {
    const now = new Date()
    const endTime = new Date(scheduledEnd)
    const diff = endTime - now

    if (diff <= 0) return 'Expired'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else {
      return `${minutes}m left`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <div className="hidden sm:block h-6 w-px bg-gray-600"></div>
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
              <h1 className="text-lg sm:text-xl font-bold text-white">Doodaha Fiidka</h1>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Simple Status Display */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Debates Available</span>
              </div>
              
              {/* Scheduled groups indicator */}
              {scheduledGroups.length > 0 && (
                <div className="flex items-center space-x-2 px-2 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-blue-400 text-sm">
                    {scheduledGroups.length} scheduled
                  </span>
                </div>
              )}
              
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!canCreateGroup()}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-white text-sm">
                  {isAdmin ? 'Create Group' : 'Admin Only'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Level Info */}
        <div className={`rounded-xl p-4 sm:p-6 border mb-6 sm:mb-8 ${
          user?.english_level === 'beginner' ? 'bg-green-500/10 border-green-500/30' :
          user?.english_level === 'intermediate' ? 'bg-yellow-500/10 border-yellow-500/30' :
          'bg-red-500/10 border-red-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <h2 className={`text-xl sm:text-2xl font-bold mb-2 ${getLevelColor(user?.english_level)}`}>
                {user?.english_level?.charAt(0).toUpperCase() + user?.english_level?.slice(1)} Level Debates
              </h2>
              <p className="text-gray-300 text-sm sm:text-base">
                Join evening group discussions with learners at your level
              </p>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-xl sm:text-2xl font-bold text-white">{activeGroups.length}/5</div>
              <div className="text-sm text-gray-400">Active Groups</div>
              {scheduledGroups.length > 0 && (
                <div className="text-sm text-blue-400 mt-1">
                  +{scheduledGroups.length} scheduled
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scheduled Groups Section */}
        {scheduledGroups.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-400" />
              <span>Upcoming Groups</span>
              <span className="text-sm text-gray-400">({scheduledGroups.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {scheduledGroups.map((group) => (
                <ScheduledGroupCard 
                  key={group.id} 
                  group={group}
                  onCountdownComplete={handleCountdownComplete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Groups Section */}
        {activeGroups.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-400" />
              <span>Active Groups - Join Now!</span>
              <span className="text-sm text-gray-400">({activeGroups.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {activeGroups.map((group) => {
                const isParticipant = group.participants?.includes(user.id)
                const participantCount = group.participants?.length || 0
                const maxParticipants = group.max_participants || 10

                return (
                  <div
                    key={group.id}
                    className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                  {/* Group Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Hosted by {group.host?.display_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getGroupStatusColor(group.status)}`}>
                      {group.status}
                    </span>
                  </div>

                  {/* Topic */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-1">Debate Topic:</h4>
                    <p className="text-white font-medium">{group.topic?.title}</p>
                    {group.topic?.description && (
                      <p className="text-sm text-gray-400 mt-1">{group.topic.description}</p>
                    )}
                  </div>

                  {/* Participants and Time Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {participantCount}/{maxParticipants} participants
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-300">
                          {formatTime(group.scheduled_start)} - {formatTime(group.scheduled_end)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Time Remaining Display */}
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-1">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span className="text-blue-400 text-xs font-medium">
                            Auto-closes: {getTimeRemaining(group.scheduled_end)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${(participantCount / maxParticipants) * 100}%` }}
                    ></div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {isParticipant ? (
                      <>
                        <button
                          disabled
                          className="flex-1 flex items-center justify-center space-x-2 py-2 bg-green-600 rounded-lg cursor-not-allowed"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-white text-sm">Joined</span>
                        </button>
                        <Link
                          to={`/group/${group.id}`}
                          className="flex-1 flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-white text-sm">Enter Chat</span>
                        </Link>
                      </>
                    ) : group.status === 'full' ? (
                      <button
                        disabled
                        className="flex-1 flex items-center justify-center space-x-2 py-2 bg-gray-600 rounded-lg cursor-not-allowed"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-white text-sm">Full</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => joinGroup(group.id, group.topic?.title)}
                        className="flex-1 flex items-center justify-center space-x-2 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span className="text-white text-sm">Join Group</span>
                      </button>
                    )}
                    
                    <button className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                      <Eye className="h-4 w-4 text-gray-300" />
                    </button>
                  </div>

                  {/* Admin Controls - Only visible to admins */}
                  {isAdmin && (
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="flex items-center space-x-2 mb-2">
                        <Settings className="h-4 w-4 text-purple-400" />
                        <span className="text-purple-400 text-xs font-medium">Admin Controls</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleAdminGroupAction(group.id, 'extend', group.name)}
                          className="flex items-center justify-center space-x-1 py-2 px-3 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-colors"
                          title="Extend group by 1 hour"
                        >
                          <Timer className="h-3 w-3 text-green-400" />
                          <span className="text-green-400 text-xs">+1h</span>
                        </button>
                        
                        <button
                          onClick={() => handleAdminGroupAction(group.id, 'close', group.name)}
                          className="flex items-center justify-center space-x-1 py-2 px-3 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg transition-colors"
                          title="Close group now"
                        >
                          <StopCircle className="h-3 w-3 text-yellow-400" />
                          <span className="text-yellow-400 text-xs">Close</span>
                        </button>
                        
                        <button
                          onClick={() => handleAdminGroupAction(group.id, 'delete', group.name)}
                          className="flex items-center justify-center space-x-1 py-2 px-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors"
                          title="Delete group permanently"
                        >
                          <Trash2 className="h-3 w-3 text-red-400" />
                          <span className="text-red-400 text-xs">Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        )}

        {/* Empty State - Show when no active groups during debate time or no scheduled groups */}
        {(scheduledGroups.length === 0 && activeGroups.length === 0) && (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Groups Available</h3>
            {isAdmin ? (
              <>
                <p className="text-gray-400 mb-6">
                  Create the first debate group as an admin!
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!canCreateGroup()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span className="text-white font-medium">Create First Group (Admin)</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-4">
                  No debate groups have been created yet.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="text-blue-400 font-medium">Admin Access Required</span>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Only administrators can create debate groups. Wait for an admin to create groups you can join.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-md border border-gray-700 mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Create Debate Group</h3>
              
              <div className="space-y-4">
                {/* Level Selector for Admins */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    English Level
                  </label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Create groups for any level as admin
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Debate Topic
                  </label>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {debateTopics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTopic?.id === topic.id
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                        }`}
                      >
                        <h4 className="text-white font-medium">{topic.title}</h4>
                        {topic.description && (
                          <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            Used {topic.usage_count} times
                          </span>
                          {selectedTopic?.id === topic.id && (
                            <CheckCircle className="h-4 w-4 text-purple-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Countdown Display (From AdminDashboard Defaults) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Countdown Timer (From Admin Defaults):
                  </label>
                  
                  <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <span className="text-blue-400 text-lg font-medium">
                      {countdownHours}h {countdownMinutes}m
                      {countdownHours === 0 && countdownMinutes === 0 && " (Immediate)"}
                    </span>
                    <p className="text-blue-300 text-xs mt-1">
                      Default for {selectedLevel} level
                    </p>
                  </div>
                  
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    {countdownHours === 0 && countdownMinutes === 0 
                      ? "Group will be available immediately for users to join"
                      : `Group will be visible to users but locked for ${countdownHours}h ${countdownMinutes}m`
                    }
                  </p>
                  
                  <p className="text-xs text-yellow-400 mt-1 text-center">
                    💡 To change defaults, go to Admin Dashboard → Countdown Defaults
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setSelectedTopic(null)
                    setGroupName('')
                  }}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <span className="text-white">Cancel</span>
                </button>
                <button
                  onClick={createGroup}
                  disabled={!selectedTopic || !groupName.trim() || creating}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  <span className="text-white">
                    {creating ? 'Creating...' : 'Create Group'}
                  </span>
                </button>
              </div>

              {!canCreateGroup() && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  {!isAdmin ? (
                    <div>
                      <p className="text-yellow-400 text-sm font-medium mb-1">
                        Admin Access Required
                      </p>
                      <p className="text-yellow-300 text-xs">
                        Only administrators can create debate groups. Contact an admin if you need a group created.
                      </p>
                    </div>
                  ) : adminCheckLoading ? (
                    <p className="text-yellow-400 text-sm">
                      Checking admin permissions...
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 