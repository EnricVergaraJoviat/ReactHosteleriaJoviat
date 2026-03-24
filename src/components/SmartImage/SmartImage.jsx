import { useEffect, useState } from 'react';
import { getFallbackImage, getImageWithFallback } from '../../helpers/imageFallbacks';

function SmartImage({ src, type, label, alt, className, ...props }) {
  const fallbackSrc = getFallbackImage(type, label);
  const [currentSrc, setCurrentSrc] = useState(getImageWithFallback(src, type, label));

  useEffect(() => {
    setCurrentSrc(getImageWithFallback(src, type, label));
  }, [src, type, label]);

  function handleError() {
    setCurrentSrc((previousSrc) => (previousSrc === fallbackSrc ? previousSrc : fallbackSrc));
  }

  return (
    <img
      {...props}
      className={className}
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleError}
    />
  );
}

export default SmartImage;
