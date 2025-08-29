import { useState } from 'react'
import { supabase } from '../lib/supabase'

const AnnouncementModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    is_active: true,
    expires_at: ''
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from('announcements')
        .insert([{
          title: formData.title,
          message: formData.message,
          type: formData.type,
          is_active: formData.is_active,
          expires_at: formData.expires_at || null
        }])

      if (error) {
        console.error('Error creating announcement:', error)
        alert('Failed to create announcement. Please try again.')
        return
      }

      // Reset form
      setFormData({
        title: '',
        message: '',
        type: 'info',
        is_active: true,
        expires_at: ''
      })

      // Close modal and refresh
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 w-full max-w-lg mx-4 border border-gray-700/50 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white tracking-wide">Create Announcement</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl font-light transition-colors duration-200 hover:scale-110"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 tracking-wide">
              Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-200 hover:border-gray-500/70"
              placeholder="Enter announcement title"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 tracking-wide">
              Message *
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-200 hover:border-gray-500/70 resize-none"
              placeholder="Enter announcement message"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 tracking-wide">
              Type
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-200 hover:border-gray-500/70 cursor-pointer"
            >
              <option value="info">ℹ️ Info (Blue)</option>
              <option value="success">✅ Success (Green)</option>
              <option value="warning">⚠️ Warning (Yellow)</option>
              <option value="error">❌ Error (Red)</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500/50 border-gray-600 rounded-lg
                         bg-gray-800/50 focus:bg-gray-700/50 transition-all duration-200"
            />
            <label className="text-gray-200 font-medium tracking-wide">
              Active (visible to users)
            </label>
          </div>

          {/* Expiration Date (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2 tracking-wide">
              Expiration Date (Optional)
            </label>
            <input
              type="datetime-local"
              name="expires_at"
              value={formData.expires_at}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                         transition-all duration-200 hover:border-gray-500/70"
            />
            <p className="text-xs text-gray-400 mt-2 italic">
              Leave empty for no expiration
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-600/50 rounded-xl text-gray-300 hover:text-white
                         hover:bg-gray-800/50 hover:border-gray-500/70 focus:outline-none focus:ring-2 
                         focus:ring-gray-500/50 transition-all duration-200 font-medium tracking-wide"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl
                         hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 
                         focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 font-medium tracking-wide shadow-lg hover:shadow-xl
                         transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </div>
              ) : (
                'Create Announcement'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AnnouncementModal
