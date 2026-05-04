import { useState, useEffect } from 'react';

const MOBILE_UA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function detectMobile() {
  return MOBILE_UA.test(navigator.userAgent) || window.innerWidth < 768;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(detectMobile);

  useEffect(() => {
    const handler = () => setIsMobile(detectMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}
