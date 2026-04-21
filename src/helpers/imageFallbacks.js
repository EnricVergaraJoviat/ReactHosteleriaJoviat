const CHEF_ICON_PATH = 'M55.46 0c-4.73 0-8.97 2.21-11.73 5.66-.95-.21-1.92-.35-2.9-.35-8.26 0-14.99 6.75-14.99 15.01 0 5.58 3.09 10.66 7.95 13.25v25.48c0 11.86 9.66 21.51 21.51 21.51h.31c11.85 0 21.51-9.65 21.51-21.51V33.6c4.9-2.57 8.03-7.68 8.03-13.28 0-8.26-6.73-15.01-14.99-15.01-1 0-1.98.16-2.95.38C64.45 2.23 60.21 0 55.46 0ZM55.46 4.24c.1 0 .19 0 .28 0h.06s.06 0 .1 0c.19 0 .39.02.58.04.02 0 .06 0 .08 0 .08 0 .17.02.25.03.1 0 .19.02.29.04 3.01.47 5.72 2.2 7.4 4.8h0s.05.05.06.08c1.05 1.66 1.66 3.64 1.66 5.76v.17h0c-.02 1.17.91 2.12 2.08 2.14.56.01 1.11-.2 1.52-.59.4-.39.64-.93.65-1.49v-.24c0-1.92-.36-3.75-1.03-5.44.24-.02.48-.02.71-.02 5.97 0 10.75 4.79 10.75 10.77 0 4.39-2.65 8.33-6.71 9.98h0c-.1.04-.2.09-.3.16-.03.01-.06.02-.08.04-.08.06-.16.12-.23.19-.03.03-.07.06-.1.09-.06.06-.11.12-.16.19-.05.06-.09.12-.14.19-.03.06-.06.12-.1.18-.03.07-.06.15-.09.22-.02.07-.05.15-.06.22-.02.06-.02.12-.03.18-.01.08-.02.17-.02.26v.05 2.77H38.03v-2.67c.06-.9-.46-1.74-1.3-2.09-4.03-1.67-6.65-5.59-6.65-9.96 0-5.97 4.78-10.77 10.75-10.77.21 0 .42 0 .64.02-.66 1.69-1.03 3.53-1.03 5.44 0 .08.02.16.02.24h0c.02 1.17.98 2.1 2.15 2.09 1.17-.02 2.09-.98 2.08-2.15v-.17c0-2.12.61-4.09 1.66-5.75.03-.03.06-.07.08-.1 1.98-3.06 5.39-4.91 9.04-4.92ZM38.03 39.27h34.85v5.44H38.03v-5.44Zm0 9.68h34.85v10.1c0 9.56-7.71 17.27-17.27 17.27h-.31c-9.56 0-17.27-7.7-17.27-17.27v-10.1ZM55.46 83.93c-7.59 0-15.18 1.13-22.51 3.4l-.13.05h0s-.02.02-.03.04v-.05c-6.95 2.16-12.26 7.82-13.98 14.91l-7.5 30.84h0c-.15.64 0 1.31.4 1.81.4.51 1.02.81 1.67.81h84.17c.65 0 1.26-.3 1.66-.81.4-.51.55-1.17.39-1.8l-7.5-30.84c-1.72-7.08-7.03-12.75-13.98-14.91h0-.03l-.12-.05h-.03c-4.93-1.53-9.98-2.53-15.07-3.03-.03 0-.06-.01-.1-.02-2.43-.24-4.87-.35-7.31-.35ZM55.46 88.15c.34 0 .68 0 1.03 0l-10.45 7.36h-.01c-.56.4-.89 1.05-.89 1.74v34.22H16.07l6.86-28.21c1.37-5.63 5.58-10.12 11.1-11.83l.16-.05h0s.02-.01.03-.02c6.92-2.15 14.08-3.23 21.24-3.23ZM63.25 88.58c4.54.5 9.05 1.43 13.45 2.79h0l.03.02.16.05c5.52 1.72 9.73 6.21 11.1 11.83l6.86 28.21H49.39V98.35l13.87-9.77ZM58.58 101.77c-2 .05-3.61 1.71-3.61 3.72s1.67 3.71 3.71 3.71 3.72-1.67 3.72-3.71-1.67-3.72-3.72-3.72h-.1ZM58.58 116.76c-2 .05-3.61 1.7-3.61 3.71s1.67 3.71 3.71 3.71 3.72-1.67 3.72-3.71-1.67-3.71-3.72-3.71h-.1Z';

function createStudentPlaceholder() {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <g transform="translate(28 16) scale(0.58)" fill="#111111">
        <path d="${CHEF_ICON_PATH}"/>
      </g>
    </svg>
  `)}`;
}

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
    return createStudentPlaceholder();
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
