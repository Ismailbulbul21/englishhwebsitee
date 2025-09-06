import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true
    setIsStandalone(standalone)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS install instructions after a delay
    if (iOS && !standalone) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('installPromptDismissed', 'true')
  }

  // Don't show if already dismissed this session or if already installed
  if (!showInstallPrompt || isStandalone || sessionStorage.getItem('installPromptDismissed')) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 shadow-2xl border border-blue-500/30">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Soo dagso hadalhub</h3>
              <p className="text-blue-100 text-xs">App ahaan u isticmaal</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            <p className="text-white text-sm">
              🇸🇴 <strong> Qaabka loo dagsado:</strong>
            </p>
            <div className="text-white text-xs space-y-1">
              <p>1. Taabo Share button-ka (⬆️)</p>
              <p>2. Dooro "Add to Home Screen"</p>
              <p>3. ka dibna "Add" ku dhufo</p>
            </div>
            <p className="text-white text-sm">
              🇺🇸 <strong>Install the app:</strong>
            </p>
            <div className="text-white text-xs space-y-1">
              <p>1. Tap the Share button (⬆️)</p>
              <p>2. Select "Add to Home Screen"</p>
              <p>3. Tap "Add"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-white text-sm">
              🇸🇴 <strong>Soo dagso websiteka :</strong> Taabo "Install" button-ka hoose
            </p>
            <p className="text-white text-sm">
              🇺🇸 <strong>Install the app:</strong> Tap the "Install" button below
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Install App
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
