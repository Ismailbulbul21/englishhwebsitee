import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useVoiceRecording } from '../lib/useVoiceRecording'
import VoiceMessage from './VoiceMessage'
import { 
  ArrowLeft, 
  MessageCircle, 
  Send, 
  Users,
  Search,
  Heart,
  MoreHorizontal,
  X,
  Plus,
  Mic
} from 'lucide-react'

export default function RandomChat({ user }) {
  const [activeChats, setActiveChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [realtimeStatus, setRealtimeStatus] = useState('connecting') // 'connecting', 'connected', 'disconnected'
  const [recentStatusUpdate, setRecentStatusUpdate] = useState(null) // For showing real-time update notifications
  
  const messagesEndRef = useRef(null)
  const subscriptionsRef = useRef(new Map())
  const matchRequestSubscriptionRef = useRef(null)

  // Voice recording hook
  const {
    isRecording,
    recordingTime,
    audioBlob,
    isUploading,
    error: voiceError,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadVoiceMessage,
    formatTime,
    cleanup: cleanupVoice
  } = useVoiceRecording()

  // Optimized scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  // Initialize component
  useEffect(() => {
    if (!user) return

    const initialize = async () => {
      setLoading(true)
      try {
        await Promise.all([
          checkForActiveChats(),
          loadPendingRequests(),
          loadSentRequests()
        ])
        
        // Setup real-time subscriptions
        setupMatchRequestSubscription()
      } catch (error) {
        console.error('❌ Chat initialization failed:', error)
        setError('Failed to load chats')
      } finally {
        setLoading(false)
      }
    }

    initialize()
    
    // Add debug functions to window for troubleshooting
    if (typeof window !== 'undefined') {
      window.debugRandomChat = () => {
        console.log('🔍 RandomChat Debug Info:')
        console.log('- User:', user)
        console.log('- Active Chats:', activeChats)
        console.log('- Current Chat ID:', currentChatId)
        console.log('- Pending Requests:', pendingRequests)
        console.log('- Sent Requests:', sentRequests)
        console.log('- Available Users:', availableUsers)
        console.log('- Loading:', loading)
        console.log('- Error:', error)
        console.log('- Real-time Status:', realtimeStatus)
        console.log('- Chat Subscriptions:', Array.from(subscriptionsRef.current.keys()))
        console.log('- Match Request Subscription:', matchRequestSubscriptionRef.current ? 'Active' : 'Inactive')
        console.log('- Recent Status Update:', recentStatusUpdate)
      }
      
      window.refreshChats = () => {
        console.log('🔄 Force refreshing chats...')
        setError('')
        checkForActiveChats()
        loadPendingRequests()
        loadSentRequests()
      }
      
      window.testMatchRequestSubscription = () => {
        console.log('🧪 Testing match request subscription...')
        console.log('- Subscription active:', matchRequestSubscriptionRef.current ? 'Yes' : 'No')
        console.log('- User ID:', user.id)
        console.log('- Sent requests count:', sentRequests.length)
        
        if (matchRequestSubscriptionRef.current) {
          console.log('- Subscription channel:', matchRequestSubscriptionRef.current.topic)
        } else {
          console.log('❌ No match request subscription found')
        }
      }
      
      window.testChatFunction = async () => {
        console.log('🧪 Testing chat function directly...')
        try {
          const { data, error } = await supabase
            .rpc('get_user_active_chat_session', { user_id_param: user.id })
          console.log('Function result:', { data, error })
        } catch (err) {
          console.error('Function test error:', err)
        }
      }
      
      window.testRealtimeConnection = () => {
        console.log('🧪 Testing real-time connection...')
        console.log('- Real-time Status:', realtimeStatus)
        console.log('- Active Subscriptions:', subscriptionsRef.current.size)
        console.log('- Current Chat ID:', currentChatId)
        
        // Test basic connectivity
        const testChannel = supabase.channel('test-channel-' + Date.now())
        testChannel
          .on('broadcast', { event: 'test' }, (payload) => {
            console.log('✅ Real-time test successful:', payload)
          })
          .subscribe((status) => {
            console.log('🧪 Test channel status:', status)
            if (status === 'SUBSCRIBED') {
              // Send test broadcast
              testChannel.send({
                type: 'broadcast',
                event: 'test',
                payload: { message: 'Real-time is working!', timestamp: new Date() }
              })
              
              // Clean up after 3 seconds
              setTimeout(() => {
                testChannel.unsubscribe()
                console.log('🧪 Test channel cleaned up')
              }, 3000)
            }
          })
      }
      
      window.sendTestMessage = async () => {
        if (!currentChatId) {
          console.log('❌ No active chat to test with')
          return
        }
        
        console.log('🧪 Sending test message to chat:', currentChatId)
        
        try {
          const { data, error } = await supabase
            .from('messages')
            .insert({
              chat_session_id: currentChatId,
              sender_id: user.id,
              content: `🧪 Test message sent at ${new Date().toLocaleTimeString()}`,
              message_type: 'text'
            })
            .select(`
              *,
              sender:users(display_name, english_level)
            `)
            .single()

          if (error) throw error
          console.log('✅ Test message sent successfully:', data)
        } catch (error) {
          console.error('❌ Test message failed:', error)
        }
      }
    }
    
    return () => {
      // Cleanup chat subscriptions
      subscriptionsRef.current.forEach(subscription => {
        subscription.unsubscribe()
      })
      subscriptionsRef.current.clear()
      
      // Cleanup match request subscription
      if (matchRequestSubscriptionRef.current) {
        matchRequestSubscriptionRef.current.unsubscribe()
        matchRequestSubscriptionRef.current = null
      }
      
      // Cleanup voice recording
      cleanupVoice()
      
      // Cleanup debug functions
      if (typeof window !== 'undefined') {
        delete window.debugRandomChat
        delete window.refreshChats
        delete window.testChatFunction
        delete window.testRealtimeConnection
        delete window.sendTestMessage
        delete window.testMatchRequestSubscription
      }
    }
  }, [user])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [activeChats, currentChatId, scrollToBottom])

  // Enhanced check for existing active chats - supports multiple chats
  const checkForActiveChats = async () => {
    try {
      console.log('🔍 Loading all active chat sessions for user:', user.id)
      
      const { data: activeSessions, error } = await supabase
        .rpc('get_user_active_chat_session', { user_id_param: user.id })

      if (error) {
        console.error('❌ Error loading active sessions:', error)
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })
        
        // Don't throw error, just show empty state
        setActiveChats([])
        setCurrentChatId(null)
        setError(`Failed to load chats: ${error.message}`)
        return
      }

      console.log(`✅ Found ${activeSessions?.length || 0} active chat sessions`)
      console.log('Active sessions data:', activeSessions)

      if (activeSessions && activeSessions.length > 0) {
        const loadedChats = await Promise.all(
          activeSessions.map(async (session) => {
            console.log('📥 Loading chat session:', session.id, 'type:', session.type)
            
            const partnerId = session.participants.find(id => id !== user.id)
            let partnerData = null
            
            if (partnerId) {
              try {
                const { data: partner } = await supabase
                  .from('users')
                  .select('id, display_name, english_level, gender')
                  .eq('id', partnerId)
                  .single()
                partnerData = partner
                console.log('👤 Partner loaded:', partner?.display_name)
              } catch (partnerError) {
                console.warn('⚠️ Failed to load partner data:', partnerError)
                // Continue with null partner data
              }
            }
            
            const messages = await loadMessagesForSession(session.id)
            const subscription = setupChatSubscription(session.id)
            
            return {
              session,
              partner: partnerData,
              messages: messages || [],
              subscription,
              lastActivity: new Date(session.updated_at || session.created_at)
            }
          })
        )
        
        // Sort chats by last activity (most recent first)
        loadedChats.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
        
        setActiveChats(loadedChats)
        
        // Set current chat to most recent if none selected
        if (loadedChats.length > 0 && !currentChatId) {
          setCurrentChatId(loadedChats[0].session.id)
          console.log('🎯 Set current chat to:', loadedChats[0].partner?.display_name)
        }
        
        console.log(`🎉 Successfully loaded ${loadedChats.length} chat sessions`)
        setError('') // Clear any previous errors
      } else {
        console.log('ℹ️ No active chat sessions found')
        setActiveChats([])
        setCurrentChatId(null)
        setError('') // Clear any previous errors
      }
    } catch (error) {
      console.error('❌ Error loading active chats:', error)
      console.error('Error stack:', error.stack)
      
      // Set user-friendly error message
      setError('Unable to load your chats. Please refresh the page.')
      setActiveChats([])
      setCurrentChatId(null)
    }
  }

  // Load messages for a session
  const loadMessagesForSession = async (sessionId) => {
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
      return data || []
    } catch (error) {
      console.error('❌ Error loading messages for session:', sessionId, error)
      return []
    }
  }

  // Setup chat subscription with improved error handling
  const setupChatSubscription = (sessionId) => {
    // Clean up existing subscription if it exists
    const existingSubscription = subscriptionsRef.current.get(sessionId)
    if (existingSubscription) {
      console.log('🧹 Cleaning up existing subscription for session:', sessionId)
      existingSubscription.unsubscribe()
    }

    console.log('🔔 Setting up real-time subscription for session:', sessionId)
    
    const subscription = supabase
      .channel(`chat_${sessionId}_${Date.now()}`) // Unique channel name
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_session_id=eq.${sessionId}`
      }, async (payload) => {
        console.log('📨 Real-time message received:', payload.new)
        
        // Only process messages from other users
        if (payload.new.sender_id !== user.id) {
          console.log('👤 Message from other user, processing...')
          
          try {
            // Fetch complete message data with sender info
            const { data: messageData, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(display_name, english_level)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              console.error('❌ Error fetching message data:', error)
              return
            }

            if (messageData) {
              console.log('✅ Adding real-time message to chat:', messageData.content)
              
              // Update the specific chat with new message
              setActiveChats(prev => prev.map(chat => {
                if (chat.session.id === sessionId) {
                  // Check if message already exists to prevent duplicates
                  const messageExists = chat.messages.some(msg => msg.id === messageData.id)
                  if (messageExists) {
                    console.log('⚠️ Message already exists, skipping duplicate')
                    return chat
                  }
                  
                  console.log('📝 Adding new message to chat with', chat.partner?.display_name)
                  return { 
                    ...chat, 
                    messages: [...chat.messages, messageData],
                    lastActivity: new Date()
                  }
                }
                return chat
              }))
            }
          } catch (error) {
            console.error('❌ Error processing real-time message:', error)
          }
        } else {
          console.log('👤 Own message, ignoring real-time notification')
        }
      })
      .subscribe((status) => {
        console.log(`🔔 Subscription status for session ${sessionId}:`, status)
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time subscription active for session ${sessionId}`)
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Real-time subscription error for session ${sessionId}`)
          setRealtimeStatus('disconnected')
          
          // Retry subscription after a delay
          setTimeout(() => {
            console.log('🔄 Retrying subscription for session:', sessionId)
            setRealtimeStatus('connecting')
            setupChatSubscription(sessionId)
          }, 2000)
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ Subscription timed out for session ${sessionId}, retrying...`)
          setRealtimeStatus('connecting')
          
          // Retry subscription
          setTimeout(() => {
            setupChatSubscription(sessionId)
          }, 1000)
        } else if (status === 'CLOSED') {
          console.warn(`🔌 Subscription closed for session ${sessionId}`)
          setRealtimeStatus('disconnected')
        }
      })

    subscriptionsRef.current.set(sessionId, subscription)
    return subscription
  }

  // Load pending requests
  const loadPendingRequests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_pending_match_requests')
      if (error) throw error
      setPendingRequests(data || [])
      console.log(`📬 Loaded ${data?.length || 0} pending requests`)
    } catch (error) {
      console.error('❌ Error loading pending requests:', error)
    }
  }

  // Load sent requests
  const loadSentRequests = async () => {
    try {
      const { data, error } = await supabase.rpc('get_sent_match_requests')
      if (error) throw error
      setSentRequests(data || [])
      console.log(`📤 Loaded ${data?.length || 0} sent requests`)
    } catch (error) {
      console.error('❌ Error loading sent requests:', error)
    }
  }

  // Setup real-time subscription for match request status updates
  const setupMatchRequestSubscription = () => {
    if (!user) return

    // Clean up existing subscription
    if (matchRequestSubscriptionRef.current) {
      console.log('🧹 Cleaning up existing match request subscription')
      matchRequestSubscriptionRef.current.unsubscribe()
    }

    console.log('🔔 Setting up real-time subscription for match requests')
    
    const subscription = supabase
      .channel(`match_requests_${user.id}_${Date.now()}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'match_requests',
        filter: `requester_id=eq.${user.id}` // Only listen for updates to requests we sent
      }, async (payload) => {
        console.log('📨 Match request status updated:', payload.new)
        
        const updatedRequest = payload.new
        
        // Update the sent requests list
        setSentRequests(prev => prev.map(request => 
          request.id === updatedRequest.id 
            ? { ...request, status: updatedRequest.status, responded_at: updatedRequest.responded_at }
            : request
        ))

        // Show notification for status change
        const currentRequest = sentRequests.find(r => r.id === updatedRequest.id)
        if (currentRequest) {
          setRecentStatusUpdate({
            targetName: currentRequest.target_name,
            status: updatedRequest.status,
            timestamp: new Date()
          })
          
          // Hide notification after 5 seconds
          setTimeout(() => {
            setRecentStatusUpdate(null)
          }, 5000)
        }

        // If request was accepted, check for new chat session
        if (updatedRequest.status === 'accepted') {
          console.log('🎉 Match request accepted! Checking for new chat session...')
          
          // Small delay to ensure chat session is created
          setTimeout(async () => {
            await checkForActiveChats()
          }, 1000)
        }

        console.log(`✅ Updated match request status to: ${updatedRequest.status}`)
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_sessions',
        filter: `participants.cs.{${user.id}}` // Listen for new chat sessions where user is participant
      }, async (payload) => {
        console.log('📨 New chat session created:', payload.new)
        
        // Add the new chat session
        if (payload.new.participants.includes(user.id)) {
          console.log('🎉 New chat session includes current user, adding to active chats')
          await addNewChatSession(payload.new.id)
        }
      })
      .subscribe((status) => {
        console.log(`🔔 Match requests subscription status:`, status)
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Real-time match request subscription active`)
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Real-time match request subscription error`)
          setRealtimeStatus('disconnected')
          
          // Retry subscription after a delay
          setTimeout(() => {
            console.log('🔄 Retrying match request subscription')
            setRealtimeStatus('connecting')
            setupMatchRequestSubscription()
          }, 2000)
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏰ Match request subscription timed out, retrying...`)
          setRealtimeStatus('connecting')
          
          // Retry subscription
          setTimeout(() => {
            setupMatchRequestSubscription()
          }, 1000)
        } else if (status === 'CLOSED') {
          console.warn(`🔌 Match request subscription closed`)
          setRealtimeStatus('disconnected')
        }
      })

    matchRequestSubscriptionRef.current = subscription
    return subscription
  }

  // Load available users
  const loadAvailableUsers = async () => {
    if (loadingUsers) return
    
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .rpc('get_available_partners', {
          user_id_param: user.id,
          user_level_param: user.english_level
        })

      if (error) throw error
      setAvailableUsers(data || [])
      console.log(`👥 Loaded ${data?.length || 0} available partners`)
    } catch (error) {
      console.error('❌ Error loading available users:', error)
      setAvailableUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Send message with better error handling
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || loading) return

    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_session_id: currentChatId,
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

      // Update the specific chat with new message and activity
      setActiveChats(prev => prev.map(chat => 
        chat.session.id === currentChatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, data],
              lastActivity: new Date()
            }
          : chat
      ))

      console.log('✅ Message sent successfully')
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setError('Failed to send message')
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setLoading(false)
    }
  }

  // Send voice message
  const sendVoiceMessage = async () => {
    if (!currentChatId || !audioBlob) return

    try {
      const messageData = await uploadVoiceMessage(currentChatId, user.id)
      
      if (messageData) {
        // Update the specific chat with new voice message
        setActiveChats(prev => prev.map(chat => 
          chat.session.id === currentChatId 
            ? { 
                ...chat, 
                messages: [...chat.messages, messageData],
                lastActivity: new Date()
              }
            : chat
        ))

        console.log('✅ Voice message sent successfully')
      }
    } catch (error) {
      console.error('❌ Error sending voice message:', error)
      setError('Failed to send voice message')
    }
  }



  // Send match request
  const sendMatchRequest = async (targetUserId, message = '') => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.rpc('send_match_request', {
        target_user_id_param: targetUserId,
        message_param: message || null
      })

      if (error) throw error

      if (data.success) {
        setShowNewChatModal(false)
        setRequestMessage('')
        setSelectedUser(null)
        await Promise.all([
          loadAvailableUsers(),
          loadSentRequests()
        ])
        console.log('✅ Match request sent successfully')
      } else {
        setError(data.error)
      }
    } catch (error) {
      console.error('❌ Error sending match request:', error)
      setError('Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced respond to match request with multi-chat support
  const respondToMatchRequest = async (requestId, response) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.rpc('respond_to_match_request', {
        request_id_param: requestId,
        response_param: response
      })

      if (error) throw error

      if (data && data.success) {
        await Promise.all([
          loadPendingRequests(),
          loadSentRequests()
        ])
        
        if (response === 'accepted' && data.chat_session_id) {
          console.log('🎉 Match accepted! New chat session:', data.chat_session_id)
          
          // Add the new chat to existing chats instead of reloading all
          await addNewChatSession(data.chat_session_id)
        }
      }
    } catch (error) {
      console.error('❌ Error responding to request:', error)
      setError('Failed to respond to request')
    } finally {
      setLoading(false)
    }
  }

  // Add new chat session to active chats
  const addNewChatSession = async (sessionId) => {
    try {
      console.log('➕ Adding new chat session:', sessionId)
      
      // Get the new session details
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Get partner info
      const partnerId = session.participants.find(id => id !== user.id)
      let partnerData = null
      
      if (partnerId) {
        const { data: partner } = await supabase
          .from('users')
          .select('id, display_name, english_level, gender')
          .eq('id', partnerId)
          .single()
        partnerData = partner
      }

      // Load messages and setup subscription
      const messages = await loadMessagesForSession(sessionId)
      const subscription = setupChatSubscription(sessionId)

      const newChat = {
        session,
        partner: partnerData,
        messages: messages || [],
        subscription,
        lastActivity: new Date()
      }

      // Add to active chats and set as current
      setActiveChats(prev => {
        // Check if chat already exists
        const exists = prev.some(chat => chat.session.id === sessionId)
        if (exists) {
          console.log('⚠️ Chat session already exists, skipping add')
          return prev
        }
        
        // Add new chat at the beginning (most recent)
        const updated = [newChat, ...prev]
        console.log(`✅ Added new chat. Total active chats: ${updated.length}`)
        return updated
      })
      
      // Switch to the new chat
      setCurrentChatId(sessionId)
      console.log('🎯 Switched to new chat:', partnerData?.display_name)
      
    } catch (error) {
      console.error('❌ Error adding new chat session:', error)
      // Fallback: reload all chats
      await checkForActiveChats()
    }
  }

  // End chat with improved cleanup
  const endChat = async (chatId) => {
    const chatToEnd = chatId || currentChatId
    if (!chatToEnd) return

    try {
      console.log('🔚 Ending chat session:', chatToEnd)
      
      await supabase
        .from('chat_sessions')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', chatToEnd)

      // Remove from active chats
      setActiveChats(prev => {
        const remaining = prev.filter(chat => chat.session.id !== chatToEnd)
        
        // Update current chat if needed
        if (currentChatId === chatToEnd) {
          const newCurrentId = remaining.length > 0 ? remaining[0].session.id : null
          setCurrentChatId(newCurrentId)
          console.log('🎯 Switched to chat:', newCurrentId ? remaining[0].partner?.display_name : 'none')
        }
        
        console.log(`✅ Chat ended. Remaining chats: ${remaining.length}`)
        return remaining
      })

      // Cleanup subscription
      const subscription = subscriptionsRef.current.get(chatToEnd)
      if (subscription) {
        subscription.unsubscribe()
        subscriptionsRef.current.delete(chatToEnd)
        console.log('🧹 Cleaned up subscription for:', chatToEnd)
      }
    } catch (error) {
      console.error('❌ Error ending chat:', error)
    }
  }

  if (loading && activeChats.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading chats...</div>
      </div>
    )
  }

  const currentChat = activeChats.find(chat => chat.session.id === currentChatId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Minimal Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-xl font-light text-white">
                Sheekaysi {activeChats.length > 0 && `(${activeChats.length})`}
              </h1>
            </div>
            
            <button
              onClick={() => {
                loadAvailableUsers()
                setShowNewChatModal(true)
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Real-time Status Update Notification */}
        {recentStatusUpdate && (
          <div className={`mb-4 p-4 rounded-xl border transition-all duration-500 ${
            recentStatusUpdate.status === 'accepted' 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                recentStatusUpdate.status === 'accepted' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <div>
                <p className={`font-medium ${
                  recentStatusUpdate.status === 'accepted' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {recentStatusUpdate.status === 'accepted' 
                    ? `🎉 ${recentStatusUpdate.targetName} accepted your request!` 
                    : `😔 ${recentStatusUpdate.targetName} declined your request`
                  }
                </p>
                <p className="text-white/60 text-sm">
                  {recentStatusUpdate.status === 'accepted' 
                    ? 'A new chat has been created. Check your active chats!' 
                    : 'You can send requests to other people'
                  }
                </p>
              </div>
              <button
                onClick={() => setRecentStatusUpdate(null)}
                className="text-white/40 hover:text-white/60 ml-auto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 font-medium">Connection Issue</p>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError('')
                  checkForActiveChats()
                }}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
              <Heart className="h-4 w-4 text-pink-400" />
              <span>Incoming Requests ({pendingRequests.length})</span>
            </h3>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <div>
                    <p className="text-white font-medium">{request.requester_name}</p>
                    {request.message && (
                      <p className="text-white/60 text-sm">"{request.message}"</p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => respondToMatchRequest(request.id, 'accepted')}
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respondToMatchRequest(request.id, 'rejected')}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="mb-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span>Your Sent Requests ({sentRequests.length})</span>
            </h3>
            <div className="space-y-2">
              {sentRequests.map((request) => (
                <div key={request.id} className="p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-10 h-10 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {request.target_name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-white font-medium">{request.target_name}</p>
                          {request.target_gender && (
                            <span className={`text-xs ${
                              request.target_gender === 'male' ? 'text-blue-400' : 'text-pink-400'
                            }`}>
                              {request.target_gender === 'male' ? '♂' : '♀'}
                            </span>
                          )}
                        </div>
                        <p className="text-white/60 text-sm">{request.target_level} level</p>
                        {request.message && (
                          <div className="mt-1 p-2 bg-white/10 rounded-lg">
                            <p className="text-white/80 text-sm italic">"{request.message}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : request.status === 'accepted'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {request.status === 'pending' ? '⏳ Pending' : 
                         request.status === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                      </div>
                      <p className="text-white/40 text-xs mt-1">
                        {new Date(request.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {request.status === 'pending' && request.expires_at && (
                        <p className="text-white/40 text-xs">
                          Expires: {new Date(request.expires_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Chat Interface */}
        {activeChats.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Enhanced Chat List Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Active Chats</span>
                  </div>
                  <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs font-bold">
                    {activeChats.length}
                  </div>
                </h3>
                
                {activeChats.length > 1 && (
                  <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-400 text-xs text-center">
                      🎉 Multi-chat active! Click to switch between conversations
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {activeChats
                    .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
                    .map((chat) => {
                      const isSelected = currentChatId === chat.session.id
                      const lastMessage = chat.messages[chat.messages.length - 1]
                      const unreadCount = 0 // TODO: Implement unread counting
                      
                      return (
                        <button
                          key={chat.session.id}
                          onClick={() => {
                            setCurrentChatId(chat.session.id)
                            console.log('🎯 Switched to chat:', chat.partner?.display_name)
                          }}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            isSelected 
                              ? 'bg-white/10 border border-white/20 ring-1 ring-blue-500/30' 
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-10 h-10 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                  {chat.partner?.display_name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              {isSelected && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-3 h-3 border-2 border-gray-900"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-1 flex-1 min-w-0">
                                  <p className="text-white font-medium text-sm truncate">
                                    {chat.partner?.display_name || 'Unknown User'}
                                  </p>
                                  {chat.partner?.gender && (
                                    <span className={`text-xs ${
                                      chat.partner.gender === 'male' ? 'text-blue-400' : 'text-pink-400'
                                    }`}>
                                      {chat.partner.gender === 'male' ? '♂' : '♀'}
                                    </span>
                                  )}
                                </div>
                                {unreadCount > 0 && (
                                  <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                                    {unreadCount}
                                  </div>
                                )}
                              </div>
                              <p className="text-white/60 text-xs truncate">
                                {lastMessage 
                                  ? (lastMessage.sender_id === user.id ? 'You: ' : '') + lastMessage.content
                                  : 'No messages yet'
                                }
                              </p>
                              <p className="text-white/40 text-xs mt-1">
                                {new Date(chat.lastActivity).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-3">
              {currentChat ? (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">
                  {/* Chat Header */}
                  <div className="border-b border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {currentChat.partner?.display_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-white font-medium">
                              {currentChat.partner?.display_name || 'Unknown User'}
                            </p>
                            {currentChat.partner?.gender && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                currentChat.partner.gender === 'male' 
                                  ? 'bg-blue-500/20 text-blue-400' 
                                  : 'bg-pink-500/20 text-pink-400'
                              }`}>
                                {currentChat.partner.gender === 'male' ? '♂' : '♀'}
                              </span>
                            )}
                            {/* Real-time Status Indicator */}
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                              realtimeStatus === 'connected' 
                                ? 'bg-green-500/20 text-green-400' 
                                : realtimeStatus === 'connecting'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                realtimeStatus === 'connected' 
                                  ? 'bg-green-400 animate-pulse' 
                                  : realtimeStatus === 'connecting'
                                  ? 'bg-yellow-400 animate-pulse'
                                  : 'bg-red-400'
                              }`}></div>
                              <span>
                                {realtimeStatus === 'connected' ? 'Live' : 
                                 realtimeStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                              </span>
                            </div>
                          </div>
                          <p className="text-white/60 text-sm">
                            {currentChat.partner?.english_level} level • Online
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => endChat(currentChatId)}
                        className="text-white/60 hover:text-red-400 transition-colors"
                        title="End this chat"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="h-96 overflow-y-auto p-4 space-y-4">
                    {currentChat.messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="h-12 w-12 text-white/30 mx-auto mb-3" />
                        <p className="text-white/60">Start your conversation!</p>
                        <p className="text-white/40 text-sm mt-1">
                          Say hello to {currentChat.partner?.display_name}
                        </p>
                      </div>
                    ) : (
                      currentChat.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.message_type === 'voice' ? (
                            <VoiceMessage
                              message={message}
                              isOwnMessage={message.sender_id === user.id}
                              timestamp={new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            />
                          ) : (
                            <div
                              className={`max-w-xs px-4 py-2 rounded-2xl ${
                                message.sender_id === user.id
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white/10 text-white'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.sender_id === user.id ? 'text-blue-100' : 'text-white/60'
                              }`}>
                                {new Date(message.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-white/10 p-4">
                    {/* Voice Recording Bar */}
                    {isRecording && (
                      <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                              <div className="relative bg-red-500 rounded-full w-8 h-8 flex items-center justify-center">
                                <Mic className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <div>
                              <p className="text-red-400 font-medium text-sm">Recording...</p>
                              <p className="text-red-300 text-xs">{formatTime(recordingTime)}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={cancelRecording}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={stopRecording}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Stop
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Voice Ready to Send Bar */}
                    {audioBlob && !isRecording && (
                      <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="bg-green-500 rounded-full w-8 h-8 flex items-center justify-center">
                              <Mic className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="text-green-400 font-medium text-sm">Voice message ready</p>
                              <p className="text-green-300 text-xs">Duration: {formatTime(recordingTime)}</p>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={cancelRecording}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                            >
                              Re-record
                            </button>
                            <button
                              onClick={sendVoiceMessage}
                              disabled={isUploading}
                              className="bg-green-500 hover:bg-green-600 disabled:bg-green-600 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
                            >
                              {isUploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                  <span>Sending...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3" />
                                  <span>Send</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

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
                        placeholder={`Message ${currentChat.partner?.display_name || 'partner'}...`}
                        className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 transition-colors"
                        disabled={loading || isRecording}
                      />
                      <button
                        onClick={isRecording ? stopRecording : (audioBlob ? sendVoiceMessage : startRecording)}
                        disabled={loading || isUploading}
                        className={`p-2 rounded-xl transition-colors ${
                          isRecording 
                            ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : audioBlob
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                        title={isRecording ? 'Stop recording' : audioBlob ? 'Send voice message' : 'Record voice message'}
                      >
                        {isUploading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : isRecording ? (
                          <div className="animate-pulse">
                            <Mic className="h-5 w-5" />
                          </div>
                        ) : audioBlob ? (
                          <Send className="h-5 w-5" />
                        ) : (
                          <Mic className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || loading || isRecording}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white p-2 rounded-xl transition-colors"
                      >
                        {loading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Voice Error Display */}
                    {voiceError && (
                      <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-xs">{voiceError}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 text-center">
                  <MessageCircle className="h-16 w-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60 text-lg">Select a chat to start messaging</p>
                  <p className="text-white/40 text-sm mt-2">
                    Choose from {activeChats.length} active conversation{activeChats.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 max-w-md mx-auto">
              <MessageCircle className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No Active Chats</h3>
              <p className="text-white/60 mb-6">Start conversations with multiple people</p>
              <button
                onClick={() => {
                  loadAvailableUsers()
                  setShowNewChatModal(true)
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Find Chat Partners
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-white">Find Chat Partner</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-white/60 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedUser ? (
              <div>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-12 h-12 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {selectedUser.display_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{selectedUser.display_name}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.gender === 'male' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-pink-500/20 text-pink-400'
                        }`}>
                          {selectedUser.gender === 'male' ? '♂ Male' : '♀ Female'}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">{selectedUser.english_level} level</p>
                    </div>
                  </div>
                </div>

                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hi! I'd love to practice English with you..."
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/40 transition-colors mb-4"
                  rows={3}
                  maxLength={200}
                />

                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => sendMatchRequest(selectedUser.id, requestMessage)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-xl transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-white/60">Loading partners...</div>
                  </div>
                ) : availableUsers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableUsers.map((availableUser) => (
                      <button
                        key={availableUser.id}
                        onClick={() => setSelectedUser(availableUser)}
                        className="w-full p-3 bg-white/5 hover:bg-white/10 rounded-xl text-left transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="bg-gradient-to-r from-blue-400 to-purple-500 rounded-full w-10 h-10 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {availableUser.display_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-white font-medium">{availableUser.display_name}</p>
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  availableUser.gender === 'male' 
                                    ? 'bg-blue-500/20 text-blue-400' 
                                    : 'bg-pink-500/20 text-pink-400'
                                }`}>
                                  {availableUser.gender === 'male' ? '♂ Male' : '♀ Female'}
                                </span>
                              </div>
                            </div>
                            <p className="text-white/60 text-sm">{availableUser.english_level} level</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No partners available right now</p>
                    <button
                      onClick={loadAvailableUsers}
                      className="mt-3 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
} 