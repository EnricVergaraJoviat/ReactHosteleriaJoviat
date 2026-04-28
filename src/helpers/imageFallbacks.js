import alumniFallbackImage from '../assets/images/Alumni.png';

function createSvgPlaceholder(type, label) {
  const safeLabel = label || (type === 'student' ? 'Alumne' : 'Restaurant');
  const subtitle = type === 'student' ? 'Perfil' : 'Hostaleria';
  const accent = type === 'student' ? '#6d5532' : '#8b3d1f';
  const background = type === 'student' ? '#efe6d4' : '#f3dfd0';
  const shape = type === 'student'
    ? '<circle cx="60" cy="50" r="22" fill="#ffffff" opacity="0.9"/><path d="M25 110c6-22 25-33 35-33s29 11 35 33" fill="#ffffff" opacity="0.9"/>'
    : '<rect x="26" y="34" width="68" height="72" rx="12" fill="#ffffff" opacity="0.9"/><rect x="38" y="48" width="12" height="12" rx="3" fill="#d8c2ab"/><rect x="56" y="48" width="12" height="12" rx="3" fill="#d8c2ab"/><rect x="74" y="48" width="8" height="34" rx="3" fill="#d8c2ab"/><rect x="38" y="66" width="30" height="8" rx="3" fill="#d8c2ab"/>';

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">
      <rect width="120" height="140" rx="24" fill="${background}"/>
      ${shape}
      ${type === 'student' ? '' : `
      <text x="60" y="123" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${accent}">
        ${safeLabel.slice(0, 18)}
      </text>
      <text x="60" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="${accent}">
        ${subtitle}
      </text>
      `}
    </svg>
  `)}`;
}

function getFallbackImage(type, label) {
  if (type === 'student') {
    return alumniFallbackImage;
  }

  return createSvgPlaceholder(type, label);
}

function getImageWithFallback(imageUrl, type, label) {
  if (typeof imageUrl === 'string' && imageUrl.trim()) {
    return imageUrl;
  }

  return getFallbackImage(type, label);
}

export { getFallbackImage, getImageWithFallback };
