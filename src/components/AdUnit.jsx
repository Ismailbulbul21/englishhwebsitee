import { useEffect, useRef } from 'react';

const AdUnit = ({ 
  adClient, 
  adSlot, 
  format = 'auto', 
  className = '', 
  label = 'Advertisement',
  style = {},
  responsive = true 
}) => {
  const adRef = useRef(null);

  useEffect(() => {
    // Only load AdSense script if not already loaded
    if (!window.adsbygoogle) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        // Push ad after script loads
        if (window.adsbygoogle && adRef.current) {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      };
      document.head.appendChild(script);
    } else {
      // Script already loaded, push ad immediately
      if (window.adsbygoogle && adRef.current) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    }
  }, [adClient, adSlot]);

  // Don't render anything if no ad client or slot provided (wait for approval)
  if (!adClient || !adSlot) {
    return null; // Hide completely until AdSense is approved
  }

  return (
    <div className={`ad-unit ${className}`} style={style}>
      {/* Ad Label */}
      {label && (
        <div className="text-center text-xs text-gray-500 mb-2 uppercase tracking-wide">
          {label}
        </div>
      )}
      
      {/* AdSense Ad Unit */}
      <ins 
        ref={adRef}
        className="adsbygoogle"
        style={{ 
          display: 'block',
          textAlign: 'center',
          ...style 
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

// Pre-configured ad components for common placements
export const HeaderBannerAd = ({ adClient, adSlot, className = '' }) => (
  <AdUnit
    adClient={adClient}
    adSlot={adSlot}
    format="leaderboard"
    className={`w-full max-w-4xl mx-auto my-4 ${className}`}
    label="Sponsored Content"
    style={{ minHeight: '90px' }}
  />
);

export const SidebarAd = ({ adClient, adSlot, className = '' }) => (
  <AdUnit
    adClient={adClient}
    adSlot={adSlot}
    format="rectangle"
    className={`w-full sticky top-4 ${className}`}
    label="Advertisement"
    style={{ minHeight: '250px' }}
  />
);

export const InContentAd = ({ adClient, adSlot, className = '' }) => (
  <AdUnit
    adClient={adClient}
    adSlot={adSlot}
    format="rectangle"
    className={`w-full max-w-lg mx-auto my-8 ${className}`}
    label="Advertisement"
    style={{ minHeight: '250px' }}
  />
);

export const MobileAd = ({ adClient, adSlot, className = '' }) => (
  <AdUnit
    adClient={adClient}
    adSlot={adSlot}
    format="banner"
    className={`w-full md:hidden my-4 ${className}`}
    label="Ad"
    style={{ minHeight: '50px' }}
  />
);

export const FooterAd = ({ adClient, adSlot, className = '' }) => (
  <AdUnit
    adClient={adClient}
    adSlot={adSlot}
    format="leaderboard"
    className={`w-full max-w-4xl mx-auto mt-8 mb-4 ${className}`}
    label="Advertisement"
    style={{ minHeight: '90px' }}
  />
);

export default AdUnit;
