import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ArrowLeft, 
  MessageCircle, 
  Send, 
  Users,
  Clock,
  Hash,
  Crown,
  Settings
} from 'lucide-react'

export default function GroupChat({ user }) {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [chatSession, setChatSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  
  const messagesEndRef = useRef(null)
  const subscriptionRef = useRef(null)

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  // Load group data and chat session
  useEffect(() => {
    if (!user || !groupId) return

    const loadGroupChat = async () => {
      try {
        setLoading(true)
        
        // Load group information
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select(`
            *,
            topic:debate_topics(title, description),
            host:users(display_name),
            chat_session:chat_sessions(*)
          `)
          .eq('id', groupId)
          .single()

        if (groupError) throw groupError

        // Check if user is a participant
        if (!groupData.participants.includes(user.id)) {
          setError('You are not a member of this group')
          return
        }

        setGroup(groupData)
        setChatSession(groupData.chat_session)

        // Load participants
        const { data: participantData, error: participantError } = await supabase
          .from('users')
          .select('id, display_name, english_level')
          .in('id', groupData.participants)

        if (!participantError) {
          setParticipants(participantData || [])
        }

        // Load messages
        if (groupData.chat_session?.id) {
          await loadMessages(groupData.chat_session.id)
          setupRealtimeSubscription(groupData.chat_session.id)
        }

      } catch (error) {
        console.error('Error loading group chat:', error)
        setError('Failed to load group chat')
      } finally {
        setLoading(false)
      }
    }

    loadGroupChat()

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [user, groupId])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Load messages
  const loadMessages = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(display_name, english_level)
        `)
        .eq('chat_session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  // Setup realtime subscription
  const setupRealtimeSubscription = (sessionId) => {
    subscriptionRef.current = supabase
      .channel(`group_chat_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new.sender_id !== user.id) {
          // Load the new message with sender info
          supabase
            .from('messages')
            .select(`
              *,
              sender:users(display_name, english_level)
            `)
            .eq('id', payload.new.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                setMessages(prev => [...prev, data])
              }
            })
        }
      })
      .subscribe()
  }

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !chatSession?.id || sending) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    try {
      setSending(true)
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_session_id: chatSession.id,
          sender_id: user.id,
          content: messageContent,
          message_type: 'text'
        })
        .select(`
          *,
          sender:users(display_name, english_level)
        `)
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
    } catch (error) {
      console.error('Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  // Format time
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading group chat...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <Link
            to="/debates"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl transition-colors"
          >
            Back to Debates
          </Link>
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
            <div className="flex items-center space-x-4">
              <Link
                to="/debates"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-10 h-10 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {group?.name?.charAt(0).toUpperCase() || 'G'}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">{group?.name}</h1>
                  <p className="text-white/60 text-sm">
                    {group?.level} level • {participants.length} members
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-white/60 text-sm">
                <Clock className="h-4 w-4 inline mr-1" />
                {group?.scheduled_start && formatTime(group.scheduled_start)} - {group?.scheduled_end && formatTime(group.scheduled_end)}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Group Info & Participants */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              {/* Topic Info */}
              {group?.topic && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                  <h3 className="text-white font-medium mb-2 flex items-center space-x-2">
                    <Hash className="h-4 w-4" />
                    <span>Debate Topic</span>
                  </h3>
                  <p className="text-white text-sm font-medium">{group.topic.title}</p>
                  {group.topic.description && (
                    <p className="text-white/60 text-xs mt-2">{group.topic.description}</p>
                  )}
                </div>
              )}

              {/* Participants */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Participants ({participants.length})</span>
                </h3>
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-8 h-8 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {participant.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-white text-sm">{participant.display_name}</p>
                          {participant.id === group?.host_id && (
                            <Crown className="h-3 w-3 text-yellow-400" />
                          )}
                        </div>
                        <p className="text-white/60 text-xs">{participant.english_level}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl h-[600px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">Welcome to the group debate!</p>
                    <p className="text-white/40 text-sm mt-1">
                      Topic: {group?.topic?.title}
                    </p>
                    <p className="text-white/40 text-xs mt-2">
                      Be respectful and stay on topic
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-xs lg:max-w-md">
                        {message.sender_id !== user.id && (
                          <p className="text-white/60 text-xs mb-1 ml-2">
                            {message.sender?.display_name}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            message.sender_id === user.id
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_id === user.id ? 'text-purple-100' : 'text-white/60'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-white/10 p-4">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    placeholder={`Message ${group?.name}...`}
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 transition-colors"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white p-2 rounded-xl transition-colors"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 