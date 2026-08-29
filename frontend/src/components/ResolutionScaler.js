'use client';

import React, { useEffect, useState } from 'react';

export default function ResolutionScaler({ children }) {
  const [scale, setScale] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleResize = () => {
      const targetWidth = 1920;
      const currentWidth = window.innerWidth;
      
      // Calculate scale ratio relative to 1920px reference resolution
      let ratio = currentWidth / targetWidth;
      
      // Clamp ratio between 0.55 (very small mobile/tablet) and 1.25 (2K+ monitors)
      if (ratio < 0.55) ratio = 0.55;
      if (ratio > 1.25) ratio = 1.25;

      setScale(ratio);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isMounted) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        overflowX: 'hidden',
        zoom: scale, // Modern CSS Zoom scaling for 1920x1080 layout baseline
      }}
    >
      {children}
    </div>
  );
}
