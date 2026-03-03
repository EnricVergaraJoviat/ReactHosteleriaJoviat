import { useEffect, useState } from 'react';

const DESKTOP_MEDIA_QUERY = '(min-width: 961px)';

function getMatches() {
  if (typeof window === 'undefined') {
    return true;
  }

  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const handleChange = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isDesktop;
}

export default useIsDesktop;
