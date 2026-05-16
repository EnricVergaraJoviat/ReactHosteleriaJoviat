const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const nodemailer = require('nodemailer');

initializeApp();

const GOOGLE_MAPS_API_KEY = defineString('GOOGLE_MAPS_API_KEY');
const GMAIL_EMAIL = defineString('GMAIL_EMAIL');
const APP_LOGIN_URL = defineString('APP_LOGIN_URL', {
  default: 'https://reacthosteleriajoviat.web.app/login',
});
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeOptionalString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePromotionYear(value) {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue || null;
  }

  if (typeof value === 'number') {
    return value;
  }

  return null;
}

const JOVIAT_STUDY_VALUES = new Set([
  'cfgm-cuina-gastronomia-serveis-restauracio',
  'cfgm-pastisseria-forneria-confiteria',
  'cfgs-direccio-cuina',
  'programa-intensiu-cuina-catalana',
  'diploma-sommelier',
  'advanced-sommelier-postgraduate-degree',
]);

function normalizeJoviatStudies(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry, index, entries) =>
      JOVIAT_STUDY_VALUES.has(entry) && entries.indexOf(entry) === index
    );
}

async function sendStudentWelcomeEmail({ email, name, password }) {
  const gmailEmail = GMAIL_EMAIL.value();
  const gmailAppPassword = GMAIL_APP_PASSWORD.value();
  const loginUrl = APP_LOGIN_URL.value();

  if (!gmailEmail || !gmailAppPassword) {
    throw new HttpsError(
      'failed-precondition',
      'Email delivery is not configured. Missing Gmail credentials.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailAppPassword,
    },
  });

  const safeName = name || 'Alumni';

  await transporter.sendMail({
    from: gmailEmail,
    to: email,
    subject: 'Benvingut/da a Alumni Joviat',
    text: [
      `Hola ${safeName},`,
      '',
      'S\'ha creat el teu compte d\'Alumni Joviat.',
      'Ja pots iniciar sessió a la plataforma des d\'aquest enllaç:',
      loginUrl,
      '',
      `La contrasenya inicial configurada és: ${password}`,
      '',
      'Quan iniciïs sessió, recorda que pots canviar-la des del teu perfil.',
      '',
      'Salutacions,',
      'Equip Alumni Joviat',
    ].join('\n'),
    html: `
      <p>Hola ${safeName},</p>
      <p>S'ha creat el teu compte d'Alumni Joviat.</p>
      <p>Ja pots iniciar sessió a la plataforma des d'aquest enllaç:</p>
      <p><a href="${loginUrl}">Inicia sessió a Alumni Joviat</a></p>
      <p><strong>La contrasenya inicial configurada és: ${password}</strong></p>
      <p>Quan iniciïs sessió, recorda que pots canviar-la des del teu perfil.</p>
      <p>Salutacions,<br />Equip Alumni Joviat</p>
    `,
  });
}

async function sendRestaurantRegistrationApprovedEmail({
  email,
  alumniName,
  restaurantName,
}) {
  const gmailEmail = GMAIL_EMAIL.value();
  const gmailAppPassword = GMAIL_APP_PASSWORD.value();

  if (!gmailEmail || !gmailAppPassword) {
    throw new HttpsError(
      'failed-precondition',
      'Email delivery is not configured. Missing Gmail credentials.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailAppPassword,
    },
  });

  const safeName = alumniName || 'Alumni';
  const safeRestaurantName = restaurantName || 'el teu establiment';

  await transporter.sendMail({
    from: gmailEmail,
    to: email,
    subject: 'El teu establiment ja està disponible a Alumni Joviat',
    text: [
      `Hola ${safeName},`,
      '',
      `Ja hem donat d'alta ${safeRestaurantName} a Alumni Joviat.`,
      'A partir d\'ara ja el pots vincular al teu compte des de la plataforma.',
      '',
      'Salutacions,',
      'Equip Alumni Joviat',
    ].join('\n'),
    html: `
      <p>Hola ${safeName},</p>
      <p>Ja hem donat d'alta <strong>${safeRestaurantName}</strong> a Alumni Joviat.</p>
      <p>A partir d'ara ja el pots vincular al teu compte des de la plataforma.</p>
      <p>Salutacions,<br />Equip Alumni Joviat</p>
    `,
  });
}

