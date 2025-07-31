import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Clock, 
  MessageCircle,
  Eye,
  CheckCircle,
  AlertCircle,
  Calendar,
  Hash
} from 'lucide-react'

export default function GroupDebates({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [debateTopics, setDebateTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [currentSchedule, setCurrentSchedule] = useState(null)

  useEffect(() => {
    if (user) {
      fetchGroups()
      fetchDebateTopics()
      fetchCurrentSchedule()
    }
  }, [user])

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          topic:debate_topics(title, description),
          host:users(display_name)
        `)
        .eq('level', user.english_level)
        .in('status', ['waiting', 'active'])
        .gte('scheduled_end', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchDebateTopics = async () => {
    try {
      const { data, error } = await supabase
        .from('debate_topics')
        .select('*')
        .eq('level', user.english_level)
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

  const fetchCurrentSchedule = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_level_schedule', { level_param: user.english_level })

      if (error) throw error
      setCurrentSchedule(data)
    } catch (error) {
      console.error('Error fetching schedule:', error)
      // Fallback to default times if database fails
      setCurrentSchedule({
        start_time: '20:00:00',
        end_time: '23:00:00'
      })
    }
  }

  const createGroup = async () => {
    if (!selectedTopic || !groupName.trim()) return

    setCreating(true)
    try {
      const { data, error } = await supabase
        .rpc('create_debate_group', {
          group_name_param: groupName.trim(),
          level_param: user.english_level,
          topic_id_param: selectedTopic.id,
          host_id_param: user.id
        })

      if (error) throw error

      if (data.success) {
        setShowCreateModal(false)
        setSelectedTopic(null)
        setGroupName('')
        fetchGroups()
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

  const formatTimeFromString = (timeString) => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getScheduleDisplay = () => {
    if (!currentSchedule) return 'Loading schedule...'
    const startTime = formatTimeFromString(currentSchedule.start_time)
    const endTime = formatTimeFromString(currentSchedule.end_time)
    return `${startTime} - ${endTime}`
  }

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
    return (user?.groups_created_today || 0) < 1
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
              <div className="flex items-center space-x-2 text-gray-300">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{getScheduleDisplay()}</span>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!canCreateGroup()}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="text-white text-sm">Create Group</span>
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
              <div className="text-xl sm:text-2xl font-bold text-white">{groups.length}/5</div>
              <div className="text-sm text-gray-400">Active Groups</div>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {groups.map((group) => {
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

                  {/* Participants */}
                  <div className="flex items-center justify-between mb-4">
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
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Active Groups</h3>
            <p className="text-gray-400 mb-6">
              Be the first to create a debate group for tonight!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!canCreateGroup()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <span className="text-white font-medium">Create First Group</span>
            </button>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-md border border-gray-700 mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Create Debate Group</h3>
              
              <div className="space-y-4">
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
                  <p className="text-yellow-400 text-sm">
                    You can only create 1 group per day. Limit resets at midnight.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 