import { useEffect, useRef, useState } from 'react';
import { getFallbackImage, getImageWithFallback } from '../../helpers/imageFallbacks';
import './SmartImage.css';

function SmartImage({ src, type, label, alt, className, ...props }) {
  const fallbackSrc = getFallbackImage(type, label);
  const imageRef = useRef(null);
  const initialSrc = getImageWithFallback(src, type, label);
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isLoaded, setIsLoaded] = useState(initialSrc === fallbackSrc);
  const isFallbackImage = currentSrc === fallbackSrc;

  useEffect(() => {
    const nextSrc = getImageWithFallback(src, type, label);
    setIsLoaded(nextSrc === fallbackSrc);
    setCurrentSrc(nextSrc);
  }, [src, type, label, fallbackSrc]);

  useEffect(() => {
    const image = imageRef.current;

    if (image?.complete && image.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  function handleError() {
    setCurrentSrc((previousSrc) => {
      if (previousSrc === fallbackSrc) {
        setIsLoaded(true);
        return previousSrc;
      }

      setIsLoaded(false);
      return fallbackSrc;
    });
  }

  return (
    <span
      className={`smart-image${className ? ` ${className}` : ''}${isFallbackImage ? ' smart-image--fallback' : ''}${
        isFallbackImage && type === 'student' ? ' smart-image--student-fallback' : ''
      }`}
    >
      {!isLoaded ? (
        <span className="smart-image__loader" aria-hidden="true" />
      ) : null}
      <img
        {...props}
        ref={imageRef}
        className={`smart-image__img${isFallbackImage ? ' smart-image__img--fallback' : ''}${
          isFallbackImage && type === 'student' ? ' smart-image__img--student-fallback' : ''
        }`}
        src={currentSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleError}
        onLoad={() => setIsLoaded(true)}
      />
    </span>
  );
}

export default SmartImage;