async function sendPasswordResetEmailMessage({ email, resetLink }) {
  const gmailEmail = GMAIL_EMAIL.value();
  const gmailAppPassword = GMAIL_APP_PASSWORD.value();

  if (!gmailEmail || !gmailAppPassword) {
    throw new HttpsError(
      'failed-precondition',
      'Email delivery is not configured. Missing Gmail credentials.'
    );
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailEmail,
      pass: gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: gmailEmail,
    to: email,
    subject: 'Recupera la contrasenya d\'Alumni Joviat',
    text: [
      'Hola,',
      '',
      'Hem rebut una petició per recuperar la contrasenya del teu compte d\'Alumni Joviat.',
      `Obre aquest enllaç per crear una nova contrasenya: ${resetLink}`,
      '',
      'Si no has demanat aquest canvi, pots ignorar aquest correu.',
      '',
      'Salutacions,',
      'Equip Alumni Joviat',
    ].join('\n'),
    html: `
      <p>Hola,</p>
      <p>Hem rebut una petició per recuperar la contrasenya del teu compte d'Alumni Joviat.</p>
      <p><a href="${resetLink}">Crea una nova contrasenya</a></p>
      <p>Si no has demanat aquest canvi, pots ignorar aquest correu.</p>
      <p>Salutacions,<br />Equip Alumni Joviat</p>
    `,
  });
}

function normalizeFileName(fileName) {
  return String(fileName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function extractImageExtension(contentType) {
  if (typeof contentType !== 'string' || !contentType.includes('/')) {
    return 'jpg';
  }

  const extension = contentType.split('/')[1]?.split(';')[0]?.trim().toLowerCase();
  if (!extension) {
    return 'jpg';
  }

  return extension === 'jpeg' ? 'jpg' : extension;
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function extractMetaContent(html, propertyName) {
  const escapedProperty = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escapedProperty}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedProperty}["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+name=["']${escapedProperty}["'][^>]+content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedProperty}["']`,
      'i'
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return '';
}

function extractTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1]) : '';
}

function extractCanonicalUrl(html) {
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );

  if (canonicalMatch?.[1]) {
    return decodeHtmlEntities(canonicalMatch[1]);
  }

  return (
    extractMetaContent(html, 'og:url')
    || extractMetaContent(html, 'al:android:url')
    || extractMetaContent(html, 'al:ios:url')
  );
}

function extractGoogleMapsParamQuery(urlValue) {
  if (!urlValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(urlValue);
    const paramNames = ['q', 'query', 'destination', 'daddr', 'near'];

    for (const paramName of paramNames) {
      const paramValue = parsedUrl.searchParams.get(paramName);

      if (paramValue) {
        return decodeHtmlEntities(paramValue).trim();
      }
    }
  } catch (error) {}

  return '';
}

function extractPathQuery(urlValue) {
  if (!urlValue) {
    return '';
  }

  try {
    const parsedUrl = new URL(urlValue);
    const placeName = parsedUrl.pathname.match(/\/place\/([^/]+)/i)?.[1];

    if (placeName) {
      return decodeURIComponent(placeName).replace(/\+/g, ' ').trim();
    }

    const pathSegments = parsedUrl.pathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);

    const lastMeaningfulSegment = [...pathSegments]
      .reverse()
      .find((segment) => /[a-zA-Z]/.test(segment) && !/^maps?$/i.test(segment));

    if (lastMeaningfulSegment) {
      return decodeURIComponent(lastMeaningfulSegment).replace(/\+/g, ' ').trim();
    }
  } catch (error) {}

  return '';
}

