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
      
      // Clamp ratio between 0.55 and 1.25
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

  // Calculate inverse height to fill browser viewport cleanly when zoomed
  const heightPercent = 100 / scale;

  return (
    <div
      style={{
        width: '100%',
        minHeight: `${heightPercent}vh`,
        height: `${heightPercent}vh`,
        zoom: scale, // Modern CSS Zoom scaling for 1920x1080 layout baseline
        backgroundColor: 'var(--background)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}
