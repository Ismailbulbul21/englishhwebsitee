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
  RefreshCw
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
  
  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    level: 'beginner',
    start_time: '20:00',
    end_time: '23:00',
    days_of_week: [1,2,3,4,5,6,7],
    is_active: true
  })
  
  const [topicForm, setTopicForm] = useState({
    title: '',
    description: '',
    level: 'beginner',
    is_active: true
  })

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

  const saveSchedule = async () => {
    setSaving(true)
    setError('')
    try {
      const { data, error } = await supabase.rpc('admin_update_schedule', {
        user_id_param: user.id,
        schedule_id: editingSchedule?.id || null,
        level_param: scheduleForm.level,
        start_time_param: scheduleForm.start_time,
        end_time_param: scheduleForm.end_time,
        days_of_week_param: scheduleForm.days_of_week,
        is_active_param: scheduleForm.is_active
      })

      if (error) throw error

      if (data?.success) {
        setShowScheduleModal(false)
        setEditingSchedule(null)
        setScheduleForm({ level: 'beginner', start_time: '20:00', end_time: '23:00', days_of_week: [1,2,3,4,5,6,7], is_active: true })
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

  const editSchedule = (schedule) => {
    setEditingSchedule(schedule)
    setScheduleForm({
      level: schedule.level,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      days_of_week: schedule.days_of_week,
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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <Shield className="h-6 w-6 text-purple-500" />
                <h1 className="text-xl font-light text-white">Maamulka HadalHub</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-white/60 text-sm">Welcome, {user?.display_name}</span>
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'schedules', label: 'Group Times', icon: Clock },
            { id: 'topics', label: 'Topics', icon: MessageSquare },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Total Users</p>
                    <p className="text-2xl font-light text-white">{dashboardData.stats?.totalUsers || 0}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Active Groups</p>
                    <p className="text-2xl font-light text-white">{dashboardData.stats?.activeGroups || 0}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Debate Topics</p>
                    <p className="text-2xl font-light text-white">{dashboardData.stats?.totalTopics || 0}</p>
                  </div>
                  <MessageSquare className="h-8 w-8 text-purple-400" />
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-sm">Today's Messages</p>
                    <p className="text-2xl font-light text-white">{dashboardData.stats?.todayMessages || 0}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-400" />
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

        {/* Group Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-white">Group Opening Times</h2>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Schedule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {dashboardData.schedules?.map(schedule => (
                <div key={schedule.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
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
                      <span className="text-white">{schedule.start_time} - {schedule.end_time}</span>
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-white">Debate Topics</h2>
              <button
                onClick={() => setShowTopicModal(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light text-white">User Management</h2>
            
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
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
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-light text-white">Platform Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
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

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
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
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Add Schedule'}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
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
                  setScheduleForm({ level: 'beginner', start_time: '20:00', end_time: '23:00', days_of_week: [1,2,3,4,5,6,7], is_active: true })
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
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
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
    </div>
  )
} 