function extractJsonLdQuery(html) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];

  for (const scriptTag of scripts) {
    const jsonText = scriptTag
      .replace(/<script[^>]*>/i, '')
      .replace(/<\/script>/i, '')
      .trim();

    if (!jsonText) {
      continue;
    }

    try {
      const parsed = JSON.parse(jsonText);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const name = typeof item?.name === 'string' ? item.name.trim() : '';
        const address = typeof item?.address === 'string'
          ? item.address.trim()
          : typeof item?.address?.streetAddress === 'string'
            ? item.address.streetAddress.trim()
            : '';

        if (name && address) {
          return `${name}, ${address}`;
        }

        if (name) {
          return name;
        }
      }
    } catch (error) {}
  }

  return '';
}

function isLikelyGenericGoogleQuery(value) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue) {
    return true;
  }

  return [
    'google maps',
    'google map',
    'google',
    'google brussels',
    'google belgium',
    'google barcelona',
    'google madrid',
    'google spain',
  ].includes(normalizedValue);
}

function collectCandidateQueries({ html, finalUrl, sharedUrl }) {
  const candidates = [
    extractGoogleMapsParamQuery(finalUrl),
    extractGoogleMapsParamQuery(sharedUrl),
    extractPathQuery(finalUrl),
    extractPathQuery(sharedUrl),
    extractMetaContent(html, 'og:title'),
    extractMetaContent(html, 'twitter:title'),
    extractJsonLdQuery(html),
    extractTitleTag(html),
    extractMetaContent(html, 'og:description'),
    extractMetaContent(html, 'twitter:description'),
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const normalizedSeen = new Set();

  return candidates.filter((candidate) => {
    const normalized = candidate.toLowerCase();

    if (normalizedSeen.has(normalized) || isLikelyGenericGoogleQuery(candidate)) {
      return false;
    }

    normalizedSeen.add(normalized);
    return true;
  });
}

function extractPlaceIdFromText(text) {
  if (!text) {
    return '';
  }

  const patterns = [
    /place_id[:=]\s*([a-zA-Z0-9_\-]+)/i,
    /["']place[_-]?id["']\s*[:=]\s*["']([a-zA-Z0-9_\-]+)["']/i,
    /place_id%3A([a-zA-Z0-9_\-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

async function searchPlaceIdByText(textQuery, apiKey) {
  if (!textQuery) {
    return '';
  }

  let response;
  try {
    response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 1,
      }),
    });
  } catch (error) {
    logger.error('Google Places text search failed', { textQuery, error });
    throw new HttpsError('unavailable', 'Unable to search Google Places.');
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    logger.error('Google Places text search response failed', {
      textQuery,
      status: response.status,
      bodyText,
    });
    throw new HttpsError('unavailable', 'Google Places text search failed.');
  }

  const data = await response.json();
  return data.places?.[0]?.id || '';
}

exports.createStudentAccount = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
    invoker: 'public',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (request) => {
    const auth = getAuth();
    const db = getFirestore();
    const rawStudentData = request.data?.studentData ?? {};
    const password = normalizeOptionalString(request.data?.password);
    const deleteRegistrationId = normalizeOptionalString(request.data?.deleteRegistrationId);
    const email = normalizeEmail(rawStudentData.Email ?? rawStudentData.email);
    const name = normalizeOptionalString(rawStudentData.Name ?? rawStudentData.name);

    if (!email || !name || !password) {
      throw new HttpsError('invalid-argument', 'Missing required student account data.');
    }

    if (password.length < 6) {
      throw new HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
    }

    const alumniCollection = db.collection('Alumni');
    const existingAlumniSnapshot = await alumniCollection.where('Email', '==', email).limit(1).get();

    if (!existingAlumniSnapshot.empty) {
      throw new HttpsError('already-exists', 'An Alumni user already exists with this email.');
    }

    let authUserRecord;
    let studentReference;

    try {
      authUserRecord = await auth.createUser({
        email,
        password,
      });

      studentReference = await alumniCollection.add({
        Name: name,
        PhotoURL: normalizeOptionalString(rawStudentData.PhotoURL),
        Email: email,
        Phone: normalizeOptionalString(rawStudentData.Phone),
        LinkedIn: normalizeOptionalString(rawStudentData.LinkedIn),
        Instagram: normalizeOptionalString(rawStudentData.Instagram),
        VisibleContactToAlumniNetwork: rawStudentData.VisibleContactToAlumniNetwork !== false,
        PromotionYear: normalizePromotionYear(rawStudentData.PromotionYear),
        JoviatStudies: normalizeJoviatStudies(rawStudentData.JoviatStudies ?? rawStudentData.Studies),
        Password: password,
        createdAt: FieldValue.serverTimestamp(),
      });

      await sendStudentWelcomeEmail({
        email,
        name,
        password,
      });

      if (deleteRegistrationId) {
        await db.collection('UserRegistrations').doc(deleteRegistrationId).delete();
      }

      return {
        studentId: studentReference.id,
        emailSent: true,
      };
    } catch (error) {
      if (studentReference?.id) {
        await studentReference.delete().catch(() => {});
      }

      if (authUserRecord?.uid) {
        await auth.deleteUser(authUserRecord.uid).catch(() => {});
      }

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error?.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'An auth user already exists with this email.');
      }

      logger.error('Unable to create student account', {
        email,
        deleteRegistrationId,
        error,
      });
      throw new HttpsError('internal', 'Unable to create the student account.');
    }
  }
);

