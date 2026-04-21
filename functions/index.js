const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

initializeApp();

const GOOGLE_MAPS_API_KEY = defineString('GOOGLE_MAPS_API_KEY');

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
