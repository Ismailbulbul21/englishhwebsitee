import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft,
  Users,
  MessageSquare,
  Clock,
  Settings,
  Plus,
  Edit,
  Trash2,
  Shield,
  BarChart3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Timer,
  StopCircle,
  Activity,
  Download
} from 'lucide-react'

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // State for different sections
  const [dashboardData, setDashboardData] = useState({
    stats: {},
    schedules: [],
    topics: [],
    users: [],
    settings: {},
    recentActions: []
  })
  
  // State for active groups management
  const [activeGroups, setActiveGroups] = useState([])
  const [loadingActiveGroups, setLoadingActiveGroups] = useState(false)
  
  // State for voice challenges management
  const [voiceChallenges, setVoiceChallenges] = useState([])
  const [loadingVoiceChallenges, setLoadingVoiceChallenges] = useState(false)
  
  // State for voice submissions management
  const [voiceSubmissions, setVoiceSubmissions] = useState([])
  const [loadingVoiceSubmissions, setLoadingVoiceSubmissions] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [selectedLevel, setSelectedLevel] = useState('all')
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showVoiceChallengeModal, setShowVoiceChallengeModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)
  const [editingVoiceChallenge, setEditingVoiceChallenge] = useState(null)
  
  // Form states - simplified to only countdown defaults
  const [scheduleForm, setScheduleForm] = useState({
    level: 'beginner',
    default_countdown_hours: 0,
    default_countdown_minutes: 30,
    is_active: true
  })
  
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    level: 'beginner',
    is_active: true
  })

  const [voiceChallengeForm, setVoiceChallengeForm] = useState({
    title: '',
    description: '',
    question: '',
    level: 'beginner',
    max_duration_seconds: 60,
    points_available: 10,
    challenge_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    is_active: true
  })

  // Function to get a random unused question for selected level
  const getRandomQuestionForLevel = async (level) => {
    try {
      const { data, error } = await supabase
        .from('voice_challenge_questions')
        .select('question')
        .eq('level', level)
        .eq('is_used', false)
        .limit(1)
      
      if (error) {
        console.error('Error fetching question:', error)
        return
      }

      if (data && data.length > 0) {
        // Auto-fill the question field
        setVoiceChallengeForm(prev => ({
          ...prev,
          question: data[0].question
        }))
      } else {
        // No more questions available for this level
        setVoiceChallengeForm(prev => ({
          ...prev,
          question: 'No more questions available for this level. Please write your own question.'
        }))
      }
    } catch (error) {
      console.error('Error getting question:', error)
    }
  }

  useEffect(() => {
    if (user) {
      loadAdminData()
    }
  }, [user])

  const loadAdminData = async () => {
    setLoading(true)
    setError('')
    try {
      console.log('🔄 Loading admin dashboard data...')
      
      const { data, error } = await supabase.rpc('get_admin_dashboard_data', {
        user_id_param: user.id
      })
      
      if (error) {
        console.error('❌ Admin data error:', error)
        if (error.message.includes('Unauthorized')) {
          setError('You do not have admin permissions to access this dashboard.')
        } else {
          setError(`Failed to load admin data: ${error.message}`)
        }
        return
      }

      if (data?.error) {
        setError(data.error)
        return
      }

      console.log('✅ Admin data loaded:', data)
      setDashboardData(data)
      
    } catch (error) {
      console.error('❌ Error loading admin data:', error)
      setError('Failed to connect to admin system')
    } finally {
      setLoading(false)
    }
  }

  const loadActiveGroups = async () => {
    setLoadingActiveGroups(true)
    try {
      console.log('🔄 Loading active groups...')
      
      const { data, error } = await supabase.rpc('get_admin_active_groups', {
        admin_id_param: user.id
      })
      
      if (error) {
        console.error('❌ Active groups error:', error)
        setError(`Failed to load active groups: ${error.message}`)
        return
      }

      if (data?.error) {
        setError(data.error)
        return
      }

      console.log('✅ Active groups loaded:', data.groups)
      setActiveGroups(data.groups || [])
      
    } catch (error) {
      console.error('❌ Error loading active groups:', error)
      setError('Failed to load active groups')
    } finally {
      setLoadingActiveGroups(false)
    }
  }

  const loadVoiceChallenges = async () => {
    setLoadingVoiceChallenges(true)
    setError('')
    try {
      console.log('🔄 Loading voice challenges...')
      
      const { data, error } = await supabase
        .from('voice_challenges')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Voice challenges error:', error)
        setError(`Failed to load voice challenges: ${error.message}`)
        return
      }

      console.log('✅ Voice challenges loaded:', data)
      setVoiceChallenges(data || [])
      
    } catch (error) {
      console.error('❌ Voice challenges error:', error)
      setError(`Failed to load voice challenges: ${error.message}`)
    } finally {
      setLoadingVoiceChallenges(false)
    }
  }

  const saveSchedule = async () => {
    setSaving(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('admin_update_schedule', {
        user_id_param: user.id,
        schedule_id: editingSchedule?.id || null,
        level_param: scheduleForm.level,
        default_countdown_hours_param: scheduleForm.default_countdown_hours,
        default_countdown_minutes_param: scheduleForm.default_countdown_minutes,
        is_active_param: scheduleForm.is_active
      })

      if (error) throw error

      if (data?.success) {
        setShowScheduleModal(false)
        setEditingSchedule(null)
        setScheduleForm({ level: 'beginner', default_countdown_hours: 0, default_countdown_minutes: 30, is_active: true })
        await loadAdminData()
        console.log('✅ Schedule saved successfully')
      } else {
        setError(data?.error || 'Failed to save schedule')
      }
    } catch (error) {
      console.error('❌ Error saving schedule:', error)
      setError('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const saveTopic = async () => {
    setSaving(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('admin_manage_topic', {
        user_id_param: user.id,
        topic_id: editingTopic?.id || null,
        action_param: editingTopic ? 'update' : 'create',
        title_param: topicForm.title,
        description_param: topicForm.description,
        level_param: topicForm.level,
        is_active_param: topicForm.is_active
      })

      if (error) throw error

      if (data?.success) {
        setShowTopicModal(false)
        setEditingTopic(null)
        setTopicForm({ title: '', description: '', level: 'beginner', is_active: true })
        await loadAdminData()
        console.log('✅ Topic saved successfully')
      } else {
        setError(data?.error || 'Failed to save topic')
      }
    } catch (error) {
      console.error('❌ Error saving topic:', error)
      setError('Failed to save topic')
    } finally {
      setSaving(false)
    }
  }

  const saveVoiceChallenge = async () => {
    setSaving(true)
    setError('')
    try {
      console.log('🔄 Saving voice challenge...')
      
      const { data, error } = await supabase.rpc('create_voice_challenge', {
        title_param: voiceChallengeForm.title,
        description_param: voiceChallengeForm.description,
        question_param: voiceChallengeForm.question,
        level_param: voiceChallengeForm.level,
        max_duration_seconds_param: voiceChallengeForm.max_duration_seconds,
        points_available_param: voiceChallengeForm.points_available,
        challenge_date_param: voiceChallengeForm.challenge_date,
        start_time_param: voiceChallengeForm.start_time || null,
        end_time_param: voiceChallengeForm.end_time || null,
        is_active_param: voiceChallengeForm.is_active,
        created_by_param: user.id
      })

      if (error) {
        console.error('❌ Error saving challenge:', error)
        throw error
      }

      if (data?.success) {
        // Mark the used question as used in the database
        try {
          await supabase
            .from('voice_challenge_questions')
            .update({ is_used: true })
            .eq('question', voiceChallengeForm.question)
            .eq('level', voiceChallengeForm.level)
        } catch (updateError) {
          console.error('Warning: Could not mark question as used:', updateError)
          // Don't fail the save if this update fails
        }

        setShowVoiceChallengeModal(false)
        setEditingVoiceChallenge(null)
        setVoiceChallengeForm({
          title: '',
          description: '',
          question: '',
          level: 'beginner',
          max_duration_seconds: 60,
          points_available: 10,
          challenge_date: new Date().toISOString().split('T')[0],
          start_time: '',
          end_time: '',
          is_active: true
        })
        await loadVoiceChallenges()
        console.log('✅ Voice challenge saved successfully')
      } else {
        setError(data?.error || 'Failed to save voice challenge')
      }
    } catch (error) {
      console.error('❌ Error saving voice challenge:', error)
      setError(`Failed to save voice challenge: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const deleteTopic = async (topicId) => {
    if (!confirm('Are you sure you want to delete this topic?')) return

    try {
      const { data, error } = await supabase.rpc('admin_manage_topic', {
        user_id_param: user.id,
        topic_id: topicId,
        action_param: 'delete'
      })

      if (error) throw error

      if (data?.success) {
        await loadAdminData()
        console.log('✅ Topic deleted successfully')
      } else {
        setError(data?.error || 'Failed to delete topic')
      }
    } catch (error) {
      console.error('❌ Error deleting topic:', error)
      setError('Failed to delete topic')
      }
  }

  const deleteVoiceChallenge = async (challengeId) => {
    if (!confirm('Are you sure you want to delete this voice challenge?')) return

    try {
      const { error } = await supabase
        .from('voice_challenges')
        .delete()
        .eq('id', challengeId)

      if (error) throw error

      await loadVoiceChallenges()
      console.log('✅ Voice challenge deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting voice challenge:', error)
      setError('Failed to delete voice challenge')
    }
  }

  const updateUserStatus = async (userId, newStatus) => {
    try {
      const { error } = await supabase.rpc('admin_update_user_status', {
        target_user_id: userId,
        new_status: newStatus,
        admin_id_param: user.id,
        reason: `Status changed to ${newStatus} by admin`
      })

      if (error) throw error
      
      await loadAdminData()
      alert(`User status updated to ${newStatus}`)
    } catch (error) {
      console.error('❌ Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  const handleGroupAction = async (groupId, action, groupName) => {
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
        await loadActiveGroups() // Refresh the groups list
        alert(`✅ ${data.message}`)
      } else {
        alert(`❌ ${data.error}`)
      }
    } catch (error) {
      console.error(`Error ${action}ing group:`, error)
      alert(`Failed to ${action} group`)
    }
  }

  // Load active groups when tab changes to active-groups
  useEffect(() => {
    if (activeTab === 'active-groups' && user) {
      loadActiveGroups()
    }
  }, [activeTab, user])

  // Load voice challenges when tab changes to voice-challenges
  useEffect(() => {
    if (activeTab === 'voice-challenges' && user) {
      loadVoiceChallenges()
    }
  }, [activeTab, user])

  // Load voice submissions when a challenge is selected
  useEffect(() => {
    console.log('🔄 useEffect triggered - selectedChallenge:', selectedChallenge, 'activeTab:', activeTab, 'selectedLevel:', selectedLevel)
    if (selectedChallenge && activeTab === 'voice-submissions') {
      console.log('✅ Calling loadVoiceSubmissions with challenge:', selectedChallenge, 'level:', selectedLevel)
      loadVoiceSubmissions(selectedChallenge, selectedLevel)
    }
  }, [selectedChallenge, activeTab, selectedLevel])

  const editSchedule = (schedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      level: schedule.level,
      default_countdown_hours: schedule.default_countdown_hours || 0,
      default_countdown_minutes: schedule.default_countdown_minutes || 30,
      is_active: schedule.is_active
    })
    setShowScheduleModal(true)
  }

  const editTopic = (topic) => {
    setEditingTopic(topic)
    setTopicForm({
      title: topic.title,
      description: topic.description || '',
      level: topic.level,
      is_active: topic.is_active
    })
    setShowTopicModal(true)
  }

  const editVoiceChallenge = (challenge) => {
    setEditingVoiceChallenge(challenge)
    setVoiceChallengeForm({
      title: challenge.title,
      description: challenge.description || '',
      question: challenge.question || '',
      level: challenge.level,
      max_duration_seconds: challenge.max_duration_seconds || 60,
      points_available: challenge.points_available || 10,
      challenge_date: challenge.challenge_date,
      start_time: challenge.start_time ? challenge.start_time.split('T')[1].substring(0, 5) : '',
      end_time: challenge.end_time ? challenge.end_time.split('T')[1].substring(0, 5) : '',
      is_active: challenge.is_active
    })
    setShowVoiceChallengeModal(true)
  }

  // Function to handle opening the voice challenge modal
  const openVoiceChallengeModal = () => {
    setEditingVoiceChallenge(null)
    setVoiceChallengeForm({
      title: '',
      description: '',
      question: '',
      level: 'beginner',
      max_duration_seconds: 60,
      points_available: 10,
      challenge_date: new Date().toISOString().split('T')[0],
      start_time: '',
      end_time: '',
      is_active: true
    })
    setShowVoiceChallengeModal(true)
    // Auto-fill question for beginner level when modal opens
    setTimeout(() => getRandomQuestionForLevel('beginner'), 100)
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'beginner': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'advanced': return 'text-red-400 bg-red-500/10 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'suspended': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'banned': return 'text-red-400 bg-red-500/10 border-red-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getGroupStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'active': return 'text-green-400 bg-green-500/10 border-green-500/30'
      case 'scheduled': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      case 'full': return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  // Load voice submissions for a specific challenge
  const loadVoiceSubmissions = async (challengeId, level = 'all') => {
    if (!challengeId) return
    
    console.log('🔄 Loading voice submissions for challenge:', challengeId, 'level:', level)
    setLoadingVoiceSubmissions(true)
    try {
      // First, get all voice submissions for the challenge
      let query = supabase
        .from('voice_submissions')
        .select(`
          *,
          voice_challenges!inner(
            level
          )
        `)
        .eq('challenge_id', challengeId)
        .order('submitted_at', { ascending: false })

      // Filter by level if specified
      if (level !== 'all') {
        query = query.eq('voice_challenges.level', level)
      }

      const { data: submissions, error: submissionsError } = await query

      if (submissionsError) throw submissionsError

      console.log('📊 Raw submissions data:', submissions)

      if (!submissions || submissions.length === 0) {
        console.log('❌ No submissions found')
        setVoiceSubmissions([])
        return
      }

      // Get user IDs from submissions
      const userIds = submissions.map(s => s.user_id)
      console.log('👥 User IDs from submissions:', userIds)

      // Fetch user names for these users
      const { data: userNames, error: namesError } = await supabase
        .from('user_full_names')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)

      if (namesError) throw namesError

      console.log('👤 User names data:', userNames)

      // Create a map of user_id to names
      const userNamesMap = {}
      if (userNames) {
        userNames.forEach(user => {
          userNamesMap[user.user_id] = {
            first_name: user.first_name || 'Unknown',
            last_name: user.last_name || 'User'
          }
        })
      }

      console.log('🗺️ User names map:', userNamesMap)

      // Transform submissions with user names and level info
      const transformedData = submissions.map(submission => ({
        ...submission,
        first_name: userNamesMap[submission.user_id]?.first_name || 'Unknown',
        last_name: userNamesMap[submission.user_id]?.last_name || 'User',
        challenge_level: submission.voice_challenges?.level || 'unknown'
      }))

      console.log('✅ Final transformed data:', transformedData)
      setVoiceSubmissions(transformedData)
    } catch (error) {
      console.error('❌ Error loading voice submissions:', error)
      alert('Failed to load voice submissions')
    } finally {
      setLoadingVoiceSubmissions(false)
    }
  }

  // Select a winner for a voice challenge
  const selectWinner = async (submissionId) => {
    try {
      // Get the submission details
      const submission = voiceSubmissions.find(s => s.id === submissionId)
      if (!submission) return

      console.log('🏆 Selecting winner:', submission)

      // Call the database function to announce winner
      const { error } = await supabase.rpc('announce_daily_winner', {
        p_challenge_id: submission.challenge_id,
        p_winner_user_id: submission.user_id,
        p_winner_full_name: `${submission.first_name} ${submission.last_name}`
      })

      if (error) throw error

      // Refresh submissions with current level filter
      loadVoiceSubmissions(selectedChallenge, selectedLevel)
      alert(`Winner selected successfully! ${submission.first_name} ${submission.last_name} is now the winner for the ${submission.challenge_level} level challenge.`)
    } catch (error) {
      console.error('Error selecting winner:', error)
      alert('Failed to select winner')
    }
  }

  // Download voice submission audio
  const downloadSubmission = (submission) => {
    const link = document.createElement('a')
    link.href = submission.voice_file_url
    link.download = `voice_submission_${submission.id}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white/60">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md mx-4 text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">Access Denied</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={loadAdminData}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-xl transition-colors"
            >
              Retry
            </button>
            <Link
              to="/"
              className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl transition-colors text-center"
            >
              Go Back
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                to="/"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                <h1 className="text-lg sm:text-xl font-light text-white">Maamulka HadalHub</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:block text-white/60 text-sm">Welcome, {user?.display_name}</span>
              <button
                onClick={loadAdminData}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap gap-1 mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'active-groups', label: 'Active Groups', icon: Activity },
            { id: 'schedules', label: 'Countdown Defaults', icon: Clock },
            { id: 'topics', label: 'Topics', icon: MessageSquare },
            { id: 'voice-challenges', label: 'Voice Challenges', icon: MessageSquare },
            { id: 'voice-submissions', label: 'Voice Submissions', icon: MessageSquare },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-xl transition-colors text-sm ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs sm:text-sm">Total Users</p>
                    <p className="text-xl sm:text-2xl font-light text-white">{dashboardData.stats?.totalUsers || 0}</p>
                  </div>
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs sm:text-sm">Active Groups</p>
                    <p className="text-xl sm:text-2xl font-light text-white">{dashboardData.stats?.activeGroups || 0}</p>
                  </div>
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs sm:text-sm">Debate Topics</p>
                    <p className="text-xl sm:text-2xl font-light text-white">{dashboardData.stats?.totalTopics || 0}</p>
                  </div>
                  <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs sm:text-sm">Today's Messages</p>
                    <p className="text-xl sm:text-2xl font-light text-white">{dashboardData.stats?.todayMessages || 0}</p>
                  </div>
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Recent Actions */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-medium mb-4">Recent Admin Actions</h3>
              <div className="space-y-3">
                {dashboardData.recentActions?.length > 0 ? dashboardData.recentActions.map(action => (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div>
                      <p className="text-white text-sm">{action.admin?.display_name || 'Unknown Admin'}</p>
                      <p className="text-white/60 text-xs">{action.action_type.replace('_', ' ')}</p>
                    </div>
                    <span className="text-white/40 text-xs">
                      {new Date(action.created_at).toLocaleString()}
                    </span>
                  </div>
                )) : (
                  <p className="text-white/60 text-center py-4">No recent actions</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Active Groups Tab */}
        {activeTab === 'active-groups' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-light text-white">Active Groups Management</h2>
              <button
                onClick={loadActiveGroups}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingActiveGroups ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-white/60">Loading active groups...</p>
              </div>
            ) : activeGroups.length > 0 ? (
              <div className="space-y-4">
                {activeGroups.map((group) => {
                  const timeRemaining = group.time_remaining > 0 
                    ? `${Math.floor(group.time_remaining / 3600)}h ${Math.floor((group.time_remaining % 3600) / 60)}m`
                    : 'Expired'
                  
                  return (
                    <div key={group.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-white font-medium text-lg">{group.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(group.level)}`}>
                              {group.level}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getGroupStatusColor(group.status)}`}>
                              {group.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-white/60">Host</p>
                              <p className="text-white">{group.host?.display_name || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Participants</p>
                              <p className="text-white">{group.participant_count}/{group.max_participants}</p>
                            </div>
                            <div>
                              <p className="text-white/60">Time Remaining</p>
                              <p className={`font-medium ${group.time_remaining > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                {timeRemaining}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <p className="text-white/60 text-sm">Topic</p>
                            <p className="text-white font-medium">{group.topic?.title || 'No topic'}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleGroupAction(group.id, 'extend', group.name)}
                            className="flex items-center justify-center space-x-2 py-2 px-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-colors"
                            title="Extend group by 1 hour"
                          >
                            <Timer className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 text-sm">Extend +1h</span>
                          </button>
                          
                          <button
                            onClick={() => handleGroupAction(group.id, 'close', group.name)}
                            className="flex items-center justify-center space-x-2 py-2 px-4 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg transition-colors"
                            title="Close group now"
                          >
                            <StopCircle className="h-4 w-4 text-yellow-400" />
                            <span className="text-yellow-400 text-sm">Close Now</span>
                          </button>
                          
                          <button
                            onClick={() => handleGroupAction(group.id, 'delete', group.name)}
                            className="flex items-center justify-center space-x-2 py-2 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg transition-colors"
                            title="Delete group permanently"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                            <span className="text-red-400 text-sm">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Active Groups</h3>
                <p className="text-gray-400">No groups are currently active. Create a group to see it here.</p>
              </div>
            )}
          </div>
        )}

        {/* Group Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-light text-white">Default Countdown Settings</h2>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Countdown Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {dashboardData.schedules?.map(schedule => (
                <div key={schedule.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(schedule.level)}`}>
                      {schedule.level}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editSchedule(schedule)}
                        className="text-white/60 hover:text-white"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-white/60" />
                      <span className="text-white">
                        Default: {schedule.default_countdown_hours || 0}h {schedule.default_countdown_minutes || 30}m
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {schedule.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className={schedule.is_active ? 'text-green-400' : 'text-red-400'}>
                        {schedule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-light text-white">Debate Topics</h2>
              <button
                onClick={() => setShowTopicModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Topic</span>
              </button>
            </div>

            <div className="space-y-4">
              {dashboardData.topics?.map(topic => (
                <div key={topic.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-white font-medium">{topic.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(topic.level)}`}>
                          {topic.level}
                        </span>
                        {topic.is_active ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <p className="text-white/60 text-sm mb-2">{topic.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-white/40">
                        <span>Used {topic.usage_count} times</span>
                        <span>Created by {topic.created_by?.display_name || 'System'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => editTopic(topic)}
                        className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteTopic(topic.id)}
                        className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Challenges Tab */}
        {activeTab === 'voice-challenges' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-light text-white">Voice Challenges</h2>
              <button
                onClick={openVoiceChallengeModal}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Voice Challenge</span>
              </button>
            </div>

            {loadingVoiceChallenges ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-white/60">Loading voice challenges...</p>
              </div>
            ) : voiceChallenges.length > 0 ? (
              <div className="space-y-4">
                {voiceChallenges.map((challenge) => (
                  <div key={challenge.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-medium">{challenge.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(challenge.level)}`}>
                            {challenge.level}
                          </span>
                          {challenge.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <p className="text-white/60 text-sm mb-2">{challenge.description}</p>
                        <p className="text-white/80 text-sm mb-3 font-medium">"{challenge.question}"</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-white/40">
                          <div>
                            <span className="text-white/60">Duration:</span>
                            <span className="ml-1">{challenge.max_duration_seconds}s</span>
                          </div>
                          <div>
                            <span className="text-white/60">Points:</span>
                            <span className="ml-1">{challenge.points_available}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Date:</span>
                            <span className="ml-1">{new Date(challenge.challenge_date).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-white/60">Created:</span>
                            <span className="ml-1">{new Date(challenge.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => editVoiceChallenge(challenge)}
                          className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteVoiceChallenge(challenge.id)}
                          className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">No Voice Challenges Yet</h3>
                <p className="text-white/40 text-sm">Create your first voice challenge to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* Voice Submissions Tab */}
        {activeTab === 'voice-submissions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl sm:text-2xl font-light text-white">Voice Challenge Submissions</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                              <select
                value={selectedChallenge || ''}
                onChange={(e) => {
                  setSelectedChallenge(e.target.value || null)
                  setSelectedLevel('all') // Reset level filter when challenge changes
                }}
                className="bg-white/10 border border-white/20 rounded-lg text-white px-4 py-2"
              >
                <option value="">Select a Voice Challenge</option>
                {voiceChallenges.map(challenge => (
                  <option key={challenge.id} value={challenge.id}>{challenge.title}</option>
                ))}
              </select>
                
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg text-white px-4 py-2"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {selectedChallenge ? (
              <>
                {/* Level Summary */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <h3 className="text-white font-medium mb-3">Submissions Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {['beginner', 'intermediate', 'advanced'].map(level => {
                      const count = voiceSubmissions.filter(s => s.challenge_level === level).length
                      return (
                        <div key={level} className="text-center">
                          <div className={`text-2xl font-bold ${getLevelColor(level).split(' ')[0]}`}>
                            {count}
                          </div>
                          <div className="text-white/60 text-sm capitalize">{level}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {loadingVoiceSubmissions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-white/60">Loading submissions...</p>
                  </div>
                ) : voiceSubmissions.length > 0 ? (
                  <div className="space-y-4">
                    {voiceSubmissions.map(submission => (
                      <div key={submission.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-white font-medium">
                                {submission.first_name} {submission.last_name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(submission.challenge_level)}`}>
                                {submission.challenge_level}
                              </span>
                              <span className="text-white/60 text-sm">ID: {submission.id.slice(0, 8)}...</span>
                            </div>
                            <p className="text-white/60 text-sm mb-2">Duration: {submission.voice_duration_seconds}s</p>
                            <p className="text-white/60 text-sm">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                            
                            {/* Audio Player */}
                            <div className="mt-4">
                              <audio 
                                controls 
                                className="w-full" 
                                src={submission.voice_file_url}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => selectWinner(submission.id)}
                              disabled={submission.is_winner}
                              className={`p-2 rounded-lg transition-colors ${
                                submission.is_winner 
                                  ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                                  : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                              }`}
                              title={submission.is_winner ? 'Already Winner' : 'Select as Winner'}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => downloadSubmission(submission)}
                              className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
                              title="Download Audio"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-white/60 text-lg mb-2">No Submissions Yet</h3>
                    <p className="text-white/40 text-sm">No one has submitted for this challenge yet.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-white/60 text-lg mb-2">Select a Voice Challenge</h3>
                <p className="text-white/40 text-sm">Choose a challenge from the dropdown to view submissions.</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-light text-white">User Management</h2>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">User</th>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">Level</th>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">Status</th>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">Progress</th>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">Last Active</th>
                      <th className="text-left p-4 text-white/60 text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.users?.map(userItem => (
                      <tr key={userItem.id} className="border-t border-white/10">
                        <td className="p-4">
                          <div>
                            <p className="text-white font-medium">{userItem.display_name}</p>
                            <p className="text-white/60 text-sm">{userItem.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(userItem.english_level)}`}>
                            {userItem.english_level}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(userItem.status)}`}>
                            {userItem.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <p className="text-white">{userItem.total_lessons_completed} lessons</p>
                            <p className="text-white/60">{userItem.total_quizzes_passed} quizzes</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-white/60 text-sm">
                            {userItem.last_activity ? new Date(userItem.last_activity).toLocaleDateString() : 'Never'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            {userItem.status === 'active' && (
                              <>
                                <button
                                  onClick={() => updateUserStatus(userItem.id, 'suspended')}
                                  className="text-yellow-400 hover:text-yellow-300 p-1 rounded transition-colors"
                                  title="Suspend User"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => updateUserStatus(userItem.id, 'banned')}
                                  className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                                  title="Ban User"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {userItem.status !== 'active' && (
                              <button
                                onClick={() => updateUserStatus(userItem.id, 'active')}
                                className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                                title="Activate User"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {dashboardData.users?.map(userItem => (
                <div key={userItem.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{userItem.display_name}</p>
                        <p className="text-white/60 text-sm">{userItem.email}</p>
                      </div>
                      <div className="flex space-x-2">
                        {userItem.status === 'active' && (
                          <>
                            <button
                              onClick={() => updateUserStatus(userItem.id, 'suspended')}
                              className="text-yellow-400 hover:text-yellow-300 p-1 rounded transition-colors"
                              title="Suspend User"
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => updateUserStatus(userItem.id, 'banned')}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                              title="Ban User"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {userItem.status !== 'active' && (
                          <button
                            onClick={() => updateUserStatus(userItem.id, 'active')}
                            className="text-green-400 hover:text-green-300 p-1 rounded transition-colors"
                            title="Activate User"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Level</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getLevelColor(userItem.english_level)}`}>
                          {userItem.english_level}
                        </span>
                      </div>
                      <div>
                        <p className="text-white/60">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(userItem.status)}`}>
                          {userItem.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-white/60">Progress</p>
                        <div className="text-white">
                          <p>{userItem.total_lessons_completed} lessons</p>
                          <p className="text-white/60">{userItem.total_quizzes_passed} quizzes</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-white/60">Last Active</p>
                        <p className="text-white">
                          {userItem.last_activity ? new Date(userItem.last_activity).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-light text-white">Platform Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <h3 className="text-white font-medium mb-4">Group Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">Max Groups per Level</label>
                    <input
                      type="number"
                      value={dashboardData.settings?.max_groups_per_level || 5}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2">Daily Group Limit per User</label>
                    <input
                      type="number"
                      value={dashboardData.settings?.daily_group_limit_per_user || 1}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-white/60 text-sm mb-2">Max Participants per Group</label>
                    <input
                      type="number"
                      value={dashboardData.settings?.max_participants_per_group || 10}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6">
                <h3 className="text-white font-medium mb-4">Platform Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/60 text-sm mb-2">Current Status</label>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <span className="text-green-400">Active</span>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm">
                    Platform is running normally. All features are available to users.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-md border border-gray-700 mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingSchedule ? 'Edit Countdown Default' : 'Add Countdown Default'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                <select
                  value={scheduleForm.level}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Countdown Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Default Countdown for New Groups</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Hours</label>
                    <select
                      value={scheduleForm.default_countdown_hours}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, default_countdown_hours: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value={0}>0 hours</option>
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Minutes</label>
                    <select
                      value={scheduleForm.default_countdown_minutes}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, default_countdown_minutes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value={0}>0 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                    </select>
                  </div>
                </div>
                <div className="text-center mt-2 p-2 bg-blue-500/10 rounded-lg">
                  <span className="text-blue-400 text-sm">
                    Default: {scheduleForm.default_countdown_hours}h {scheduleForm.default_countdown_minutes}m
                  </span>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={scheduleForm.is_active}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowScheduleModal(false)
                  setEditingSchedule(null)
                  setScheduleForm({ level: 'beginner', default_countdown_hours: 0, default_countdown_minutes: 30, is_active: true })
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveSchedule}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-md border border-gray-700 mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingTopic ? 'Edit Topic' : 'Add Topic'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={topicForm.title}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter topic title..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={topicForm.description}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter topic description..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                <select
                  value={topicForm.level}
                  onChange={(e) => setTopicForm(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={topicForm.is_active}
                    onChange={(e) => setTopicForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowTopicModal(false)
                  setEditingTopic(null)
                  setTopicForm({ title: '', description: '', level: 'beginner', is_active: true })
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveTopic}
                disabled={saving || !topicForm.title.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Challenge Modal */}
      {showVoiceChallengeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-4 sm:p-6 w-full max-w-2xl border border-gray-700 mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingVoiceChallenge ? 'Edit Voice Challenge' : 'Add Voice Challenge'}
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                  <input
                    type="text"
                    value={voiceChallengeForm.title}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter challenge title..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Level *</label>
                  <select
                    value={voiceChallengeForm.level}
                    onChange={(e) => {
                      const newLevel = e.target.value
                      setVoiceChallengeForm(prev => ({ ...prev, level: newLevel }))
                      // Auto-fill question when level changes
                      getRandomQuestionForLevel(newLevel)
                    }}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                <textarea
                  value={voiceChallengeForm.description}
                  onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter challenge description..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question *</label>
                <textarea
                  value={voiceChallengeForm.question}
                  onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question users need to answer..."
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Max Duration (seconds) *</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={voiceChallengeForm.max_duration_seconds}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, max_duration_seconds: parseInt(e.target.value) || 60 }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Points Available</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={voiceChallengeForm.points_available}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, points_available: parseInt(e.target.value) || 10 }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Challenge Date *</label>
                  <input
                    type="date"
                    value={voiceChallengeForm.challenge_date}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, challenge_date: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time (optional)</label>
                  <input
                    type="time"
                    value={voiceChallengeForm.start_time}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">End Time (optional)</label>
                <input
                  type="time"
                  value={voiceChallengeForm.end_time}
                  onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, end_time: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={voiceChallengeForm.is_active}
                    onChange={(e) => setVoiceChallengeForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowVoiceChallengeModal(false)
                  setEditingVoiceChallenge(null)
                  setVoiceChallengeForm({
                    title: '',
                    description: '',
                    question: '',
                    level: 'beginner',
                    max_duration_seconds: 60,
                    points_available: 10,
                    challenge_date: new Date().toISOString().split('T')[0],
                    start_time: '',
                    end_time: '',
                    is_active: true
                  })
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveVoiceChallenge}
                disabled={saving || !voiceChallengeForm.title.trim() || !voiceChallengeForm.description.trim() || !voiceChallengeForm.question.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors text-white flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 