exports.sendRestaurantRegistrationApprovedEmail = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
    invoker: 'public',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const alumniName = normalizeOptionalString(request.data?.alumniName);
    const restaurantName = normalizeOptionalString(request.data?.restaurantName);

    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    if (!email || !restaurantName) {
      throw new HttpsError('invalid-argument', 'Missing restaurant notification data.');
    }

    try {
      await sendRestaurantRegistrationApprovedEmail({
        email,
        alumniName,
        restaurantName,
      });

      return {
        emailSent: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error('Unable to send restaurant registration approved email', {
        email,
        alumniName,
        restaurantName,
        error,
      });
      throw new HttpsError('internal', 'Unable to send restaurant registration approved email.');
    }
  }
);

exports.sendPasswordResetEmail = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
    invoker: 'public',
    secrets: [GMAIL_APP_PASSWORD],
  },
  async (request) => {
    const auth = getAuth();
    const db = getFirestore();
    const email = normalizeEmail(request.data?.email);

    if (!email) {
      throw new HttpsError('invalid-argument', 'A valid email is required.');
    }

    try {
      const alumniSnapshot = await db
        .collection('Alumni')
        .where('Email', '==', email)
        .limit(1)
        .get();

      if (alumniSnapshot.empty) {
        throw new HttpsError('not-found', 'No Alumni user exists with this email.');
      }

      await auth.getUserByEmail(email);
      const resetLink = await auth.generatePasswordResetLink(email);

      await sendPasswordResetEmailMessage({
        email,
        resetLink,
      });

      return {
        emailSent: true,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      if (error?.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No Authentication user exists with this email.');
      }

      logger.error('Unable to send password reset email', {
        email,
        error,
      });
      throw new HttpsError('internal', 'Unable to send password reset email.');
    }
  }
);

async function fetchPlacePhotoUri(photoName, apiKey) {
  if (!photoName || !photoName.startsWith('places/')) {
    return '';
  }

  let metadataResponse;
  try {
    metadataResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${apiKey}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );
  } catch (error) {
    logger.warn('Google Place photo metadata fetch failed while resolving share link', {
      photoName,
      error,
    });
    return '';
  }

  if (!metadataResponse.ok) {
    const bodyText = await metadataResponse.text().catch(() => '');
    logger.warn('Google Place photo metadata response failed while resolving share link', {
      photoName,
      status: metadataResponse.status,
      bodyText,
    });
    return '';
  }

  const metadata = await metadataResponse.json().catch(() => null);
  return metadata?.photoUri || '';
}

