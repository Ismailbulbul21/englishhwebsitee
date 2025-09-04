import { useEffect } from 'react';

const AdUnit = ({ 
  adClient, 
  adSlot, 
  format = 'auto', 
  className = '', 
  label = 'Advertisement',
  style = {},
  responsive = true 
}) => {

  useEffect(() => {
    // AdSense script loading DISABLED until approval
    // This prevents "Google-served ads on screens without publisher-content" violation
    if (!adClient || !adSlot) return; // Only attempt to load if client and slot are provided

    // COMMENTED OUT UNTIL ADSENSE APPROVAL:
    // if (!window.adsbygoogle) {
    //   const script = document.createElement('script');
    //   script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    //   script.async = true;
    //   script.crossOrigin = 'anonymous';
    //   script.onload = () => {
    //     if (window.adsbygoogle && adRef.current) {
    //       (window.adsbygoogle = window.adsbygoogle || []).push({});
    //     }
    //   };
    //   document.head.appendChild(script);
    // } else {
    //   if (window.adsbygoogle && adRef.current) {
    //     (window.adsbygoogle = window.adsbygoogle || []).push({});
    //   }
    // }
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
      
      {/* AdSense Ad Unit - DISABLED UNTIL APPROVAL */}
      <div 
        style={{ 
          display: 'block',
          textAlign: 'center',
          ...style 
        }}
      >
        {/* Ad unit will be enabled after AdSense approval */}
        <div className="text-center text-gray-400 py-8">
          Ad space reserved for after approval
        </div>
      </div>
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