async function fetchPlaceDetailsById(placeId, apiKey) {
  let response;

  try {
    response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': [
            'id',
            'displayName',
            'formattedAddress',
            'googleMapsUri',
            'internationalPhoneNumber',
            'nationalPhoneNumber',
            'websiteUri',
            'location',
            'photos',
            'primaryType',
            'primaryTypeDisplayName',
            'rating',
            'businessStatus',
            'types',
          ].join(','),
        },
      }
    );
  } catch (error) {
    logger.error('Google Place details fetch by id failed', { placeId, error });
    throw new HttpsError('unavailable', 'Unable to fetch Google Place details.');
  }

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    logger.error('Google Place details by id response failed', {
      placeId,
      status: response.status,
      bodyText,
    });
    throw new HttpsError('unavailable', 'Google Place details request failed.');
  }

  const place = await response.json();
  const primaryPhoto = place.photos?.[0];
  const photoUrl = await fetchPlacePhotoUri(primaryPhoto?.name || '', apiKey);

  return {
    googlePlaceId: place.id || placeId,
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
    website: place.websiteUri || '',
    googleMapsUrl: place.googleMapsUri || '',
    photoUrl,
    googlePhotoName: primaryPhoto?.name || '',
    rating: typeof place.rating === 'number' ? String(place.rating) : '',
    businessStatus: place.businessStatus || '',
    latitude: typeof place.location?.latitude === 'number' ? place.location.latitude : null,
    longitude: typeof place.location?.longitude === 'number' ? place.location.longitude : null,
    primaryType: place.primaryType || '',
    primaryTypeDisplayName: place.primaryTypeDisplayName?.text || '',
    types: Array.isArray(place.types) ? place.types : [],
  };
}

exports.copyPlacePhotoToStorage = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
    invoker: 'public',
  },
  async (request) => {
    let photoName = String(request.data?.photoName || '').trim();
    const restaurantName = String(request.data?.restaurantName || '').trim();
    const googlePlaceId = String(request.data?.googlePlaceId || '').trim();

    const apiKey = GOOGLE_MAPS_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GOOGLE_MAPS_API_KEY missing.');
    }

    if (!photoName && googlePlaceId) {
      const detailsUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`;

      let detailsResponse;
      try {
        detailsResponse = await fetch(detailsUrl, {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'photos',
          },
        });
      } catch (error) {
        logger.error('Google Place details fetch failed', { googlePlaceId, error });
        throw new HttpsError('unavailable', 'Unable to fetch Google Place details.');
      }

      if (!detailsResponse.ok) {
        const bodyText = await detailsResponse.text().catch(() => '');
        logger.error('Google Place details response failed', {
          googlePlaceId,
          status: detailsResponse.status,
          bodyText,
        });
        throw new HttpsError('unavailable', 'Google Place details request failed.');
      }

      const details = await detailsResponse.json();
      photoName = details.photos?.[0]?.name || '';
    }

    if (!photoName || !photoName.startsWith('places/')) {
      throw new HttpsError('invalid-argument', 'photoName invalid.');
    }

    const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true&key=${apiKey}`;

    let metadataResponse;
    try {
      metadataResponse = await fetch(photoUrl, {
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      logger.error('Google Place Photo metadata fetch failed', { photoName, error });
      throw new HttpsError('unavailable', 'Unable to fetch Google Place photo metadata.');
    }

    if (!metadataResponse.ok) {
      const bodyText = await metadataResponse.text().catch(() => '');
      logger.error('Google Place Photo metadata response failed', {
        photoName,
        status: metadataResponse.status,
        bodyText,
      });
      throw new HttpsError('unavailable', 'Google Place photo metadata request failed.');
    }

    const metadata = await metadataResponse.json();
    const directDownloadUrl = metadata.photoUri;

    if (!directDownloadUrl) {
      logger.error('Google Place Photo metadata missing photoUri', { photoName, metadata });
      throw new HttpsError('internal', 'Google Place photo URI missing.');
    }

    let imageResponse;
    try {
      imageResponse = await fetch(directDownloadUrl);
    } catch (error) {
      logger.error('Google Place Photo binary fetch failed', { photoName, error });
      throw new HttpsError('unavailable', 'Unable to download Google Place photo.');
    }

    if (!imageResponse.ok) {
      const bodyText = await imageResponse.text().catch(() => '');
      logger.error('Google Place Photo binary response failed', {
        photoName,
        status: imageResponse.status,
        bodyText,
      });
      throw new HttpsError('unavailable', 'Google Place photo download failed.');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const extension = extractImageExtension(contentType);
    const safeBaseName = normalizeFileName(
      googlePlaceId || restaurantName || photoName.split('/').pop() || `restaurant-${Date.now()}`
    ) || `restaurant-${Date.now()}`;
    const storagePath = `restaurantes/${Date.now()}-${safeBaseName}.${extension}`;

    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    try {
      await file.save(buffer, {
        resumable: false,
        metadata: {
          contentType,
        },
      });
    } catch (error) {
      logger.error('Firebase Storage save failed', { photoName, storagePath, error });
      throw new HttpsError('internal', 'Unable to store Google Place photo.');
    }

    try {
      await file.makePublic();
    } catch (error) {
      logger.warn('Firebase Storage makePublic failed, continuing with signed URL fallback', {
        storagePath,
        error,
      });
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500',
      });

      return {
        photoUrl: signedUrl,
        storagePath,
      };
    }

    return {
      photoUrl: `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(storagePath)}`,
      storagePath,
    };
  }
);

exports.resolveGoogleMapsShareLink = onCall(
  {
    region: 'europe-west1',
    timeoutSeconds: 60,
    memory: '256MiB',
    cors: true,
    invoker: 'public',
  },
  async (request) => {
    const sharedUrl = String(request.data?.url || '').trim();
    const apiKey = GOOGLE_MAPS_API_KEY.value();

    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GOOGLE_MAPS_API_KEY missing.');
    }

    if (!sharedUrl) {
      throw new HttpsError('invalid-argument', 'url missing.');
    }

    let parsedSharedUrl;
    try {
      parsedSharedUrl = new URL(sharedUrl);
    } catch (error) {
      throw new HttpsError('invalid-argument', 'url invalid.');
    }

    if (!/^https?:$/.test(parsedSharedUrl.protocol)) {
      throw new HttpsError('invalid-argument', 'url protocol invalid.');
    }

    let response;
    try {
      response = await fetch(sharedUrl, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ReactHosteleriaJoviatBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
    } catch (error) {
      logger.error('Google Maps shared URL fetch failed', { sharedUrl, error });
      throw new HttpsError('unavailable', 'Unable to open the shared Google Maps URL.');
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      logger.error('Google Maps shared URL response failed', {
        sharedUrl,
        status: response.status,
        bodyText,
      });
      throw new HttpsError('unavailable', 'Google Maps shared URL request failed.');
    }

  const finalUrl = response.url || sharedUrl;
    const html = await response.text().catch(() => '');
    const canonicalUrl = extractCanonicalUrl(html);
    let placeId = [
      finalUrl,
      canonicalUrl,
      html,
    ]
      .map((value) => extractPlaceIdFromText(value))
      .find(Boolean) || '';

    if (!placeId) {
      const candidateQueries = collectCandidateQueries({
        html,
        finalUrl: canonicalUrl || finalUrl,
        sharedUrl,
      });

      for (const candidateQuery of candidateQueries) {
        placeId = await searchPlaceIdByText(candidateQuery, apiKey);

        if (placeId) {
          break;
        }
      }
    }

    if (!placeId) {
      logger.error('Unable to resolve place id from shared Google Maps URL', {
        sharedUrl,
        finalUrl,
        canonicalUrl,
      });
      throw new HttpsError('not-found', 'Unable to resolve the place from the shared URL.');
    }

    const details = await fetchPlaceDetailsById(placeId, apiKey);

    return {
      finalUrl,
      ...details,
    };
  }
);
